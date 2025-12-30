"""
AiVedha Guard - Common Utilities Module
========================================
Shared utility functions used across multiple Lambda functions.
This module should be included in Lambda Layers for all functions.

Version: 1.0.0
Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import json
import os
import jwt
import boto3
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional, List


# ============================================================================
# CONFIGURATION
# ============================================================================

AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
SETTINGS_TABLE = os.environ.get('SETTINGS_TABLE', 'admin-system-settings')

# Allowed CORS origins
ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://admin.aivedha.ai',
    'http://localhost:5173',
    'http://localhost:8080'
]

# PayPal Configuration
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'live')
PAYPAL_API_BASE = os.environ.get('PAYPAL_API_BASE_URL', 'https://api-m.paypal.com')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', '')

# Token cache
_paypal_token_cache = {
    'access_token': None,
    'expiry': None
}


# ============================================================================
# JSON ENCODING
# ============================================================================

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal types from DynamoDB."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert to int if no decimal places, otherwise float
            return int(obj) if obj % 1 == 0 else float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, set):
            return list(obj)
        return super(DecimalEncoder, self).default(obj)


def decimal_to_float(obj: Any) -> Any:
    """
    Recursively convert Decimal objects to float/int for JSON serialization.

    Args:
        obj: Object to convert

    Returns:
        Converted object
    """
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj


# ============================================================================
# CORS HELPERS
# ============================================================================

def get_cors_headers(event: Dict = None, is_public: bool = False) -> Dict[str, str]:
    """
    Get CORS headers based on request origin.

    Args:
        event: API Gateway event with headers
        is_public: If True, allow broader CORS access

    Returns:
        Dict of CORS headers
    """
    origin = None

    if event:
        headers = event.get('headers', {}) or {}
        for key, value in headers.items():
            if key.lower() == 'origin':
                origin = value
                break

    # Determine allowed origin
    if origin and origin in ALLOWED_ORIGINS:
        allowed_origin = origin
    elif is_public:
        allowed_origin = '*'
    else:
        allowed_origin = 'https://aivedha.ai'

    return {
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true' if origin in ALLOWED_ORIGINS else 'false',
        'Content-Type': 'application/json'
    }


# ============================================================================
# API RESPONSE BUILDERS
# ============================================================================

def create_response(
    status_code: int,
    body: Dict[str, Any],
    event: Dict = None,
    cors: bool = True,
    is_public: bool = False
) -> Dict[str, Any]:
    """
    Create a standardized API Gateway response.

    Args:
        status_code: HTTP status code
        body: Response body (will be JSON serialized)
        event: API Gateway event (for CORS origin detection)
        cors: Whether to include CORS headers
        is_public: Whether this is a public endpoint

    Returns:
        API Gateway response dict
    """
    response = {
        'statusCode': status_code,
        'body': json.dumps(body, cls=DecimalEncoder)
    }

    if cors:
        response['headers'] = get_cors_headers(event, is_public)
    else:
        response['headers'] = {'Content-Type': 'application/json'}

    return response


def create_error_response(
    status_code: int,
    error_message: str,
    error_code: str = None,
    event: Dict = None
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        status_code: HTTP status code
        error_message: Human-readable error message
        error_code: Optional error code for client handling
        event: API Gateway event

    Returns:
        API Gateway error response
    """
    body = {
        'success': False,
        'error': error_message
    }
    if error_code:
        body['errorCode'] = error_code

    return create_response(status_code, body, event)


def create_success_response(
    data: Any = None,
    message: str = None,
    event: Dict = None
) -> Dict[str, Any]:
    """
    Create a standardized success response.

    Args:
        data: Response data
        message: Optional success message
        event: API Gateway event

    Returns:
        API Gateway success response
    """
    body = {'success': True}
    if data is not None:
        body['data'] = data
    if message:
        body['message'] = message

    return create_response(200, body, event)


# ============================================================================
# JWT AUTHENTICATION
# ============================================================================

def get_jwt_secret(admin: bool = False) -> Optional[str]:
    """
    Get JWT secret from DynamoDB config or environment variable.

    Args:
        admin: If True, get admin secret; otherwise user secret

    Returns:
        JWT secret string or None
    """
    # Try environment first
    if admin:
        secret = os.environ.get('ADMIN_JWT_SECRET')
    else:
        secret = os.environ.get('JWT_SECRET') or os.environ.get('USER_JWT_SECRET')

    if secret:
        return secret

    # Try DynamoDB
    try:
        import base64
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(SETTINGS_TABLE)

        key = 'admin_jwt_secret' if admin else 'user_jwt_secret'
        response = table.get_item(
            Key={'setting_category': 'jwt', 'setting_key': key}
        )

        if 'Item' in response:
            value = response['Item'].get('value', '')
            # Decrypt if encrypted
            if value and value.startswith('ENC:'):
                try:
                    encoded = value.replace('ENC:', '')
                    return base64.b64decode(encoded).decode()
                except Exception:
                    pass
            return value
    except Exception as e:
        print(f"JWT secret lookup error: {e}")

    return None


def verify_admin_token(event: Dict) -> Optional[Dict]:
    """
    Verify admin JWT token from Authorization header.

    Args:
        event: API Gateway event

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        # Get Authorization header
        headers = event.get('headers', {}) or {}
        auth_header = None

        for key, value in headers.items():
            if key.lower() == 'authorization':
                auth_header = value
                break

        if not auth_header:
            return None

        # Extract token
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header

        # Get secret and verify
        secret = get_jwt_secret(admin=True)
        if not secret:
            print("Admin JWT secret not configured")
            return None

        payload = jwt.decode(token, secret, algorithms=['HS256'])

        # Check if admin role
        if payload.get('role') != 'admin':
            return None

        return payload

    except jwt.ExpiredSignatureError:
        print("Admin token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid admin token: {e}")
        return None
    except Exception as e:
        print(f"Admin token verification error: {e}")
        return None


def verify_user_token(event: Dict) -> Optional[Dict]:
    """
    Verify user JWT token from Authorization header.

    Args:
        event: API Gateway event

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        headers = event.get('headers', {}) or {}
        auth_header = None

        for key, value in headers.items():
            if key.lower() == 'authorization':
                auth_header = value
                break

        if not auth_header:
            return None

        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header

        secret = get_jwt_secret(admin=False)
        if not secret:
            print("User JWT secret not configured")
            return None

        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload

    except jwt.ExpiredSignatureError:
        print("User token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid user token: {e}")
        return None
    except Exception as e:
        print(f"User token verification error: {e}")
        return None


# ============================================================================
# PAYPAL API HELPERS
# ============================================================================

def get_paypal_access_token() -> Optional[str]:
    """
    Get valid PayPal access token using client credentials.

    Returns:
        Access token string or None
    """
    global _paypal_token_cache

    # Check cached token
    if _paypal_token_cache['access_token'] and _paypal_token_cache['expiry']:
        if datetime.utcnow() < _paypal_token_cache['expiry']:
            return _paypal_token_cache['access_token']

    client_id = PAYPAL_CLIENT_ID or os.environ.get('PAYPAL_CLIENT_ID')
    client_secret = PAYPAL_CLIENT_SECRET or os.environ.get('PAYPAL_CLIENT_SECRET')

    if not (client_id and client_secret):
        print("PayPal credentials not configured")
        return None

    try:
        import base64
        auth_str = f"{client_id}:{client_secret}"
        auth_bytes = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')

        token_url = f'{PAYPAL_API_BASE}/v1/oauth2/token'
        token_data = b'grant_type=client_credentials'

        request = urllib.request.Request(token_url, data=token_data, method='POST')
        request.add_header('Authorization', f'Basic {auth_bytes}')
        request.add_header('Content-Type', 'application/x-www-form-urlencoded')

        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode())

            if 'access_token' in result:
                _paypal_token_cache['access_token'] = result['access_token']
                expires_in = result.get('expires_in', 32400)  # Default 9 hours
                _paypal_token_cache['expiry'] = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                return result['access_token']
            else:
                print(f"PayPal token request failed: {result}")
                return None

    except Exception as e:
        print(f"PayPal token error: {e}")
        return None


def paypal_api_request(
    endpoint: str,
    method: str = 'GET',
    data: Dict = None,
    access_token: str = None
) -> Optional[Dict]:
    """
    Make a request to PayPal API.

    Args:
        endpoint: API endpoint (without base URL)
        method: HTTP method
        data: Request body for POST/PUT/PATCH
        access_token: Optional access token (will fetch if not provided)

    Returns:
        API response dict or None on error
    """
    if not access_token:
        access_token = get_paypal_access_token()

    if not access_token:
        return None

    url = f"{PAYPAL_API_BASE}/{endpoint.lstrip('/')}"

    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        if data:
            body = json.dumps(data).encode('utf-8')
        else:
            body = None

        request = urllib.request.Request(url, data=body, method=method)
        for key, value in headers.items():
            request.add_header(key, value)

        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        print(f"PayPal API error {e.code}: {error_body}")
        return None
    except Exception as e:
        print(f"PayPal API request error: {e}")
        return None


def verify_paypal_webhook(
    headers: Dict[str, str],
    body: str,
    webhook_id: str = None
) -> bool:
    """
    Verify PayPal webhook signature.

    Args:
        headers: Request headers containing PayPal signature info
        body: Raw request body
        webhook_id: PayPal webhook ID for verification

    Returns:
        True if signature is valid
    """
    webhook_id = webhook_id or os.environ.get('PAYPAL_WEBHOOK_ID')
    if not webhook_id:
        print("PayPal webhook ID not configured, skipping verification")
        return True  # Allow in dev mode

    access_token = get_paypal_access_token()
    if not access_token:
        return False

    # Get required headers (case-insensitive)
    def get_header(name: str) -> str:
        for k, v in headers.items():
            if k.lower() == name.lower():
                return v
        return ''

    verification_data = {
        'auth_algo': get_header('PAYPAL-AUTH-ALGO'),
        'cert_url': get_header('PAYPAL-CERT-URL'),
        'transmission_id': get_header('PAYPAL-TRANSMISSION-ID'),
        'transmission_sig': get_header('PAYPAL-TRANSMISSION-SIG'),
        'transmission_time': get_header('PAYPAL-TRANSMISSION-TIME'),
        'webhook_id': webhook_id,
        'webhook_event': json.loads(body) if isinstance(body, str) else body
    }

    try:
        result = paypal_api_request(
            '/v1/notifications/verify-webhook-signature',
            method='POST',
            data=verification_data,
            access_token=access_token
        )
        return result and result.get('verification_status') == 'SUCCESS'
    except Exception as e:
        print(f"PayPal webhook verification error: {e}")
        return False


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_user_from_event(event: Dict) -> Optional[Dict]:
    """
    Extract user info from API Gateway event.

    Args:
        event: API Gateway event

    Returns:
        User dict with user_id, email, etc. or None
    """
    # Try JWT token first
    payload = verify_user_token(event)
    if payload:
        return {
            'user_id': payload.get('user_id') or payload.get('sub'),
            'email': payload.get('email'),
            'name': payload.get('name'),
            'role': payload.get('role', 'user')
        }

    # Try request body
    try:
        body = event.get('body', '{}')
        if body:
            data = json.loads(body)
            if 'user_id' in data or 'email' in data:
                return {
                    'user_id': data.get('user_id'),
                    'email': data.get('email'),
                    'name': data.get('name')
                }
    except Exception:
        pass

    return None


def parse_request_body(event: Dict) -> Dict:
    """
    Safely parse JSON body from API Gateway event.

    Args:
        event: API Gateway event

    Returns:
        Parsed body dict (empty dict on error)
    """
    try:
        body = event.get('body', '{}')
        if not body:
            return {}
        return json.loads(body)
    except json.JSONDecodeError:
        return {}


def get_path_parameter(event: Dict, param_name: str) -> Optional[str]:
    """
    Get path parameter from API Gateway event.

    Args:
        event: API Gateway event
        param_name: Parameter name

    Returns:
        Parameter value or None
    """
    params = event.get('pathParameters', {}) or {}
    return params.get(param_name)


def get_query_parameter(event: Dict, param_name: str, default: str = None) -> Optional[str]:
    """
    Get query string parameter from API Gateway event.

    Args:
        event: API Gateway event
        param_name: Parameter name
        default: Default value

    Returns:
        Parameter value or default
    """
    params = event.get('queryStringParameters', {}) or {}
    return params.get(param_name, default)


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """
    Sanitize string input to prevent injection attacks.

    Args:
        value: Input string
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return ''

    # Truncate
    value = str(value)[:max_length]

    # Remove null bytes
    value = value.replace('\x00', '')

    # Strip leading/trailing whitespace
    value = value.strip()

    return value


def validate_email(email: str) -> bool:
    """
    Validate email format.

    Args:
        email: Email string

    Returns:
        True if valid
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email or ''))


def validate_url(url: str) -> bool:
    """
    Validate URL format.

    Args:
        url: URL string

    Returns:
        True if valid
    """
    from urllib.parse import urlparse
    try:
        result = urlparse(url)
        return all([result.scheme in ('http', 'https'), result.netloc])
    except Exception:
        return False


# ============================================================================
# THREAT TRACKING (SILENT - NO USER NOTIFICATION)
# ============================================================================

THREAT_TABLE = 'aivedha-guardian-threat-found'

def log_threat(
    event: Dict,
    threat_type: str,
    reason: str,
    user_id: str = None,
    severity: str = 'medium',
    additional_data: Dict = None
) -> None:
    """
    Silently log security threats to ThreatFound table.
    This function is designed to NEVER throw exceptions or notify users.

    Args:
        event: API Gateway event (for IP, user-agent extraction)
        threat_type: Type of threat (recaptcha_failure, suspicious_activity, rate_limit, etc.)
        reason: Human-readable reason for the threat detection
        user_id: Optional user ID if known
        severity: low, medium, high, critical
        additional_data: Any additional context to store
    """
    try:
        import uuid
        import hashlib

        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(THREAT_TABLE)

        now = datetime.utcnow()

        # Extract request context (silently fail if not available)
        request_context = event.get('requestContext', {}) or {}
        identity = request_context.get('identity', {}) or {}
        headers = event.get('headers', {}) or {}

        # Get IP address from various sources
        ip_address = (
            identity.get('sourceIp') or
            headers.get('X-Forwarded-For', '').split(',')[0].strip() or
            headers.get('x-forwarded-for', '').split(',')[0].strip() or
            'unknown'
        )

        # Get user agent
        user_agent = (
            headers.get('User-Agent') or
            headers.get('user-agent') or
            'unknown'
        )

        # Generate unique threat ID
        threat_id = f"threat-{now.strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8]}"

        # Hash sensitive data for privacy but retain searchability
        ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16] if ip_address != 'unknown' else None

        # Build threat record
        threat_record = {
            'threat_id': threat_id,
            'timestamp': now.isoformat(),
            'threat_type': threat_type,
            'severity': severity,
            'reason': reason,
            'ip_address': ip_address,
            'ip_hash': ip_hash,
            'user_agent': user_agent[:500] if user_agent else None,
            'user_id': user_id,
            'request_path': event.get('path', 'unknown'),
            'http_method': event.get('httpMethod', 'unknown'),
            'request_id': request_context.get('requestId', 'unknown'),
            'stage': request_context.get('stage', 'unknown'),
            'created_at': now.isoformat(),
        }

        # Add additional data if provided
        if additional_data:
            threat_record['additional_data'] = json.dumps(additional_data)

        # Add geolocation hint from headers if available
        country = headers.get('CloudFront-Viewer-Country') or headers.get('cf-ipcountry')
        if country:
            threat_record['country'] = country

        # Remove None values
        threat_record = {k: v for k, v in threat_record.items() if v is not None}

        # Store threat record (fire-and-forget, silently)
        table.put_item(Item=threat_record)

        # Log for CloudWatch (not exposed to users)
        print(f"[THREAT] {severity.upper()}: {threat_type} - {reason} | IP: {ip_address} | User: {user_id or 'anonymous'}")

    except Exception as e:
        # NEVER let threat logging errors bubble up to user
        # Only log to CloudWatch for internal review
        print(f"[THREAT_LOG_ERROR] Failed to log threat: {str(e)}")


def check_ip_threat_count(ip_address: str, hours: int = 24) -> int:
    """
    Check number of threats from an IP address in the last N hours.

    Args:
        ip_address: IP address to check
        hours: Timeframe in hours

    Returns:
        Number of threats from this IP
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(THREAT_TABLE)

        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

        response = table.query(
            IndexName='ip-index',
            KeyConditionExpression='ip_address = :ip',
            FilterExpression='#ts >= :cutoff',
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues={
                ':ip': ip_address,
                ':cutoff': cutoff
            }
        )

        return response.get('Count', 0)
    except Exception:
        return 0


# ============================================================================
# SECURE URL GENERATION
# ============================================================================

def generate_secure_token(data: Dict, expiry_hours: int = 24) -> str:
    """
    Generate a secure, non-guessable URL token.

    Args:
        data: Data to encode in token
        expiry_hours: Token validity in hours

    Returns:
        Secure token string
    """
    import hashlib
    import hmac
    import base64

    secret = os.environ.get('URL_TOKEN_SECRET', 'aivedha-secure-url-token-secret-2024')

    # Add expiry to data
    expiry = (datetime.utcnow() + timedelta(hours=expiry_hours)).isoformat()
    data['exp'] = expiry

    # Create payload
    payload = json.dumps(data, sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode()

    # Create signature
    signature = hmac.new(
        secret.encode(),
        payload_b64.encode(),
        hashlib.sha256
    ).hexdigest()[:16]

    return f"{payload_b64}.{signature}"


def verify_secure_token(token: str) -> Optional[Dict]:
    """
    Verify a secure URL token.

    Args:
        token: Token to verify

    Returns:
        Decoded data dict or None if invalid/expired
    """
    import hashlib
    import hmac
    import base64

    try:
        secret = os.environ.get('URL_TOKEN_SECRET', 'aivedha-secure-url-token-secret-2024')

        parts = token.split('.')
        if len(parts) != 2:
            return None

        payload_b64, signature = parts

        # Verify signature
        expected_signature = hmac.new(
            secret.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        if not hmac.compare_digest(signature, expected_signature):
            return None

        # Decode payload
        payload = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        data = json.loads(payload)

        # Check expiry
        expiry = data.get('exp')
        if expiry:
            if datetime.fromisoformat(expiry) < datetime.utcnow():
                return None
            del data['exp']

        return data

    except Exception:
        return None


def generate_secure_url(base_url: str, params: Dict, expiry_hours: int = 24) -> str:
    """
    Generate a secure URL with non-guessable token.

    Args:
        base_url: Base URL (e.g., /certificate/)
        params: Parameters to include in token
        expiry_hours: URL validity in hours

    Returns:
        Secure URL with token
    """
    token = generate_secure_token(params, expiry_hours)
    return f"{base_url}?token={token}"


# ============================================================================
# ACTIVE USER VALIDATION
# ============================================================================

def get_active_user(user_id: str, users_table_name: str = 'aivedha-guardian-users') -> Optional[Dict]:
    """
    Get user record ONLY if they are active (not deleted/inactive).

    Args:
        user_id: User ID to look up
        users_table_name: DynamoDB table name

    Returns:
        User record if active, None otherwise
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(users_table_name)

        response = table.get_item(Key={'user_id': user_id})
        user = response.get('Item')

        if not user:
            return None

        # Check if user is active
        status = user.get('status', 'active')
        account_status = user.get('account_status', 'active')

        if status == 'inactive' or account_status in ['deleted', 'inactive']:
            return None

        return user

    except Exception as e:
        print(f"Error getting active user: {e}")
        return None


def validate_active_user(event: Dict, users_table_name: str = 'aivedha-guardian-users') -> Optional[Dict]:
    """
    Validate that request is from an active user.
    Combines JWT verification with active user check.

    Args:
        event: API Gateway event
        users_table_name: DynamoDB table name

    Returns:
        User record if active and authenticated, None otherwise
    """
    # First verify token
    payload = verify_user_token(event)
    if not payload:
        return None

    user_id = payload.get('user_id') or payload.get('sub')
    if not user_id:
        return None

    # Then check if user is active
    return get_active_user(user_id, users_table_name)
