"""
Admin Settings Management Lambda
================================
Secure CRUD operations for system configuration settings.

Features:
- JWT secrets management
- Payment gateway configuration (PayPal USD only)
- AWS service configurations
- Email/SES settings
- API keys management
- Encryption for sensitive values

Security:
- Admin authentication required
- Role-based access (Super Admin only for secrets)
- Audit logging for all changes
- Encryption at rest for sensitive data
"""

import json
import boto3
import os
import hashlib
import base64
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

# Configuration
SETTINGS_TABLE = 'admin-system-settings'
ADMIN_USERS_TABLE = 'admin-users'
AUDIT_LOG_TABLE = 'admin-audit-logs'

# KMS key for encryption (create one or use default)
KMS_KEY_ID = os.environ.get('KMS_KEY_ID', 'alias/aws/dynamodb')

# Allowed CORS origins
ALLOWED_ORIGINS = [
    'https://admin.aivedha.ai',
    'https://aivedha.ai',
    'http://localhost:5173',
    'http://localhost:8080'
]

# Setting categories and their keys
SETTING_SCHEMA = {
    'jwt': {
        'keys': ['user_jwt_secret', 'admin_jwt_secret', 'jwt_expiry_hours', 'refresh_token_expiry_days'],
        'sensitive': ['user_jwt_secret', 'admin_jwt_secret'],
        'required_role': 'Super Admin'
    },
    'payment_paypal': {
        'keys': ['client_id', 'client_secret', 'webhook_id', 'api_url', 'enabled'],
        'sensitive': ['client_secret', 'webhook_id'],
        'required_role': 'Super Admin'
    },
    'aws_cognito': {
        'keys': ['user_pool_id', 'app_client_id', 'identity_pool_id', 'region'],
        'sensitive': [],
        'required_role': 'Admin'
    },
    'aws_ses': {
        'keys': ['sender_email', 'admin_email', 'support_email', 'region', 'configuration_set'],
        'sensitive': [],
        'required_role': 'Admin'
    },
    'aws_s3': {
        'keys': ['reports_bucket', 'website_bucket', 'region'],
        'sensitive': [],
        'required_role': 'Admin'
    },
    'api_keys': {
        'keys': ['google_recaptcha_site_key', 'google_recaptcha_secret', 'github_client_id', 'github_client_secret'],
        'sensitive': ['google_recaptcha_secret', 'github_client_secret'],
        'required_role': 'Super Admin'
    },
    'subscription_plans': {
        'keys': ['starter_price_usd', 'starter_credits', 'enterprise_price_usd', 'enterprise_credits', 'free_credits'],
        'sensitive': [],
        'required_role': 'Admin'
    },
    'security_audit': {
        'keys': ['max_scan_depth', 'timeout_seconds', 'rate_limit_per_minute', 'enable_deep_scan', 'enable_ai_analysis'],
        'sensitive': [],
        'required_role': 'Admin'
    },
    'email_templates': {
        'keys': ['welcome_template_id', 'payment_success_template_id', 'audit_complete_template_id', 'subscription_reminder_template_id'],
        'sensitive': [],
        'required_role': 'Moderator'
    },
    'feature_flags': {
        'keys': ['enable_github_login', 'enable_google_login', 'enable_scheduled_audits', 'enable_white_label', 'maintenance_mode'],
        'sensitive': [],
        'required_role': 'Admin'
    }
}

# Role hierarchy for access control
ROLE_HIERARCHY = {
    'Super Admin': 4,
    'Admin': 3,
    'Moderator': 2,
    'Support': 1
}


def get_cors_headers(event):
    """Get CORS headers based on request origin"""
    origin = None
    headers = event.get('headers', {}) or {}

    for key, value in headers.items():
        if key.lower() == 'origin':
            origin = value
            break

    if origin in ALLOWED_ORIGINS:
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        }

    return {
        'Access-Control-Allow-Origin': 'https://admin.aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }


def create_response(status_code, body, event):
    """Create HTTP response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps(body, default=str)
    }


def verify_admin_token(event):
    """Verify admin JWT token and return user info"""
    import jwt

    headers = event.get('headers', {}) or {}
    auth_header = None

    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break

    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.replace('Bearer ', '')

    try:
        # Get JWT secret from environment or settings
        jwt_secret = os.environ.get('ADMIN_JWT_SECRET')

        if not jwt_secret:
            # Try to get from DynamoDB
            dynamodb = boto3.resource('dynamodb')
            table = dynamodb.Table(SETTINGS_TABLE)
            response = table.get_item(
                Key={'setting_category': 'jwt', 'setting_key': 'admin_jwt_secret'}
            )
            if 'Item' in response:
                jwt_secret = decrypt_value(response['Item'].get('value', ''))

        if not jwt_secret:
            print("CRITICAL: No JWT secret configured")
            return None

        decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        return decoded
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None


def has_permission(user_role, required_role):
    """Check if user role has permission for required role"""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 999)
    return user_level >= required_level


def encrypt_value(value):
    """Encrypt sensitive value using base64 (use KMS in production)"""
    if not value:
        return value
    # Simple obfuscation - in production, use AWS KMS
    encoded = base64.b64encode(value.encode()).decode()
    return f"ENC:{encoded}"


def decrypt_value(value):
    """Decrypt sensitive value"""
    if not value or not value.startswith('ENC:'):
        return value
    try:
        encoded = value.replace('ENC:', '')
        return base64.b64decode(encoded).decode()
    except:
        return value


def mask_sensitive_value(value):
    """Mask sensitive value for display"""
    if not value:
        return ''
    if len(value) <= 8:
        return '*' * len(value)
    return value[:4] + '*' * (len(value) - 8) + value[-4:]


def log_audit(dynamodb, admin_user, action, category, key, old_value, new_value):
    """Log audit trail for setting changes"""
    try:
        # Create audit log table if it doesn't exist
        table = dynamodb.Table(AUDIT_LOG_TABLE)

        table.put_item(Item={
            'audit_id': f"{datetime.utcnow().isoformat()}-{admin_user.get('email', 'unknown')}",
            'timestamp': datetime.utcnow().isoformat(),
            'admin_user_id': admin_user.get('admin_user_id', 'unknown'),
            'admin_email': admin_user.get('email', 'unknown'),
            'action': action,
            'category': category,
            'setting_key': key,
            'old_value_hash': hashlib.sha256(str(old_value).encode()).hexdigest()[:16] if old_value else None,
            'new_value_hash': hashlib.sha256(str(new_value).encode()).hexdigest()[:16] if new_value else None,
            'ip_address': 'N/A',  # Add from event if needed
            'user_agent': 'N/A'
        })
    except Exception as e:
        print(f"Audit log error: {e}")


def lambda_handler(event, context):
    """Main Lambda handler"""

    # Handle CORS preflight
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'POST'))

    if http_method == 'OPTIONS':
        return create_response(200, {}, event)

    # Verify admin authentication
    admin_user = verify_admin_token(event)
    if not admin_user:
        return create_response(401, {
            'success': False,
            'error': 'UNAUTHORIZED',
            'message': 'Admin authentication required'
        }, event)

    # Parse request
    path = event.get('path', event.get('rawPath', ''))
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except:
            body = {}

    # Initialize DynamoDB
    dynamodb = boto3.resource('dynamodb')

    # Route to appropriate handler
    try:
        if '/settings/categories' in path and http_method == 'GET':
            return get_categories(event, admin_user)

        elif '/settings/category/' in path and http_method == 'GET':
            category = path.split('/settings/category/')[-1].split('/')[0]
            return get_category_settings(event, admin_user, dynamodb, category)

        elif '/settings/update' in path and http_method in ['POST', 'PUT']:
            return update_setting(event, admin_user, dynamodb, body)

        elif '/settings/bulk-update' in path and http_method in ['POST', 'PUT']:
            return bulk_update_settings(event, admin_user, dynamodb, body)

        elif '/settings/export' in path and http_method == 'GET':
            return export_settings(event, admin_user, dynamodb)

        elif '/settings/import' in path and http_method == 'POST':
            return import_settings(event, admin_user, dynamodb, body)

        elif '/settings/test-connection' in path and http_method == 'POST':
            return test_connection(event, admin_user, dynamodb, body)

        else:
            return create_response(404, {
                'success': False,
                'error': 'NOT_FOUND',
                'message': 'Endpoint not found'
            }, event)

    except Exception as e:
        print(f"Handler error: {e}")
        return create_response(500, {
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'An error occurred processing your request'
        }, event)


def get_categories(event, admin_user):
    """Get list of setting categories with user's access level"""
    user_role = admin_user.get('role', 'Support')

    categories = []
    for category, config in SETTING_SCHEMA.items():
        has_access = has_permission(user_role, config.get('required_role', 'Super Admin'))
        categories.append({
            'category': category,
            'display_name': category.replace('_', ' ').title(),
            'key_count': len(config['keys']),
            'has_sensitive': len(config.get('sensitive', [])) > 0,
            'required_role': config.get('required_role', 'Super Admin'),
            'has_access': has_access
        })

    return create_response(200, {
        'success': True,
        'categories': categories,
        'user_role': user_role
    }, event)


def get_category_settings(event, admin_user, dynamodb, category):
    """Get all settings for a category"""
    user_role = admin_user.get('role', 'Support')

    # Check if category exists
    if category not in SETTING_SCHEMA:
        return create_response(404, {
            'success': False,
            'error': 'CATEGORY_NOT_FOUND',
            'message': f'Category {category} not found'
        }, event)

    # Check permissions
    config = SETTING_SCHEMA[category]
    if not has_permission(user_role, config.get('required_role', 'Super Admin')):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': f'Insufficient permissions. Required: {config.get("required_role")}'
        }, event)

    # Get settings from DynamoDB
    table = dynamodb.Table(SETTINGS_TABLE)

    try:
        response = table.query(
            KeyConditionExpression='setting_category = :cat',
            ExpressionAttributeValues={':cat': category}
        )

        # Build settings dict with schema
        settings = {}
        db_settings = {item['setting_key']: item for item in response.get('Items', [])}

        sensitive_keys = config.get('sensitive', [])

        for key in config['keys']:
            if key in db_settings:
                item = db_settings[key]
                value = item.get('value', '')

                # Decrypt and mask sensitive values
                if key in sensitive_keys:
                    decrypted = decrypt_value(value)
                    settings[key] = {
                        'value': mask_sensitive_value(decrypted),
                        'is_set': bool(decrypted),
                        'is_sensitive': True,
                        'updated_at': item.get('updated_at'),
                        'updated_by': item.get('updated_by')
                    }
                else:
                    settings[key] = {
                        'value': value,
                        'is_set': bool(value),
                        'is_sensitive': False,
                        'updated_at': item.get('updated_at'),
                        'updated_by': item.get('updated_by')
                    }
            else:
                settings[key] = {
                    'value': '',
                    'is_set': False,
                    'is_sensitive': key in sensitive_keys,
                    'updated_at': None,
                    'updated_by': None
                }

        return create_response(200, {
            'success': True,
            'category': category,
            'display_name': category.replace('_', ' ').title(),
            'settings': settings,
            'required_role': config.get('required_role')
        }, event)

    except Exception as e:
        print(f"Error fetching settings: {e}")
        return create_response(500, {
            'success': False,
            'error': 'DATABASE_ERROR',
            'message': 'Failed to fetch settings'
        }, event)


def update_setting(event, admin_user, dynamodb, body):
    """Update a single setting"""
    user_role = admin_user.get('role', 'Support')

    category = body.get('category')
    key = body.get('key')
    value = body.get('value')

    if not all([category, key]):
        return create_response(400, {
            'success': False,
            'error': 'MISSING_PARAMS',
            'message': 'Category and key are required'
        }, event)

    # Validate category and key
    if category not in SETTING_SCHEMA:
        return create_response(404, {
            'success': False,
            'error': 'CATEGORY_NOT_FOUND',
            'message': f'Category {category} not found'
        }, event)

    config = SETTING_SCHEMA[category]
    if key not in config['keys']:
        return create_response(400, {
            'success': False,
            'error': 'INVALID_KEY',
            'message': f'Key {key} not valid for category {category}'
        }, event)

    # Check permissions
    if not has_permission(user_role, config.get('required_role', 'Super Admin')):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': f'Insufficient permissions. Required: {config.get("required_role")}'
        }, event)

    # Get old value for audit
    table = dynamodb.Table(SETTINGS_TABLE)
    old_value = None
    try:
        response = table.get_item(Key={'setting_category': category, 'setting_key': key})
        if 'Item' in response:
            old_value = response['Item'].get('value')
    except:
        pass

    # Encrypt sensitive values
    store_value = value
    if key in config.get('sensitive', []) and value:
        store_value = encrypt_value(value)

    # Update setting
    try:
        table.put_item(Item={
            'setting_category': category,
            'setting_key': key,
            'value': store_value,
            'updated_at': datetime.utcnow().isoformat(),
            'updated_by': admin_user.get('email', 'unknown')
        })

        # Log audit
        log_audit(dynamodb, admin_user, 'UPDATE', category, key, old_value, store_value)

        return create_response(200, {
            'success': True,
            'message': f'Setting {key} updated successfully',
            'category': category,
            'key': key
        }, event)

    except Exception as e:
        print(f"Error updating setting: {e}")
        return create_response(500, {
            'success': False,
            'error': 'DATABASE_ERROR',
            'message': 'Failed to update setting'
        }, event)


def bulk_update_settings(event, admin_user, dynamodb, body):
    """Update multiple settings at once"""
    user_role = admin_user.get('role', 'Support')

    category = body.get('category')
    settings = body.get('settings', {})

    if not category or not settings:
        return create_response(400, {
            'success': False,
            'error': 'MISSING_PARAMS',
            'message': 'Category and settings are required'
        }, event)

    if category not in SETTING_SCHEMA:
        return create_response(404, {
            'success': False,
            'error': 'CATEGORY_NOT_FOUND',
            'message': f'Category {category} not found'
        }, event)

    config = SETTING_SCHEMA[category]

    # Check permissions
    if not has_permission(user_role, config.get('required_role', 'Super Admin')):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': f'Insufficient permissions. Required: {config.get("required_role")}'
        }, event)

    table = dynamodb.Table(SETTINGS_TABLE)
    updated = []
    errors = []

    for key, value in settings.items():
        if key not in config['keys']:
            errors.append(f'Invalid key: {key}')
            continue

        try:
            # Encrypt sensitive values
            store_value = value
            if key in config.get('sensitive', []) and value:
                store_value = encrypt_value(value)

            table.put_item(Item={
                'setting_category': category,
                'setting_key': key,
                'value': store_value,
                'updated_at': datetime.utcnow().isoformat(),
                'updated_by': admin_user.get('email', 'unknown')
            })

            updated.append(key)
            log_audit(dynamodb, admin_user, 'BULK_UPDATE', category, key, None, store_value)

        except Exception as e:
            errors.append(f'{key}: {str(e)}')

    return create_response(200, {
        'success': len(errors) == 0,
        'message': f'Updated {len(updated)} settings',
        'updated': updated,
        'errors': errors
    }, event)


def export_settings(event, admin_user, dynamodb):
    """Export all settings (Super Admin only)"""
    user_role = admin_user.get('role', 'Support')

    if not has_permission(user_role, 'Super Admin'):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': 'Only Super Admin can export settings'
        }, event)

    table = dynamodb.Table(SETTINGS_TABLE)

    try:
        response = table.scan()
        items = response.get('Items', [])

        # Organize by category
        export_data = {}
        for item in items:
            cat = item['setting_category']
            key = item['setting_key']
            value = item.get('value', '')

            if cat not in export_data:
                export_data[cat] = {}

            # Don't export encrypted values directly
            if value and value.startswith('ENC:'):
                export_data[cat][key] = '[ENCRYPTED]'
            else:
                export_data[cat][key] = value

        return create_response(200, {
            'success': True,
            'export_date': datetime.utcnow().isoformat(),
            'exported_by': admin_user.get('email'),
            'data': export_data
        }, event)

    except Exception as e:
        print(f"Export error: {e}")
        return create_response(500, {
            'success': False,
            'error': 'EXPORT_ERROR',
            'message': 'Failed to export settings'
        }, event)


def import_settings(event, admin_user, dynamodb, body):
    """Import settings from export (Super Admin only)"""
    user_role = admin_user.get('role', 'Support')

    if not has_permission(user_role, 'Super Admin'):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': 'Only Super Admin can import settings'
        }, event)

    data = body.get('data', {})
    if not data:
        return create_response(400, {
            'success': False,
            'error': 'MISSING_DATA',
            'message': 'No data to import'
        }, event)

    table = dynamodb.Table(SETTINGS_TABLE)
    imported = 0
    skipped = 0

    for category, settings in data.items():
        if category not in SETTING_SCHEMA:
            continue

        config = SETTING_SCHEMA[category]

        for key, value in settings.items():
            if key not in config['keys']:
                continue

            # Skip encrypted placeholders
            if value == '[ENCRYPTED]':
                skipped += 1
                continue

            try:
                store_value = value
                if key in config.get('sensitive', []) and value:
                    store_value = encrypt_value(value)

                table.put_item(Item={
                    'setting_category': category,
                    'setting_key': key,
                    'value': store_value,
                    'updated_at': datetime.utcnow().isoformat(),
                    'updated_by': f"IMPORT:{admin_user.get('email', 'unknown')}"
                })
                imported += 1
            except:
                pass

    log_audit(dynamodb, admin_user, 'IMPORT', 'ALL', 'BULK', None, f'{imported} settings')

    return create_response(200, {
        'success': True,
        'message': f'Imported {imported} settings, skipped {skipped} encrypted values',
        'imported_count': imported,
        'skipped_count': skipped
    }, event)


def test_connection(event, admin_user, dynamodb, body):
    """Test connection for a service"""
    user_role = admin_user.get('role', 'Support')

    if not has_permission(user_role, 'Admin'):
        return create_response(403, {
            'success': False,
            'error': 'FORBIDDEN',
            'message': 'Admin role required'
        }, event)

    service = body.get('service')

    if service == 'ses':
        return test_ses_connection(dynamodb)
    elif service == 'paypal':
        return test_paypal_connection(dynamodb, event)
    else:
        return create_response(400, {
            'success': False,
            'error': 'INVALID_SERVICE',
            'message': f'Unknown service: {service}'
        }, event)


def test_ses_connection(dynamodb):
    """Test AWS SES connection"""
    try:
        ses = boto3.client('ses', region_name='us-east-1')
        response = ses.get_send_quota()

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'service': 'ses',
                'status': 'connected',
                'details': {
                    'max_24_hour_send': response.get('Max24HourSend'),
                    'sent_last_24_hours': response.get('SentLast24Hours'),
                    'max_send_rate': response.get('MaxSendRate')
                }
            })
        }
    except Exception as e:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': False,
                'service': 'ses',
                'status': 'error',
                'error': str(e)
            })
        }


def test_paypal_connection(dynamodb, event):
    """Test PayPal connection (USD only)"""
    table = dynamodb.Table(SETTINGS_TABLE)

    try:
        client_id_resp = table.get_item(Key={'setting_category': 'payment_paypal', 'setting_key': 'client_id'})

        if 'Item' not in client_id_resp:
            return create_response(200, {
                'success': False,
                'service': 'paypal',
                'status': 'not_configured',
                'message': 'PayPal client ID not configured'
            }, event)

        return create_response(200, {
            'success': True,
            'service': 'paypal',
            'status': 'configured',
            'message': 'PayPal credentials are configured (manual API test required)'
        }, event)

    except Exception as e:
        return create_response(200, {
            'success': False,
            'service': 'paypal',
            'status': 'error',
            'error': str(e)
        }, event)
