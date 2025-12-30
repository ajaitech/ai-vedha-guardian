"""
AiVedha Guard - API Key Manager Lambda
=======================================
Manages API keys for CI/CD integrations (GitHub, etc.)
- Secure key generation with HMAC
- Validity periods: 7, 12, 15, 30, 60, 90 days
- User-specific permissions only
- Auto-disable on plan downgrade

Copyright 2024-2025 AiVibe Software Services Pvt Ltd
"""

import json
import os
import boto3
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any

def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'

# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
API_KEYS_TABLE = os.environ.get('API_KEYS_TABLE', 'aivedha-guardian-api-keys')
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
CREDITS_TABLE = os.environ.get('CREDITS_TABLE', 'aivedha-guardian-credits')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
API_KEY_SECRET = os.environ.get('API_KEY_SECRET', 'aivedha-api-key-secret-2024-v1')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

# Valid validity periods in days
VALID_PERIODS = [7, 12, 15, 30, 60, 90]
MAX_KEYS_PER_USER = 5

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
ses = boto3.client('ses', region_name=AWS_REGION)

# CORS Headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}


def json_response(status_code: int, body: dict) -> dict:
    """Create JSON response with CORS headers."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def generate_api_key() -> tuple:
    """
    Generate a secure API key.
    Returns: (display_key, key_hash)

    Format: avg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
    The display_key is shown once, only the hash is stored.
    """
    # Generate cryptographically secure random bytes
    random_bytes = secrets.token_bytes(24)
    key_suffix = secrets.token_hex(16)

    # Create the full API key
    display_key = f"avg_live_{key_suffix}"

    # Hash the key for storage (we never store the actual key)
    key_hash = hashlib.sha256(
        (display_key + API_KEY_SECRET).encode()
    ).hexdigest()

    return display_key, key_hash


def verify_api_key(api_key: str) -> Optional[Dict]:
    """
    Verify an API key and return the associated data.
    Returns None if invalid or expired.
    """
    try:
        # Hash the provided key
        key_hash = hashlib.sha256(
            (api_key + API_KEY_SECRET).encode()
        ).hexdigest()

        # Look up by hash
        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.query(
            IndexName='api-key-hash-index',
            KeyConditionExpression='api_key_hash = :hash',
            ExpressionAttributeValues={':hash': key_hash}
        )

        if not response.get('Items'):
            return None

        key_data = response['Items'][0]

        # Check if active
        if key_data.get('status') != 'active':
            return None

        # Check expiry
        expires_at = key_data.get('expires_at', '')
        if expires_at:
            if datetime.utcnow() > datetime.fromisoformat(expires_at.replace('Z', '')):
                # Mark as expired
                table.update_item(
                    Key={'api_key_id': key_data['api_key_id']},
                    UpdateExpression='SET #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={':status': 'expired'}
                )
                return None

        # Update last used
        table.update_item(
            Key={'api_key_id': key_data['api_key_id']},
            UpdateExpression='SET last_used_at = :now, usage_count = if_not_exists(usage_count, :zero) + :inc',
            ExpressionAttributeValues={
                ':now': datetime.utcnow().isoformat(),
                ':zero': 0,
                ':inc': 1
            }
        )

        return key_data

    except Exception as e:
        print(f"Error verifying API key: {e}")
        return None


def get_user_subscription(user_id: str) -> Optional[Dict]:
    """Get user's active subscription."""
    try:
        table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
            ScanIndexForward=False,
            Limit=1
        )

        if response.get('Items'):
            sub = response['Items'][0]
            if sub.get('status') == 'active':
                return sub
        return None
    except Exception as e:
        print(f"Error getting subscription: {e}")
        return None


def get_user_credits(user_id: str) -> int:
    """Get user's available credits."""
    try:
        # Get credits from users table (main balance)
        users_table = dynamodb.Table(USERS_TABLE)
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        return int(user.get('credits', 0))
    except Exception as e:
        print(f"Error getting credits: {e}")
        return 0


def deduct_credit(user_id: str, reason: str = 'api_key_usage') -> bool:
    """Deduct one credit from user's balance in users table."""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        credits_table = dynamodb.Table(CREDITS_TABLE)
        now = datetime.utcnow().isoformat()

        # Get current balance
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        current_credits = int(user.get('credits', 0))

        if current_credits <= 0:
            return False

        # Deduct from users table
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = credits - :one, used_credits = if_not_exists(used_credits, :zero) + :one',
            ConditionExpression='credits > :zero',
            ExpressionAttributeValues={':one': 1, ':zero': 0}
        )

        # Log transaction
        transaction_id = f"API_{uuid.uuid4()}"
        credits_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'credits': -1,
            'balance_before': current_credits,
            'balance_after': current_credits - 1,
            'transaction_type': reason,
            'description': f'API key credit usage',
            'status': 'completed',
            'created_at': now
        })

        return True
    except Exception as e:
        print(f"Error deducting credit: {e}")
        return False


def send_credit_alert_email(user_email: str, user_name: str):
    """Send email alert when credits are insufficient."""
    try:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f23; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,215,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo h1 {{ color: #FFD700; font-size: 28px; margin: 0; }}
        .alert-box {{ background: linear-gradient(135deg, #ff6b6b22, #ff6b6b11); border: 1px solid #ff6b6b; border-radius: 12px; padding: 24px; margin: 24px 0; }}
        .alert-title {{ color: #ff6b6b; font-size: 20px; font-weight: bold; margin-bottom: 12px; }}
        .message {{ color: #ddd; line-height: 1.8; font-size: 16px; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        .cta-button:hover {{ background: linear-gradient(135deg, #FFA500, #FF8C00); }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>AiVedha Guard</h1>
        </div>

        <div class="alert-box">
            <div class="alert-title">Security Audit Paused - Insufficient Credits</div>
            <p class="message">
                Hello {user_name or 'there'},<br><br>
                Your CI/CD security audit was initiated but could not complete because your account has <strong>insufficient credits</strong>.<br><br>
                Don't worry - your deployment workflow continued smoothly without interruption. However, to ensure continuous security monitoring of your deployments, please add more credits to your account.
            </p>
        </div>

        <p class="message">
            <strong>Why security audits matter:</strong><br>
            Every deployment is an opportunity to catch vulnerabilities before they reach production. Our AI-powered scanner analyzes your application for:
        </p>
        <ul style="color: #ddd; line-height: 2;">
            <li>OWASP Top 10 vulnerabilities</li>
            <li>SSL/TLS configuration issues</li>
            <li>Security header misconfigurations</li>
            <li>Exposed sensitive information</li>
        </ul>

        <div style="text-align: center;">
            <a href="{SITE_URL}/pricing" class="cta-button">Upgrade Now</a>
            <a href="{SITE_URL}/dashboard" class="cta-button" style="margin-left: 10px; background: linear-gradient(135deg, #4CAF50, #45a049);">Add Credits</a>
        </div>

        <div class="footer">
            <p>This is an automated message from AiVedha Guard CI/CD Integration.</p>
            <p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p>
        </div>
    </div>
</body>
</html>
"""

        ses.send_email(
            Source='noreply@aivedha.ai',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': 'Action Required: Security Audit Paused - Add Credits'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
    except Exception as e:
        print(f"Error sending credit alert email: {e}")


# ============================================================================
# API KEY MANAGEMENT HANDLERS
# ============================================================================

def get_user_info(user_id: str) -> Optional[Dict]:
    """Get user info from users table."""
    try:
        table = dynamodb.Table(USERS_TABLE)
        response = table.get_item(Key={'user_id': user_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting user info: {e}")
        return None


def create_api_key(event: dict) -> dict:
    """
    Create a new API key for the user.
    FREE for all users with expiration-based access.
    Each CI/CD audit uses 1 credit.
    """
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId') or body.get('user_id')
        key_name = body.get('name', '').strip()
        reason = body.get('reason', '').strip()
        validity_days = int(body.get('validityDays') or body.get('validity_days', 30))

        # Validate required fields
        if not user_id:
            return json_response(400, {'error': 'User ID required', 'success': False})
        if not key_name:
            return json_response(400, {'error': 'API key name required', 'success': False})
        if not reason:
            return json_response(400, {'error': 'Reason for API key required', 'success': False})
        if validity_days not in VALID_PERIODS:
            return json_response(400, {
                'error': f'Invalid validity period. Must be one of: {VALID_PERIODS}',
                'success': False
            })

        # Get user info (API keys are FREE for all users)
        user_info = get_user_info(user_id)
        if not user_info:
            return json_response(404, {
                'error': 'User not found',
                'success': False
            })

        # Check existing key count
        table = dynamodb.Table(API_KEYS_TABLE)
        existing = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        if len(existing.get('Items', [])) >= MAX_KEYS_PER_USER:
            return json_response(400, {
                'error': f'Maximum {MAX_KEYS_PER_USER} active API keys allowed',
                'message': 'Please revoke an existing key before creating a new one.'
            })

        # Generate the key
        display_key, key_hash = generate_api_key()
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=validity_days)

        # Get user email for notifications
        user_email = user_info.get('email', '')
        user_plan = user_info.get('subscription_plan', 'free')

        # Store key metadata (NOT the actual key)
        table.put_item(Item={
            'api_key_id': key_id,
            'user_id': user_id,
            'user_email': user_email,
            'api_key_hash': key_hash,
            'key_prefix': display_key[:12] + '...',  # Only store prefix for display
            'name': key_name,
            'reason': reason,
            'validity_days': validity_days,
            'created_at': now.isoformat(),
            'expires_at': expires_at.isoformat(),
            'status': 'active',
            'permissions': [
                'audit:create',      # Can initiate security audits
                'audit:read',        # Can read audit results
                'audit:status',      # Can check audit status
                'report:download',   # Can download PDF reports
                'certificate:read'   # Can view certificates
            ],
            'usage_count': 0,
            'last_used_at': None,
            'plan_code': user_plan,
            'credit_per_audit': 1  # Each audit costs 1 credit
        })

        return json_response(201, {
            'success': True,
            'api_key': display_key,  # Show ONLY ONCE
            'api_key_id': key_id,
            'name': key_name,
            'expires_at': expires_at.isoformat(),
            'warning': 'Save this API key now. It will not be shown again.',
            'usage': {
                'header': 'X-API-Key',
                'example': f'curl -H "X-API-Key: {display_key}" {get_api_base_url()}/cicd/audit'
            }
        })

    except Exception as e:
        print(f"Error creating API key: {e}")
        return json_response(500, {'error': 'Failed to create API key'})


def list_api_keys(event: dict) -> dict:
    """List all API keys for a user (without showing the actual keys)."""
    try:
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('userId') or params.get('user_id')

        if not user_id:
            return json_response(400, {'error': 'User ID required'})

        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )

        keys = []
        for item in response.get('Items', []):
            keys.append({
                'api_key_id': item.get('api_key_id'),
                'name': item.get('name'),
                'key_prefix': item.get('key_prefix'),
                'reason': item.get('reason'),
                'status': item.get('status'),
                'validity_days': item.get('validity_days'),
                'created_at': item.get('created_at'),
                'expires_at': item.get('expires_at'),
                'last_used_at': item.get('last_used_at'),
                'usage_count': item.get('usage_count', 0),
                'permissions': item.get('permissions', [])
            })

        # Sort by created_at descending
        keys.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return json_response(200, {
            'success': True,
            'api_keys': keys,
            'max_keys': MAX_KEYS_PER_USER,
            'active_count': len([k for k in keys if k['status'] == 'active'])
        })

    except Exception as e:
        print(f"Error listing API keys: {e}")
        return json_response(500, {'error': 'Failed to list API keys'})


def revoke_api_key(event: dict) -> dict:
    """Revoke an API key."""
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId') or body.get('user_id')
        key_id = body.get('api_key_id')

        if not user_id or not key_id:
            return json_response(400, {'error': 'User ID and API key ID required'})

        table = dynamodb.Table(API_KEYS_TABLE)

        # Verify ownership
        response = table.get_item(Key={'api_key_id': key_id})
        key_data = response.get('Item')

        if not key_data:
            return json_response(404, {'error': 'API key not found'})

        if key_data.get('user_id') != user_id:
            return json_response(403, {'error': 'Access denied'})

        # Revoke
        table.update_item(
            Key={'api_key_id': key_id},
            UpdateExpression='SET #status = :status, revoked_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'revoked',
                ':now': datetime.utcnow().isoformat()
            }
        )

        return json_response(200, {
            'success': True,
            'message': 'API key revoked successfully'
        })

    except Exception as e:
        print(f"Error revoking API key: {e}")
        return json_response(500, {'error': 'Failed to revoke API key'})


def disable_user_api_keys(user_id: str, reason: str = 'plan_downgrade') -> int:
    """Disable all API keys for a user (called on plan downgrade)."""
    try:
        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        disabled_count = 0
        for item in response.get('Items', []):
            table.update_item(
                Key={'api_key_id': item['api_key_id']},
                UpdateExpression='SET #status = :status, disabled_reason = :reason, disabled_at = :now',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'disabled',
                    ':reason': reason,
                    ':now': datetime.utcnow().isoformat()
                }
            )
            disabled_count += 1

        return disabled_count

    except Exception as e:
        print(f"Error disabling user API keys: {e}")
        return 0


# ============================================================================
# URL VALIDATION FOR CI/CD
# ============================================================================

def validate_url_for_cicd(url: str, user_id: str) -> dict:
    """
    Validate URL before CI/CD audit - check for error pages.
    Returns validation result with status.
    """
    import urllib.request
    import urllib.error
    import ssl
    import socket

    ERROR_STATUS_CODES = {400, 401, 403, 404, 405, 408, 429, 500, 501, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526}

    result = {
        'valid': False,
        'status_code': None,
        'error_type': None,
        'error_message': None
    }

    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        request = urllib.request.Request(url, headers={
            'User-Agent': 'AiVedha-Guard-CI-CD/1.0',
            'Accept': 'text/html,*/*'
        })

        response = urllib.request.urlopen(request, timeout=15, context=ssl_context)
        result['status_code'] = response.status

        if response.status in ERROR_STATUS_CODES:
            result['error_type'] = 'http_error'
            result['error_message'] = f'HTTP {response.status} error page detected'
        else:
            result['valid'] = True

    except urllib.error.HTTPError as e:
        result['status_code'] = e.code
        result['error_type'] = 'http_error'
        result['error_message'] = f'HTTP {e.code}: {e.reason}'

    except urllib.error.URLError as e:
        result['error_type'] = 'connection_error'
        result['error_message'] = f'Connection error: {str(e.reason)}'

    except socket.timeout:
        result['error_type'] = 'timeout'
        result['error_message'] = 'Request timed out'

    except Exception as e:
        result['error_type'] = 'unknown_error'
        result['error_message'] = f'Validation error: {str(e)}'

    return result


def send_cicd_failure_email(user_email: str, user_name: str, url: str, error_message: str):
    """Send email notification when CI/CD audit fails due to URL error."""
    try:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f23; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,215,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo h1 {{ color: #FFD700; font-size: 28px; margin: 0; }}
        .alert-box {{ background: linear-gradient(135deg, #ff6b6b22, #ff6b6b11); border: 1px solid #ff6b6b; border-radius: 12px; padding: 24px; margin: 24px 0; }}
        .alert-title {{ color: #ff6b6b; font-size: 20px; font-weight: bold; margin-bottom: 12px; }}
        .message {{ color: #ddd; line-height: 1.8; font-size: 16px; }}
        .details {{ background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; color: #fff; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>🛡️ AiVedha Guard</h1></div>
        <div class="alert-box">
            <div class="alert-title">⚠️ GitHub CI/CD Audit Failed - URL Error</div>
            <p class="message">Hello {user_name or 'there'},<br><br>
            Your CI/CD security audit could not proceed because the target URL returned an error.</p>
        </div>
        <div class="details">
            <strong>URL:</strong> {url}<br>
            <strong>Error:</strong> {error_message}
        </div>
        <p class="message"><strong>Your deployment continues normally.</strong> The security audit was skipped to prevent wasted credits on an error page.</p>
        <p class="message">Please verify the URL is correct and the site is responding properly, then trigger a new audit.</p>
        <div style="text-align: center;">
            <a href="{SITE_URL}/dashboard" class="cta-button">View Dashboard</a>
        </div>
        <div class="footer"><p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p></div>
    </div>
</body>
</html>
"""
        ses.send_email(
            Source='noreply@aivedha.ai',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': '⚠️ AiVedha Guard: CI/CD Audit Failed - URL Error Detected'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
    except Exception as e:
        print(f"Error sending CI/CD failure email: {e}")


# ============================================================================
# CI/CD AUDIT HANDLER
# ============================================================================

def send_cicd_success_email(user_email: str, user_name: str, url: str, report_id: str,
                            security_score: float, grade: str, vulnerabilities: dict,
                            pdf_url: str, certificate_number: str):
    """Send email notification with audit report after successful CI/CD audit."""
    try:
        vuln_summary = f"""
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;">Critical</td><td style="padding: 8px; border-bottom: 1px solid #333; color: #ff4444;">{vulnerabilities.get('critical', 0)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;">High</td><td style="padding: 8px; border-bottom: 1px solid #333; color: #ff8800;">{vulnerabilities.get('high', 0)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;">Medium</td><td style="padding: 8px; border-bottom: 1px solid #333; color: #ffcc00;">{vulnerabilities.get('medium', 0)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;">Low</td><td style="padding: 8px; border-bottom: 1px solid #333; color: #44aa44;">{vulnerabilities.get('low', 0)}</td></tr>
        """

        grade_color = {
            'A+': '#00ff00', 'A': '#44ff44', 'B': '#88ff44',
            'C': '#ffcc00', 'D': '#ff8800', 'F': '#ff4444'
        }.get(grade, '#888888')

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f23; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(0,255,136,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo h1 {{ color: #00ff88; font-size: 28px; margin: 0; }}
        .success-box {{ background: linear-gradient(135deg, #00ff8822, #00ff8811); border: 1px solid #00ff88; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }}
        .score {{ font-size: 48px; font-weight: bold; color: {grade_color}; }}
        .grade {{ font-size: 24px; color: {grade_color}; margin-top: 8px; }}
        .details {{ background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin: 16px 0; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px; }}
        .cta-button.secondary {{ background: linear-gradient(135deg, #4488ff, #2266cc); color: #fff; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        table {{ width: 100%; border-collapse: collapse; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>🛡️ AiVedha Guard</h1></div>
        <div class="success-box">
            <div style="color: #00ff88; font-size: 18px; margin-bottom: 16px;">✅ CI/CD Security Audit Complete</div>
            <div class="score">{security_score:.1f}/10</div>
            <div class="grade">Grade: {grade}</div>
        </div>

        <div class="details">
            <p><strong>URL Scanned:</strong> {url}</p>
            <p><strong>Report ID:</strong> {report_id}</p>
            <p><strong>Certificate:</strong> {certificate_number or 'N/A'}</p>
        </div>

        <div class="details">
            <p><strong>Vulnerability Summary:</strong></p>
            <table>
                {vuln_summary}
            </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <a href="{pdf_url}" class="cta-button">📄 Download PDF Report</a>
            <a href="{SITE_URL}/dashboard" class="cta-button secondary">View Dashboard</a>
        </div>

        <div class="footer">
            <p>This security audit was triggered by your CI/CD pipeline.</p>
            <p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p>
        </div>
    </div>
</body>
</html>
"""
        ses.send_email(
            Source='noreply@aivedha.ai',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': f'✅ CI/CD Security Audit Complete - {url} - Grade: {grade}'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        return True
    except Exception as e:
        print(f"Error sending CI/CD success email: {e}")
        return False


def handle_cicd_audit(event: dict) -> dict:
    """
    Handle audit request from CI/CD pipeline.
    Validates API key, validates URL, checks credits, initiates audit.
    Returns GitHub Actions compatible output format.
    """
    try:
        # Get API key from header
        headers = event.get('headers', {})
        api_key = headers.get('X-API-Key') or headers.get('x-api-key')

        if not api_key:
            return json_response(401, {
                'success': False,
                'error': 'API key required',
                'message': 'Provide API key in X-API-Key header',
                'github_output': 'audit_status=failed\naudit_error=missing_api_key'
            })

        # Verify API key
        key_data = verify_api_key(api_key)
        if not key_data:
            return json_response(401, {
                'success': False,
                'error': 'Invalid or expired API key',
                'message': 'Please generate a new API key from your dashboard.',
                'github_output': 'audit_status=failed\naudit_error=invalid_api_key'
            })

        user_id = key_data.get('user_id')
        user_email = key_data.get('user_email', '')

        # Get request body
        body = json.loads(event.get('body', '{}'))
        url = body.get('url', '').strip()
        skip_url_validation = body.get('skip_url_validation', False)
        wait_for_result = body.get('wait_for_result', False)
        github_run_id = body.get('github_run_id', '')
        github_repository = body.get('github_repository', '')

        if not url:
            return json_response(400, {
                'success': False,
                'error': 'URL to audit is required',
                'github_output': 'audit_status=failed\naudit_error=missing_url'
            })

        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'

        # URL validation for error pages (unless explicitly skipped)
        if not skip_url_validation:
            url_validation = validate_url_for_cicd(url, user_id)

            if not url_validation['valid']:
                # Get user info for email notification
                users_table = dynamodb.Table(USERS_TABLE)
                user_response = users_table.get_item(Key={'user_id': user_id})
                user = user_response.get('Item', {})

                # Send failure email
                if user.get('email'):
                    send_cicd_failure_email(
                        user.get('email'),
                        user.get('full_name', user.get('name', '')),
                        url,
                        url_validation.get('error_message', 'URL validation failed')
                    )

                # Return graceful error (not a showstopper for deployment)
                return json_response(200, {
                    'success': False,
                    'audit_skipped': True,
                    'reason': 'url_validation_failed',
                    'url': url,
                    'status_code': url_validation.get('status_code'),
                    'error_type': url_validation.get('error_type'),
                    'message': f"Security audit skipped: {url_validation.get('error_message')}. Your deployment continues normally.",
                    'email_sent': bool(user.get('email')),
                    'action_required': 'Verify the URL is correct and the site is responding',
                    'github_output': f"audit_status=skipped\naudit_reason=url_error\nurl={url}"
                })

        # Check credits BEFORE starting audit (1 credit per audit)
        credits = get_user_credits(user_id)
        if credits < 1:
            # Get user info for email
            users_table = dynamodb.Table(USERS_TABLE)
            user_response = users_table.get_item(Key={'user_id': user_id})
            user = user_response.get('Item', {})

            # Send credit alert email
            send_credit_alert_email(
                user.get('email', ''),
                user.get('full_name', user.get('name', ''))
            )

            # Return graceful error (not a showstopper)
            return json_response(200, {
                'success': False,
                'audit_skipped': True,
                'reason': 'insufficient_credits',
                'message': 'Security audit skipped due to insufficient credits. Your deployment continues normally.',
                'credits_available': 0,
                'action_required': 'Add credits to enable security audits',
                'upgrade_url': f'{SITE_URL}/pricing',
                'email_sent': True,
                'github_output': f"audit_status=skipped\naudit_reason=no_credits\ncredits_available=0"
            })

        # Deduct 1 credit for CI/CD audit
        if not deduct_credit(user_id, 'cicd_audit'):
            return json_response(200, {
                'success': False,
                'audit_skipped': True,
                'reason': 'credit_deduction_failed',
                'message': 'Could not process credit. Please try again.',
                'github_output': 'audit_status=failed\naudit_error=credit_deduction_failed'
            })

        # Generate report ID
        from datetime import datetime
        report_id = f"AVG-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        # Get user info for callback
        users_table = dynamodb.Table(USERS_TABLE)
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})

        # Call the security audit Lambda (invoke async)
        lambda_client = boto3.client('lambda', region_name=AWS_REGION)

        audit_payload = {
            'body': json.dumps({
                'url': url,
                'userId': user_id,
                'userEmail': user.get('email', user_email),
                'reportId': report_id,
                'source': 'cicd',
                'api_key_id': key_data.get('api_key_id'),
                'callback_type': 'cicd',
                'send_email_report': True,  # Send email with PDF report
                'github_run_id': github_run_id,
                'github_repository': github_repository
            })
        }

        # Invoke async for non-blocking (default CI/CD behavior)
        lambda_client.invoke(
            FunctionName='aivedha-guardian-security-crawler',
            InvocationType='Event',  # Async
            Payload=json.dumps(audit_payload)
        )

        return json_response(202, {
            'success': True,
            'audit_initiated': True,
            'report_id': report_id,
            'url': url,
            'message': 'Security audit initiated. Results will be sent via email.',
            'credits_remaining': credits - 1,
            'credits_used': 1,
            'status_url': f'{SITE_URL}/dashboard',
            'result_url': f'{SITE_URL}/audit-results?reportId={report_id}',
            'github_output': f"audit_status=initiated\nreport_id={report_id}\nurl={url}\ncredits_remaining={credits - 1}"
        })

    except Exception as e:
        print(f"Error in CI/CD audit: {e}")
        return json_response(500, {
            'success': False,
            'error': 'Audit request failed',
            'github_output': f'audit_status=error\naudit_error={str(e)}'
        })


# ============================================================================
# WEBHOOK FOR PLAN CHANGES
# ============================================================================

def handle_plan_downgrade_webhook(event: dict) -> dict:
    """Handle plan downgrade - disable all API keys."""
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        new_plan = body.get('new_plan')

        if not user_id:
            return json_response(400, {'error': 'User ID required'})

        # Disable all API keys if downgrading to free
        if new_plan in ['free', 'cancelled', None]:
            disabled = disable_user_api_keys(user_id, 'plan_downgrade')
            return json_response(200, {
                'success': True,
                'api_keys_disabled': disabled,
                'reason': 'Plan downgrade - API keys require active paid subscription'
            })

        return json_response(200, {'success': True, 'api_keys_disabled': 0})

    except Exception as e:
        print(f"Error handling plan downgrade: {e}")
        return json_response(500, {'error': 'Failed to process plan change'})


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event, context):
    """Main Lambda handler."""

    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    # Route: POST /api-keys/create
    if '/api-keys/create' in path and method == 'POST':
        return create_api_key(event)

    # Route: GET /api-keys/list
    if '/api-keys/list' in path and method == 'GET':
        return list_api_keys(event)

    # Route: POST /api-keys/revoke
    if '/api-keys/revoke' in path and method == 'POST':
        return revoke_api_key(event)

    # Route: POST /cicd/audit
    if '/cicd/audit' in path and method == 'POST':
        return handle_cicd_audit(event)

    # Route: POST /webhooks/plan-change
    if '/webhooks/plan-change' in path and method == 'POST':
        return handle_plan_downgrade_webhook(event)

    # Route: POST /api-keys/validate
    if '/api-keys/validate' in path and method == 'POST':
        headers = event.get('headers', {})
        api_key = headers.get('X-API-Key') or headers.get('x-api-key')

        if not api_key:
            return json_response(401, {'valid': False, 'error': 'No API key provided'})

        key_data = verify_api_key(api_key)
        if key_data:
            return json_response(200, {
                'valid': True,
                'name': key_data.get('name'),
                'expires_at': key_data.get('expires_at'),
                'permissions': key_data.get('permissions', [])
            })
        else:
            return json_response(401, {'valid': False, 'error': 'Invalid or expired API key'})

    # Health check
    if '/health' in path:
        return json_response(200, {
            'status': 'healthy',
            'service': 'api-key-manager',
            'timestamp': datetime.utcnow().isoformat()
        })

    # Not found
    return json_response(404, {
        'error': 'Endpoint not found',
        'available_endpoints': [
            'POST /api-keys/create',
            'GET /api-keys/list',
            'POST /api-keys/revoke',
            'POST /api-keys/validate',
            'POST /cicd/audit'
        ]
    })
