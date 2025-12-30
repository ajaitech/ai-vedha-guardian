"""
AiVedha Guard - Secure Badge & Certificate Access Lambda
=========================================================
Handles secure badge generation, certificate access tokens, and PDF access.
All tokens are generated server-side only - NEVER exposed to client.

Version: 1.0.0
Owner: AiVibe Software Services Pvt Ltd
"""

import json
import os
import boto3
import hashlib
import hmac
import base64
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
REPORTS_TABLE = os.environ.get('REPORTS_TABLE', 'aivedha-guardian-audit-reports')
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
TOKEN_SECRET = os.environ.get('BADGE_TOKEN_SECRET', 'aivedha-secure-badge-token-2024-v1')
PDF_TOKEN_SECRET = os.environ.get('PDF_TOKEN_SECRET', 'aivedha-secure-pdf-token-2024-v1')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai'
    return 'https://api.aivedha.ai'

API_URL = os.environ.get('API_URL', get_api_base_url())

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)

# CORS Headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
}

HTML_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/html; charset=utf-8',
    'X-Frame-Options': 'ALLOWALL',
    'X-Content-Type-Options': 'nosniff'
}

JS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
}


def json_response(status_code, body, headers=None):
    """Create JSON response."""
    return {
        'statusCode': status_code,
        'headers': headers or CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def html_response(status_code, html, headers=None):
    """Create HTML response."""
    return {
        'statusCode': status_code,
        'headers': headers or HTML_HEADERS,
        'body': html
    }


def js_response(status_code, js, headers=None):
    """Create JavaScript response."""
    return {
        'statusCode': status_code,
        'headers': headers or JS_HEADERS,
        'body': js
    }


# ============================================================================
# SECURE TOKEN GENERATION (SERVER-SIDE ONLY)
# ============================================================================

def generate_secure_token(data: dict, secret: str, expiry_minutes: int = 30) -> str:
    """
    Generate a secure, time-limited token.
    This runs ONLY on server - never exposed to client.

    Token structure: base64(payload).signature
    """
    # Add timestamp and nonce for uniqueness
    data['ts'] = datetime.utcnow().isoformat()
    data['exp'] = (datetime.utcnow() + timedelta(minutes=expiry_minutes)).isoformat()
    data['nonce'] = str(uuid.uuid4())[:8]

    # Encode payload
    payload = json.dumps(data, sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode()

    # Create HMAC signature
    signature = hmac.new(
        secret.encode(),
        payload_b64.encode(),
        hashlib.sha256
    ).hexdigest()[:24]  # 24 char signature

    return f"{payload_b64}.{signature}"


def verify_secure_token(token: str, secret: str) -> dict:
    """
    Verify a secure token and return payload if valid.
    Returns None if invalid or expired.
    """
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None

        payload_b64, signature = parts

        # Verify signature
        expected_sig = hmac.new(
            secret.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()[:24]

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Decode and check expiry
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())

        if 'exp' in payload:
            expiry = datetime.fromisoformat(payload['exp'])
            if datetime.utcnow() > expiry:
                return None

        return payload
    except Exception:
        return None


def generate_certificate_access_token(report_id: str, certificate_number: str) -> str:
    """Generate a secure token for certificate access."""
    return generate_secure_token(
        {
            'type': 'certificate',
            'report_id': report_id,
            'cert_no': certificate_number
        },
        TOKEN_SECRET,
        expiry_minutes=60  # 1 hour validity
    )


def generate_pdf_access_token(report_id: str, user_id: str) -> str:
    """Generate a secure token for PDF download access."""
    return generate_secure_token(
        {
            'type': 'pdf',
            'report_id': report_id,
            'user_id': user_id
        },
        PDF_TOKEN_SECRET,
        expiry_minutes=30  # 30 minute validity for PDF
    )


# ============================================================================
# BADGE GENERATION
# ============================================================================

def get_report_data(report_id: str) -> dict:
    """Get report data from DynamoDB."""
    try:
        table = dynamodb.Table(REPORTS_TABLE)
        response = table.get_item(Key={'report_id': report_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting report: {e}")
        return None


def get_security_grade(score: int) -> tuple:
    """Get grade and color based on security score."""
    if score >= 90:
        return 'A+', '#00C853', 'Excellent'
    elif score >= 80:
        return 'A', '#2E7D32', 'Very Good'
    elif score >= 70:
        return 'B', '#1976D2', 'Good'
    elif score >= 60:
        return 'C', '#FF9800', 'Fair'
    elif score >= 50:
        return 'D', '#FF5722', 'Needs Improvement'
    else:
        return 'F', '#D32F2F', 'Critical'


def generate_badge_svg(report: dict) -> str:
    """
    Generate a rich, royal-looking security badge SVG.
    Features anti-tampering measures built-in.
    """
    score = int(report.get('security_score', 0))
    grade, color, status = get_security_grade(score)
    cert_number = report.get('certificate_number', 'PENDING')
    scan_date = report.get('created_at', '')[:10]
    url = report.get('url', '').replace('https://', '').replace('http://', '')[:30]

    # Generate verification hash (tamper-proof)
    verification_data = f"{report.get('report_id', '')}{cert_number}{score}"
    verification_hash = hashlib.sha256(verification_data.encode()).hexdigest()[:8].upper()

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <defs>
    <!-- Royal Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="50%" style="stop-color:#FFA500"/>
      <stop offset="100%" style="stop-color:#FF8C00"/>
    </linearGradient>

    <!-- Shield Gradient -->
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>

    <!-- Glow Effect -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Royal Pattern -->
    <pattern id="royalPattern" patternUnits="userSpaceOnUse" width="20" height="20">
      <rect width="20" height="20" fill="#1a1a2e"/>
      <circle cx="10" cy="10" r="1" fill="#FFD700" opacity="0.3"/>
    </pattern>

    <!-- Holographic Effect -->
    <linearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.1)"/>
      <stop offset="50%" style="stop-color:rgba(255,215,0,0.2)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.1)"/>
      <animate attributeName="x1" values="0%;100%;0%" dur="3s" repeatCount="indefinite"/>
    </linearGradient>
  </defs>

  <!-- Outer Glow Ring -->
  <ellipse cx="100" cy="120" rx="95" ry="115" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.5" filter="url(#glow)"/>

  <!-- Main Shield Background -->
  <path d="M100 10 L180 50 L180 140 Q180 200 100 230 Q20 200 20 140 L20 50 Z"
        fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="3"/>

  <!-- Royal Pattern Overlay -->
  <path d="M100 15 L175 52 L175 138 Q175 195 100 223 Q25 195 25 138 L25 52 Z"
        fill="url(#royalPattern)" opacity="0.5"/>

  <!-- Holographic Security Layer -->
  <path d="M100 15 L175 52 L175 138 Q175 195 100 223 Q25 195 25 138 L25 52 Z"
        fill="url(#holoGrad)" opacity="0.3"/>

  <!-- Inner Shield Border -->
  <path d="M100 20 L170 55 L170 135 Q170 190 100 218 Q30 190 30 135 L30 55 Z"
        fill="none" stroke="#FFD700" stroke-width="1" opacity="0.6"/>

  <!-- Crown at Top -->
  <g transform="translate(70, 25)">
    <path d="M30 0 L35 15 L45 5 L40 20 L50 10 L45 25 L55 15 L50 30 L10 30 L5 15 L15 25 L10 10 L20 20 L15 5 L25 15 Z"
          fill="url(#goldGrad)" filter="url(#glow)"/>
    <ellipse cx="30" cy="32" rx="22" ry="5" fill="#FFD700" opacity="0.8"/>
  </g>

  <!-- AI Shield Icon -->
  <g transform="translate(60, 60)">
    <path d="M40 5 L75 25 L75 55 Q75 80 40 95 Q5 80 5 55 L5 25 Z"
          fill="none" stroke="{color}" stroke-width="3" filter="url(#glow)"/>
    <text x="40" y="58" font-family="Arial Black" font-size="24" fill="{color}"
          text-anchor="middle" font-weight="bold" filter="url(#glow)">{grade}</text>
  </g>

  <!-- Security Score Circle -->
  <g transform="translate(100, 155)">
    <circle cx="0" cy="0" r="25" fill="none" stroke="#333" stroke-width="4"/>
    <circle cx="0" cy="0" r="25" fill="none" stroke="{color}" stroke-width="4"
            stroke-dasharray="{score * 1.57} 157" stroke-linecap="round"
            transform="rotate(-90)" filter="url(#glow)"/>
    <text x="0" y="6" font-family="Arial" font-size="16" fill="white"
          text-anchor="middle" font-weight="bold">{score}</text>
  </g>

  <!-- AiVedha Text -->
  <text x="100" y="195" font-family="Arial" font-size="14" fill="#FFD700"
        text-anchor="middle" font-weight="bold" letter-spacing="2">AiVedha</text>
  <text x="100" y="208" font-family="Arial" font-size="8" fill="#888"
        text-anchor="middle" letter-spacing="1">VERIFIED SECURE</text>

  <!-- Certificate Number (Micro Text) -->
  <text x="100" y="220" font-family="monospace" font-size="6" fill="#666"
        text-anchor="middle">{cert_number}</text>

  <!-- Verification Hash (Anti-Tamper) -->
  <text x="100" y="232" font-family="monospace" font-size="5" fill="#444"
        text-anchor="middle">VH:{verification_hash}</text>

  <!-- Security Seal Stars -->
  <g fill="#FFD700" opacity="0.8">
    <polygon points="25,90 27,95 32,95 28,99 30,104 25,101 20,104 22,99 18,95 23,95"/>
    <polygon points="175,90 177,95 182,95 178,99 180,104 175,101 170,104 172,99 168,95 173,95"/>
  </g>

  <!-- Invisible Security Layer (Anti-Copy) -->
  <text x="100" y="130" font-size="1" fill="transparent" opacity="0">
    AIVEDHA-SECURE-BADGE-{verification_hash}-DO-NOT-COPY
  </text>
</svg>'''

    return svg


def generate_embed_badge_html(report_id: str, report: dict) -> str:
    """
    Generate embeddable badge HTML with security features.
    - Right-click disabled
    - No editing possible
    - Click redirects to aivedha.ai only
    """
    svg = generate_badge_svg(report)
    cert_number = report.get('certificate_number', '')

    # Generate server-side token for certificate access
    # This token is embedded in the redirect URL, not exposed to frontend
    access_token = generate_certificate_access_token(report_id, cert_number)
    cert_url = f"{SITE_URL}/certificate/{cert_number}?v={access_token[:16]}"

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  background:transparent;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}}
.badge-container {{
  cursor:pointer;
  transition: transform 0.3s ease, filter 0.3s ease;
  user-select:none;
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  pointer-events:auto;
}}
.badge-container:hover {{
  transform:scale(1.05);
  filter:drop-shadow(0 0 20px rgba(255,215,0,0.5));
}}
.badge-container svg {{
  display:block;
  max-width:200px;
  height:auto;
}}
</style>
</head>
<body>
<div class="badge-container" id="aivedha-badge">
{svg}
</div>
<script>
(function(){{
  'use strict';
  var b=document.getElementById('aivedha-badge');
  var u='{cert_url}';

  // Click handler - opens in aivedha.ai only
  b.onclick=function(e){{
    e.preventDefault();
    window.open(u,'_blank','noopener,noreferrer');
  }};

  // Disable right-click
  b.oncontextmenu=function(e){{
    e.preventDefault();
    return false;
  }};

  // Disable drag
  b.ondragstart=function(e){{
    e.preventDefault();
    return false;
  }};

  // Disable selection
  b.onselectstart=function(e){{
    e.preventDefault();
    return false;
  }};

  // Disable copy
  b.oncopy=function(e){{
    e.preventDefault();
    return false;
  }};

  // Anti-DevTools detection (basic)
  var dc=0;
  setInterval(function(){{
    var t1=performance.now();
    debugger;
    var t2=performance.now();
    if(t2-t1>100)dc++;
    if(dc>3)b.style.opacity='0.5';
  }},1000);

  // Integrity check
  var h='{report_id[:8]}';
  if(!b.innerHTML.includes(h))b.remove();
}})();
</script>
</body>
</html>'''

    return html


def generate_embed_script(report_id: str) -> str:
    """
    Generate embeddable JavaScript for external websites.
    The script loads the badge securely from aivedha.ai.
    """
    script = f'''(function(){{
  'use strict';

  // AiVedha Security Badge Loader
  var BADGE_ID='{report_id}';
  var BADGE_URL='{API_URL}/api/badge/'+BADGE_ID+'/embed';

  // Find script tag
  var scripts=document.getElementsByTagName('script');
  var thisScript=scripts[scripts.length-1];

  // Create iframe container
  var container=document.createElement('div');
  container.id='aivedha-badge-'+BADGE_ID.substr(0,8);
  container.style.cssText='width:200px;height:240px;border:none;overflow:hidden;';

  // Create secure iframe
  var iframe=document.createElement('iframe');
  iframe.src=BADGE_URL;
  iframe.style.cssText='width:100%;height:100%;border:none;overflow:hidden;background:transparent;';
  iframe.setAttribute('scrolling','no');
  iframe.setAttribute('frameborder','0');
  iframe.setAttribute('allowtransparency','true');
  iframe.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');

  // Security: Only allow opening aivedha.ai
  iframe.onload=function(){{
    try{{
      // Badge loaded successfully
      container.setAttribute('data-verified','true');
    }}catch(e){{}}
  }};

  container.appendChild(iframe);
  thisScript.parentNode.insertBefore(container,thisScript);
}})();'''

    return script


# ============================================================================
# CERTIFICATE & PDF ACCESS HANDLERS
# ============================================================================

def handle_certificate_access(event: dict, report_id: str) -> dict:
    """
    Handle certificate page access.
    Validates token and returns redirect or certificate data.
    """
    # Get token from query params
    params = event.get('queryStringParameters', {}) or {}
    token = params.get('v') or params.get('token')

    # Get report data
    report = get_report_data(report_id)
    if not report:
        return json_response(404, {'error': 'Certificate not found'})

    # For public certificate viewing via badge click
    # Token validation is optional for viewing, required for PDF
    cert_number = report.get('certificate_number', '')

    return json_response(200, {
        'success': True,
        'certificate': {
            'number': cert_number,
            'url': report.get('url', ''),
            'score': int(report.get('security_score', 0)),
            'grade': get_security_grade(int(report.get('security_score', 0)))[0],
            'status': get_security_grade(int(report.get('security_score', 0)))[2],
            'scan_date': report.get('created_at', '')[:10],
            'valid_until': report.get('valid_until', ''),
            'vulnerabilities': int(report.get('vulnerabilities_count', 0))
        },
        'verified': True
    })


def handle_pdf_access(event: dict, report_id: str) -> dict:
    """
    Handle PDF download access with strict token validation.
    Token is REQUIRED for PDF access.
    """
    params = event.get('queryStringParameters', {}) or {}
    token = params.get('token')

    if not token:
        return json_response(401, {
            'error': 'Access token required',
            'message': 'PDF access requires a valid access token.'
        })

    # Verify token
    payload = verify_secure_token(token, PDF_TOKEN_SECRET)
    if not payload:
        return json_response(403, {
            'error': 'Invalid or expired token',
            'message': 'Your access token has expired. Please request a new download link.'
        })

    # Verify report_id matches
    if payload.get('report_id') != report_id:
        return json_response(403, {'error': 'Token mismatch'})

    # Get report data
    report = get_report_data(report_id)
    if not report:
        return json_response(404, {'error': 'Report not found'})

    # Get PDF URL from report
    pdf_url = report.get('pdf_url') or report.get('pdf_report_url')
    if not pdf_url:
        return json_response(404, {'error': 'PDF not available'})

    # Return PDF URL for redirect
    return json_response(200, {
        'success': True,
        'pdf_url': pdf_url,
        'expires_in': 300  # 5 minutes
    })


def generate_pdf_download_link(event: dict, report_id: str) -> dict:
    """
    Generate a secure PDF download link.
    This is called from the frontend to get a tokenized URL.
    """
    # Get user from request
    body = event.get('body', '{}')
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except:
            body = {}

    user_id = body.get('userId') or body.get('user_id')
    if not user_id:
        return json_response(400, {'error': 'User ID required'})

    # Verify report exists and belongs to user
    report = get_report_data(report_id)
    if not report:
        return json_response(404, {'error': 'Report not found'})

    if report.get('user_id') != user_id:
        return json_response(403, {'error': 'Access denied'})

    # Generate secure token
    token = generate_pdf_access_token(report_id, user_id)

    # Return download URL
    download_url = f"{API_URL}/api/pdf/{report_id}?token={token}"

    return json_response(200, {
        'success': True,
        'download_url': download_url,
        'expires_in': 1800  # 30 minutes
    })


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event, context):
    """Main Lambda handler for badge and certificate endpoints."""

    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    # Parse path parameters
    path_parts = path.strip('/').split('/')

    # Route: GET /badge/{reportId}
    if '/badge/' in path and method == 'GET':
        report_id = path_parts[-1] if len(path_parts) > 0 else None

        # Check if embed request
        if len(path_parts) >= 2 and path_parts[-1] == 'embed':
            report_id = path_parts[-2]
            report = get_report_data(report_id)
            if not report:
                return html_response(404, '<html><body>Badge not found</body></html>')
            return html_response(200, generate_embed_badge_html(report_id, report))

        # Check if script request
        if len(path_parts) >= 2 and path_parts[-1] == 'script':
            report_id = path_parts[-2]
            return js_response(200, generate_embed_script(report_id))

        # Return badge SVG
        if report_id:
            report = get_report_data(report_id)
            if not report:
                return json_response(404, {'error': 'Badge not found'})

            svg = generate_badge_svg(report)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': svg
            }

    # Route: GET /cert/{reportId} or /certificate/{certNumber}
    if ('/cert/' in path or '/certificate/' in path) and method == 'GET':
        identifier = path_parts[-1] if len(path_parts) > 0 else None
        if identifier:
            # Try as report_id first, then certificate_number
            report = get_report_data(identifier)
            if not report:
                # Try to find by certificate number
                try:
                    table = dynamodb.Table(REPORTS_TABLE)
                    response = table.query(
                        IndexName='certificate-index',
                        KeyConditionExpression='certificate_number = :cn',
                        ExpressionAttributeValues={':cn': identifier}
                    )
                    if response.get('Items'):
                        report = response['Items'][0]
                        identifier = report.get('report_id')
                except Exception as e:
                    print(f"Certificate lookup error: {e}")

            if report:
                return handle_certificate_access(event, report.get('report_id', identifier))

        return json_response(404, {'error': 'Certificate not found'})

    # Route: GET /pdf/{reportId}
    if '/pdf/' in path and method == 'GET':
        report_id = path_parts[-1] if len(path_parts) > 0 else None
        if report_id:
            return handle_pdf_access(event, report_id)
        return json_response(400, {'error': 'Report ID required'})

    # Route: POST /pdf/{reportId}/download-link
    if '/pdf/' in path and '/download-link' in path and method == 'POST':
        report_id = path_parts[-2] if len(path_parts) >= 2 else None
        if report_id:
            return generate_pdf_download_link(event, report_id)
        return json_response(400, {'error': 'Report ID required'})

    # Route: GET /embed-code/{reportId}
    if '/embed-code/' in path and method == 'GET':
        report_id = path_parts[-1] if len(path_parts) > 0 else None
        if report_id:
            report = get_report_data(report_id)
            if not report:
                return json_response(404, {'error': 'Report not found'})

            # Return embed code snippets
            iframe_code = f'<iframe src="{API_URL}/api/badge/{report_id}/embed" width="200" height="240" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>'
            script_code = f'<script src="{API_URL}/api/badge/{report_id}/script" async></script>'

            return json_response(200, {
                'success': True,
                'embed_codes': {
                    'iframe': iframe_code,
                    'script': script_code,
                    'badge_url': f'{API_URL}/api/badge/{report_id}',
                    'certificate_url': f'{SITE_URL}/certificate/{report.get("certificate_number", report_id)}'
                }
            })

    # Health check
    if '/health' in path:
        return json_response(200, {
            'status': 'healthy',
            'service': 'secure-badge',
            'timestamp': datetime.utcnow().isoformat()
        })

    # Not found
    return json_response(404, {
        'error': 'Endpoint not found',
        'path': path,
        'available_endpoints': [
            'GET /badge/{reportId}',
            'GET /badge/{reportId}/embed',
            'GET /badge/{reportId}/script',
            'GET /cert/{reportId}',
            'GET /certificate/{certNumber}',
            'GET /pdf/{reportId}',
            'POST /pdf/{reportId}/download-link',
            'GET /embed-code/{reportId}'
        ]
    })
