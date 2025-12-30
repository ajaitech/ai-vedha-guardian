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

# Configuration - Load from environment or AWS Secrets Manager
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
API_KEYS_TABLE = os.environ.get('API_KEYS_TABLE', 'aivedha-guardian-api-keys')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
API_KEY_SECRET = os.environ.get('API_KEY_SECRET', 'aivedha-api-key-secret-2024-v1')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
ses_client = boto3.client('ses', region_name='us-east-1')

# Secrets cache
_secrets_cache = {}


# =============================================================================
# AUTO API KEY GENERATION FOR GITHUB MARKETPLACE
# =============================================================================

def generate_api_key():
    """
    Generate a secure API key for CI/CD integration.
    Returns: (display_key, key_hash)
    Format: avg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
    """
    key_suffix = secrets.token_hex(16)
    display_key = f"avg_live_{key_suffix}"

    # Hash the key for storage (we never store the actual key)
    key_hash = hashlib.sha256(
        (display_key + API_KEY_SECRET).encode()
    ).hexdigest()

    return display_key, key_hash


def create_auto_api_key(user_id: str, email: str, source: str = 'github_marketplace'):
    """
    Auto-create an API key for a user during GitHub Marketplace installation.
    Returns the display key (shown only once) or None if creation fails.
    """
    try:
        api_keys_table = dynamodb.Table(API_KEYS_TABLE)

        # Check if user already has an active API key
        existing = api_keys_table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        # If user already has active key, skip creation
        if existing.get('Items'):
            print(f"User {user_id} already has {len(existing['Items'])} active API key(s)")
            return None

        # Generate new API key
        display_key, key_hash = generate_api_key()
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=90)  # 90 days default for marketplace

        # Store key metadata
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
            'permissions': [
                'audit:create',
                'audit:read',
                'audit:status',
                'report:download',
                'certificate:read'
            ],
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
    """
    Send welcome email with auto-generated API key for GitHub Marketplace users.
    """
    try:
        first_name = full_name.split()[0] if full_name else 'there'

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f23; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,215,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo h1 {{ color: #FFD700; font-size: 32px; margin: 0; }}
        .logo p {{ color: #888; margin-top: 8px; }}
        .welcome-box {{ background: linear-gradient(135deg, #00ff8822, #00ff8811); border: 1px solid #00ff88; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }}
        .api-key-box {{ background: #000; border: 2px dashed #FFD700; border-radius: 12px; padding: 20px; margin: 24px 0; }}
        .api-key {{ font-family: 'Courier New', monospace; font-size: 14px; color: #00ff88; word-break: break-all; padding: 12px; background: rgba(0,255,136,0.1); border-radius: 8px; }}
        .warning {{ background: linear-gradient(135deg, #ff6b6b22, #ff6b6b11); border: 1px solid #ff6b6b; border-radius: 8px; padding: 16px; margin: 16px 0; }}
        .warning-text {{ color: #ff6b6b; font-size: 14px; }}
        .stats {{ display: flex; justify-content: center; gap: 40px; margin: 24px 0; }}
        .stat {{ text-align: center; }}
        .stat-value {{ font-size: 32px; font-weight: bold; color: #FFD700; }}
        .stat-label {{ font-size: 12px; color: #888; text-transform: uppercase; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px; }}
        .code-block {{ background: #000; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: 'Courier New', monospace; font-size: 12px; color: #00ff88; overflow-x: auto; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        ul {{ padding-left: 20px; }}
        li {{ margin: 8px 0; color: #ddd; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🛡️ AiVedha Guard</h1>
            <p>AI-Powered Security Audit Platform</p>
        </div>

        <div class="welcome-box">
            <h2 style="color: #00ff88; margin: 0 0 8px 0;">Welcome to AiVedha Guard!</h2>
            <p style="color: #ddd; margin: 0;">Your GitHub Marketplace installation is complete</p>
        </div>

        <p style="color: #ddd; line-height: 1.8;">Hello {first_name},</p>
        <p style="color: #ddd; line-height: 1.8;">
            Thank you for installing AiVedha Guard from GitHub Marketplace! Your account is now ready
            with <strong style="color: #FFD700;">{credits} security audit credits</strong> on the <strong style="color: #FFD700;">{plan}</strong> plan.
        </p>

        <div class="api-key-box">
            <h3 style="color: #FFD700; margin: 0 0 16px 0; text-align: center;">🔑 Your CI/CD API Key</h3>
            <div class="api-key">{api_key}</div>
            <div class="warning">
                <p class="warning-text">
                    ⚠️ <strong>IMPORTANT:</strong> This key is shown only once! Save it securely now.
                    <br>Store in GitHub Secrets, never commit to code.
                </p>
            </div>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">{credits}</div>
                <div class="stat-label">Credits Available</div>
            </div>
            <div class="stat">
                <div class="stat-value">90</div>
                <div class="stat-label">Days Valid</div>
            </div>
        </div>

        <h3 style="color: #FFD700;">🚀 Quick Start - GitHub Actions</h3>
        <p style="color: #ddd; font-size: 14px;">Add this workflow to your repository:</p>

        <div class="code-block">
# .github/workflows/security-audit.yml<br>
name: AiVedha Security Audit<br>
on: [push]<br>
jobs:<br>
&nbsp;&nbsp;audit:<br>
&nbsp;&nbsp;&nbsp;&nbsp;runs-on: ubuntu-latest<br>
&nbsp;&nbsp;&nbsp;&nbsp;steps:<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- name: Run Security Audit<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;run: |<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;curl -X POST https://api.aivedha.ai/api/cicd/audit \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-H "X-API-Key: ${{{{ secrets.AIVEDHA_API_KEY }}}}" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-d '{{"url": "https://your-site.com"}}'
        </div>

        <h3 style="color: #FFD700;">📋 Setup Steps</h3>
        <ul>
            <li>Go to your repository → Settings → Secrets → Actions</li>
            <li>Click "New repository secret"</li>
            <li>Name: <code style="color: #00ff88;">AIVEDHA_API_KEY</code></li>
            <li>Value: Paste your API key above</li>
            <li>Add the workflow file to your repository</li>
        </ul>

        <div style="text-align: center; margin-top: 32px;">
            <a href="{SITE_URL}/dashboard" class="cta-button">View Dashboard</a>
            <a href="{SITE_URL}/faq#cicd-integration" class="cta-button" style="background: linear-gradient(135deg, #4488ff, #2266cc); color: #fff;">Setup Guide</a>
        </div>

        <div class="footer">
            <p>Questions? Reply to this email or contact support@aivedha.ai</p>
            <p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p>
            <p style="margin-top: 16px;">
                <a href="{SITE_URL}/privacy" style="color: #888; margin: 0 8px;">Privacy</a> |
                <a href="{SITE_URL}/terms" style="color: #888; margin: 0 8px;">Terms</a>
            </p>
        </div>
    </div>
</body>
</html>
"""

        ses_client.send_email(
            Source='AiVedha Guard <noreply@aivedha.ai>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': f'🔑 Your AiVedha Guard API Key - GitHub Marketplace Setup Complete'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        print(f"Welcome email with API key sent to {email}")
        return True

    except Exception as e:
        print(f"Error sending welcome email: {e}")
        return False

def get_github_credentials():
    """
    Get GitHub credentials from environment variables or AWS Secrets Manager.
    Returns tuple of (client_id, client_secret, webhook_secret)
    """
    global _secrets_cache

    # Check cache first
    if 'github' in _secrets_cache:
        return _secrets_cache['github']

    # Try environment variables first
    client_id = os.environ.get('GITHUB_CLIENT_ID', '')
    client_secret = os.environ.get('GITHUB_CLIENT_SECRET', '')
    webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET', '')

    # If environment variables are set, use them
    if client_id and client_secret:
        _secrets_cache['github'] = (client_id, client_secret, webhook_secret)
        return _secrets_cache['github']

    # Fallback to AWS Secrets Manager
    try:
        secrets_client = boto3.client('secretsmanager', region_name=AWS_REGION)
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

    # Return empty values if nothing found (will cause auth to fail with clear error)
    return ('', '', '')

# Lazy-load credentials
GITHUB_CLIENT_ID = None
GITHUB_CLIENT_SECRET = None
GITHUB_WEBHOOK_SECRET = None

def ensure_credentials():
    """Ensure GitHub credentials are loaded. Returns True if valid, False otherwise."""
    global GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET

    if GITHUB_CLIENT_ID is None:
        GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET = get_github_credentials()

    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)

def lambda_handler(event, context):
    """
    GitHub OAuth Handler
    Handles OAuth code exchange, status checks, and webhook events
    """

    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': 'https://aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hub-Signature-256,X-GitHub-Event,X-GitHub-Delivery',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }

    # Handle CORS preflight
    http_method = event.get('httpMethod', 'POST')
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    # Route based on path
    path = event.get('path', '')

    # Handle status endpoint for GitHub Marketplace
    if '/status' in path or path.endswith('/github/status'):
        return handle_status_check(event, cors_headers)

    # Handle webhook events from GitHub Marketplace
    if event.get('headers', {}).get('X-GitHub-Event') or event.get('headers', {}).get('x-github-event'):
        return handle_webhook(event, cors_headers)

    try:
        # Ensure credentials are loaded before processing OAuth
        if not ensure_credentials():
            print("ERROR: GitHub OAuth credentials not configured")
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Service temporarily unavailable',
                    'message': 'GitHub OAuth is not configured. Please contact support.'
                })
            }

        # Parse request body
        body = json.loads(event.get('body', '{}'))
        code = body.get('code')
        redirect_uri = body.get('redirect_uri')

        if not code:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Authorization code is required'})
            }

        # Exchange code for access token
        token_data = exchange_code_for_token(code, redirect_uri)
        if not token_data or 'access_token' not in token_data:
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Failed to exchange code for token'})
            }

        access_token = token_data['access_token']

        # Get user info from GitHub
        user_info = get_github_user_info(access_token)
        if not user_info:
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Failed to get user info from GitHub'})
            }

        # Get user email (may need separate API call if email is private)
        email = user_info.get('email')
        if not email:
            email = get_github_user_email(access_token)

        if not email:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Unable to retrieve email from GitHub. Please make your email public or grant email access.'})
            }

        github_id = str(user_info.get('id'))
        full_name = user_info.get('name') or user_info.get('login')
        avatar = user_info.get('avatar_url')

        # Check/create user in DynamoDB
        users_table = dynamodb.Table(USERS_TABLE)

        # Try to find existing user by email using GSI query (efficient and reliable)
        # This ensures email uniqueness across all login methods (Google, GitHub, email)
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        is_new_user = False
        if response['Items']:
            # Existing user found - check login method
            user = response['Items'][0]
            user_id = user.get('user_id')
            credits = user.get('credits', 0)
            plan = user.get('plan', 'Aarambh')  # Default to Aarambh plan
            existing_login_method = user.get('login_method', 'email')
            existing_github_id = user.get('githubId')

            # Check if this is a different social provider trying to use same email
            # Allow if: same github account, or account has no social provider linked
            if existing_github_id and existing_github_id != github_id:
                # Different GitHub account trying to use same email - this shouldn't happen
                return {
                    'statusCode': 409,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': 'Email already registered',
                        'message': f'This email is already registered with a different GitHub account. Please use the original GitHub account or sign in with email/password.',
                        'existing_method': existing_login_method,
                        'suggested_action': 'use_existing_account'
                    })
                }

            # If the existing account was created with Google, inform user about account linking
            if existing_login_method == 'google' and not existing_github_id:
                # First time linking GitHub to a Google account - allow it
                print(f"Linking GitHub to existing Google account: {email}")

            # Update user with GitHub info (link accounts)
            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET githubId = :gid, avatar = :avatar, fullName = :name, last_login = :login',
                ExpressionAttributeValues={
                    ':gid': github_id,
                    ':avatar': avatar,
                    ':name': full_name,
                    ':login': datetime.utcnow().isoformat()
                }
            )
        else:
            # New user - create account with 3 free credits (Aarambh plan)
            is_new_user = True
            user_id = f"github-{github_id}"
            credits = 3  # Free credits for new users - Aarambh plan default
            plan = 'Aarambh'  # Default plan

            users_table.put_item(Item={
                'user_id': user_id,
                'email': email,
                'fullName': full_name,
                'githubId': github_id,
                'avatar': avatar,
                'credits': 3,  # Free credits - Aarambh plan default
                'plan': 'Aarambh',
                'subscription_plan': 'aarambh_free',
                'created_at': datetime.utcnow().isoformat(),
                'last_login': datetime.utcnow().isoformat(),
                'login_method': 'github',
                'github_marketplace_install': True
            })

        # Convert Decimal to int for JSON serialization
        if isinstance(credits, Decimal):
            credits = int(credits)

        # Auto-generate API key for new GitHub users (seamless CI/CD integration)
        auto_api_key = None
        if is_new_user:
            auto_api_key = create_auto_api_key(user_id, email, 'github_oauth')
            if auto_api_key:
                # Send welcome email with API key
                send_welcome_email_with_api_key(
                    email=email,
                    full_name=full_name,
                    api_key=auto_api_key,
                    plan=plan,
                    credits=credits
                )

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
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)})
        }


def exchange_code_for_token(code, redirect_uri):
    """Exchange authorization code for access token"""
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
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Token exchange error: {str(e)}")
        return None


def get_github_user_info(access_token):
    """Get user info from GitHub API"""
    try:
        req = urllib.request.Request(
            'https://api.github.com/user',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AiVedha-Guardian'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Get user info error: {str(e)}")
        return None


def get_github_user_email(access_token):
    """Get user's primary email from GitHub API"""
    try:
        req = urllib.request.Request(
            'https://api.github.com/user/emails',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AiVedha-Guardian'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            emails = json.loads(response.read().decode('utf-8'))
            # Find primary email
            for email_obj in emails:
                if email_obj.get('primary'):
                    return email_obj.get('email')
            # Fallback to first verified email
            for email_obj in emails:
                if email_obj.get('verified'):
                    return email_obj.get('email')
            # Fallback to first email
            if emails:
                return emails[0].get('email')
    except Exception as e:
        print(f"Get email error: {str(e)}")
    return None


def handle_status_check(event, cors_headers):
    """
    Handle GitHub Marketplace status check requests
    Returns the current status of the integration
    """
    try:
        http_method = event.get('httpMethod', 'GET')

        # For GET requests, return service status
        if http_method == 'GET':
            # Get installation stats from DynamoDB
            users_table = dynamodb.Table(USERS_TABLE)

            # Count GitHub users - Note: For admin stats, scan with COUNT is acceptable
            # as this is not user-facing and runs infrequently
            # TODO: Consider adding login_method GSI if this becomes a frequent operation
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
                    'features': [
                        'OAuth Authentication',
                        'Website Security Audits',
                        'OWASP Vulnerability Scanning',
                        'SSL/TLS Analysis',
                        'Security Reports & Certificates'
                    ],
                    'endpoints': {
                        'auth': 'https://api.aivedha.ai/api/auth/github',
                        'status': 'https://api.aivedha.ai/api/auth/github/status',
                        'dashboard': 'https://aivedha.ai/dashboard'
                    },
                    'timestamp': datetime.utcnow().isoformat(),
                    'health': 'healthy'
                })
            }

        # For POST requests, handle webhook verification
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))

            # Handle marketplace purchase events
            action = body.get('action')
            marketplace_purchase = body.get('marketplace_purchase', {})
            sender = body.get('sender', {})

            if action:
                print(f"GitHub Marketplace event: {action}")
                print(f"Marketplace purchase: {json.dumps(marketplace_purchase)}")
                print(f"Sender: {json.dumps(sender)}")

                # Handle different actions
                if action == 'purchased':
                    # New subscription
                    return handle_marketplace_purchase(marketplace_purchase, sender, cors_headers)
                elif action == 'cancelled':
                    # Subscription cancelled
                    return handle_marketplace_cancellation(marketplace_purchase, sender, cors_headers)
                elif action == 'changed':
                    # Plan changed
                    return handle_marketplace_change(marketplace_purchase, sender, cors_headers)

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'received': True,
                    'action': action,
                    'timestamp': datetime.utcnow().isoformat()
                })
            }

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'status': 'ok'})
        }

    except Exception as e:
        print(f"Status check error: {str(e)}")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'active',
                'health': 'healthy',
                'error': str(e)
            })
        }


def handle_webhook(event, cors_headers):
    """
    Handle GitHub webhook events
    Processes marketplace events, installation events, etc.
    """
    try:
        headers = event.get('headers', {})
        # Handle case-insensitive headers
        github_event = headers.get('X-GitHub-Event') or headers.get('x-github-event', '')
        delivery_id = headers.get('X-GitHub-Delivery') or headers.get('x-github-delivery', '')
        signature = headers.get('X-Hub-Signature-256') or headers.get('x-hub-signature-256', '')

        body = event.get('body', '{}')

        # Verify webhook signature if secret is configured
        if GITHUB_WEBHOOK_SECRET and signature:
            expected_signature = 'sha256=' + hmac.new(
                GITHUB_WEBHOOK_SECRET.encode('utf-8'),
                body.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected_signature):
                print(f"Invalid webhook signature for delivery {delivery_id}")
                return {
                    'statusCode': 401,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Invalid signature'})
                }

        payload = json.loads(body)

        print(f"GitHub webhook received: event={github_event}, delivery={delivery_id}")
        print(f"Payload: {json.dumps(payload)[:500]}")

        # Handle different event types
        if github_event == 'marketplace_purchase':
            action = payload.get('action')
            marketplace_purchase = payload.get('marketplace_purchase', {})
            sender = payload.get('sender', {})

            if action == 'purchased':
                return handle_marketplace_purchase(marketplace_purchase, sender, cors_headers)
            elif action == 'cancelled':
                return handle_marketplace_cancellation(marketplace_purchase, sender, cors_headers)
            elif action == 'changed':
                return handle_marketplace_change(marketplace_purchase, sender, cors_headers)

        elif github_event == 'ping':
            # GitHub sends a ping event when webhook is first configured
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'pong',
                    'zen': payload.get('zen', ''),
                    'hook_id': payload.get('hook_id')
                })
            }

        elif github_event == 'installation':
            # Handle GitHub App installation events
            action = payload.get('action')
            installation = payload.get('installation', {})
            sender = payload.get('sender', {})

            return handle_installation_event(action, installation, sender, cors_headers)

        elif github_event == 'installation_repositories':
            # Handle repository selection changes
            action = payload.get('action')
            installation = payload.get('installation', {})
            repos_added = payload.get('repositories_added', [])
            repos_removed = payload.get('repositories_removed', [])

            return handle_repositories_event(action, installation, repos_added, repos_removed, cors_headers)

        # Acknowledge receipt of event
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'received': True,
                'event': github_event,
                'delivery_id': delivery_id
            })
        }

    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }


def handle_marketplace_purchase(marketplace_purchase, sender, cors_headers):
    """
    Handle new marketplace subscription.
    - Creates user account if not exists
    - Auto-generates API key for seamless CI/CD integration
    - Sends welcome email with API key and setup instructions
    """
    try:
        account = marketplace_purchase.get('account', {})
        plan = marketplace_purchase.get('plan', {})

        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')
        github_email = account.get('email', '')  # May be available from marketplace
        account_type = account.get('type', 'User')  # User or Organization
        plan_name = plan.get('name', 'Aarambh')

        print(f"New marketplace purchase: user={github_login}, plan={plan_name}, type={account_type}")

        # Map GitHub Marketplace plan to our plan with credits
        plan_mapping = {
            'aarambh': ('Aarambh', 3),
            'free': ('Aarambh', 3),
            'raksha': ('Raksha', 10),
            'starter': ('Raksha', 10),
            'suraksha': ('Suraksha', 30),
            'professional': ('Suraksha', 30),
            'vajra': ('Vajra', 100),
            'agency': ('Vajra', 100),
            'chakra': ('Chakra', 500),
            'enterprise': ('Chakra', 500),
            'unlimited': ('Chakra', 500),
        }

        plan_lower = plan_name.lower()
        aivedha_plan = 'Aarambh'
        credits = 3  # Default free credits

        for key, (mapped_plan, mapped_credits) in plan_mapping.items():
            if key in plan_lower:
                aivedha_plan = mapped_plan
                credits = mapped_credits
                break

        users_table = dynamodb.Table(USERS_TABLE)

        # Check if user exists by GitHub ID
        response = users_table.query(
            IndexName='github-id-index',
            KeyConditionExpression='githubId = :gid',
            ExpressionAttributeValues={':gid': github_id}
        )

        is_new_user = False
        user_id = None
        user_email = github_email

        if response.get('Items'):
            # Existing user - update plan and add credits
            user = response['Items'][0]
            user_id = user.get('user_id')
            user_email = user.get('email', github_email)
            full_name = user.get('fullName', github_login)
            current_credits = int(user.get('credits', 0)) if user.get('credits') else 0

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET #plan = :plan, marketplace_plan = :mp, marketplace_updated = :updated, credits = :credits',
                ExpressionAttributeNames={'#plan': 'plan'},
                ExpressionAttributeValues={
                    ':plan': aivedha_plan,
                    ':mp': plan_name,
                    ':updated': datetime.utcnow().isoformat(),
                    ':credits': current_credits + credits
                }
            )

            print(f"Updated existing user {user_id}: plan={aivedha_plan}, added {credits} credits")

        else:
            # New user from marketplace - create account automatically
            is_new_user = True
            user_id = f"github-{github_id}"
            full_name = github_login

            # If no email from marketplace, we'll get it when they OAuth
            if not user_email:
                user_email = f"{github_login}@github.marketplace.pending"

            users_table.put_item(Item={
                'user_id': user_id,
                'email': user_email,
                'fullName': github_login,
                'githubId': github_id,
                'githubLogin': github_login,
                'avatar': f'https://github.com/{github_login}.png',
                'credits': credits,
                'plan': aivedha_plan,
                'subscription_plan': f"{aivedha_plan.lower()}_marketplace",
                'marketplace_plan': plan_name,
                'marketplace_install_type': account_type,
                'created_at': datetime.utcnow().isoformat(),
                'last_login': None,  # Not logged in yet
                'login_method': 'github_marketplace',
                'github_marketplace_install': True,
                'awaiting_oauth': True  # Will be updated when user completes OAuth
            })

            print(f"Created new user {user_id} from marketplace: plan={aivedha_plan}, credits={credits}")

        # Auto-generate API key for seamless integration
        auto_api_key = None
        if user_id and user_email and not user_email.endswith('.pending'):
            auto_api_key = create_auto_api_key(user_id, user_email, 'github_marketplace')

            if auto_api_key:
                # Send welcome email with API key
                send_welcome_email_with_api_key(
                    email=user_email,
                    full_name=full_name if 'full_name' in dir() else github_login,
                    api_key=auto_api_key,
                    plan=aivedha_plan,
                    credits=credits
                )

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'action': 'purchased',
                'github_login': github_login,
                'plan': plan_name,
                'aivedha_plan': aivedha_plan,
                'credits_added': credits,
                'is_new_user': is_new_user,
                'api_key_generated': bool(auto_api_key),
                'welcome_email_sent': bool(auto_api_key)
            })
        }

    except Exception as e:
        print(f"Marketplace purchase error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }


def handle_marketplace_cancellation(marketplace_purchase, sender, cors_headers):
    """Handle marketplace subscription cancellation"""
    try:
        account = marketplace_purchase.get('account', {})
        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')

        print(f"Marketplace cancellation: user={github_login}")

        # Update user in DynamoDB - using GSI for performance
        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.query(
            IndexName='github-id-index',
            KeyConditionExpression='githubId = :gid',
            ExpressionAttributeValues={':gid': github_id}
        )

        if response.get('Items'):
            user = response['Items'][0]
            user_id = user.get('user_id')

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET #plan = :plan, marketplace_plan = :mp, marketplace_cancelled = :cancelled',
                ExpressionAttributeNames={'#plan': 'plan'},
                ExpressionAttributeValues={
                    ':plan': 'Aarambh',
                    ':mp': 'cancelled',
                    ':cancelled': datetime.utcnow().isoformat()
                }
            )

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'action': 'cancelled',
                'github_login': github_login
            })
        }

    except Exception as e:
        print(f"Marketplace cancellation error: {str(e)}")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }


def handle_marketplace_change(marketplace_purchase, sender, cors_headers):
    """Handle marketplace plan change"""
    try:
        account = marketplace_purchase.get('account', {})
        plan = marketplace_purchase.get('plan', {})

        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')
        plan_name = plan.get('name', 'Aarambh')

        print(f"Marketplace plan change: user={github_login}, new_plan={plan_name}")

        # This is similar to purchase - update the plan
        return handle_marketplace_purchase(marketplace_purchase, sender, cors_headers)

    except Exception as e:
        print(f"Marketplace change error: {str(e)}")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }


def handle_installation_event(action, installation, sender, cors_headers):
    """
    Handle GitHub App installation events.
    Actions: created, deleted, suspend, unsuspend, new_permissions_accepted
    """
    try:
        install_id = installation.get('id')
        account = installation.get('account', {})
        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')
        account_type = account.get('type', 'User')

        print(f"GitHub App installation event: action={action}, user={github_login}, install_id={install_id}")

        users_table = dynamodb.Table(USERS_TABLE)

        if action == 'created':
            # New installation - create or update user
            response = users_table.query(
                IndexName='github-id-index',
                KeyConditionExpression='githubId = :gid',
                ExpressionAttributeValues={':gid': github_id}
            )

            if response.get('Items'):
                # Existing user - update with installation info
                user = response['Items'][0]
                user_id = user.get('user_id')

                users_table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='SET github_app_install_id = :iid, github_app_installed = :installed, github_app_installed_at = :now',
                    ExpressionAttributeValues={
                        ':iid': install_id,
                        ':installed': True,
                        ':now': datetime.utcnow().isoformat()
                    }
                )
                print(f"Updated user {user_id} with GitHub App installation")
            else:
                # New user from App installation - create pending account
                user_id = f"github-{github_id}"
                users_table.put_item(Item={
                    'user_id': user_id,
                    'email': f"{github_login}@github.app.pending",
                    'fullName': github_login,
                    'githubId': github_id,
                    'githubLogin': github_login,
                    'avatar': f'https://github.com/{github_login}.png',
                    'credits': 3,  # Free credits
                    'plan': 'Aarambh',
                    'subscription_plan': 'aarambh_free',
                    'created_at': datetime.utcnow().isoformat(),
                    'login_method': 'github_app',
                    'github_app_install_id': install_id,
                    'github_app_installed': True,
                    'github_app_installed_at': datetime.utcnow().isoformat(),
                    'awaiting_oauth': True
                })
                print(f"Created pending user {user_id} from GitHub App installation")

        elif action == 'deleted':
            # App uninstalled - update user status
            response = users_table.query(
                IndexName='github-id-index',
                KeyConditionExpression='githubId = :gid',
                ExpressionAttributeValues={':gid': github_id}
            )

            if response.get('Items'):
                user = response['Items'][0]
                user_id = user.get('user_id')

                users_table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='SET github_app_installed = :installed, github_app_uninstalled_at = :now',
                    ExpressionAttributeValues={
                        ':installed': False,
                        ':now': datetime.utcnow().isoformat()
                    }
                )
                print(f"Marked user {user_id} as uninstalled GitHub App")

        elif action in ['suspend', 'unsuspend']:
            # Handle suspension
            response = users_table.query(
                IndexName='github-id-index',
                KeyConditionExpression='githubId = :gid',
                ExpressionAttributeValues={':gid': github_id}
            )

            if response.get('Items'):
                user = response['Items'][0]
                user_id = user.get('user_id')
                is_suspended = action == 'suspend'

                users_table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='SET github_app_suspended = :suspended, github_app_suspend_updated = :now',
                    ExpressionAttributeValues={
                        ':suspended': is_suspended,
                        ':now': datetime.utcnow().isoformat()
                    }
                )
                print(f"Updated user {user_id} suspension status: {is_suspended}")

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'event': 'installation',
                'action': action,
                'github_login': github_login,
                'install_id': install_id
            })
        }

    except Exception as e:
        print(f"Installation event error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }


def handle_repositories_event(action, installation, repos_added, repos_removed, cors_headers):
    """
    Handle repository selection changes for GitHub App.
    Tracks which repositories the user has granted access to.
    """
    try:
        account = installation.get('account', {})
        github_id = str(account.get('id', ''))
        github_login = account.get('login', '')

        print(f"Repositories event: action={action}, user={github_login}")
        print(f"Repos added: {[r.get('full_name') for r in repos_added]}")
        print(f"Repos removed: {[r.get('full_name') for r in repos_removed]}")

        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.query(
            IndexName='github-id-index',
            KeyConditionExpression='githubId = :gid',
            ExpressionAttributeValues={':gid': github_id}
        )

        if response.get('Items'):
            user = response['Items'][0]
            user_id = user.get('user_id')
            current_repos = user.get('github_repos', [])

            # Update repo list
            if action == 'added':
                for repo in repos_added:
                    repo_info = {
                        'id': repo.get('id'),
                        'name': repo.get('name'),
                        'full_name': repo.get('full_name'),
                        'private': repo.get('private', False),
                        'added_at': datetime.utcnow().isoformat()
                    }
                    # Avoid duplicates
                    if not any(r.get('id') == repo_info['id'] for r in current_repos):
                        current_repos.append(repo_info)

            elif action == 'removed':
                removed_ids = [r.get('id') for r in repos_removed]
                current_repos = [r for r in current_repos if r.get('id') not in removed_ids]

            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET github_repos = :repos, github_repos_updated = :now',
                ExpressionAttributeValues={
                    ':repos': current_repos,
                    ':now': datetime.utcnow().isoformat()
                }
            )
            print(f"Updated user {user_id} repositories: {len(current_repos)} repos")

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'event': 'installation_repositories',
                'action': action,
                'repos_added': len(repos_added),
                'repos_removed': len(repos_removed)
            })
        }

    except Exception as e:
        print(f"Repositories event error: {str(e)}")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'received': True, 'error': str(e)})
        }
