import json
import boto3
import hashlib
import jwt
import uuid
import os
import base64
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from decimal import Decimal

# =============================================================================
# CROSS-REGION CONFIGURATION
# =============================================================================
# CRITICAL: All authentication and data tables are in us-east-1 ONLY
# This is the SINGLE SOURCE OF TRUTH for all user data
# India Lambda functions access US resources via cross-region calls
# This prevents data inconsistency and simplifies management

AUTH_REGION = 'us-east-1'  # Primary region for all auth/user data
SES_REGION = 'us-east-1'   # SES is only configured in us-east-1

# DynamoDB Tables (all in us-east-1)
USERS_TABLE = 'aivedha-guardian-users'
SESSIONS_TABLE = 'aivedha-user-sessions'
SETTINGS_TABLE = 'admin-system-settings'

# Default values
FREE_CREDITS = 3  # Free credits for new users

# =============================================================================
# SINGLETON CLIENTS - Always connect to us-east-1
# =============================================================================
_dynamodb_resource = None
_ses_client = None
_secrets_client = None

def get_dynamodb():
    """
    Get DynamoDB resource singleton - ALWAYS connects to us-east-1.
    This ensures all user data is in one region (single source of truth).
    """
    global _dynamodb_resource
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource('dynamodb', region_name=AUTH_REGION)
    return _dynamodb_resource


def get_ses_client():
    """
    Get SES client singleton - ALWAYS connects to us-east-1.
    SES verified domain and sender are only in us-east-1.
    """
    global _ses_client
    if _ses_client is None:
        _ses_client = boto3.client('ses', region_name=SES_REGION)
    return _ses_client


def get_secrets_client():
    """
    Get Secrets Manager client - ALWAYS connects to us-east-1.
    All secrets (JWT, OAuth credentials) are stored in us-east-1.
    """
    global _secrets_client
    if _secrets_client is None:
        _secrets_client = boto3.client('secretsmanager', region_name=AUTH_REGION)
    return _secrets_client


# =============================================================================
# EMAIL FUNCTIONS
# =============================================================================

def send_email_via_ses(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send email via Amazon SES (always us-east-1)."""
    try:
        ses = get_ses_client()
        response = ses.send_email(
            Source='AiVedha Guard <noreply@aivedha.ai>',
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        print(f"Email sent to {to_email}: {response.get('MessageId')}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False


# Multi-language email templates for login alerts
LOGIN_EMAIL_TEMPLATES = {
    'en': {
        'subject': '🔐 Security Alert: New login to your AiVedha Guard account',
        'header': 'Security Alert',
        'subheader': 'New login detected on your account',
        'greeting': 'Hello',
        'message': 'We detected a new login to your AiVedha Guard account. For your security, please review the details below.',
        'time_label': 'Time',
        'ip_label': 'IP Address',
        'device_label': 'Device',
        'location_label': 'Location',
        'was_you': 'Was this you?',
        'was_you_yes': 'If yes, you can safely ignore this email. Your account is secure.',
        'not_you': 'Not you?',
        'not_you_action': 'If you did not perform this login, please secure your account immediately by changing your password and contact our support team.',
        'support_text': 'Need help? Contact us at',
        'footer': 'AiVedha Guard - Enterprise Security Platform',
        'copyright': '© 2025 Aivibe Software Services Pvt Ltd. All rights reserved.'
    }
}

# Country to language mapping
COUNTRY_LANGUAGE_MAP = {
    'IN': 'en', 'IND': 'en', 'US': 'en', 'USA': 'en', 'GB': 'en', 'UK': 'en',
    'AU': 'en', 'CA': 'en', 'NZ': 'en', 'IE': 'en', 'SG': 'en'
}


def get_language_from_location(country_code: str = None, user_location: str = None) -> str:
    """Get language code based on country. Default to English."""
    if country_code:
        return COUNTRY_LANGUAGE_MAP.get(country_code.upper().strip(), 'en')
    return 'en'


def generate_login_alert_html(template: dict, user_name: str, login_time: str, login_ip: str, login_device: str, login_location: str = "Unknown") -> str:
    """Generate HTML email for login alert."""
    name = user_name or 'Valued User'
    return f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f0f4f8; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
<div style="background: linear-gradient(135deg, #1e3a8a, #0ea5e9); padding: 30px; text-align: center; color: white;">
<h1>🛡️ {template['header']}</h1>
<p>{template['subheader']}</p>
</div>
<div style="padding: 30px;">
<h2>{template['greeting']}, {name}!</h2>
<p>{template['message']}</p>
<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
<p><strong>{template['time_label']}:</strong> {login_time}</p>
<p><strong>{template['ip_label']}:</strong> {login_ip}</p>
<p><strong>{template['device_label']}:</strong> {login_device}</p>
<p><strong>{template['location_label']}:</strong> {login_location}</p>
</div>
<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
<p>✅ <strong>{template['was_you']}</strong></p>
<p>{template['was_you_yes']}</p>
</div>
<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
<p>⚠️ <strong>{template['not_you']}</strong></p>
<p>{template['not_you_action']}</p>
</div>
<p style="text-align: center; color: #666;">{template['support_text']} <a href="mailto:support@aivedha.ai">support@aivedha.ai</a></p>
</div>
<div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af;">
<p>{template['footer']}</p>
<p style="font-size: 12px;">{template['copyright']}</p>
</div>
</div>
</body></html>'''


def send_login_alert_email(user_email: str, user_name: str, login_time: str, login_ip: str = "Unknown", login_device: str = "Unknown", country_code: str = None, login_location: str = "Unknown"):
    """Send login security alert email."""
    try:
        lang = get_language_from_location(country_code, login_location)
        template = LOGIN_EMAIL_TEMPLATES.get(lang, LOGIN_EMAIL_TEMPLATES['en'])
        subject = template['subject']
        html_body = generate_login_alert_html(template, user_name, login_time, login_ip, login_device, login_location)
        text_body = f"{template['header']}\n\n{template['greeting']}, {user_name or 'Valued User'}!\n\n{template['message']}\n\n{template['time_label']}: {login_time}\n{template['ip_label']}: {login_ip}\n{template['device_label']}: {login_device}\n{template['location_label']}: {login_location}"
        result = send_email_via_ses(user_email, subject, html_body, text_body)
        print(f"Login alert sent to {user_email}")
        return result
    except Exception as e:
        print(f"Failed to send login alert: {str(e)}")
        return False


def send_welcome_email(user_email: str, user_name: str, credits: int = 3):
    """Send welcome email to new users."""
    try:
        subject = f"🎁 Welcome to AiVedha Guard - {credits} Free Security Audits Await!"
        html_body = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
<div style="background: linear-gradient(135deg, #1e40af, #0ea5e9); padding: 24px; text-align: center; color: white;">
<h1>🛡️ Welcome to AiVedha Guard!</h1>
</div>
<div style="padding: 24px;">
<h2>Hello {user_name or 'there'}! 👋</h2>
<p>Thank you for joining AiVedha Guard!</p>
<div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
<div style="font-size: 48px;">🎁</div>
<h3 style="color: #166534;">Your Welcome Gift!</h3>
<div style="background: white; border-radius: 8px; padding: 16px; display: inline-block;">
<span style="font-size: 36px; font-weight: 700; color: #10b981;">{credits}</span>
<span style="display: block; color: #6b7280;">Free Audit Credits</span>
</div>
</div>
<div style="text-align: center; margin: 24px 0;">
<a href="https://aivedha.ai/security-audit" style="background: linear-gradient(135deg, #1e40af, #0ea5e9); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">🔍 Start Your First Audit</a>
</div>
</div>
<div style="background: #1f2937; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
<p>© 2025 Aivibe Software Services Pvt Ltd</p>
</div>
</div>
</body></html>'''
        text_body = f"Welcome to AiVedha Guard!\n\nHello {user_name or 'there'},\n\nYou've received {credits} FREE AUDIT CREDITS!\n\nStart your first audit: https://aivedha.ai/security-audit"
        return send_email_via_ses(user_email, subject, html_body, text_body)
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")
        return False


# =============================================================================
# JWT SECRET MANAGEMENT
# =============================================================================

def get_jwt_secret():
    """
    Get JWT secret from DynamoDB config or environment variable.
    Always reads from us-east-1 where config is stored.
    """
    # First try DynamoDB settings table (us-east-1)
    try:
        dynamodb = get_dynamodb()
        table = dynamodb.Table(SETTINGS_TABLE)
        response = table.get_item(
            Key={'setting_category': 'jwt', 'setting_key': 'user_jwt_secret'}
        )
        if 'Item' in response:
            value = response['Item'].get('value', '')
            if value and value.startswith('ENC:'):
                try:
                    encoded = value.replace('ENC:', '')
                    return base64.b64decode(encoded).decode()
                except:
                    pass
            elif value:
                return value
    except Exception as e:
        print(f"Config lookup error (DynamoDB): {e}")

    # Fall back to environment variable
    return os.environ.get('JWT_SECRET', os.environ.get('USER_JWT_SECRET'))


# =============================================================================
# CORS CONFIGURATION
# =============================================================================

ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://admin.aivedha.ai',
    'http://localhost:8080',
    'http://localhost:5173'
]


def get_cors_origin(event):
    """Get CORS origin if it's in the allowed list."""
    headers = event.get('headers', {}) or {}
    for key, value in headers.items():
        if key.lower() == 'origin' and value in ALLOWED_ORIGINS:
            return value
    return 'https://aivedha.ai'


# =============================================================================
# MAIN LAMBDA HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    AWS Lambda function for user authentication.
    
    CROSS-REGION ARCHITECTURE:
    - This Lambda can be deployed in ANY region (us-east-1 or ap-south-1)
    - ALL data operations go to us-east-1 (single source of truth)
    - India API Gateway -> India Lambda -> US DynamoDB (cross-region)
    - This ensures data consistency and prevents split-brain issues
    """
    # Get JWT secret (from us-east-1 DynamoDB or environment)
    JWT_SECRET = get_jwt_secret()
    if not JWT_SECRET:
        print("CRITICAL: JWT_SECRET not configured")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Server configuration error'})
        }

    # CORS headers
    cors_origin = get_cors_origin(event)
    cors_headers = {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

    # Get DynamoDB resource (always us-east-1)
    dynamodb = get_dynamodb()

    # Handle API Gateway request
    if 'httpMethod' in event or 'requestContext' in event:
        return handle_api_gateway_request(event, dynamodb, cors_headers)

    # Direct Lambda invocation
    action = event.get('action')
    result = handle_action(action, event, dynamodb)
    return result


def handle_api_gateway_request(event, dynamodb, cors_headers):
    """Handle requests from API Gateway."""
    http_method = event.get('httpMethod', 'POST')
    path = event.get('path', '')

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    # Parse request body
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event.get('body', '{}'))
        except:
            body = {}

    # Determine action from path
    action = None
    if '/auth/login' in path:
        action = 'login'
    elif '/auth/register' in path:
        action = 'register'
    elif '/auth/google' in path:
        action = 'google_auth'
    elif '/auth/verify' in path:
        action = 'verify_token'
    elif '/auth/logout' in path:
        action = 'logout'
    elif '/auth/reset-password' in path:
        action = 'reset_password'
    else:
        action = body.get('action')

    if not action:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid endpoint or action'})
        }

    result = handle_action(action, body, dynamodb)
    if 'headers' not in result:
        result['headers'] = {}
    result['headers'].update(cors_headers)
    return result


def handle_action(action, event, dynamodb):
    """Route to appropriate handler based on action."""
    handlers = {
        'register': register_user,
        'login': login_user,
        'google_auth': google_auth,
        'verify_token': verify_token,
        'logout': logout_user,
        'reset_password': reset_password,
        'startup_register': startup_register,
        'update_profile': update_user_profile,
    }
    handler = handlers.get(action)
    if handler:
        return handler(event, dynamodb)
    return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid action'})}


# =============================================================================
# USER OPERATIONS (All use us-east-1 DynamoDB)
# =============================================================================

def register_user(event, dynamodb):
    """Register a new user."""
    try:
        email = event.get('email')
        password = event.get('password')
        full_name = event.get('fullName') or event.get('full_name', '')

        if not all([email, password]):
            return {'statusCode': 400, 'body': json.dumps({'error': 'Email and password are required'})}

        if '@' not in email or '.' not in email:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid email format'})}

        users_table = dynamodb.Table(USERS_TABLE)

        # Check if user exists (GSI query)
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if response.get('Items'):
            existing = response['Items'][0]
            if existing.get('status', 'active') == 'active' and existing.get('account_status', 'active') not in ['deleted', 'inactive']:
                return {'statusCode': 409, 'body': json.dumps({'error': 'User already exists'})}

        # Create user
        user_id = f"email-{str(uuid.uuid4())[:8]}"
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        user_data = {
            'user_id': user_id,
            'email': email,
            'password_hash': password_hash,
            'fullName': full_name,
            'credits': FREE_CREDITS,
            'plan': 'Free',
            'subscription_plan': 'aarambh_free',
            'aarambh_credits_claimed': True,
            'aarambh_claimed_at': datetime.utcnow().isoformat(),
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'last_login': datetime.utcnow().isoformat(),
            'total_audits': 0,
            'login_method': 'email'
        }

        users_table.put_item(Item=user_data)
        token = generate_token(user_id, email)

        # Send welcome email (non-blocking)
        try:
            send_welcome_email(email, full_name, FREE_CREDITS)
        except:
            pass

        return {
            'statusCode': 201,
            'body': json.dumps({
                'success': True,
                'message': 'User registered successfully',
                'user': {'user_id': user_id, 'email': email, 'fullName': full_name, 'credits': FREE_CREDITS, 'plan': 'Free'},
                'token': token,
                'isNewUser': True
            })
        }
    except Exception as e:
        print(f"Registration error: {type(e).__name__}: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Registration failed. Please try again.'})}


def login_user(event, dynamodb):
    """Login user with email and password."""
    try:
        email = event.get('email')
        password = event.get('password')

        if not all([email, password]):
            return {'statusCode': 400, 'body': json.dumps({'error': 'Email and password are required'})}

        users_table = dynamodb.Table(USERS_TABLE)

        # Find user by email (GSI query)
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if not response.get('Items'):
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid email or password'})}

        user = response['Items'][0]
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        if user.get('password_hash') != password_hash:
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid email or password'})}

        # Check account status
        if user.get('status') == 'inactive' or user.get('account_status') in ['deleted', 'inactive']:
            return {'statusCode': 403, 'body': json.dumps({'error': 'Account has been deleted'})}

        # Update last login
        login_time = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        login_ip = event.get('sourceIp', event.get('ip', 'Unknown'))
        login_device = event.get('userAgent', event.get('device', 'Web Browser'))

        users_table.update_item(
            Key={'user_id': user['user_id']},
            UpdateExpression='SET last_login = :last_login, login_count = if_not_exists(login_count, :zero) + :one',
            ExpressionAttributeValues={':last_login': datetime.utcnow().isoformat(), ':zero': 0, ':one': 1}
        )

        token = generate_token(user['user_id'], email)
        credits = int(user.get('credits', 0)) if isinstance(user.get('credits'), Decimal) else user.get('credits', 0)

        # Send login alert (non-blocking)
        try:
            send_login_alert_email(email, user.get('fullName', ''), login_time, login_ip, login_device)
        except:
            pass

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'fullName': user.get('fullName', ''),
                    'credits': credits,
                    'plan': user.get('plan', 'Free'),
                    'picture': user.get('picture', user.get('avatar', ''))
                },
                'token': token
            })
        }
    except Exception as e:
        print(f"Login error: {type(e).__name__}: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Login failed. Please try again.'})}


def google_auth(event, dynamodb):
    """Handle Google OAuth authentication."""
    try:
        email = event.get('email')
        full_name = event.get('fullName')
        google_id = event.get('googleId')
        picture = event.get('picture')
        identity_id = event.get('identityId')

        if not email:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Email is required'})}

        users_table = dynamodb.Table(USERS_TABLE)
        login_time = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        login_ip = event.get('sourceIp', event.get('ip', 'Unknown'))
        login_device = event.get('userAgent', event.get('device', 'Google Sign-In'))

        # Find existing user
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        existing_user = None
        if response.get('Items'):
            for item in response['Items']:
                if item.get('status', 'active') == 'active' and item.get('account_status', 'active') not in ['deleted', 'inactive']:
                    existing_user = item
                    break

        if existing_user:
            user = existing_user
            user_id = user.get('user_id')

            # Check for Google ID conflict
            if user.get('googleId') and user.get('googleId') != google_id:
                return {
                    'statusCode': 409,
                    'body': json.dumps({
                        'error': 'Email already registered',
                        'message': 'This email is already registered with a different Google account.'
                    })
                }

            # Update user
            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET googleId = :gid, picture = :pic, fullName = :name, last_login = :login, identityId = :iid, login_method = :method, login_count = if_not_exists(login_count, :zero) + :one',
                ExpressionAttributeValues={
                    ':gid': google_id, ':pic': picture, ':name': full_name,
                    ':login': datetime.utcnow().isoformat(), ':iid': identity_id,
                    ':method': 'google', ':zero': 0, ':one': 1
                }
            )

            credits = int(user.get('credits', 0)) if isinstance(user.get('credits'), Decimal) else user.get('credits', 0)

            try:
                send_login_alert_email(email, full_name or user.get('fullName', ''), login_time, login_ip, login_device)
            except:
                pass

            return {
                'statusCode': 200,
                'body': json.dumps({'success': True, 'isNewUser': False, 'credits': credits, 'plan': user.get('plan', 'Aarambh')})
            }
        else:
            # New user
            user_id = f"google-{email.split('@')[0]}"
            now = datetime.utcnow().isoformat()

            users_table.put_item(Item={
                'user_id': user_id,
                'email': email,
                'fullName': full_name,
                'googleId': google_id,
                'picture': picture,
                'identityId': identity_id,
                'credits': FREE_CREDITS,
                'plan': 'Aarambh',
                'subscription_plan': 'aarambh_free',
                'aarambh_credits_claimed': True,
                'aarambh_claimed_at': now,
                'status': 'active',
                'created_at': now,
                'last_login': now,
                'login_method': 'google',
                'login_count': 1
            })

            try:
                send_welcome_email(email, full_name, FREE_CREDITS)
            except:
                pass

            return {
                'statusCode': 201,
                'body': json.dumps({'success': True, 'isNewUser': True, 'credits': FREE_CREDITS, 'plan': 'Aarambh'})
            }
    except Exception as e:
        print(f"Google auth error: {type(e).__name__}: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Google authentication failed. Please try again.'})}


def verify_token(event, dynamodb):
    """Verify JWT token."""
    try:
        token = event.get('token')
        if not token:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Token is required'})}

        jwt_secret = get_jwt_secret()
        if not jwt_secret:
            return {'statusCode': 500, 'body': json.dumps({'error': 'Server configuration error'})}

        try:
            decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return {'statusCode': 401, 'body': json.dumps({'error': 'Token has expired'})}
        except jwt.InvalidTokenError:
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid token'})}

        user_id = decoded.get('user_id')
        users_table = dynamodb.Table(USERS_TABLE)
        response = users_table.get_item(Key={'user_id': user_id})

        if 'Item' not in response:
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}

        user = response['Item']
        credits = int(user.get('credits', 0)) if isinstance(user.get('credits'), Decimal) else user.get('credits', 0)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'valid': True,
                'user_id': user['user_id'],
                'email': user['email'],
                'fullName': user.get('fullName', ''),
                'credits': credits,
                'plan': user.get('plan', 'Free')
            })
        }
    except Exception as e:
        print(f"Token verification error: {type(e).__name__}: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Token verification failed'})}


def logout_user(event, dynamodb):
    """Logout user."""
    return {'statusCode': 200, 'body': json.dumps({'success': True, 'message': 'Logout successful'})}


def reset_password(event, dynamodb):
    """Reset user password."""
    try:
        email = event.get('email')
        new_password = event.get('newPassword') or event.get('new_password')

        if not all([email, new_password]):
            return {'statusCode': 400, 'body': json.dumps({'error': 'Email and new password are required'})}

        users_table = dynamodb.Table(USERS_TABLE)
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if not response.get('Items'):
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}

        user = response['Items'][0]
        new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()

        users_table.update_item(
            Key={'user_id': user['user_id']},
            UpdateExpression='SET password_hash = :ph, updated_at = :ua',
            ExpressionAttributeValues={':ph': new_password_hash, ':ua': datetime.utcnow().isoformat()}
        )

        return {'statusCode': 200, 'body': json.dumps({'success': True, 'message': 'Password reset successful'})}
    except Exception as e:
        print(f"Password reset error: {type(e).__name__}: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Password reset failed. Please try again.'})}


def update_user_profile(event, dynamodb):
    """Update user profile."""
    try:
        user_id = event.get('userId') or event.get('user_id')
        if not user_id:
            return {'statusCode': 400, 'body': json.dumps({'success': False, 'error': 'User ID is required'})}

        users_table = dynamodb.Table(USERS_TABLE)
        update_parts = []
        expression_values = {}
        expression_names = {}

        simple_fields = ['fullName', 'phone', 'category', 'orgName', 'gstin', 'pan']
        for field in simple_fields:
            if field in event and event[field] is not None:
                update_parts.append(f"#{field} = :{field}")
                expression_values[f":{field}"] = event[field]
                expression_names[f"#{field}"] = field

        nested_fields = ['address', 'employment', 'organization']
        for field in nested_fields:
            if field in event and event[field]:
                update_parts.append(f"#{field} = :{field}")
                expression_values[f":{field}"] = event[field]
                expression_names[f"#{field}"] = field

        update_parts.append("#updatedAt = :updatedAt")
        expression_values[":updatedAt"] = datetime.utcnow().isoformat()
        expression_names["#updatedAt"] = "updated_at"

        if len(update_parts) <= 1:
            return {'statusCode': 400, 'body': json.dumps({'success': False, 'error': 'No fields to update'})}

        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names
        )

        return {'statusCode': 200, 'body': json.dumps({'success': True, 'message': 'Profile updated successfully'})}
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'success': False, 'error': str(e)})}


def startup_register(event, dynamodb):
    """Register a startup with special benefits."""
    try:
        email = event.get('email')
        founder_name = event.get('founderName') or event.get('founder_name', '')
        startup_name = event.get('startupName') or event.get('startup_name', '')
        coupon_code = event.get('couponCode') or event.get('coupon_code', '')

        if not email or not founder_name or not startup_name:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Email, founder name, and startup name are required'})}

        users_table = dynamodb.Table(USERS_TABLE)
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        now = datetime.utcnow()
        coupon_expiry = (now + timedelta(days=365)).isoformat()

        existing_user = None
        if response.get('Items'):
            for item in response['Items']:
                if item.get('status', 'active') == 'active' and item.get('account_status', 'active') != 'deleted':
                    existing_user = item
                    break

        if existing_user:
            user_id = existing_user.get('user_id')
            current_credits = int(existing_user.get('credits', 0))

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET credits = :credits, startup_name = :sn, startup_coupon = :coupon, startup_coupon_expiry = :expiry, is_startup = :is, updated_at = :updated',
                ExpressionAttributeValues={
                    ':credits': current_credits + 3, ':sn': startup_name, ':coupon': coupon_code,
                    ':expiry': coupon_expiry, ':is': True, ':updated': now.isoformat()
                }
            )
        else:
            user_id = str(uuid.uuid4())
            users_table.put_item(Item={
                'user_id': user_id, 'email': email, 'full_name': founder_name,
                'status': 'active', 'credits': 3, 'plan': 'aarambh',
                'startup_name': startup_name, 'startup_coupon': coupon_code,
                'startup_coupon_expiry': coupon_expiry, 'is_startup': True,
                'created_at': now.isoformat(), 'updated_at': now.isoformat()
            })

        return {
            'statusCode': 200,
            'body': json.dumps({'success': True, 'message': 'Startup registered successfully', 'couponCode': coupon_code, 'couponExpiry': coupon_expiry, 'credits': 3})
        }
    except Exception as e:
        print(f"Startup registration error: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Startup registration failed. Please try again.'})}


def generate_token(user_id, email):
    """Generate JWT token."""
    jwt_secret = get_jwt_secret()
    token_data = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(token_data, jwt_secret, algorithm='HS256')
