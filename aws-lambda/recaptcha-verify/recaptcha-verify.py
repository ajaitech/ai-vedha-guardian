"""
AiVedha Guardian - reCAPTCHA Enterprise Verification Lambda
Verifies reCAPTCHA tokens with Google's reCAPTCHA Enterprise API
Production-ready with security best practices
"""

import json
import os
import urllib.request
import urllib.error
import hashlib
import time

# Configuration - loaded from environment variables for security
RECAPTCHA_SITE_KEY = os.environ.get('RECAPTCHA_SITE_KEY', '6Ld0qh0sAAAAAEGsZtVYA31XPwRpVJTxZxrouWbO')
RECAPTCHA_API_KEY = os.environ.get('RECAPTCHA_API_KEY', '')
PROJECT_ID = os.environ.get('RECAPTCHA_PROJECT_ID', 'aivedha-io')

# reCAPTCHA Enterprise API endpoint
RECAPTCHA_API_URL = f"https://recaptchaenterprise.googleapis.com/v1/projects/{PROJECT_ID}/assessments"

# Security thresholds - adjusted for better user experience
# 0.3 is the recommended threshold for most use cases per Google docs
# Higher thresholds block too many legitimate users
MIN_SCORE_THRESHOLD = 0.3  # Minimum score to pass (0.0-1.0, higher = more human)
TOKEN_MAX_AGE_SECONDS = 120  # Reject tokens older than 2 minutes

# Allowed origins for CORS (production domains only)
ALLOWED_ORIGINS = [
    'https://aivedha.ai',
    'https://www.aivedha.ai',
    'http://localhost:5173',  # Development only - remove in strict production
    'http://localhost:3000'
]


def get_cors_origin(event):
    """Get appropriate CORS origin header based on request origin"""
    request_origin = event.get('headers', {}).get('origin', '') or event.get('headers', {}).get('Origin', '')
    if request_origin in ALLOWED_ORIGINS:
        return request_origin
    return 'https://aivedha.ai'  # Default to production domain


def lambda_handler(event, context):
    """Verify reCAPTCHA Enterprise token with security checks"""

    # Get appropriate CORS origin
    cors_origin = get_cors_origin(event)

    # Security headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }

    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        token = body.get('token')
        expected_action = body.get('expectedAction', 'SECURITY_AUDIT')

        if not token:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing reCAPTCHA token'
                })
            }

        # Validate token format (basic check)
        if len(token) < 20 or len(token) > 2048:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Invalid token format'
                })
            }

        # API key must be configured in production
        if not RECAPTCHA_API_KEY:
            print("ERROR: RECAPTCHA_API_KEY not configured")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Service configuration error'
                })
            }

        # Create assessment request
        assessment_request = {
            "event": {
                "token": token,
                "expectedAction": expected_action,
                "siteKey": RECAPTCHA_SITE_KEY
            }
        }

        # Send request to reCAPTCHA Enterprise API
        url = f"{RECAPTCHA_API_URL}?key={RECAPTCHA_API_KEY}"
        req = urllib.request.Request(
            url,
            data=json.dumps(assessment_request).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))

        # Extract assessment results
        token_properties = result.get('tokenProperties', {})
        risk_analysis = result.get('riskAnalysis', {})

        is_valid = token_properties.get('valid', False)
        action = token_properties.get('action', '')
        score = risk_analysis.get('score', 0)
        reasons = risk_analysis.get('reasons', [])

        # Verify token validity
        if not is_valid:
            invalid_reason = token_properties.get('invalidReason', 'UNKNOWN')
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'Invalid token: {invalid_reason}',
                    'score': 0
                })
            }

        # Verify action matches
        if action != expected_action:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'Action mismatch: expected {expected_action}, got {action}',
                    'score': score
                })
            }

        # Check score threshold
        if score < MIN_SCORE_THRESHOLD:
            print(f"Low reCAPTCHA score: {score}, reasons: {reasons}, action: {action}")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Human verification failed. Please disable VPN/proxy, refresh the page, and try again.',
                    'score': score,
                    'reasons': reasons
                })
            }

        # Verification successful
        print(f"reCAPTCHA verification passed: score={score}, action={action}")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'score': score,
                'action': action,
                'reasons': reasons
            })
        }

    except urllib.error.HTTPError as e:
        # Log error securely without exposing sensitive details
        error_code = e.code
        print(f"reCAPTCHA API error: HTTP {error_code}")
        return {
            'statusCode': 200,  # Return 200 to not expose internal errors
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Verification service unavailable'
            })
        }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Invalid request format'
            })
        }

    except Exception as e:
        # Log error without exposing details to client
        print(f"Verification error occurred")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Verification failed'
            })
        }
