"""
AiVedha Guard - Security Badge Generator Lambda

Generates embeddable security badge images for verified websites.
Badge cannot be white-labeled - always displays AiVedha branding.

Variants:
- full: Complete badge with score, domain, SSL grade (320x280)
- compact: Smaller badge for sidebars (220x72)
- minimal: Small icon badge (48x48)

Themes:
- dark: Dark background with light text
- light: Light background with dark text
"""

import json
import boto3
import io
import os
from datetime import datetime
from decimal import Decimal

# Pillow for image generation
try:
    from PIL import Image, ImageDraw, ImageFont
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("Pillow not available - badge generation disabled")

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# S3 bucket for badges
BUCKET_NAME = os.environ.get('BADGE_BUCKET', 'aivedha-guardian-reports-us-east-1')

# CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

# Badge dimensions by variant
BADGE_DIMENSIONS = {
    'full': (320, 280),
    'compact': (220, 72),
    'minimal': (48, 48)
}

# Color schemes
COLORS = {
    'dark': {
        'bg': '#0f172a',
        'card_bg': '#1e293b',
        'text': '#e2e8f0',
        'muted': '#94a3b8',
        'border': '#334155',
        'primary': '#06b6d4',
        'gradient_start': '#06b6d4',
        'gradient_end': '#3b82f6'
    },
    'light': {
        'bg': '#ffffff',
        'card_bg': '#f8fafc',
        'text': '#1e293b',
        'muted': '#64748b',
        'border': '#e2e8f0',
        'primary': '#0284c7',
        'gradient_start': '#06b6d4',
        'gradient_end': '#3b82f6'
    }
}


def get_score_color(score, theme='dark'):
    """Get color based on score"""
    if score >= 8:
        return '#10b981' if theme == 'dark' else '#059669'  # Green
    elif score >= 6:
        return '#f59e0b' if theme == 'dark' else '#d97706'  # Amber
    else:
        return '#ef4444' if theme == 'dark' else '#dc2626'  # Red


def get_grade(score):
    """Get letter grade from numeric score"""
    if score >= 9:
        return 'A+'
    elif score >= 8:
        return 'A'
    elif score >= 7:
        return 'B'
    elif score >= 6:
        return 'C'
    elif score >= 5:
        return 'D'
    return 'F'


def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def draw_rounded_rect(draw, coords, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle(coords, radius=radius, fill=fill, outline=outline, width=width)


def generate_full_badge(data, theme='dark'):
    """Generate full badge (320x280)"""
    width, height = BADGE_DIMENSIONS['full']
    colors = COLORS[theme]

    # Create image with transparent background option
    img = Image.new('RGBA', (width, height), hex_to_rgb(colors['bg']) + (255,))
    draw = ImageDraw.Draw(img)

    # Try to load font, fall back to default
    try:
        font_regular = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except:
        font_regular = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_large = ImageFont.load_default()
        font_title = ImageFont.load_default()

    # Draw border/card
    draw_rounded_rect(draw, (2, 2, width-2, height-2), radius=16,
                      fill=hex_to_rgb(colors['bg']),
                      outline=hex_to_rgb(colors['border']), width=2)

    # Header - Shield icon (simplified) and brand name
    # Draw a gradient-like shield shape
    shield_x, shield_y = 20, 20
    shield_size = 48

    # Draw gradient background for shield (approximated)
    for i in range(shield_size):
        ratio = i / shield_size
        r = int(6 + (59-6) * ratio)
        g = int(182 + (130-182) * ratio)
        b = int(212 + (246-212) * ratio)
        draw.rectangle([shield_x, shield_y + i, shield_x + shield_size, shield_y + i + 1],
                       fill=(r, g, b))

    # Draw shield outline
    draw_rounded_rect(draw, (shield_x, shield_y, shield_x + shield_size, shield_y + shield_size),
                      radius=12, outline=hex_to_rgb(colors['border']), width=1)

    # Shield checkmark icon
    draw.text((shield_x + 16, shield_y + 12), "✓", fill=(255, 255, 255), font=font_large)

    # Brand name
    draw.text((shield_x + shield_size + 12, shield_y + 8), "AiVedha Guard",
              fill=hex_to_rgb(colors['text']), font=font_title)
    draw.text((shield_x + shield_size + 12, shield_y + 30), "SECURITY VERIFIED",
              fill=hex_to_rgb(colors['muted']), font=font_regular)

    # Score section background
    score_bg_y = 85
    draw_rounded_rect(draw, (16, score_bg_y, width - 16, score_bg_y + 80), radius=12,
                      fill=hex_to_rgb(colors['card_bg']))

    # Score label
    draw.text((24, score_bg_y + 10), "SECURITY SCORE",
              fill=hex_to_rgb(colors['muted']), font=font_regular)

    # Score value
    score = float(data.get('security_score', 0))
    score_color = get_score_color(score, theme)
    draw.text((24, score_bg_y + 28), f"{score:.1f}",
              fill=hex_to_rgb(score_color), font=font_large)
    draw.text((85, score_bg_y + 42), "/10",
              fill=hex_to_rgb(colors['muted']), font=font_regular)

    # Grade circle
    grade = get_grade(score)
    grade_x = width - 75
    grade_y = score_bg_y + 12

    # Draw grade circle
    draw.ellipse([grade_x, grade_y, grade_x + 50, grade_y + 50],
                 fill=hex_to_rgb(score_color + '25'), outline=hex_to_rgb(score_color), width=3)
    draw.text((grade_x + 14, grade_y + 10), grade,
              fill=hex_to_rgb(score_color), font=font_title)

    # Details section
    details_y = 175
    domain = data.get('domain', 'unknown')[:30]
    ssl_grade = data.get('ssl_grade', 'A')
    scan_date = data.get('scan_date', datetime.utcnow().strftime('%Y-%m-%d'))

    # Domain
    draw.text((24, details_y), "Domain", fill=hex_to_rgb(colors['muted']), font=font_regular)
    draw.text((width - 24 - len(domain) * 7, details_y), domain,
              fill=hex_to_rgb(colors['text']), font=font_regular)

    # SSL/TLS
    draw.text((24, details_y + 22), "SSL/TLS", fill=hex_to_rgb(colors['muted']), font=font_regular)
    draw.text((width - 80, details_y + 22), f"Grade {ssl_grade}",
              fill=hex_to_rgb('#10b981'), font=font_regular)

    # Verified date
    draw.text((24, details_y + 44), "Verified", fill=hex_to_rgb(colors['muted']), font=font_regular)
    draw.text((width - 24 - len(scan_date) * 7, details_y + 44), scan_date,
              fill=hex_to_rgb(colors['text']), font=font_regular)

    # Verify Certificate button
    btn_y = height - 55
    # Draw gradient button background
    for i in range(36):
        ratio = i / 36
        r = int(6 + (59-6) * ratio)
        g = int(182 + (130-182) * ratio)
        b = int(212 + (246-212) * ratio)
        draw.rectangle([16, btn_y + i, width - 16, btn_y + i + 1], fill=(r, g, b))

    draw_rounded_rect(draw, (16, btn_y, width - 16, btn_y + 36), radius=10, outline=None)
    draw.text((100, btn_y + 10), "Verify Certificate", fill=(255, 255, 255), font=font_bold)

    # Certificate number at bottom
    cert_num = data.get('certificate_number', 'UNKNOWN')
    draw.text((width // 2 - len(f"CERT: {cert_num}") * 3, height - 15),
              f"CERT: {cert_num}", fill=hex_to_rgb(colors['muted']), font=font_regular)

    return img


def generate_compact_badge(data, theme='dark'):
    """Generate compact badge (220x72)"""
    width, height = BADGE_DIMENSIONS['compact']
    colors = COLORS[theme]

    img = Image.new('RGBA', (width, height), hex_to_rgb(colors['bg']) + (255,))
    draw = ImageDraw.Draw(img)

    try:
        font_regular = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_grade = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except:
        font_regular = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_grade = ImageFont.load_default()

    # Draw border
    draw_rounded_rect(draw, (2, 2, width-2, height-2), radius=12,
                      fill=hex_to_rgb(colors['bg']),
                      outline=hex_to_rgb(colors['border']), width=2)

    # Shield icon (smaller)
    shield_x, shield_y = 12, 16
    shield_size = 40

    for i in range(shield_size):
        ratio = i / shield_size
        r = int(6 + (59-6) * ratio)
        g = int(182 + (130-182) * ratio)
        b = int(212 + (246-212) * ratio)
        draw.rectangle([shield_x, shield_y + i, shield_x + shield_size, shield_y + i + 1],
                       fill=(r, g, b))

    draw_rounded_rect(draw, (shield_x, shield_y, shield_x + shield_size, shield_y + shield_size),
                      radius=10, outline=None)
    draw.text((shield_x + 12, shield_y + 8), "✓", fill=(255, 255, 255), font=font_bold)

    # Brand name
    draw.text((shield_x + shield_size + 12, shield_y), "AiVedha Guard",
              fill=hex_to_rgb(colors['text']), font=font_bold)

    # Grade and verified text
    score = float(data.get('security_score', 0))
    grade = get_grade(score)
    score_color = get_score_color(score, theme)

    draw.text((shield_x + shield_size + 12, shield_y + 22), grade,
              fill=hex_to_rgb(score_color), font=font_grade)
    draw.text((shield_x + shield_size + 40, shield_y + 28), "Verified",
              fill=hex_to_rgb(score_color), font=font_regular)

    return img


def generate_minimal_badge(data, theme='dark'):
    """Generate minimal badge (48x48)"""
    width, height = BADGE_DIMENSIONS['minimal']

    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))  # Transparent background
    draw = ImageDraw.Draw(img)

    try:
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 10)
        font_icon = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except:
        font_small = ImageFont.load_default()
        font_icon = ImageFont.load_default()

    # Draw gradient shield
    for i in range(height):
        ratio = i / height
        r = int(6 + (59-6) * ratio)
        g = int(182 + (130-182) * ratio)
        b = int(212 + (246-212) * ratio)
        draw.rectangle([0, i, width, i + 1], fill=(r, g, b, 255))

    draw_rounded_rect(draw, (0, 0, width, height), radius=12, outline=None)

    # Shield checkmark
    draw.text((10, 8), "✓", fill=(255, 255, 255), font=font_icon)

    # Grade indicator dot
    score = float(data.get('security_score', 0))
    grade = get_grade(score)
    score_color = get_score_color(score, theme)

    # Draw grade indicator circle at bottom right
    indicator_size = 20
    draw.ellipse([width - indicator_size - 2, height - indicator_size - 2,
                  width + 2, height + 2],
                 fill=hex_to_rgb(score_color), outline=(255, 255, 255), width=2)
    draw.text((width - 16, height - 18), grade[0], fill=(255, 255, 255), font=font_small)

    return img


def get_report_data(certificate_number):
    """Fetch report data from DynamoDB by certificate number"""
    table_names = ['aivedha-guardian-audit-reports', 'aivedha-audit-reports']

    for table_name in table_names:
        try:
            table = dynamodb.Table(table_name)

            # Try to get by certificate_number using GSI
            try:
                response = table.query(
                    IndexName='certificate_number-index',
                    KeyConditionExpression='certificate_number = :cert',
                    ExpressionAttributeValues={':cert': certificate_number}
                )
                if response.get('Items'):
                    return response['Items'][0]
            except Exception as e:
                print(f"GSI query failed: {e}")

            # Fallback: try to get by report_id (if certificate_number is actually report_id)
            response = table.get_item(Key={'report_id': certificate_number})
            if 'Item' in response:
                return response['Item']

        except Exception as e:
            print(f"Table {table_name} error: {e}")
            continue

    return None


def convert_decimal(obj):
    """Convert DynamoDB Decimal to Python float/int"""
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    return obj


def lambda_handler(event, context):
    """
    AWS Lambda handler for badge generation

    GET /badge/{certificateNumber}?variant=full&theme=dark
    """

    # Handle OPTIONS preflight
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'message': 'OK'})}

    if not PILLOW_AVAILABLE:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': False, 'error': 'Image generation not available'})
        }

    # Get certificate number from path
    path_params = event.get('pathParameters') or {}
    certificate_number = path_params.get('certificateNumber')

    if not certificate_number:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': False, 'error': 'Certificate number required'})
        }

    # Get query parameters
    query_params = event.get('queryStringParameters') or {}
    variant = query_params.get('variant', 'full')
    theme = query_params.get('theme', 'dark')
    preview = query_params.get('preview', 'false') == 'true'

    # Validate variant and theme
    if variant not in BADGE_DIMENSIONS:
        variant = 'full'
    if theme not in COLORS:
        theme = 'dark'

    try:
        # Check if badge already exists in S3
        badge_key = f"badges/{certificate_number}/{variant}_{theme}.png"

        if not preview:
            try:
                # Try to get existing badge
                s3.head_object(Bucket=BUCKET_NAME, Key=badge_key)

                # Badge exists, return presigned URL
                url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': badge_key},
                    ExpiresIn=86400  # 24 hours
                )

                return {
                    'statusCode': 302,
                    'headers': {
                        **CORS_HEADERS,
                        'Location': url,
                        'Cache-Control': 'public, max-age=3600'
                    },
                    'body': ''
                }
            except:
                pass  # Badge doesn't exist, generate it

        # Fetch report data
        report_data = get_report_data(certificate_number)

        if not report_data:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'success': False, 'error': 'Certificate not found'})
            }

        # Convert DynamoDB Decimals
        report_data = convert_decimal(report_data)

        # Parse scan_results if it's a string
        scan_results = report_data.get('scan_results', '{}')
        if isinstance(scan_results, str):
            try:
                scan_results = json.loads(scan_results)
            except:
                scan_results = {}

        # Get security score - check multiple sources for compatibility
        raw_score = scan_results.get('security_assessment', {}).get('security_score') or \
                   scan_results.get('security_score') or \
                   report_data.get('security_score', 0)
        security_score = float(raw_score) if raw_score else 0
        # Score stored as x10 if > 10, convert back
        if security_score > 10:
            security_score = security_score / 10

        # Prepare badge data
        badge_data = {
            'certificate_number': report_data.get('certificate_number', certificate_number),
            'domain': report_data.get('url', scan_results.get('url', 'unknown')).replace('https://', '').replace('http://', '').split('/')[0],
            'security_score': security_score,
            'ssl_grade': scan_results.get('ssl_info', {}).get('grade', 'A' if scan_results.get('ssl_info', {}).get('valid') else 'F'),
            'scan_date': report_data.get('created_at', datetime.utcnow().isoformat())[:10]
        }

        # Generate badge image
        if variant == 'full':
            img = generate_full_badge(badge_data, theme)
        elif variant == 'compact':
            img = generate_compact_badge(badge_data, theme)
        else:
            img = generate_minimal_badge(badge_data, theme)

        # Convert to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)

        # Upload to S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=badge_key,
            Body=buffer.getvalue(),
            ContentType='image/png',
            CacheControl='public, max-age=86400',
            Metadata={
                'certificate_number': certificate_number,
                'variant': variant,
                'theme': theme
            }
        )

        # Generate presigned URL
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': badge_key},
            ExpiresIn=86400
        )

        # Return redirect to image or JSON response
        if preview:
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'success': True,
                    'imageUrl': url,
                    'variant': variant,
                    'theme': theme
                })
            }

        return {
            'statusCode': 302,
            'headers': {
                **CORS_HEADERS,
                'Location': url,
                'Cache-Control': 'public, max-age=3600'
            },
            'body': ''
        }

    except Exception as e:
        print(f"Badge generation error: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def verify_certificate(event, context):
    """
    Verify certificate endpoint for public verification page

    GET /verify/{certificateNumber}
    """

    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'message': 'OK'})}

    # Get certificate number from path
    path_params = event.get('pathParameters') or {}
    certificate_number = path_params.get('certificateNumber')

    if not certificate_number:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'valid': False, 'error': 'Certificate number required'})
        }

    try:
        # Fetch report data
        report_data = get_report_data(certificate_number)

        if not report_data:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'valid': False, 'error': 'Certificate not found'})
            }

        # Convert DynamoDB Decimals
        report_data = convert_decimal(report_data)

        # Parse scan_results
        scan_results = report_data.get('scan_results', '{}')
        if isinstance(scan_results, str):
            try:
                scan_results = json.loads(scan_results)
            except:
                scan_results = {}

        # Get vulnerability counts
        vulnerabilities = scan_results.get('vulnerabilities', [])
        critical = len([v for v in vulnerabilities if v.get('severity') == 'HIGH'])
        medium = len([v for v in vulnerabilities if v.get('severity') == 'MEDIUM'])
        low = len([v for v in vulnerabilities if v.get('severity') == 'LOW'])

        # SSL info
        ssl_info = scan_results.get('ssl_info', {})
        ssl_valid = ssl_info.get('valid', False)

        # Get security score - check multiple sources for compatibility
        raw_score = scan_results.get('security_assessment', {}).get('security_score') or \
                   scan_results.get('security_score') or \
                   report_data.get('security_score', 0)
        security_score = float(raw_score) if raw_score else 0
        # Score stored as x10 if > 10, convert back
        if security_score > 10:
            security_score = security_score / 10

        # Handle issuer as string or dict
        issuer_val = ssl_info.get('issuer', 'Unknown')
        if isinstance(issuer_val, dict):
            issuer_val = issuer_val.get('organizationName', issuer_val.get('O', 'Unknown'))

        # Build verification response
        verification_data = {
            'valid': True,
            'certificate_number': report_data.get('certificate_number', certificate_number),
            'domain': report_data.get('url', scan_results.get('url', 'unknown')).replace('https://', '').replace('http://', '').split('/')[0],
            'organization_name': report_data.get('user_name', ''),
            'security_score': security_score,
            'grade': get_grade(security_score),
            'ssl_status': 'Valid' if ssl_valid else 'Invalid',
            'ssl_grade': ssl_info.get('grade', 'A' if ssl_valid else 'F'),
            'ssl_issuer': issuer_val,
            'ssl_expiry': ssl_info.get('expires') or ssl_info.get('not_after', 'Unknown'),
            'scan_date': report_data.get('created_at', datetime.utcnow().isoformat())[:10],
            'vulnerabilities_found': len(vulnerabilities),
            'critical_issues': critical,
            'medium_issues': medium,
            'low_issues': low,
            'status': 'active',
            'report_id': report_data.get('report_id', '')
        }

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(verification_data)
        }

    except Exception as e:
        print(f"Certificate verification error: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'valid': False, 'error': str(e)})
        }
