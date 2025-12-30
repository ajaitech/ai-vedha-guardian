"""
AWS Lambda CORS Headers Update Script
=====================================

This script provides the CORS configuration that all Lambda functions
should use to allow Wix domain requests.

Add this to the top of each Lambda function.
"""

# CORS Configuration for Wix Compatibility
ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://editor.wix.com',
    'https://manage.wix.com',
    'https://www.wix.com',
    'http://localhost:8080',
    'http://localhost:3000',
]

# Wix domain patterns (wildcard matching)
WIX_DOMAIN_PATTERNS = [
    '.wix.com',
    '.wixsite.com',
    '.editorx.io',
    '.wix-user-site.com',
]

def get_cors_origin(event):
    """
    Determine the appropriate CORS origin based on the request.
    Allows all Wix domains and configured origins.
    """
    origin = None

    # Get origin from headers
    headers = event.get('headers', {}) or {}

    # Handle case-insensitive headers
    for key, value in headers.items():
        if key.lower() == 'origin':
            origin = value
            break

    if not origin:
        return 'https://aivedha.ai'

    # Check exact match
    if origin in ALLOWED_ORIGINS:
        return origin

    # Check Wix domain patterns
    for pattern in WIX_DOMAIN_PATTERNS:
        if pattern in origin:
            return origin

    # Default to main domain
    return 'https://aivedha.ai'


def create_response(status_code, body, event=None):
    """
    Create a Lambda response with proper CORS headers for Wix compatibility.
    """
    import json

    origin = get_cors_origin(event) if event else 'https://aivedha.ai'

    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Key, X-Wix-Client-Id, X-Wix-Instance',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
        },
        'body': json.dumps(body) if isinstance(body, dict) else body
    }


def handle_options(event):
    """
    Handle CORS preflight (OPTIONS) requests.
    """
    return create_response(200, {'message': 'OK'}, event)


# Example Lambda handler with CORS
def lambda_handler_example(event, context):
    """
    Example Lambda handler showing CORS implementation.
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options(event)

    try:
        # Your business logic here
        result = {'success': True, 'message': 'Operation completed'}
        return create_response(200, result, event)

    except Exception as e:
        return create_response(500, {'success': False, 'error': str(e)}, event)


# Lambda Layer code to be shared across all functions
CORS_LAYER_CODE = '''
import json

ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'https://editor.wix.com',
    'https://manage.wix.com',
    'https://www.wix.com',
]

WIX_DOMAIN_PATTERNS = ['.wix.com', '.wixsite.com', '.editorx.io', '.wix-user-site.com']

def get_cors_origin(event):
    headers = event.get('headers', {}) or {}
    origin = None
    for key, value in headers.items():
        if key.lower() == 'origin':
            origin = value
            break

    if not origin:
        return 'https://aivedha.ai'

    if origin in ALLOWED_ORIGINS:
        return origin

    for pattern in WIX_DOMAIN_PATTERNS:
        if pattern in origin:
            return origin

    return 'https://aivedha.ai'

def cors_response(status_code, body, event=None):
    origin = get_cors_origin(event) if event else 'https://aivedha.ai'
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Key, X-Wix-Client-Id, X-Wix-Instance',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
        },
        'body': json.dumps(body) if isinstance(body, dict) else body
    }
'''

if __name__ == '__main__':
    print("CORS Configuration for AiVedha Guardian")
    print("=" * 50)
    print("\nAllowed Origins:")
    for origin in ALLOWED_ORIGINS:
        print(f"  - {origin}")
    print("\nWix Domain Patterns:")
    for pattern in WIX_DOMAIN_PATTERNS:
        print(f"  - *{pattern}")
    print("\n" + "=" * 50)
    print("\nCopy the CORS helper functions to your Lambda functions.")
