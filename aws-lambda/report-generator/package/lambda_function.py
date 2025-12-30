import json
import boto3
import io
from datetime import datetime
from decimal import Decimal

# Custom JSON encoder for DynamoDB Decimal types
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super(DecimalEncoder, self).default(obj)

def json_dumps(obj):
    """Wrapper for json.dumps that handles DynamoDB Decimal types"""
    return json.dumps(obj, cls=DecimalEncoder)

# Lazy import reportlab - only when generating PDFs
REPORTLAB_AVAILABLE = False
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
    from reportlab.platypus.frames import Frame
    from reportlab.platypus.doctemplate import PageTemplate
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.graphics.shapes import Drawing, Rect
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.barcode import code128
    from reportlab.graphics.barcode.qr import QrCodeWidget
    REPORTLAB_AVAILABLE = True
except ImportError as e:
    print(f"ReportLab not available: {e}")
    REPORTLAB_AVAILABLE = False

# Global variable for page timestamp
PAGE_TIMESTAMP = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

# Global variable for logo path (will be set after download)
LOGO_PATH = None

def download_logo():
    """Download logo from S3 for use in PDF"""
    global LOGO_PATH
    try:
        s3 = boto3.client('s3')
        logo_path = '/tmp/logo.png'
        s3.download_file('aivedha-guardian-reports', 'assets/logo.png', logo_path)
        LOGO_PATH = logo_path
        return logo_path
    except Exception as e:
        print(f"Logo download failed: {e}")
        return None

def add_page_header_footer(canvas, doc):
    """Add header with centered logo, timestamp and footer with disclaimer to every page"""
    canvas.saveState()

    # Header - Centered logo
    if LOGO_PATH:
        try:
            # Draw logo centered at top
            logo_width = 80
            logo_height = 40
            logo_x = (A4[0] - logo_width) / 2
            logo_y = A4[1] - 55
            canvas.drawImage(LOGO_PATH, logo_x, logo_y, width=logo_width, height=logo_height, preserveAspectRatio=True, mask='auto')
        except Exception as e:
            # Fallback to text if image fails
            canvas.setFont('Helvetica-Bold', 12)
            canvas.setFillColor(colors.HexColor('#1e40af'))
            canvas.drawCentredString(A4[0]/2, A4[1] - 45, "AiVedha Guard")

    # Timestamp on right top
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.grey)
    canvas.drawRightString(A4[0] - 72, A4[1] - 30, PAGE_TIMESTAMP)

    # Page number on right
    page_num = canvas.getPageNumber()
    canvas.drawRightString(A4[0] - 72, A4[1] - 42, f"Page {page_num}")

    # Footer - Disclaimer in 7px
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.grey)

    disclaimer = "Disclaimer: This security audit report is auto-generated. AiVedha Guard and Aivibe Software Services Pvt Ltd do not guarantee the completeness or accuracy of the information. Consult qualified cybersecurity professionals for comprehensive assessments."

    # Draw disclaimer at bottom
    canvas.drawCentredString(A4[0]/2, 25, disclaimer[:120] + "...")
    canvas.drawCentredString(A4[0]/2, 15, f"© {datetime.utcnow().year}, Aivibe Software Services Pvt Ltd | Not liable for damages arising from use of this service.")

    canvas.restoreState()
import uuid
import random
import string
import os

def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'

def handle_verify_certificate(certificate_number, dynamodb, cors_headers):
    """
    Handle certificate verification request - returns certificate validity and details
    """
    try:
        # Try multiple table names
        table_names = ['aivedha-guardian-audit-reports', 'aivedha-audit-reports']
        report_data = None

        for table_name in table_names:
            try:
                reports_table = dynamodb.Table(table_name)
                # Use GSI query for certificate number lookup (much faster than scan)
                try:
                    response = reports_table.query(
                        IndexName='certificate-index',
                        KeyConditionExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]
                except Exception as gsi_error:
                    # Fallback to scan if GSI doesn't exist on this table
                    print(f"GSI query failed, falling back to scan: {gsi_error}")
                    response = reports_table.scan(
                        FilterExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]

                if report_data:
                    break
            except Exception as e:
                print(f"Table {table_name} error: {e}")
                continue

        if not report_data:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'valid': False,
                    'error': 'Certificate not found',
                    'certificate_number': certificate_number
                })
            }

        # Parse scan results
        scan_results = {}
        try:
            scan_results = json.loads(report_data.get('scan_results', '{}'))
        except:
            scan_results = report_data.get('scan_results', {})

        vulnerabilities = scan_results.get('vulnerabilities', [])
        ssl_info = scan_results.get('ssl_info', {})

        # Calculate issue counts
        high_issues = len([v for v in vulnerabilities if v.get('severity') == 'HIGH'])
        medium_issues = len([v for v in vulnerabilities if v.get('severity') == 'MEDIUM'])
        low_issues = len([v for v in vulnerabilities if v.get('severity') == 'LOW'])

        # Get security score - check multiple sources for compatibility
        security_score = scan_results.get('security_assessment', {}).get('security_score') or \
                        scan_results.get('security_score') or \
                        report_data.get('security_score', 0)
        security_score = float(security_score) if security_score else 0
        # Score stored as x10 if > 10, convert back
        if security_score > 10:
            security_score = security_score / 10
        if security_score >= 9:
            grade = 'A+'
        elif security_score >= 8:
            grade = 'A'
        elif security_score >= 7:
            grade = 'B'
        elif security_score >= 6:
            grade = 'C'
        elif security_score >= 5:
            grade = 'D'
        else:
            grade = 'F'

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json_dumps({
                'valid': True,
                'certificate_number': certificate_number,
                'domain': scan_results.get('url', report_data.get('url', 'N/A')),
                'organization_name': report_data.get('user_name', 'Unknown'),
                'security_score': security_score,
                'grade': grade,
                'ssl_status': 'valid' if ssl_info.get('valid') else 'invalid',
                'ssl_grade': ssl_info.get('grade', 'N/A'),
                # issuer can be string or dict, handle both formats
                'ssl_issuer': ssl_info.get('issuer') if isinstance(ssl_info.get('issuer'), str) else ssl_info.get('issuer', {}).get('organizationName', ssl_info.get('issuer', {}).get('O', 'N/A')) if isinstance(ssl_info.get('issuer'), dict) else 'N/A',
                # expires field (also check not_after for backward compatibility)
                'ssl_expiry': ssl_info.get('expires') or ssl_info.get('not_after', 'N/A'),
                'scan_date': scan_results.get('scan_timestamp', report_data.get('created_at', 'N/A')),
                'vulnerabilities_found': len(vulnerabilities),
                'critical_issues': high_issues,
                'medium_issues': medium_issues,
                'low_issues': low_issues,
                'status': 'active',
                'report_id': report_data.get('report_id', 'N/A')
            })
        }
    except Exception as e:
        print(f"Verify error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'valid': False, 'error': str(e)})
        }


def handle_badge_request(certificate_number, dynamodb, query_params, cors_headers):
    """
    Handle badge request - returns badge metadata or redirects to badge image
    """
    try:
        # Get badge parameters
        variant = query_params.get('variant', 'full')
        theme = query_params.get('theme', 'dark')
        preview = query_params.get('preview', 'false').lower() == 'true'

        # Try multiple table names
        table_names = ['aivedha-guardian-audit-reports', 'aivedha-audit-reports']
        report_data = None

        for table_name in table_names:
            try:
                reports_table = dynamodb.Table(table_name)
                # Use GSI query for certificate number lookup (much faster than scan)
                try:
                    response = reports_table.query(
                        IndexName='certificate-index',
                        KeyConditionExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]
                except Exception as gsi_error:
                    # Fallback to scan if GSI doesn't exist on this table
                    print(f"GSI query failed, falling back to scan: {gsi_error}")
                    response = reports_table.scan(
                        FilterExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]

                if report_data:
                    break
            except Exception as e:
                print(f"Table {table_name} error: {e}")
                continue

        if not report_data:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Certificate not found'})
            }

        # Parse scan results
        scan_results = {}
        try:
            scan_results = json.loads(report_data.get('scan_results', '{}'))
        except:
            scan_results = report_data.get('scan_results', {})

        # Get security score - check multiple sources
        raw_score = scan_results.get('security_score') or report_data.get('security_score', 0)
        # Handle Decimal from DynamoDB
        if isinstance(raw_score, Decimal):
            raw_score = float(raw_score)
        security_score = float(raw_score) if raw_score else 0
        # Score is stored as x10 if > 10, convert back
        if security_score > 10:
            security_score = security_score / 10

        domain = scan_results.get('url', report_data.get('url', 'N/A'))

        # Get grade from report or calculate
        grade = report_data.get('grade') or scan_results.get('grade')
        if not grade:
            if security_score >= 9:
                grade = 'A+'
            elif security_score >= 8:
                grade = 'A'
            elif security_score >= 7:
                grade = 'B'
            elif security_score >= 6:
                grade = 'C'
            elif security_score >= 5:
                grade = 'D'
            else:
                grade = 'F'

        # Return badge metadata
        badge_data = {
            'certificate_number': certificate_number,
            'domain': domain,
            'security_score': security_score,
            'grade': grade,
            'variant': variant,
            'theme': theme,
            'verify_url': f"https://aivedha.ai/verify/{certificate_number}",
            'embed_url': f"{get_api_base_url()}/badge/{certificate_number}?variant={variant}&theme={theme}",
            'status': 'active'
        }

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json_dumps(badge_data)
        }

    except Exception as e:
        print(f"Badge error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_certificate_request(certificate_number, dynamodb, cors_headers):
    """
    Handle certificate data request - returns full certificate information
    """
    try:
        # Try multiple table names
        table_names = ['aivedha-guardian-audit-reports', 'aivedha-audit-reports']
        report_data = None

        print(f"Looking up certificate: {certificate_number}")

        for table_name in table_names:
            try:
                reports_table = dynamodb.Table(table_name)
                print(f"Querying table {table_name} using certificate-index GSI")

                # Use GSI query for certificate number lookup (much faster than scan)
                try:
                    response = reports_table.query(
                        IndexName='certificate-index',
                        KeyConditionExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]
                        print(f"Found certificate in {table_name}")
                except Exception as gsi_error:
                    # Fallback to scan if GSI doesn't exist on this table
                    print(f"GSI query failed, falling back to scan: {gsi_error}")
                    response = reports_table.scan(
                        FilterExpression='certificate_number = :cert_num',
                        ExpressionAttributeValues={':cert_num': certificate_number}
                    )
                    if response.get('Items'):
                        report_data = response['Items'][0]
                        print(f"Found certificate in {table_name} via scan fallback")

                if report_data:
                    break  # Found it, exit table loop

            except Exception as e:
                print(f"Table {table_name} error: {e}")
                continue

        if not report_data:
            print(f"Certificate {certificate_number} not found in any table")
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Certificate not found'})
            }

        # Parse scan results - check multiple locations
        scan_results = {}
        try:
            raw_scan = report_data.get('scan_results')
            if raw_scan:
                if isinstance(raw_scan, str):
                    scan_results = json.loads(raw_scan)
                else:
                    scan_results = raw_scan
        except:
            scan_results = {}

        # Extract vulnerability counts - check report_data first (direct fields), then scan_results
        # DynamoDB stores counts directly in report_data as critical_issues, high_issues, etc.
        vulnerabilities = report_data.get('vulnerabilities', scan_results.get('vulnerabilities', []))

        # Calculate from vulnerabilities if available
        calc_critical = sum(1 for v in vulnerabilities if str(v.get('severity', '')).upper() == 'CRITICAL')
        calc_high = sum(1 for v in vulnerabilities if str(v.get('severity', '')).upper() == 'HIGH')
        calc_medium = sum(1 for v in vulnerabilities if str(v.get('severity', '')).upper() == 'MEDIUM')
        calc_low = sum(1 for v in vulnerabilities if str(v.get('severity', '')).upper() == 'LOW')

        # Use direct fields from report_data, fallback to calculated values
        # Handle None, Decimal, and numeric types properly
        def to_int(val, default=0):
            """Convert value to int, handling Decimal and None"""
            if val is None:
                return default
            if isinstance(val, Decimal):
                return int(val)
            try:
                return int(val)
            except (TypeError, ValueError):
                return default

        critical_issues = to_int(report_data.get('critical_issues'), calc_critical)
        high_issues = to_int(report_data.get('high_issues'), calc_high)
        medium_issues = to_int(report_data.get('medium_issues'), calc_medium)
        low_issues = to_int(report_data.get('low_issues'), calc_low)

        # Get SSL info from scan_results or report_data
        ssl_info = report_data.get('ssl_info', scan_results.get('ssl_info', {}))
        if isinstance(ssl_info, str):
            try:
                ssl_info = json.loads(ssl_info)
            except:
                ssl_info = {}

        # Get security score and grade
        security_score = report_data.get('security_score', scan_results.get('security_score', 0))
        if isinstance(security_score, Decimal):
            security_score = float(security_score)
        grade = report_data.get('grade', scan_results.get('grade', 'F'))

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json_dumps({
                'success': True,
                'certificate_number': certificate_number,
                'report_id': report_data.get('report_id'),
                'url': report_data.get('url', scan_results.get('url', '')),
                'user_name': report_data.get('user_name', ''),
                'user_email': report_data.get('user_email', ''),
                'security_score': security_score,
                'grade': grade,
                'critical_issues': critical_issues,
                'high_issues': high_issues,
                'medium_issues': medium_issues,
                'low_issues': low_issues,
                'ssl_status': report_data.get('ssl_status', ssl_info.get('status', 'Unknown')),
                'ssl_grade': report_data.get('ssl_grade', ssl_info.get('grade', 'N/A')),
                'seo_score': report_data.get('seo_score', scan_results.get('seo_score', 0)),
                'scan_date': report_data.get('created_at', report_data.get('completedAt', '')),
                'document_number': report_data.get('document_number', certificate_number),
                'pdf_location': report_data.get('pdf_report_url') or report_data.get('pdf_url') or report_data.get('pdf_location'),
                'vulnerabilities_count': report_data.get('vulnerabilities_count', len(vulnerabilities))
            })
        }
    except Exception as e:
        print(f"Certificate error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_download_request(report_id, dynamodb, s3, cors_headers):
    """
    Handle download request - returns presigned URL for existing PDF
    """
    try:
        # Try multiple table names (production uses different naming)
        table_names = ['aivedha-guardian-audit-reports', 'aivedha-audit-reports']
        report_data = None

        for table_name in table_names:
            try:
                reports_table = dynamodb.Table(table_name)
                response = reports_table.get_item(Key={'report_id': report_id})
                if 'Item' in response:
                    report_data = response['Item']
                    break
            except Exception as e:
                print(f"Table {table_name} error: {e}")
                continue

        if not report_data:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Report not found'})
            }

        # Get PDF location from report
        pdf_location = report_data.get('pdf_location') or report_data.get('pdf_url') or report_data.get('pdf_report_url')

        if not pdf_location:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'PDF not available for this report'})
            }

        # Always generate fresh presigned URL (never return old URLs directly)
        # This ensures secure access and avoids expired URL issues
        bucket_name = 'aivedha-guardian-reports-us-east-1'

        # Extract S3 key from various URL formats
        if pdf_location.startswith('https://') and '.s3.' in pdf_location:
            # Format: https://bucket.s3.region.amazonaws.com/key or https://bucket.s3.amazonaws.com/key
            try:
                from urllib.parse import urlparse, unquote
                parsed = urlparse(pdf_location)
                # Extract bucket from hostname
                host_parts = parsed.netloc.split('.s3.')
                if host_parts:
                    bucket_name = host_parts[0]
                # Path is the key (without leading slash, remove query params)
                pdf_location = unquote(parsed.path.lstrip('/').split('?')[0])
            except Exception as e:
                print(f"URL parse error: {e}")
                # Fall through to try as raw path
        elif pdf_location.startswith('https://s3.') or pdf_location.startswith('http://s3.'):
            # Format: https://s3.region.amazonaws.com/bucket/key
            try:
                from urllib.parse import urlparse, unquote
                parsed = urlparse(pdf_location)
                path_parts = parsed.path.lstrip('/').split('/', 1)
                if len(path_parts) >= 2:
                    bucket_name = path_parts[0]
                    pdf_location = unquote(path_parts[1].split('?')[0])
            except Exception as e:
                print(f"URL parse error: {e}")
        elif pdf_location.startswith('http://') or pdf_location.startswith('https://'):
            # Unknown URL format - try to extract key from path
            try:
                from urllib.parse import urlparse, unquote
                parsed = urlparse(pdf_location)
                pdf_location = unquote(parsed.path.lstrip('/').split('?')[0])
            except Exception as e:
                print(f"URL parse error: {e}")
        elif pdf_location.startswith('s3://'):
            # Format: s3://bucket/key
            parts = pdf_location.replace('s3://', '').split('/', 1)
            if len(parts) == 2:
                bucket_name = parts[0]
                pdf_location = parts[1]

        # Remove leading slash if present
        s3_key = pdf_location.lstrip('/')

        # Try multiple bucket names (production may use different naming)
        # Order matters: try the extracted bucket first, then fallback options
        buckets_to_try = [bucket_name]
        if bucket_name != 'aivedha-guardian-reports-us-east-1':
            buckets_to_try.append('aivedha-guardian-reports-us-east-1')
        if bucket_name != 'aivedha-guardian-reports':
            buckets_to_try.append('aivedha-guardian-reports')

        download_url = None
        last_error = None

        for try_bucket in buckets_to_try:
            try:
                # Check if object exists before generating URL
                s3.head_object(Bucket=try_bucket, Key=s3_key)

                # Object exists, generate presigned URL
                download_url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': try_bucket, 'Key': s3_key},
                    ExpiresIn=3600  # 1 hour
                )
                print(f"PDF found in bucket: {try_bucket}, key: {s3_key}")
                break
            except s3.exceptions.ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code in ('404', 'NoSuchKey'):
                    print(f"PDF not found in bucket {try_bucket}: {s3_key}")
                    last_error = f"PDF not found in {try_bucket}"
                    continue
                else:
                    print(f"S3 error for {try_bucket}: {e}")
                    last_error = str(e)
                    continue
            except Exception as e:
                print(f"Error checking bucket {try_bucket}: {e}")
                last_error = str(e)
                continue

        if not download_url:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'PDF file not found: {last_error}'
                })
            }

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'downloadUrl': download_url,
                'filename': f"AiVedha_Security_Report_{report_id}.pdf"
            })
        }

    except Exception as e:
        print(f"Download error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': 'Download service error. Please try again.'})
        }


def lambda_handler(event, context):
    """
    AWS Lambda function for PDF report generation, download, and certificate verification
    Handles:
    - POST: Generate new PDF report
    - GET /download/{reportId}: Download existing PDF (returns presigned URL)
    - GET /verify/{certificateNumber}: Verify certificate validity
    - GET /badge/{certificateNumber}: Get badge metadata
    - GET /certificate/{certificateNumber}: Get full certificate data
    """

    # CORS headers for all responses - support production and dev environments
    origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin') or 'https://aivedha.ai'
    allowed_origins = ['https://aivedha.ai', 'https://www.aivedha.ai', 'http://localhost:8080', 'http://localhost:5173']
    cors_origin = origin if origin in allowed_origins else 'https://aivedha.ai'

    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }

    # Handle OPTIONS preflight
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'POST'))
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': json.dumps({'message': 'OK'})}

    # Initialize AWS services
    # CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
    # This allows India region Lambda to access US region data
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    s3 = boto3.client('s3', region_name='us-east-1')

    # Get path and parameters
    path = event.get('path', event.get('rawPath', ''))
    path_params = event.get('pathParameters') or {}
    query_params = event.get('queryStringParameters') or {}

    # Route based on path - ORDER MATTERS! Check specific paths first
    # Handle /badge/{certificateNumber}
    if '/badge/' in path:
        certificate_number = path_params.get('certificateNumber')
        if not certificate_number:
            parts = path.split('/badge/')
            if len(parts) > 1:
                certificate_number = parts[1].strip('/').split('?')[0]

        if certificate_number:
            return handle_badge_request(certificate_number, dynamodb, query_params, cors_headers)

    # Handle /verify/{certificateNumber}
    if '/verify/' in path:
        certificate_number = path_params.get('certificateNumber')
        if not certificate_number:
            parts = path.split('/verify/')
            if len(parts) > 1:
                certificate_number = parts[1].strip('/')

        if certificate_number:
            return handle_verify_certificate(certificate_number, dynamodb, cors_headers)

    # Handle /certificate/{certificateNumber} - but not download paths
    if '/certificate/' in path and 'download' not in path:
        certificate_number = path_params.get('certificateNumber')
        if not certificate_number:
            parts = path.split('/certificate/')
            if len(parts) > 1:
                certificate_number = parts[1].strip('/')

        if certificate_number:
            return handle_certificate_request(certificate_number, dynamodb, cors_headers)

    # Handle download request (GET with reportId in path)
    # Check both pathParameters and extract from URL path
    report_id_from_path = path_params.get('reportId')

    # Also try to extract from /download/ path if pathParameters doesn't have it
    if not report_id_from_path and '/download/' in path:
        parts = path.split('/download/')
        if len(parts) > 1:
            report_id_from_path = parts[1].strip('/').split('?')[0]

    # Also handle /pdf/{reportId} paths for download
    if not report_id_from_path and '/pdf/' in path and '/download-link' not in path:
        parts = path.split('/pdf/')
        if len(parts) > 1:
            report_id_from_path = parts[1].strip('/').split('?')[0].split('/')[0]

    if http_method == 'GET' and report_id_from_path:
        # Handle download request - return presigned URL for existing PDF
        return handle_download_request(report_id_from_path, dynamodb, s3, cors_headers)

    # Download logo for PDF header (only for generation)
    download_logo()

    # Get parameters from event body (for generation)
    body = event.get('body', '{}')
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except:
            body = {}

    report_id = body.get('report_id') or event.get('report_id')
    user_id = body.get('user_id') or event.get('user_id')

    if not report_id or not user_id:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Missing required parameters: report_id, user_id'})
        }
    
    try:
        # Retrieve scan results from DynamoDB
        reports_table = dynamodb.Table('aivedha-audit-reports')
        response = reports_table.get_item(
            Key={'report_id': report_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Report not found'})
            }
        
        report_data = response['Item']
        scan_results = json.loads(report_data.get('scan_results', '{}'))
        user_email = report_data.get('user_email', 'unknown@example.com')
        user_name = report_data.get('user_name', 'Unknown User')
        
        # Generate certificate number and document ID
        certificate_number = generate_certificate_number()
        document_number = f"AIV/PU/AUD/WEB/{str(random.randint(100, 999)).zfill(3)}-V1"
        
        # Generate PDF report
        pdf_buffer = io.BytesIO()
        pdf_filename = f"aivedha_security_report_{report_id}.pdf"
        
        # Create PDF document
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Build PDF content
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1e40af'),
            alignment=1  # Center alignment
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.HexColor('#1e40af'),
            borderWidth=1,
            borderColor=colors.HexColor('#1e40af'),
            borderPadding=5
        )
        
        # Header with logo placeholder and branding
        story.append(Paragraph("🛡️ AiVedha Guard", title_style))
        story.append(Paragraph("Professional Website Security Audit Report", styles['Heading2']))
        story.append(Paragraph(f"Document No: {document_number}", 
                              ParagraphStyle('DocNumber', fontSize=10, textColor=colors.grey, alignment=2)))
        story.append(Spacer(1, 20))
        
        # Executive Summary
        story.append(Paragraph("Executive Summary", heading_style))
        
        url = scan_results.get('url', 'N/A')
        security_score = scan_results.get('security_score', 0)
        scan_date = datetime.fromisoformat(scan_results.get('scan_timestamp', datetime.utcnow().isoformat()))
        vulnerabilities = scan_results.get('vulnerabilities', [])
        
        summary_data = [
            ['Website URL:', url],
            ['Scan Date:', scan_date.strftime('%Y-%m-%d %H:%M:%S UTC')],
            ['Security Score:', f"{security_score}/10"],
            ['Report ID:', report_id],
            ['Vulnerabilities Found:', str(len(vulnerabilities))]
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Security Score Visualization
        story.append(Paragraph("Security Score Analysis", heading_style))
        
        # Create pie chart for security score
        drawing = Drawing(400, 200)
        pie = Pie()
        pie.x = 150
        pie.y = 50
        pie.width = 100
        pie.height = 100
        
        score_percentage = (security_score / 10) * 100
        remaining_percentage = 100 - score_percentage
        
        pie.data = [score_percentage, remaining_percentage]
        pie.labels = [f'Secure ({security_score}/10)', f'Risk Areas']
        pie.slices.strokeWidth = 0.5
        pie.slices[0].fillColor = colors.green
        pie.slices[1].fillColor = colors.red
        
        drawing.add(pie)
        story.append(drawing)
        story.append(Spacer(1, 20))
        
        # SSL/TLS Analysis
        story.append(Paragraph("SSL/TLS Certificate Analysis", heading_style))
        
        ssl_info = scan_results.get('ssl_info', {})
        if ssl_info.get('valid'):
            ssl_status = "✓ Valid SSL Certificate"
            ssl_color = colors.green
        else:
            ssl_status = "✗ Invalid or Missing SSL Certificate"
            ssl_color = colors.red
            
        story.append(Paragraph(ssl_status, ParagraphStyle('SSLStatus', textColor=ssl_color, fontSize=12)))
        
        if ssl_info.get('valid'):
            # Handle issuer as string or dict
            issuer_val = ssl_info.get('issuer', 'N/A')
            if isinstance(issuer_val, dict):
                issuer_val = issuer_val.get('organizationName', issuer_val.get('O', 'N/A'))

            ssl_data = [
                ['Property', 'Value'],
                ['Issuer', issuer_val],
                ['Grade', ssl_info.get('grade', 'N/A')],
                ['Protocol', ssl_info.get('protocol', 'N/A')],
                ['Valid Until', ssl_info.get('expires') or ssl_info.get('not_after', 'N/A')],
                ['Key Size', str(ssl_info.get('key_size', 'N/A'))]
            ]
            
            ssl_table = Table(ssl_data, colWidths=[2*inch, 3*inch])
            ssl_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('GRID', (0,0), (-1,-1), 1, colors.black)
            ]))
            
            story.append(ssl_table)
        
        story.append(Spacer(1, 20))
        
        # Security Headers Analysis
        story.append(Paragraph("Security Headers Analysis", heading_style))
        
        security_headers = scan_results.get('security_headers', {})
        headers = security_headers.get('headers', {})
        
        headers_data = [['Header', 'Status', 'Value']]
        
        critical_headers = {
            'strict-transport-security': 'HSTS',
            'x-frame-options': 'X-Frame-Options',
            'x-content-type-options': 'X-Content-Type-Options',
            'x-xss-protection': 'X-XSS-Protection',
            'content-security-policy': 'Content Security Policy',
            'referrer-policy': 'Referrer Policy'
        }
        
        for header_key, header_name in critical_headers.items():
            value = headers.get(header_key)
            if value:
                status = "✓ Present"
                status_color = colors.green
            else:
                status = "✗ Missing"
                status_color = colors.red
                value = "Not implemented"
            
            headers_data.append([header_name, status, value[:50] + '...' if len(str(value)) > 50 else str(value)])
        
        headers_table = Table(headers_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
        headers_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'TOP')
        ]))
        
        story.append(headers_table)
        story.append(Spacer(1, 20))
        
        # Vulnerabilities Analysis
        story.append(Paragraph("Identified Vulnerabilities", heading_style))
        
        if vulnerabilities:
            vuln_data = [['Severity', 'Type', 'Description', 'Recommendation']]
            
            for vuln in vulnerabilities:
                severity = vuln.get('severity', 'UNKNOWN')
                vuln_type = vuln.get('type', 'UNKNOWN')
                description = vuln.get('description', 'N/A')
                recommendation = vuln.get('recommendation', 'N/A')
                
                vuln_data.append([
                    severity,
                    vuln_type.replace('_', ' '),
                    description[:100] + '...' if len(description) > 100 else description,
                    recommendation[:100] + '...' if len(recommendation) > 100 else recommendation
                ])
            
            vuln_table = Table(vuln_data, colWidths=[0.8*inch, 1.5*inch, 2.2*inch, 2.2*inch])
            vuln_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 1, colors.black),
                ('VALIGN', (0,0), (-1,-1), 'TOP')
            ]))
            
            # Color code severity levels
            for i, vuln in enumerate(vulnerabilities, 1):
                severity = vuln.get('severity', 'UNKNOWN')
                if severity == 'HIGH':
                    vuln_table.setStyle(TableStyle([('BACKGROUND', (0,i), (0,i), colors.red)]))
                elif severity == 'MEDIUM':
                    vuln_table.setStyle(TableStyle([('BACKGROUND', (0,i), (0,i), colors.orange)]))
                elif severity == 'LOW':
                    vuln_table.setStyle(TableStyle([('BACKGROUND', (0,i), (0,i), colors.yellow)]))
            
            story.append(vuln_table)
        else:
            story.append(Paragraph("✓ No critical vulnerabilities identified", 
                                  ParagraphStyle('NoVuln', textColor=colors.green, fontSize=12)))
        
        story.append(Spacer(1, 20))
        
        # Recommendations
        story.append(Paragraph("Security Recommendations", heading_style))
        
        recommendations = [
            "Implement all missing security headers to protect against common attacks",
            "Ensure SSL/TLS certificate is valid and properly configured",
            "Regularly update and patch all web server software and dependencies",
            "Implement Content Security Policy (CSP) to prevent XSS attacks",
            "Enable HTTP Strict Transport Security (HSTS) for secure connections",
            "Regular security audits and vulnerability assessments",
            "Implement proper input validation and output encoding",
            "Use secure authentication and session management practices"
        ]
        
        for i, recommendation in enumerate(recommendations, 1):
            story.append(Paragraph(f"{i}. {recommendation}", styles['Normal']))
        
        story.append(Spacer(1, 30))
        
        # Add page break for certificate
        story.append(PageBreak())
        
        # Professional Certificate Page
        story.extend(create_certificate_page(
            url, security_score, vulnerabilities, scan_results,
            user_name, user_email, certificate_number, document_number
        ))
        
        # Report ID reference (footer is added via page template)
        story.append(Paragraph(f"Report ID: {report_id}",
                              ParagraphStyle('Footer', fontSize=8, textColor=colors.grey, alignment=1)))
        
        # Build PDF with custom header and footer on every page
        doc.build(story, onFirstPage=add_page_header_footer, onLaterPages=add_page_header_footer)
        
        # Upload to S3
        bucket_name = 'aivedha-guardian-reports'  # This should come from environment
        s3_key = f"reports/{user_id}/{pdf_filename}"
        
        pdf_buffer.seek(0)
        # Fix #16: Enable S3 server-side encryption
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=pdf_buffer.getvalue(),
            ContentType='application/pdf',
            ServerSideEncryption='AES256',
            Metadata={
                'user_id': user_id,
                'report_id': report_id,
                'security_score': str(security_score)
            },
            Tagging=f'user-access=granted&user_id={user_id}'
        )
        
        # Generate presigned URL for download
        download_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_key},
            ExpiresIn=3600  # 1 hour
        )
        
        # Update report record with PDF location and certificate info
        reports_table.update_item(
            Key={'report_id': report_id},
            UpdateExpression='SET pdf_location = :pdf_location, pdf_generated_at = :generated_at, certificate_number = :cert_num, document_number = :doc_num',
            ExpressionAttributeValues={
                ':pdf_location': s3_key,
                ':generated_at': datetime.utcnow().isoformat(),
                ':cert_num': certificate_number,
                ':doc_num': document_number
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'report_id': report_id,
                'pdf_location': s3_key,
                'download_url': download_url,
                'certificate_number': certificate_number,
                'document_number': document_number,
                'message': 'PDF report generated successfully'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'PDF generation failed',
                'message': str(e),
                'report_id': report_id
            })
        }

def generate_certificate_number():
    """Generate a professional 15-character alphanumeric certificate number ending with numbers"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=10))
    numbers = ''.join(random.choices(string.digits, k=5))
    return f"{letters}{numbers}"

def create_certificate_page(url, security_score, vulnerabilities, scan_results, user_name, user_email, certificate_number, document_number):
    """Create professional certificate page"""
    story = []
    styles = getSampleStyleSheet()
    
    # Certificate header style
    cert_title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    
    cert_subtitle_style = ParagraphStyle(
        'CertSubtitle',
        parent=styles['Normal'],
        fontSize=16,
        spaceAfter=30,
        textColor=colors.HexColor('#374151'),
        alignment=1,
        fontName='Helvetica'
    )
    
    # Header with logo placeholder
    story.append(Spacer(1, 50))
    story.append(Paragraph("🛡️ AiVedha Guard", cert_title_style))
    story.append(Paragraph("SECURITY AUDIT CERTIFICATE", cert_subtitle_style))
    
    # Certificate body
    story.append(Spacer(1, 30))
    
    # Website name (bold and prominent)
    website_style = ParagraphStyle(
        'WebsiteName',
        parent=styles['Heading2'],
        fontSize=24,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph(f"{url}", website_style))
    
    # User details (smaller font)
    user_style = ParagraphStyle(
        'UserDetails',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        textColor=colors.HexColor('#6b7280'),
        alignment=1
    )
    story.append(Paragraph(f"Audit requested by: {user_name} | {user_email}", user_style))
    
    # Certificate content
    story.append(Spacer(1, 40))
    
    # Security metrics table
    high_issues = len([v for v in vulnerabilities if v.get('severity') == 'HIGH'])
    medium_issues = len([v for v in vulnerabilities if v.get('severity') == 'MEDIUM'])
    low_issues = len([v for v in vulnerabilities if v.get('severity') == 'LOW'])
    
    # SEO data (simplified)
    seo_score = scan_results.get('seo_analysis', {}).get('seo_score', 85)
    
    metrics_data = [
        ['Security Rating', f"{security_score}/10"],
        ['Critical Issues', str(high_issues)],
        ['Medium Issues', str(medium_issues)],
        ['Low Issues', str(low_issues)],
        ['SEO Score', f"{seo_score}/100"]
    ]
    
    metrics_table = Table(metrics_data, colWidths=[2.5*inch, 1.5*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('GRID', (0,0), (-1,-1), 2, colors.HexColor('#1e40af')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    
    story.append(metrics_table)
    story.append(Spacer(1, 40))
    
    # Certificate number and barcode
    cert_num_style = ParagraphStyle(
        'CertNumber',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph(f"Certificate Number: {certificate_number}", cert_num_style))
    
    # QR Code for certificate verification
    certificate_url = f"https://www.aivedha.tech/certificate/{certificate_number}"
    
    # Create QR code
    qr_code = QrCodeWidget(certificate_url)
    qr_code.barWidth = 100
    qr_code.barHeight = 100
    
    qr_drawing = Drawing(150, 150)
    qr_drawing.add(qr_code)
    story.append(qr_drawing)
    
    # Certificate verification text
    story.append(Paragraph(f"Scan QR code or visit: {certificate_url}", 
                          ParagraphStyle('QRText', fontSize=10, textColor=colors.grey, alignment=1)))
    
    # Glossy stamp effect (text representation)
    story.append(Spacer(1, 30))
    stamp_style = ParagraphStyle(
        'Stamp',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#dc2626'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("🏆 VERIFIED AUDIT ✓", stamp_style))
    
    # Date and validity
    story.append(Spacer(1, 20))
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#374151'),
        alignment=1
    )
    story.append(Paragraph(f"Issued on: {datetime.utcnow().strftime('%B %d, %Y')}", date_style))
    
    # Footer (7px as per user requirement)
    story.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'CertFooter',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.grey,
        alignment=1
    )
    story.append(Paragraph(f"© {datetime.utcnow().year}, Aivibe Software Services Pvt Ltd", footer_style))
    story.append(Paragraph(f"Document: {document_number}", footer_style))

    return story