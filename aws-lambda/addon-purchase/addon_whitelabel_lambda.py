"""
AiVedha Guard - White Label Certificate Lambda Function
Version: 2.0.0 - PayPal USD Only

This Lambda function handles white label certificate functionality:
1. Validates user subscription and addon status (DynamoDB)
2. Stores/retrieves white label configurations
3. Applies branding to audit reports when domain matches
4. Manages white label domain registrations

Environment Variables:
- DYNAMODB_WHITELABEL_TABLE: DynamoDB table for white label configs
- DYNAMODB_USERS_TABLE: DynamoDB table for users
- DYNAMODB_SUBSCRIPTIONS_TABLE: DynamoDB table for subscriptions
- S3_REPORTS_BUCKET: S3 bucket for audit reports
"""

import json
import os
import logging
import boto3
import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlparse

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

# Environment variables
WHITELABEL_TABLE = os.environ.get('DYNAMODB_WHITELABEL_TABLE', 'aivedha_whitelabel')
USERS_TABLE = os.environ.get('DYNAMODB_USERS_TABLE', 'aivedha_users')
SUBSCRIPTIONS_TABLE = os.environ.get('DYNAMODB_SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
S3_REPORTS_BUCKET = os.environ.get('S3_REPORTS_BUCKET', 'aivedha-reports')

# Paid plan IDs (addons only for paid users)
PAID_PLANS = ['raksha', 'suraksha', 'vajra', 'chakra']


# ============================================================================
# ADDON VERIFICATION (DynamoDB - PayPal USD Only)
# ============================================================================

def has_active_whitelabel_addon(user_id: str) -> Tuple[bool, Optional[str]]:
    """
    Check if user has active White Label addon via DynamoDB.
    Returns (has_addon, expires_at).
    """
    try:
        subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)

        # Query subscriptions for this user
        response = subscriptions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':uid': user_id,
                ':active': 'active'
            }
        )

        for sub in response.get('Items', []):
            addons = sub.get('addons', [])
            if isinstance(addons, list):
                if 'whitelabel' in addons or 'whitelabel_cert' in addons:
                    return True, sub.get('expires_at')

            # Also check addon_subscriptions field
            addon_subs = sub.get('addon_subscriptions', [])
            for addon in addon_subs:
                addon_id = addon.get('addon_id', '') if isinstance(addon, dict) else addon
                if addon_id in ['whitelabel', 'whitelabel_cert']:
                    return True, addon.get('expires_at') if isinstance(addon, dict) else sub.get('expires_at')

        return False, None

    except Exception as e:
        logger.error(f"Error checking whitelabel addon: {e}")
        return False, None


# ============================================================================
# DOMAIN VALIDATION
# ============================================================================

def extract_domain(url_or_domain: str) -> str:
    """Extract clean domain from URL or domain string."""
    # Remove protocol if present
    cleaned = url_or_domain.strip().lower()
    cleaned = re.sub(r'^https?://', '', cleaned)
    cleaned = re.sub(r'^www\.', '', cleaned)
    
    # Get just the domain part
    domain = cleaned.split('/')[0].split(':')[0]
    
    return domain


def validate_domain(domain: str) -> Tuple[bool, str]:
    """Validate domain format."""
    if not domain:
        return False, "Domain is required"
    
    # Domain pattern
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$'
    
    if not re.match(pattern, domain):
        return False, "Invalid domain format"
    
    # Check for reserved domains
    reserved = ['aivedha.ai', 'aivedha.com', 'aivedha.in', 'localhost']
    if domain in reserved:
        return False, "This domain cannot be white-labeled"
    
    return True, "Valid domain"


def validate_brand_name(name: str) -> Tuple[bool, str]:
    """Validate brand name."""
    if not name or not name.strip():
        return False, "Brand name is required"
    
    name = name.strip()
    
    if len(name) < 2:
        return False, "Brand name must be at least 2 characters"
    
    if len(name) > 50:
        return False, "Brand name must be less than 50 characters"
    
    # Allow letters, numbers, spaces, and common brand characters
    pattern = r'^[a-zA-Z0-9\s\-_.&]+$'
    if not re.match(pattern, name):
        return False, "Brand name contains invalid characters"
    
    return True, "Valid brand name"


# ============================================================================
# DYNAMODB OPERATIONS
# ============================================================================

def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user from DynamoDB."""
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        response = table.get_item(Key={'user_id': user_id})
        return response.get('Item')
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        return None




def is_paid_plan_user(user_id: str) -> bool:
    """Check if user is on a paid plan."""
    user = get_user(user_id)
    if not user:
        return False
    return user.get('current_plan_id', '') in PAID_PLANS


def get_whitelabel_config(user_id: str) -> Optional[Dict[str, Any]]:
    """Get white label configuration for a user."""
    table = dynamodb.Table(WHITELABEL_TABLE)
    
    try:
        response = table.get_item(Key={'user_id': user_id})
        return response.get('Item')
    except Exception as e:
        logger.error(f"Error getting whitelabel config: {str(e)}")
        return None


def get_whitelabel_by_domain(domain: str) -> Optional[Dict[str, Any]]:
    """Get white label configuration by domain."""
    table = dynamodb.Table(WHITELABEL_TABLE)
    
    try:
        response = table.query(
            IndexName='domain-index',
            KeyConditionExpression='domain = :domain',
            ExpressionAttributeValues={':domain': domain}
        )
        items = response.get('Items', [])
        
        # Return only active configs
        for item in items:
            if item.get('status') == 'active':
                return item
        
        return None
    except Exception as e:
        logger.error(f"Error getting whitelabel by domain: {str(e)}")
        return None


def save_whitelabel_config(
    user_id: str,
    brand_name: str,
    domain: str
) -> Dict[str, Any]:
    """Save or update white label configuration."""
    table = dynamodb.Table(WHITELABEL_TABLE)

    now = datetime.utcnow().isoformat()

    item = {
        'user_id': user_id,
        'brand_name': brand_name,
        'domain': domain,
        'status': 'active',
        'created_at': now,
        'updated_at': now
    }

    try:
        table.put_item(Item=item)
        return {'success': True, 'config': item}
    except Exception as e:
        logger.error(f"Error saving whitelabel config: {str(e)}")
        return {'success': False, 'error': str(e)}


def update_whitelabel_status(user_id: str, status: str) -> bool:
    """Update white label configuration status."""
    table = dynamodb.Table(WHITELABEL_TABLE)
    
    try:
        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET #status = :status, updated_at = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': status,
                ':updated': datetime.utcnow().isoformat()
            }
        )
        return True
    except Exception as e:
        logger.error(f"Error updating whitelabel status: {str(e)}")
        return False


def delete_whitelabel_config(user_id: str) -> bool:
    """Delete white label configuration."""
    table = dynamodb.Table(WHITELABEL_TABLE)
    
    try:
        table.delete_item(Key={'user_id': user_id})
        return True
    except Exception as e:
        logger.error(f"Error deleting whitelabel config: {str(e)}")
        return False


# ============================================================================
# BRANDING APPLICATION
# ============================================================================

def get_branding_for_audit(audit_url: str) -> Optional[Dict[str, Any]]:
    """
    Check if the audited URL domain has white label branding configured.
    Returns branding info if found and valid.
    """
    domain = extract_domain(audit_url)

    # Check for exact domain match
    config = get_whitelabel_by_domain(domain)

    if not config:
        # Try without subdomain
        parts = domain.split('.')
        if len(parts) > 2:
            base_domain = '.'.join(parts[-2:])
            config = get_whitelabel_by_domain(base_domain)

    if not config:
        return None

    # Verify addon is still active in DynamoDB
    user_id = config.get('user_id')
    if user_id:
        has_addon, expires_at = has_active_whitelabel_addon(user_id)

        if not has_addon:
            # Mark config as expired
            update_whitelabel_status(user_id, 'expired')
            return None

        # Check if expired
        if expires_at:
            try:
                expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if expiry_date < datetime.now(expiry_date.tzinfo):
                    update_whitelabel_status(user_id, 'expired')
                    return None
            except:
                pass

    return {
        'brand_name': config.get('brand_name'),
        'domain': config.get('domain'),
        'user_id': config.get('user_id')
    }


def apply_branding_to_report(report_data: Dict[str, Any], branding: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply white label branding to report data.
    This modifies the report metadata to use custom branding.
    """
    branded_report = report_data.copy()
    
    # Replace AiVedha branding with custom brand
    branded_report['branding'] = {
        'company_name': branding['brand_name'],
        'is_whitelabeled': True,
        'original_company': 'AiVedha',  # Keep for internal reference
    }
    
    # Update report header
    if 'report_header' in branded_report:
        branded_report['report_header']['company_name'] = branding['brand_name']
    
    # Update certificate
    if 'certificate' in branded_report:
        branded_report['certificate']['issued_by'] = branding['brand_name']
    
    return branded_report


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Main Lambda handler for white label operations.
    
    Actions:
    - configure: Save/update white label configuration
    - get_config: Get current configuration for a user
    - check_branding: Check if URL domain has white label branding
    - apply_branding: Apply branding to report data
    - delete_config: Delete white label configuration
    - validate_addon: Check if user has active addon
    """
    logger.info(f"Received event: {json.dumps(event)}")

    action = event.get('action')
    user_id = event.get('user_id')
    
    # ========================================================================
    # ACTION: CONFIGURE WHITE LABEL
    # ========================================================================
    if action == 'configure':
        brand_name = event.get('brand_name', '').strip()
        domain = event.get('domain', '')
        
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id is required'})
            }
        
        # Validate inputs
        brand_valid, brand_msg = validate_brand_name(brand_name)
        if not brand_valid:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': brand_msg, 'field': 'brand_name'})
            }
        
        domain = extract_domain(domain)
        domain_valid, domain_msg = validate_domain(domain)
        if not domain_valid:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': domain_msg, 'field': 'domain'})
            }
        
        # Check if user is on paid plan
        if not is_paid_plan_user(user_id):
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'White Label Certificate is only available for paid plan users'})
            }
        
        # Verify addon is active in DynamoDB
        has_addon, expires_at = has_active_whitelabel_addon(user_id)
        if not has_addon:
            return {
                'statusCode': 403,
                'body': json.dumps({
                    'error': 'White Label Certificate addon is not active',
                    'addon_required': True
                })
            }
        
        # Check if domain is already registered by another user
        existing = get_whitelabel_by_domain(domain)
        if existing and existing.get('user_id') != user_id:
            return {
                'statusCode': 409,
                'body': json.dumps({'error': 'This domain is already registered by another user'})
            }
        
        # Save configuration
        result = save_whitelabel_config(user_id, brand_name, domain)
        
        if result.get('success'):
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'message': 'White label configuration saved',
                    'config': {
                        'brand_name': brand_name,
                        'domain': domain,
                        'expires_at': expires_at
                    }
                })
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': result.get('error', 'Failed to save configuration')})
            }
    
    # ========================================================================
    # ACTION: GET CONFIGURATION
    # ========================================================================
    elif action == 'get_config':
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id is required'})
            }
        
        config = get_whitelabel_config(user_id)

        if not config:
            return {
                'statusCode': 200,
                'body': json.dumps({'config': None})
            }

        # Check if addon is still active (DynamoDB)
        has_addon, expires_at = has_active_whitelabel_addon(user_id)
        config['addon_active'] = has_addon
        config['expires_at'] = expires_at
        
        return {
            'statusCode': 200,
            'body': json.dumps({'config': config})
        }
    
    # ========================================================================
    # ACTION: CHECK BRANDING FOR URL
    # ========================================================================
    elif action == 'check_branding':
        url = event.get('url', '')
        
        if not url:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'url is required'})
            }
        
        branding = get_branding_for_audit(url)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'has_branding': branding is not None,
                'branding': branding
            })
        }
    
    # ========================================================================
    # ACTION: APPLY BRANDING TO REPORT
    # ========================================================================
    elif action == 'apply_branding':
        url = event.get('url', '')
        report_data = event.get('report_data', {})
        
        if not url or not report_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'url and report_data are required'})
            }
        
        branding = get_branding_for_audit(url)
        
        if branding:
            branded_report = apply_branding_to_report(report_data, branding)
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'applied': True,
                    'brand_name': branding['brand_name'],
                    'report_data': branded_report
                })
            }
        else:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'applied': False,
                    'report_data': report_data
                })
            }
    
    # ========================================================================
    # ACTION: DELETE CONFIGURATION
    # ========================================================================
    elif action == 'delete_config':
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id is required'})
            }
        
        success = delete_whitelabel_config(user_id)
        
        return {
            'statusCode': 200 if success else 500,
            'body': json.dumps({'success': success})
        }
    
    # ========================================================================
    # ACTION: VALIDATE ADDON STATUS
    # ========================================================================
    elif action == 'validate_addon':
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id is required'})
            }

        # Check if user is on paid plan
        if not is_paid_plan_user(user_id):
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'has_addon': False,
                    'reason': 'paid_plan_required'
                })
            }

        # Check addon status in DynamoDB
        has_addon, expires_at = has_active_whitelabel_addon(user_id)

        # If addon expired, update config status
        if not has_addon:
            update_whitelabel_status(user_id, 'expired')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'has_addon': has_addon,
                'expires_at': expires_at
            })
        }
    
    return {
        'statusCode': 400,
        'body': json.dumps({'error': f'Unknown action: {action}'})
    }
