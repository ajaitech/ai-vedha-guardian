"""
AiVedha Guard - URL Validator Lambda
=====================================
Validates URLs before security audits to detect error pages (404, 500, 502, etc.)
Prevents wasted credits on invalid or error pages.

Copyright 2024-2025 AiVibe Software Services Pvt Ltd
"""

import json
import os
import boto3
import urllib.request
import urllib.error
import ssl
import socket
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@aivedha.ai')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

# Initialize AWS clients
ses = boto3.client('ses', region_name=AWS_REGION)
# CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
# This allows India region Lambda to access US region data
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# CORS Headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
}

# Error page status codes
ERROR_STATUS_CODES = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    520: 'Web Server Error',
    521: 'Web Server Down',
    522: 'Connection Timed Out',
    523: 'Origin Unreachable',
    524: 'Timeout Occurred',
    525: 'SSL Handshake Failed',
    526: 'Invalid SSL Certificate'
}

# Common error page indicators in content
ERROR_CONTENT_PATTERNS = [
    'page not found',
    '404 error',
    '404 not found',
    'server error',
    '500 error',
    '502 bad gateway',
    '503 service unavailable',
    '504 gateway timeout',
    'site is under maintenance',
    'temporarily unavailable',
    'connection refused',
    'access denied',
    'forbidden',
    'cloudflare error',
    'nginx error',
    'apache error',
    'iis error',
    'error establishing',
    'database connection'
]


def json_response(status_code: int, body: dict) -> dict:
    """Create JSON response with CORS headers."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def validate_url_format(url: str) -> Tuple[bool, str]:
    """Validate URL format and normalize it."""
    if not url or not url.strip():
        return False, 'URL is required'

    url = url.strip()

    # Add protocol if missing
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'

    # Basic URL validation
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not parsed.netloc:
            return False, 'Invalid URL format: missing domain'
        if not parsed.scheme in ('http', 'https'):
            return False, 'Invalid URL format: must use http or https'
    except Exception as e:
        return False, f'Invalid URL format: {str(e)}'

    return True, url


def check_url_accessibility(url: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Check if URL is accessible and detect error pages.
    Returns detailed status information.
    """
    result = {
        'url': url,
        'accessible': False,
        'status_code': None,
        'status_text': None,
        'is_error_page': False,
        'error_type': None,
        'error_message': None,
        'response_time_ms': None,
        'ssl_valid': None,
        'content_type': None,
        'server': None,
        'redirect_url': None,
        'checked_at': datetime.utcnow().isoformat()
    }

    start_time = datetime.utcnow()

    try:
        # Create SSL context that allows some flexibility but still validates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED

        # Create request with common headers
        request = urllib.request.Request(url, headers={
            'User-Agent': 'AiVedha-Guard-URLValidator/1.0 (Security Audit Pre-Check)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        })

        try:
            response = urllib.request.urlopen(request, timeout=timeout, context=ssl_context)
            result['ssl_valid'] = True
        except ssl.SSLError as ssl_err:
            # Try without strict SSL for checking (but flag it)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            try:
                response = urllib.request.urlopen(request, timeout=timeout, context=ssl_context)
                result['ssl_valid'] = False
                result['error_message'] = f'SSL certificate issue: {str(ssl_err)}'
            except Exception:
                raise ssl_err

        # Calculate response time
        end_time = datetime.utcnow()
        result['response_time_ms'] = int((end_time - start_time).total_seconds() * 1000)

        # Get response details
        result['status_code'] = response.status
        result['status_text'] = response.reason
        result['content_type'] = response.headers.get('Content-Type', '')
        result['server'] = response.headers.get('Server', '')
        result['redirect_url'] = response.geturl() if response.geturl() != url else None

        # Check if it's an error status code
        if result['status_code'] in ERROR_STATUS_CODES:
            result['is_error_page'] = True
            result['error_type'] = 'http_error'
            result['error_message'] = f"HTTP {result['status_code']}: {ERROR_STATUS_CODES[result['status_code']]}"
        else:
            result['accessible'] = True

            # Check content for error patterns
            try:
                content = response.read(10000).decode('utf-8', errors='ignore').lower()
                for pattern in ERROR_CONTENT_PATTERNS:
                    if pattern in content:
                        # Check if it's a legitimate page with error-like content
                        # Only flag if content is short (likely an error page)
                        if len(content) < 5000:
                            result['is_error_page'] = True
                            result['error_type'] = 'content_error'
                            result['error_message'] = f'Page content suggests error: "{pattern}" detected'
                            break
            except Exception:
                pass  # If we can't read content, assume it's OK

    except urllib.error.HTTPError as e:
        result['status_code'] = e.code
        result['status_text'] = e.reason
        result['is_error_page'] = True
        result['error_type'] = 'http_error'
        result['error_message'] = f"HTTP {e.code}: {ERROR_STATUS_CODES.get(e.code, e.reason)}"

    except urllib.error.URLError as e:
        result['error_type'] = 'connection_error'
        if isinstance(e.reason, socket.timeout):
            result['error_message'] = 'Connection timed out'
        elif isinstance(e.reason, ssl.SSLError):
            result['error_message'] = f'SSL error: {str(e.reason)}'
            result['ssl_valid'] = False
        else:
            result['error_message'] = f'Connection error: {str(e.reason)}'
        result['is_error_page'] = True

    except socket.timeout:
        result['error_type'] = 'timeout'
        result['error_message'] = 'Request timed out'
        result['is_error_page'] = True

    except Exception as e:
        result['error_type'] = 'unknown_error'
        result['error_message'] = f'Unexpected error: {str(e)}'
        result['is_error_page'] = True

    return result


def send_failure_notification(
    user_email: str,
    user_name: str,
    url: str,
    validation_result: Dict[str, Any],
    source: str = 'scheduler'
) -> bool:
    """Send email notification when URL validation fails."""
    try:
        source_label = 'Scheduled Audit' if source == 'scheduler' else 'GitHub CI/CD Pipeline'

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
        .details {{ background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin: 16px 0; }}
        .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }}
        .detail-label {{ color: #888; }}
        .detail-value {{ color: #fff; font-family: monospace; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🛡️ AiVedha Guard</h1>
        </div>

        <div class="alert-box">
            <div class="alert-title">⚠️ {source_label} Failed - URL Validation Error</div>
            <p class="message">
                Hello {user_name or 'there'},<br><br>
                Your {source_label.lower()} could not proceed because the target URL returned an error.
            </p>
        </div>

        <div class="details">
            <div class="detail-row">
                <span class="detail-label">URL:</span>
                <span class="detail-value">{url}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Error Type:</span>
                <span class="detail-value">{validation_result.get('error_type', 'Unknown')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status Code:</span>
                <span class="detail-value">{validation_result.get('status_code', 'N/A')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Error Message:</span>
                <span class="detail-value">{validation_result.get('error_message', 'Unknown error')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Checked At:</span>
                <span class="detail-value">{validation_result.get('checked_at', 'N/A')}</span>
            </div>
        </div>

        <p class="message">
            <strong>What this means:</strong><br>
            The URL appears to be returning an error page or is not accessible.
            Security audits on error pages provide no useful results and would waste your credits.
        </p>

        <p class="message">
            <strong>Recommended actions:</strong>
        </p>
        <ul style="color: #ddd; line-height: 2;">
            <li>Verify the URL is correct and the site is online</li>
            <li>Check if the page requires authentication</li>
            <li>Ensure your server is responding correctly</li>
            <li>Try accessing the URL in a browser</li>
        </ul>

        <div style="text-align: center;">
            <a href="{SITE_URL}/dashboard" class="cta-button">View Dashboard</a>
        </div>

        <div class="footer">
            <p>This notification was sent because URL validation failed for your {source_label.lower()}.</p>
            <p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p>
        </div>
    </div>
</body>
</html>
"""

        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': f'⚠️ AiVedha Guard: {source_label} Failed - URL Error Detected'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        return True
    except Exception as e:
        print(f"Error sending failure notification: {e}")
        return False


def validate_url(event: dict) -> dict:
    """
    Main URL validation handler.
    Returns validation result with recommendation.
    """
    try:
        # Parse request
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)

        url = body.get('url', '').strip()
        source = body.get('source', 'ui')  # ui, scheduler, github
        user_id = body.get('userId') or body.get('user_id')
        send_notification = body.get('send_notification', source != 'ui')

        # Validate URL format
        valid, result_or_url = validate_url_format(url)
        if not valid:
            return json_response(400, {
                'success': False,
                'valid': False,
                'error': result_or_url
            })

        normalized_url = result_or_url

        # Check URL accessibility
        validation_result = check_url_accessibility(normalized_url)

        # Determine recommendation
        if validation_result['is_error_page']:
            recommendation = 'block' if source in ['scheduler', 'github'] else 'warn'

            # Send notification for scheduler/github failures
            if send_notification and user_id:
                try:
                    users_table = dynamodb.Table(USERS_TABLE)
                    user_response = users_table.get_item(Key={'user_id': user_id})
                    user = user_response.get('Item', {})

                    if user.get('email'):
                        send_failure_notification(
                            user.get('email'),
                            user.get('full_name', user.get('name', '')),
                            normalized_url,
                            validation_result,
                            source
                        )
                except Exception as e:
                    print(f"Error getting user for notification: {e}")

            return json_response(200, {
                'success': True,
                'valid': False,
                'url': normalized_url,
                'validation': validation_result,
                'recommendation': recommendation,
                'can_proceed': source == 'ui',  # UI can proceed with warning
                'message': f"URL validation failed: {validation_result.get('error_message', 'Error page detected')}",
                'notification_sent': send_notification and source != 'ui'
            })

        return json_response(200, {
            'success': True,
            'valid': True,
            'url': normalized_url,
            'validation': validation_result,
            'recommendation': 'proceed',
            'can_proceed': True,
            'message': 'URL is accessible and valid for security audit'
        })

    except Exception as e:
        print(f"Error validating URL: {e}")
        return json_response(500, {
            'success': False,
            'error': f'Validation failed: {str(e)}'
        })


def lambda_handler(event, context):
    """Main Lambda handler."""

    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    path = event.get('path', '')
    method = event.get('httpMethod', 'POST')

    # Route: POST /url-validator/validate
    if '/validate' in path and method == 'POST':
        return validate_url(event)

    # Health check
    if '/health' in path:
        return json_response(200, {
            'status': 'healthy',
            'service': 'url-validator',
            'timestamp': datetime.utcnow().isoformat()
        })

    # Not found
    return json_response(404, {
        'error': 'Endpoint not found',
        'available_endpoints': [
            'POST /url-validator/validate'
        ]
    })
