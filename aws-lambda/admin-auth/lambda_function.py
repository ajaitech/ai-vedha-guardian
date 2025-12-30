import json
import boto3
import bcrypt
import jwt
import uuid
import os
import base64
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# Configuration - Environment variables (with DynamoDB fallback)
ADMIN_USERS_TABLE = 'admin-users'
SETTINGS_TABLE = 'admin-system-settings'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 8


def get_jwt_secret():
    """Get JWT secret from DynamoDB config or environment variable."""
    # First try DynamoDB
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(SETTINGS_TABLE)
        response = table.get_item(
            Key={'setting_category': 'jwt', 'setting_key': 'admin_jwt_secret'}
        )
        if 'Item' in response:
            value = response['Item'].get('value', '')
            # Decrypt if encrypted
            if value and value.startswith('ENC:'):
                try:
                    encoded = value.replace('ENC:', '')
                    return base64.b64decode(encoded).decode()
                except:
                    pass
            elif value:
                return value
    except Exception as e:
        print(f"Config lookup error: {e}")

    # Fall back to environment variable
    return os.environ.get('ADMIN_JWT_SECRET')

# Allowed CORS origins (Issue #7 fix)
ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://admin.aivedha.ai'
]


def get_cors_origin(event):
    """Get CORS origin if it's in the allowed list"""
    origin = None
    headers = event.get('headers', {}) or {}

    # Headers might be case-insensitive
    for key, value in headers.items():
        if key.lower() == 'origin':
            origin = value
            break

    if origin in ALLOWED_ORIGINS:
        return origin

    # Default to primary domain if origin not in headers
    return 'https://aivedha.ai'


def get_cors_headers(event):
    """Generate CORS headers with restricted origins (Fix #7)"""
    origin = get_cors_origin(event)
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }


def create_error_response(status_code, error_code, message, event):
    """Create sanitized error response (Fix #17)"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps({
            'success': False,
            'error': error_code,
            'message': message
        })
    }


def create_success_response(data, event):
    """Create success response"""
    return {
        'statusCode': 200,
        'headers': get_cors_headers(event),
        'body': json.dumps({
            'success': True,
            **data
        })
    }


def lambda_handler(event, context):
    """
    AWS Lambda function for admin authentication
    Handles admin login, token verification, and logout
    """

    # Get JWT secret (from DynamoDB or environment)
    JWT_SECRET = get_jwt_secret()

    # Validate JWT secret is configured
    if not JWT_SECRET:
        # Log internally but don't expose to client (Fix #17)
        print("CRITICAL: ADMIN_JWT_SECRET not configured in DynamoDB or environment")
        return create_error_response(500, 'CONFIG_ERROR', 'Server configuration error', event)

    # Initialize DynamoDB
    dynamodb = boto3.resource('dynamodb')

    # Handle API Gateway request
    http_method = event.get('httpMethod', 'POST')
    path = event.get('path', '')

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': ''
        }

    # Parse request body
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return create_error_response(400, 'INVALID_JSON', 'Invalid request body', event)

    # Route to appropriate handler
    try:
        if '/admin/auth/login' in path:
            return handle_login(body, dynamodb, event)
        elif '/admin/auth/verify' in path:
            return handle_verify_token(event, dynamodb)
        elif '/admin/auth/logout' in path:
            return handle_logout(event)
        elif '/admin/auth/refresh' in path:
            return handle_refresh_token(event, dynamodb)
        else:
            return create_error_response(404, 'NOT_FOUND', 'Endpoint not found', event)
    except Exception as e:
        # Log full error internally but sanitize response (Fix #17)
        print(f"Admin auth error: {type(e).__name__}: {str(e)}")
        return create_error_response(500, 'INTERNAL_ERROR', 'An unexpected error occurred', event)


def handle_login(body, dynamodb, event):
    """Handle admin login with bcrypt password verification"""

    email = body.get('email', '').strip().lower()
    password = body.get('password', '')

    # Input validation
    if not email or not password:
        return create_error_response(400, 'MISSING_CREDENTIALS', 'Email and password are required', event)

    # Email format validation
    if '@' not in email or '.' not in email:
        return create_error_response(400, 'INVALID_EMAIL', 'Invalid email format', event)

    try:
        # Query DynamoDB using GSI on email (Fix #6 - using query instead of scan)
        table = dynamodb.Table(ADMIN_USERS_TABLE)
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={
                ':email': email
            }
        )

        items = response.get('Items', [])

        if not items:
            # Don't reveal whether email exists (security best practice)
            return create_error_response(401, 'INVALID_CREDENTIALS', 'Invalid email or password', event)

        user = items[0]

        # Check if user is active
        if user.get('status') != 'active':
            return create_error_response(403, 'ACCOUNT_DISABLED', 'Account is disabled', event)

        # Verify password with bcrypt
        stored_hash = user.get('password_hash', '')
        if not bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
            # Log failed attempt (for security monitoring)
            print(f"Failed login attempt for admin: {email}")
            return create_error_response(401, 'INVALID_CREDENTIALS', 'Invalid email or password', event)

        # Generate JWT token
        token_payload = {
            'admin_user_id': user['admin_user_id'],
            'email': user['email'],
            'name': user.get('name', ''),
            'role': user.get('role', 'Admin'),
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            'iss': 'aivedha-admin-auth',
            'aud': 'aivedha-admin-portal'
        }

        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # Update last login timestamp
        try:
            table.update_item(
                Key={'admin_user_id': user['admin_user_id']},
                UpdateExpression='SET last_login = :login_time',
                ExpressionAttributeValues={
                    ':login_time': datetime.utcnow().isoformat()
                }
            )
        except Exception as update_error:
            # Non-critical error, log but continue
            print(f"Failed to update last_login: {update_error}")

        # Log successful login
        print(f"Admin login successful: {email}")

        return create_success_response({
            'token': token,
            'user': {
                'admin_user_id': user['admin_user_id'],
                'email': user['email'],
                'name': user.get('name', ''),
                'role': user.get('role', 'Admin'),
                'location': user.get('location', '')
            },
            'expires_in': JWT_EXPIRATION_HOURS * 3600
        }, event)

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        print(f"DynamoDB error during login: {error_code}")
        return create_error_response(500, 'DATABASE_ERROR', 'Unable to process login request', event)


def handle_verify_token(event, dynamodb):
    """Verify JWT token and return user info (Fix #15 - proper authorization check)"""

    # Extract token from Authorization header
    headers = event.get('headers', {}) or {}
    auth_header = None

    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break

    if not auth_header:
        return create_error_response(401, 'NO_TOKEN', 'Authorization token required', event)

    # Extract Bearer token
    if not auth_header.startswith('Bearer '):
        return create_error_response(401, 'INVALID_TOKEN_FORMAT', 'Invalid token format', event)

    token = auth_header[7:]  # Remove 'Bearer ' prefix

    try:
        # Verify and decode JWT with full validation
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={
                'require': ['exp', 'iat', 'admin_user_id', 'email'],
                'verify_exp': True,
                'verify_iat': True
            },
            audience='aivedha-admin-portal',
            issuer='aivedha-admin-auth'
        )

        # Verify user still exists and is active (Fix #15)
        table = dynamodb.Table(ADMIN_USERS_TABLE)
        response = table.get_item(
            Key={'admin_user_id': payload['admin_user_id']}
        )

        user = response.get('Item')
        if not user:
            return create_error_response(401, 'USER_NOT_FOUND', 'User no longer exists', event)

        if user.get('status') != 'active':
            return create_error_response(403, 'ACCOUNT_DISABLED', 'Account is disabled', event)

        return create_success_response({
            'valid': True,
            'user': {
                'admin_user_id': payload['admin_user_id'],
                'email': payload['email'],
                'name': payload.get('name', ''),
                'role': payload.get('role', 'Admin')
            }
        }, event)

    except jwt.ExpiredSignatureError:
        return create_error_response(401, 'TOKEN_EXPIRED', 'Token has expired', event)
    except jwt.InvalidAudienceError:
        return create_error_response(401, 'INVALID_AUDIENCE', 'Invalid token audience', event)
    except jwt.InvalidIssuerError:
        return create_error_response(401, 'INVALID_ISSUER', 'Invalid token issuer', event)
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {type(e).__name__}")
        return create_error_response(401, 'INVALID_TOKEN', 'Invalid or malformed token', event)


def handle_refresh_token(event, dynamodb):
    """Refresh JWT token before expiration"""

    # Verify current token first
    verify_result = handle_verify_token(event, dynamodb)
    verify_body = json.loads(verify_result.get('body', '{}'))

    if not verify_body.get('success'):
        return verify_result

    user = verify_body.get('user', {})

    # Generate new token
    token_payload = {
        'admin_user_id': user['admin_user_id'],
        'email': user['email'],
        'name': user.get('name', ''),
        'role': user.get('role', 'Admin'),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iss': 'aivedha-admin-auth',
        'aud': 'aivedha-admin-portal'
    }

    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return create_success_response({
        'token': token,
        'expires_in': JWT_EXPIRATION_HOURS * 3600
    }, event)


def handle_logout(event):
    """Handle logout - primarily for logging purposes since JWT is stateless"""

    # Extract user info from token for logging
    headers = event.get('headers', {}) or {}
    auth_header = None

    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]
        try:
            # Decode without verification just for logging
            payload = jwt.decode(token, options={'verify_signature': False})
            print(f"Admin logout: {payload.get('email', 'unknown')}")
        except:
            pass

    return create_success_response({
        'message': 'Logged out successfully'
    }, event)
