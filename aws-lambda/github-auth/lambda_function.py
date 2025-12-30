import json
import boto3
import os
import urllib.request
import urllib.parse
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

# =============================================================================
# CROSS-REGION CONFIGURATION
# =============================================================================
# CRITICAL: All user/auth tables are in us-east-1 ONLY (single source of truth)
# India Lambda functions access US resources via cross-region calls

AUTH_REGION = 'us-east-1'  # Primary region for all auth/user data
SES_REGION = 'us-east-1'   # SES is only configured in us-east-1

# DynamoDB Tables (all in us-east-1)
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
API_KEYS_TABLE = os.environ.get('API_KEYS_TABLE', 'aivedha-guardian-api-keys')

# Other configuration
API_KEY_SECRET = os.environ.get('API_KEY_SECRET', 'aivedha-api-key-secret-2024-v1')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

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
    All secrets (GitHub OAuth credentials) are stored in us-east-1.
    """
    global _secrets_client
    if _secrets_client is None:
        _secrets_client = boto3.client('secretsmanager', region_name=AUTH_REGION)
    return _secrets_client


def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'


# Secrets cache
_secrets_cache = {}

# =============================================================================
# AUTO API KEY GENERATION FOR GITHUB MARKETPLACE
# =============================================================================

def generate_api_key():
    """Generate a secure API key for CI/CD integration."""
    key_suffix = secrets.token_hex(16)
    display_key = f"avg_live_{key_suffix}"
    key_hash = hashlib.sha256((display_key + API_KEY_SECRET).encode()).hexdigest()
    return display_key, key_hash


def create_auto_api_key(user_id: str, email: str, source: str = 'github_marketplace'):
    """Auto-create an API key for a user during GitHub Marketplace installation."""
    try:
        dynamodb = get_dynamodb()
        api_keys_table = dynamodb.Table(API_KEYS_TABLE)

        # Check if user already has an active API key
        existing = api_keys_table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        if existing.get('Items'):
            print(f"User {user_id} already has {len(existing['Items'])} active API key(s)")
            return None

        display_key, key_hash = generate_api_key()
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=90)

        api_keys_table.put_item(Item={
            'api_key_id': key_id,
            'user_id': user_id,
            'user_email': email,
            'api_key_hash': key_hash,
            'key_prefix': display_key[:12] + '...',
            'name': 'GitHub Marketplace Auto-Key',
            'reason': f'Auto-generated during {source} installation',
            'validity_days': 90,
            'created_at': now.isoformat(),
            'expires_at': expires_at.isoformat(),
            'status': 'active',
            'auto_generated': True,
            'source': source,
            'permissions': ['audit:create', 'audit:read', 'audit:status', 'report:download', 'certificate:read'],
            'usage_count': 0,
            'last_used_at': None,
            'credit_per_audit': 1
        })

        print(f"Auto-created API key for user {user_id}: {display_key[:12]}...")
        return display_key
    except Exception as e:
        print(f"Error auto-creating API key: {e}")
        return None


def send_welcome_email_with_api_key(email: str, full_name: str, api_key: str, plan: str, credits: int):
    """Send welcome email with auto-generated API key for GitHub Marketplace users."""
    try:
        ses = get_ses_client()
        first_name = full_name.split()[0] if full_name else 'there'

        html_body = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial; background: #0f0f23; color: #fff; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; padding: 40px;">
<h1 style="color: #FFD700; text-align: center;">🛡️ AiVedha Guard</h1>
<div style="background: rgba(0,255,136,0.1); border: 1px solid #00ff88; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
<h2 style="color: #00ff88;">Welcome to AiVedha Guard!</h2>
<p style="color: #ddd;">Your GitHub Marketplace installation is complete</p>
</div>
<p style="color: #ddd;">Hello {first_name},</p>
<p style="color: #ddd;">Your account is ready with <strong style="color: #FFD700;">{credits} security audit credits</strong> on the <strong style="color: #FFD700;">{plan}</strong> plan.</p>
<div style="background: #000; border: 2px dashed #FFD700; border-radius: 12px; padding: 20px; margin: 24px 0;">
<h3 style="color: #FFD700; text-align: center;">🔑 Your CI/CD API Key</h3>
<div style="font-family: monospace; color: #00ff88; word-break: break-all; padding: 12px; background: rgba(0,255,136,0.1); border-radius: 8px;">{api_key}</div>
<p style="color: #ff6b6b; font-size: 14px;">⚠️ This key is shown only once! Save it securely now.</p>
</div>
<div style="text-align: center; margin-top: 32px;">
<a href="{SITE_URL}/dashboard" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Dashboard</a>
</div>
<p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">© 2025 AiVibe Software Services Pvt Ltd</p>
</div>
</body></html>'''

        ses.send_email(
            Source='AiVedha Guard <noreply@aivedha.ai>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '🔑 Your AiVedha Guard API Key - GitHub Marketplace Setup Complete'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        print(f"Welcome email with API key sent to {email}")
        return True
    except Exception as e:
        print(f"Error sending welcome email: {e}")
        return False


# =============================================================================
# GITHUB CREDENTIALS
# =============================================================================

GITHUB_CLIENT_ID = None
GITHUB_CLIENT_SECRET = None
GITHUB_WEBHOOK_SECRET = None


def get_github_credentials():
    """Get GitHub credentials from environment variables or AWS Secrets Manager."""
    global _secrets_cache

    if 'github' in _secrets_cache:
        return _secrets_cache['github']

    client_id = os.environ.get('GITHUB_CLIENT_ID', '')
    client_secret = os.environ.get('GITHUB_CLIENT_SECRET', '')
    webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET', '')

    if client_id and client_secret:
        _secrets_cache['github'] = (client_id, client_secret, webhook_secret)
        return _secrets_cache['github']

    # Fallback to AWS Secrets Manager (always us-east-1)
    try:
        secrets_client = get_secrets_client()
        secret_name = os.environ.get('GITHUB_SECRET_NAME', 'aivedha/github-oauth')
        response = secrets_client.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(response['SecretString'])
        client_id = secret_data.get('client_id', '')
        client_secret = secret_data.get('client_secret', '')
        webhook_secret = secret_data.get('webhook_secret', '')

        if client_id and client_secret:
            _secrets_cache['github'] = (client_id, client_secret, webhook_secret)
            return _secrets_cache['github']
    except Exception as e:
        print(f"Failed to load secrets from Secrets Manager: {e}")

    return ('', '', '')


def ensure_credentials():
    """Ensure GitHub credentials are loaded."""
    global GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET
    if GITHUB_CLIENT_ID is None:
        GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET = get_github_credentials()
    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)


# =============================================================================
# MAIN LAMBDA HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    GitHub OAuth Handler - Handles OAuth code exchange, status checks, and webhook events.
    
    CROSS-REGION ARCHITECTURE:
    - This Lambda can be deployed in ANY region
    - ALL data operations go to us-east-1 (single source of truth)
    """
    cors_headers = {
        'Access-Control-Allow-Origin': 'https://aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hub-Signature-256,X-GitHub-Event,X-GitHub-Delivery',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }

    http_method = event.get('httpMethod', 'POST')
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    path = event.get('path', '')

    # Handle status endpoint
    if '/status' in path or path.endswith('/github/status'):
        return handle_status_check(event, cors_headers)

    # Handle webhook events
    headers = event.get('headers', {})
    if headers.get('X-GitHub-Event') or headers.get('x-github-event'):
        return handle_webhook(event, cors_headers)

    try:
        if not ensure_credentials():
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Service temporarily unavailable', 'message': 'GitHub OAuth is not configured.'})
            }

        body = json.loads(event.get('body', '{}'))
        code = body.get('code')
        redirect_uri = body.get('redirect_uri')

        if not code:
            return {'statusCode': 400, 'headers': cors_headers, 'body': json.dumps({'error': 'Authorization code is required'})}

        # Exchange code for access token
        token_data = exchange_code_for_token(code, redirect_uri)
        if not token_data or 'access_token' not in token_data:
            return {'statusCode': 401, 'headers': cors_headers, 'body': json.dumps({'error': 'Failed to exchange code for token'})}

        access_token = token_data['access_token']

        # Get user info from GitHub
        user_info = get_github_user_info(access_token)
        if not user_info:
            return {'statusCode': 401, 'headers': cors_headers, 'body': json.dumps({'error': 'Failed to get user info from GitHub'})}

        email = user_info.get('email') or get_github_user_email(access_token)
        if not email:
            return {'statusCode': 400, 'headers': cors_headers, 'body': json.dumps({'error': 'Unable to retrieve email from GitHub.'})}

        github_id = str(user_info.get('id'))
        full_name = user_info.get('name') or user_info.get('login')
        avatar = user_info.get('avatar_url')

        # Access DynamoDB in us-east-1
        dynamodb = get_dynamodb()
        users_table = dynamodb.Table(USERS_TABLE)

        # Find existing user by email
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        is_new_user = False
        if response['Items']:
            user = response['Items'][0]
            user_id = user.get('user_id')
            credits = user.get('credits', 0)
            plan = user.get('plan', 'Aarambh')
            existing_github_id = user.get('githubId')

            if existing_github_id and existing_github_id != github_id:
                return {
                    'statusCode': 409,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': 'Email already registered',
                        'message': 'This email is registered with a different GitHub account.'
                    })
                }

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET githubId = :gid, avatar = :avatar, fullName = :name, last_login = :login',
                ExpressionAttributeValues={
                    ':gid': github_id, ':avatar': avatar, ':name': full_name,
                    ':login': datetime.utcnow().isoformat()
                }
            )
        else:
            is_new_user = True
            user_id = f"github-{github_id}"
            credits = 3
            plan = 'Aarambh'

            users_table.put_item(Item={
                'user_id': user_id,
                'email': email,
                'fullName': full_name,
                'githubId': github_id,
                'avatar': avatar,
                'credits': 3,
                'plan': 'Aarambh',
                'subscription_plan': 'aarambh_free',
                'created_at': datetime.utcnow().isoformat(),
                'last_login': datetime.utcnow().isoformat(),
                'login_method': 'github',
                'github_marketplace_install': True
            })

        if isinstance(credits, Decimal):
            credits = int(credits)

        # Auto-generate API key for new users
        auto_api_key = None
        if is_new_user:
            auto_api_key = create_auto_api_key(user_id, email, 'github_oauth')
            if auto_api_key:
                send_welcome_email_with_api_key(email, full_name, auto_api_key, plan, credits)

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'email': email,
                'fullName': full_name,
                'githubId': github_id,
                'avatar': avatar,
                'credits': credits,
                'plan': plan,
                'isNewUser': is_new_user,
                'token': access_token,
                'apiKeyGenerated': bool(auto_api_key),
                'apiKeyEmailSent': bool(auto_api_key)
            })
        }
    except Exception as e:
        print(f"GitHub auth error: {str(e)}")
        return {'statusCode': 500, 'headers': cors_headers, 'body': json.dumps({'error': 'Internal server error', 'message': str(e)})}


def exchange_code_for_token(code, redirect_uri):
    """Exchange authorization code for access token."""
    try:
        data = urllib.parse.urlencode({
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': redirect_uri or 'https://aivedha.ai/dashboard'
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://github.com/login/oauth/access_token',
            data=data,
            headers={'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Token exchange error: {str(e)}")
        return None


def get_github_user_info(access_token):
    """Get user info from GitHub API."""
    try:
        req = urllib.request.Request(
            'https://api.github.com/user',
            headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'AiVedha-Guardian'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Get user info error: {str(e)}")
        return None


def get_github_user_email(access_token):
    """Get user's primary email from GitHub API."""
    try:
        req = urllib.request.Request(
            'https://api.github.com/user/emails',
            headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'AiVedha-Guardian'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            emails = json.loads(response.read().decode('utf-8'))
            for email_obj in emails:
                if email_obj.get('primary'):
                    return email_obj.get('email')
            for email_obj in emails:
                if email_obj.get('verified'):
                    return email_obj.get('email')
            if emails:
                return emails[0].get('email')
    except Exception as e:
        print(f"Get email error: {str(e)}")
    return None


def handle_status_check(event, cors_headers):
    """Handle GitHub Marketplace status check requests."""
    try:
        dynamodb = get_dynamodb()
        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.scan(
            FilterExpression='login_method = :method',
            ExpressionAttributeValues={':method': 'github'},
            Select='COUNT'
        )
        github_user_count = response.get('Count', 0)

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'active',
                'service': 'AiVedha Guardian',
                'version': '1.0.0',
                'github_integration': 'enabled',
                'oauth_configured': bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET),
                'active_github_users': github_user_count,
                'timestamp': datetime.utcnow().isoformat(),
                'health': 'healthy'
            })
        }
    except Exception as e:
        print(f"Status check error: {str(e)}")
        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'status': 'active', 'health': 'healthy', 'error': str(e)})}


def handle_webhook(event, cors_headers):
    """Handle GitHub webhook events."""
    try:
        headers = event.get('headers', {})
        github_event = headers.get('X-GitHub-Event') or headers.get('x-github-event', '')
        delivery_id = headers.get('X-GitHub-Delivery') or headers.get('x-github-delivery', '')
        signature = headers.get('X-Hub-Signature-256') or headers.get('x-hub-signature-256', '')
        body = event.get('body', '{}')

        # Verify signature if configured
        if GITHUB_WEBHOOK_SECRET and signature:
            expected = 'sha256=' + hmac.new(GITHUB_WEBHOOK_SECRET.encode('utf-8'), body.encode('utf-8'), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                return {'statusCode': 401, 'headers': cors_headers, 'body': json.dumps({'error': 'Invalid signature'})}

        payload = json.loads(body)
        print(f"GitHub webhook: event={github_event}, delivery={delivery_id}")

        if github_event == 'marketplace_purchase':
            action = payload.get('action')
            marketplace_purchase = payload.get('marketplace_purchase', {})
            sender = payload.get('sender', {})
            if action == 'purchased':
                return handle_marketplace_purchase(marketplace_purchase, sender, cors_headers)
            elif action == 'cancelled':
                return handle_marketplace_cancellation(marketplace_purchase, sender, cors_headers)

        elif github_event == 'ping':
            return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'message': 'pong', 'zen': payload.get('zen', '')})}

        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'received': True, 'event': github_event})}
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'received': True, 'error': str(e)})}


def handle_marketplace_purchase(marketplace_purchase, sender, cors_headers):
    """Handle new marketplace subscription."""
    try:
        account = marketplace_purchase.get('account', {})
        plan = marketplace_purchase.get('plan', {})
        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')
        github_email = account.get('email', '')
        plan_name = plan.get('name', 'Aarambh')

        # Map plan
        plan_mapping = {'aarambh': ('Aarambh', 3), 'free': ('Aarambh', 3), 'raksha': ('Raksha', 10), 'suraksha': ('Suraksha', 30), 'vajra': ('Vajra', 100), 'chakra': ('Chakra', 500)}
        aivedha_plan, credits = plan_mapping.get(plan_name.lower(), ('Aarambh', 3))

        dynamodb = get_dynamodb()
        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.query(
            IndexName='github-id-index',
            KeyConditionExpression='githubId = :gid',
            ExpressionAttributeValues={':gid': github_id}
        )

        is_new_user = False
        if response.get('Items'):
            user = response['Items'][0]
            user_id = user.get('user_id')
            current_credits = int(user.get('credits', 0))

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET #plan = :plan, marketplace_plan = :mp, credits = :credits',
                ExpressionAttributeNames={'#plan': 'plan'},
                ExpressionAttributeValues={':plan': aivedha_plan, ':mp': plan_name, ':credits': current_credits + credits}
            )
        else:
            is_new_user = True
            user_id = f"github-{github_id}"
            users_table.put_item(Item={
                'user_id': user_id,
                'email': github_email or f"{github_login}@github.marketplace.pending",
                'fullName': github_login,
                'githubId': github_id,
                'credits': credits,
                'plan': aivedha_plan,
                'created_at': datetime.utcnow().isoformat(),
                'login_method': 'github_marketplace'
            })

        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'success': True, 'action': 'purchased', 'plan': aivedha_plan})}
    except Exception as e:
        print(f"Marketplace purchase error: {str(e)}")
        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'received': True, 'error': str(e)})}


def handle_marketplace_cancellation(marketplace_purchase, sender, cors_headers):
    """Handle marketplace subscription cancellation."""
    try:
        account = marketplace_purchase.get('account', {})
        github_id = str(account.get('id', ''))

        dynamodb = get_dynamodb()
        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.query(
            IndexName='github-id-index',
            KeyConditionExpression='githubId = :gid',
            ExpressionAttributeValues={':gid': github_id}
        )

        if response.get('Items'):
            user = response['Items'][0]
            users_table.update_item(
                Key={'user_id': user.get('user_id')},
                UpdateExpression='SET #plan = :plan, marketplace_cancelled = :cancelled',
                ExpressionAttributeNames={'#plan': 'plan'},
                ExpressionAttributeValues={':plan': 'Aarambh', ':cancelled': datetime.utcnow().isoformat()}
            )

        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'success': True, 'action': 'cancelled'})}
    except Exception as e:
        print(f"Marketplace cancellation error: {str(e)}")
        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'received': True, 'error': str(e)})}
