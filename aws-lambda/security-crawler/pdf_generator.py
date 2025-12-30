"""
AiVedha Guard - Professional PDF Report & Certificate Generator
Version: 5.0.0 "Quantum Fortress"

Generates enterprise-grade security audit PDF reports with:
- Professional header with logo on every page
- Report number and timestamp on all pages
- Website properties and ownership details
- International standard certificate
- Color-coded vulnerability sections
- AI-powered recommendations (properly formatted)
- S3 secure file access with presigned URLs
- White-label support for enterprise customers

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
ISO 27001:2022 Certified

Partners:
- NVIDIA Inception Program
- AWS Activate
- Microsoft for Startups
"""

import io
import os
import hashlib
import base64
import logging
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import uuid
import textwrap

# AWS SDK
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# PDF Generation
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm, mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        Image, PageBreak, HRFlowable, ListFlowable, ListItem,
        KeepTogether, Frame, PageTemplate, BaseDocTemplate
    )
    from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("ReportLab not available - PDF generation disabled")


# ============================================================================
# FONT CONFIGURATION - Nunito with Helvetica fallback
# ============================================================================

FONT_REGULAR = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
NUNITO_AVAILABLE = False

def register_nunito_font():
    """
    Register Nunito font if available in Lambda environment.
    Falls back to Helvetica if not available.
    """
    global FONT_REGULAR, FONT_BOLD, NUNITO_AVAILABLE

    if not PDF_AVAILABLE:
        return

    font_paths = [
        '/tmp/fonts/Nunito-Regular.ttf',
        '/opt/fonts/Nunito-Regular.ttf',
        '/var/task/fonts/Nunito-Regular.ttf',
        './fonts/Nunito-Regular.ttf',
    ]
    bold_paths = [
        '/tmp/fonts/Nunito-Bold.ttf',
        '/opt/fonts/Nunito-Bold.ttf',
        '/var/task/fonts/Nunito-Bold.ttf',
        './fonts/Nunito-Bold.ttf',
    ]

    for regular_path, bold_path in zip(font_paths, bold_paths):
        try:
            if os.path.exists(regular_path) and os.path.exists(bold_path):
                pdfmetrics.registerFont(TTFont('Nunito', regular_path))
                pdfmetrics.registerFont(TTFont('Nunito-Bold', bold_path))
                FONT_REGULAR = 'Nunito'
                FONT_BOLD = 'Nunito-Bold'
                NUNITO_AVAILABLE = True
                print(f"Nunito font registered from {regular_path}")
                return
        except Exception as e:
            print(f"Could not register Nunito from {regular_path}: {e}")
            continue

    print("Nunito font not available, using Helvetica fallback")

# Try to register Nunito on module load
register_nunito_font()


# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(handler)


# ============================================================================
# AWS CONFIGURATION
# ============================================================================

# S3 Client with retry configuration
s3_client = boto3.client(
    's3',
    config=Config(
        signature_version='s3v4',
        retries={'max_attempts': 3, 'mode': 'adaptive'}
    )
)

# DynamoDB Resource
# CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
# This allows India region Lambda to access US region data
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# Environment Variables
PDF_BUCKET = os.environ.get('PDF_BUCKET', 'aivedha-guard-reports')
LOGO_BUCKET = os.environ.get('LOGO_BUCKET', 'aivedha-guard-assets')
REPORTS_TABLE = os.environ.get('REPORTS_TABLE', 'aivedha_guard_reports')
DEFAULT_LOGO_URL = os.environ.get('DEFAULT_LOGO_URL', '')
DEFAULT_WATERMARK_URL = os.environ.get('DEFAULT_WATERMARK_URL', '')


# ============================================================================
# COLOR PALETTE
# ============================================================================

class AiVedhaColors:
    """Brand colors for AiVedha Guard."""
    
    # Primary Brand Colors
    PRIMARY = colors.HexColor('#1e40af')
    SECONDARY = colors.HexColor('#0ea5e9')
    ACCENT = colors.HexColor('#06b6d4')
    
    # Status Colors
    SUCCESS = colors.HexColor('#10b981')
    WARNING = colors.HexColor('#f59e0b')
    DANGER = colors.HexColor('#ef4444')
    CRITICAL = colors.HexColor('#7c3aed')
    INFO = colors.HexColor('#3b82f6')
    
    # Neutral Colors
    DARK = colors.HexColor('#1f2937')
    LIGHT = colors.HexColor('#f3f4f6')
    WHITE = colors.white
    BLACK = colors.black
    GRAY = colors.HexColor('#6b7280')
    
    # Header/Footer
    HEADER_BG = colors.HexColor('#1e3a5f')
    FOOTER_BG = colors.HexColor('#f8fafc')

    # Severity Colors
    SEVERITY_CRITICAL = colors.HexColor('#7c2d12')
    SEVERITY_HIGH = colors.HexColor('#dc2626')
    SEVERITY_MEDIUM = colors.HexColor('#ea580c')
    SEVERITY_LOW = colors.HexColor('#ca8a04')
    SEVERITY_INFO = colors.HexColor('#0284c7')

    # Certificate Colors
    CERT_GOLD = colors.HexColor('#d4af37')
    CERT_SILVER = colors.HexColor('#c0c0c0')
    CERT_BORDER = colors.HexColor('#1e3a5f')
    
    # Table Colors
    TABLE_HEADER = colors.HexColor('#1e40af')
    TABLE_ROW_ALT = colors.HexColor('#f8fafc')
    TABLE_BORDER = colors.HexColor('#e5e7eb')


def get_severity_color(severity: str) -> colors.Color:
    """Get color for severity level."""
    severity = severity.upper() if severity else 'INFO'
    return {
        'CRITICAL': AiVedhaColors.SEVERITY_CRITICAL,
        'HIGH': AiVedhaColors.SEVERITY_HIGH,
        'MEDIUM': AiVedhaColors.SEVERITY_MEDIUM,
        'LOW': AiVedhaColors.SEVERITY_LOW,
        'INFO': AiVedhaColors.SEVERITY_INFO
    }.get(severity, AiVedhaColors.SEVERITY_INFO)


def get_grade_color(grade: str) -> colors.Color:
    """Get color for security grade."""
    grade = grade.upper() if grade else 'F'
    return {
        'A+': AiVedhaColors.SUCCESS,
        'A': AiVedhaColors.SUCCESS,
        'B': colors.HexColor('#22c55e'),
        'C': AiVedhaColors.WARNING,
        'D': colors.HexColor('#f97316'),
        'F': AiVedhaColors.DANGER
    }.get(grade, AiVedhaColors.DANGER)


# ============================================================================
# WHITE-LABEL CONFIGURATION
# ============================================================================

class WhiteLabelConfig:
    """White-label configuration for enterprise customers."""
    
    def __init__(
        self,
        enabled: bool = False,
        company_name: str = "AiVedha Guard",
        logo_url: str = None,
        logo_base64: str = None,
        watermark_url: str = None,
        primary_color: str = "#1e40af",
        secondary_color: str = "#0ea5e9",
        accent_color: str = "#06b6d4",
        header_bg_color: str = "#1e3a5f",
        header_text: str = None,
        footer_text: str = None,
        contact_email: str = None,
        contact_phone: str = None,
        website_url: str = None,
        show_powered_by: bool = True,
        custom_css: str = None,
        certificate_seal_url: str = None
    ):
        self.enabled = enabled
        self.company_name = company_name
        self.logo_url = logo_url
        self.logo_base64 = logo_base64
        self.watermark_url = watermark_url
        self.primary_color = primary_color
        self.secondary_color = secondary_color
        self.accent_color = accent_color
        self.header_bg_color = header_bg_color
        self.header_text = header_text
        self.footer_text = footer_text
        self.contact_email = contact_email
        self.contact_phone = contact_phone
        self.website_url = website_url or "https://aivedha.ai"
        self.show_powered_by = show_powered_by
        self.custom_css = custom_css
        self.certificate_seal_url = certificate_seal_url
    
    def get_primary_color(self) -> colors.Color:
        """Get primary color as ReportLab color."""
        try:
            return colors.HexColor(self.primary_color)
        except:
            return AiVedhaColors.PRIMARY
    
    def get_secondary_color(self) -> colors.Color:
        """Get secondary color as ReportLab color."""
        try:
            return colors.HexColor(self.secondary_color)
        except:
            return AiVedhaColors.SECONDARY
    
    def get_header_bg_color(self) -> colors.Color:
        """Get header background color as ReportLab color."""
        try:
            return colors.HexColor(self.header_bg_color)
        except:
            return AiVedhaColors.HEADER_BG
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'WhiteLabelConfig':
        """Create WhiteLabelConfig from dictionary."""
        return cls(
            enabled=data.get('enabled', False),
            company_name=data.get('company_name', 'AiVedha Guard'),
            logo_url=data.get('logo_url'),
            logo_base64=data.get('logo_base64'),
            watermark_url=data.get('watermark_url'),
            primary_color=data.get('primary_color', '#1e40af'),
            secondary_color=data.get('secondary_color', '#0ea5e9'),
            accent_color=data.get('accent_color', '#06b6d4'),
            header_bg_color=data.get('header_bg_color', '#1e3a5f'),
            header_text=data.get('header_text'),
            footer_text=data.get('footer_text'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone'),
            website_url=data.get('website_url'),
            show_powered_by=data.get('show_powered_by', True),
            custom_css=data.get('custom_css'),
            certificate_seal_url=data.get('certificate_seal_url')
        )


# ============================================================================
# CERTIFICATE NUMBER GENERATOR
# ============================================================================

def generate_certificate_number(report_id: str, url: str, timestamp: str = None) -> str:
    """
    Generate a unique, verifiable certificate number.
    
    Format: AVGUARD-{YEAR}-{UNIQUE_ID}-{CHECKSUM}
    
    Args:
        report_id: Unique report identifier
        url: Target URL that was scanned
        timestamp: Scan timestamp (ISO format)
    
    Returns:
        Certificate number string
    """
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()

    year = datetime.utcnow().strftime('%Y')
    unique_data = f"{report_id}:{url}:{timestamp}"
    hash_digest = hashlib.sha256(unique_data.encode()).hexdigest()
    unique_id = hash_digest[:5].upper()
    checksum = hash_digest[10:15].upper()

    return f"AVGUARD-{year}-{unique_id}-{checksum}"


def verify_certificate_number(certificate_number: str) -> Dict[str, Any]:
    """
    Verify a certificate number format and extract components.
    
    Args:
        certificate_number: Certificate number to verify
    
    Returns:
        Dict with verification status and extracted components
    """
    try:
        parts = certificate_number.split('-')
        if len(parts) != 4 or parts[0] != 'AVGUARD':
            return {'valid': False, 'error': 'Invalid certificate format'}
        
        year = parts[1]
        unique_id = parts[2]
        checksum = parts[3]
        
        # Basic validation
        if not year.isdigit() or len(year) != 4:
            return {'valid': False, 'error': 'Invalid year in certificate'}
        
        if len(unique_id) != 5 or len(checksum) != 5:
            return {'valid': False, 'error': 'Invalid certificate components'}
        
        return {
            'valid': True,
            'year': year,
            'unique_id': unique_id,
            'checksum': checksum,
            'certificate_number': certificate_number
        }
    except Exception as e:
        return {'valid': False, 'error': str(e)}


# ============================================================================
# PDF STYLES
# ============================================================================

def add_style_safe(styles, style):
    """Safely add a style to stylesheet without duplicates."""
    try:
        styles.add(style)
    except KeyError:
        styles.byName[style.name] = style


def get_custom_styles(white_label: WhiteLabelConfig = None):
    """
    Get custom paragraph styles for PDF generation.
    
    Args:
        white_label: Optional white-label configuration
    
    Returns:
        StyleSheet with custom styles
    """
    styles = getSampleStyleSheet()
    
    # Get colors from white-label config or defaults
    primary_color = white_label.get_primary_color() if white_label else AiVedhaColors.PRIMARY
    secondary_color = white_label.get_secondary_color() if white_label else AiVedhaColors.SECONDARY

    # Report Title
    add_style_safe(styles, ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceAfter=15,
        fontName=FONT_BOLD,
        leading=28
    ))

    # Report Subtitle
    add_style_safe(styles, ParagraphStyle(
        name='ReportSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=AiVedhaColors.DARK,
        alignment=TA_CENTER,
        spaceAfter=20,
        leading=16
    ))

    # Section Heading
    add_style_safe(styles, ParagraphStyle(
        name='SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=8,
        fontName=FONT_BOLD,
        leading=18
    ))

    # Subsection Heading
    add_style_safe(styles, ParagraphStyle(
        name='SubsectionHeading',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=AiVedhaColors.DARK,
        spaceBefore=10,
        spaceAfter=6,
        fontName=FONT_BOLD,
        leading=15
    ))

    # Vulnerability Title
    add_style_safe(styles, ParagraphStyle(
        name='VulnTitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=AiVedhaColors.DARK,
        spaceBefore=8,
        spaceAfter=4,
        fontName=FONT_BOLD,
        leading=14
    ))

    # Report Body Text
    add_style_safe(styles, ParagraphStyle(
        name='ReportBodyText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=AiVedhaColors.DARK,
        alignment=TA_LEFT,
        spaceAfter=6,
        leading=12
    ))

    # Report Body Justified
    add_style_safe(styles, ParagraphStyle(
        name='ReportBodyJustified',
        parent=styles['Normal'],
        fontSize=9,
        textColor=AiVedhaColors.DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        leading=12
    ))

    # Small Text
    add_style_safe(styles, ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=AiVedhaColors.GRAY,
        alignment=TA_LEFT,
        leading=10
    ))

    # Certificate Title
    add_style_safe(styles, ParagraphStyle(
        name='CertTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=AiVedhaColors.CERT_BORDER,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName=FONT_BOLD,
        leading=32
    ))

    # Certificate Body
    add_style_safe(styles, ParagraphStyle(
        name='CertBody',
        parent=styles['Normal'],
        fontSize=11,
        textColor=AiVedhaColors.DARK,
        alignment=TA_CENTER,
        spaceAfter=12,
        leading=14
    ))

    # Code Block
    add_style_safe(styles, ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#374151'),
        fontName='Courier',
        backColor=colors.HexColor('#f3f4f6'),
        borderPadding=5,
        leading=10,
        leftIndent=10,
        rightIndent=10
    ))

    # Table Header
    add_style_safe(styles, ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=AiVedhaColors.WHITE,
        fontName=FONT_BOLD,
        alignment=TA_CENTER,
        leading=12
    ))

    # Table Cell
    add_style_safe(styles, ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=8,
        textColor=AiVedhaColors.DARK,
        alignment=TA_LEFT,
        leading=10
    ))

    return styles


# ============================================================================
# S3 SECURE FILE ACCESS FUNCTIONS
# ============================================================================

def generate_presigned_url(
    s3_key: str,
    expiration_seconds: int = 3600,
    bucket_name: str = None,
    response_content_type: str = 'application/pdf',
    response_content_disposition: str = None
) -> Optional[str]:
    """
    Generate a secure presigned URL for S3 file access.
    
    Args:
        s3_key: The S3 object key (file path in bucket)
        expiration_seconds: URL validity period (default: 1 hour, max: 7 days)
        bucket_name: S3 bucket name (defaults to PDF_BUCKET)
        response_content_type: Content-Type header for response
        response_content_disposition: Content-Disposition header (inline/attachment)
    
    Returns:
        Presigned URL string or None if generation fails
    
    Security Notes:
        - URLs are time-limited and expire after specified duration
        - Each URL is unique and cannot be reused after expiration
        - Access is granted only to the specific object
        - IAM permissions still apply to the signing credentials
    """
    if not bucket_name:
        bucket_name = PDF_BUCKET
    
    if not s3_key:
        logger.error("S3 key is required for presigned URL generation")
        return None
    
    # Validate expiration (min 60 seconds, max 7 days = 604800 seconds)
    expiration_seconds = min(max(expiration_seconds, 60), 604800)
    
    try:
        params = {
            'Bucket': bucket_name,
            'Key': s3_key,
            'ResponseContentType': response_content_type,
        }
        
        # Add content disposition if specified
        if response_content_disposition:
            params['ResponseContentDisposition'] = response_content_disposition
        
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expiration_seconds
        )
        
        logger.info(f"Generated presigned URL for {s3_key}, expires in {expiration_seconds}s")
        return presigned_url
        
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL: {e}")
        return None


def get_report_download_url(
    report_id: str,
    user_id: str,
    expiration_seconds: int = 3600,
    force_download: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Get secure download URL for a specific report.
    
    Args:
        report_id: The unique report identifier
        user_id: User ID for S3 path construction
        expiration_seconds: URL validity period (default: 1 hour)
        force_download: If True, browser downloads; if False, displays inline
    
    Returns:
        Dict with url, expires_at, and metadata or None if failed
    """
    # Construct S3 key based on naming convention
    s3_key = f"reports/{user_id}/{report_id}.pdf"
    
    # Set content disposition based on force_download flag
    if force_download:
        disposition = f'attachment; filename="security_report_{report_id}.pdf"'
    else:
        disposition = f'inline; filename="security_report_{report_id}.pdf"'
    
    url = generate_presigned_url(
        s3_key=s3_key,
        expiration_seconds=expiration_seconds,
        response_content_disposition=disposition
    )
    
    if url:
        expires_at = datetime.utcnow() + timedelta(seconds=expiration_seconds)
        
        return {
            'url': url,
            'expires_at': expires_at.isoformat() + 'Z',
            'expires_in_seconds': expiration_seconds,
            's3_key': s3_key,
            'content_type': 'application/pdf',
            'report_id': report_id
        }
    
    return None


def get_report_view_url(report_id: str, user_id: str) -> Optional[str]:
    """
    Get a short-lived URL for viewing a report inline in browser.
    
    Default: 1 hour expiration, inline content disposition.
    
    Args:
        report_id: The unique report identifier
        user_id: User ID for S3 path construction
    
    Returns:
        Presigned URL string or None if generation fails
    """
    result = get_report_download_url(
        report_id=report_id,
        user_id=user_id,
        expiration_seconds=3600,
        force_download=False
    )
    return result.get('url') if result else None


def verify_report_access(report_id: str, user_id: str) -> bool:
    """
    Verify user has access to the specified report.
    
    Checks DynamoDB for ownership/permissions before generating URL.
    
    Args:
        report_id: The unique report identifier
        user_id: User ID to verify access for
    
    Returns:
        True if user has access, False otherwise
    """
    try:
        reports_table = dynamodb.Table(REPORTS_TABLE)
        
        response = reports_table.get_item(
            Key={'report_id': report_id},
            ProjectionExpression='user_id, visibility, shared_with'
        )
        
        if 'Item' not in response:
            logger.warning(f"Report {report_id} not found")
            return False
        
        item = response['Item']
        
        # Check ownership
        if item.get('user_id') == user_id:
            return True
        
        # Check if report is public
        if item.get('visibility') == 'public':
            return True
        
        # Check if report is shared with this user
        shared_with = item.get('shared_with', [])
        if user_id in shared_with:
            return True
        
        logger.warning(f"User {user_id} denied access to report {report_id}")
        return False
        
    except ClientError as e:
        logger.error(f"DynamoDB error verifying report access: {e}")
        return False
    except Exception as e:
        logger.error(f"Error verifying report access: {e}")
        return False


def get_secure_report_url(
    report_id: str,
    user_id: str,
    expiration_seconds: int = 3600,
    force_download: bool = False
) -> Dict[str, Any]:
    """
    Complete secure report access function with authorization check.
    
    This is the PRIMARY function to call from API/Lambda handlers
    when a user requests to view a report from the dashboard.
    
    Args:
        report_id: The unique report identifier
        user_id: User ID to verify access and construct path
        expiration_seconds: URL validity period (default: 1 hour)
        force_download: If True, forces download; if False, inline display
    
    Returns:
        Dict with success status, URL, expiration, or error message
        {
            'success': True/False,
            'url': 'presigned_url' or None,
            'expires_at': 'ISO timestamp' or None,
            'error': 'error message' or None
        }
    """
    # Step 1: Verify user has access
    if not verify_report_access(report_id, user_id):
        return {
            'success': False,
            'url': None,
            'expires_at': None,
            'error': 'Access denied: You do not have permission to view this report'
        }
    
    # Step 2: Generate presigned URL
    result = get_report_download_url(
        report_id=report_id,
        user_id=user_id,
        expiration_seconds=expiration_seconds,
        force_download=force_download
    )
    
    if result:
        return {
            'success': True,
            'url': result['url'],
            'expires_at': result['expires_at'],
            's3_key': result['s3_key'],
            'error': None
        }
    else:
        return {
            'success': False,
            'url': None,
            'expires_at': None,
            'error': 'Failed to generate download URL. Report may not exist in storage.'
        }


def save_pdf_to_s3(
    pdf_bytes: bytes,
    report_id: str,
    user_id: str,
    metadata: Dict[str, str] = None
) -> Optional[str]:
    """
    Save PDF report to S3 bucket.
    
    Args:
        pdf_bytes: PDF file content as bytes
        report_id: Unique report identifier
        user_id: User ID for path construction
        metadata: Optional metadata to attach to S3 object
    
    Returns:
        S3 key where file was saved, or None if failed
    """
    s3_key = f"reports/{user_id}/{report_id}.pdf"
    
    try:
        extra_args = {
            'ContentType': 'application/pdf',
            'ServerSideEncryption': 'AES256'
        }
        
        if metadata:
            extra_args['Metadata'] = metadata
        
        s3_client.put_object(
            Bucket=PDF_BUCKET,
            Key=s3_key,
            Body=pdf_bytes,
            **extra_args
        )
        
        logger.info(f"Saved PDF to S3: {s3_key}")
        return s3_key
        
    except ClientError as e:
        logger.error(f"Failed to save PDF to S3: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error saving PDF to S3: {e}")
        return None


def delete_pdf_from_s3(report_id: str, user_id: str) -> bool:
    """
    Delete PDF report from S3 bucket.
    
    Args:
        report_id: Unique report identifier
        user_id: User ID for path construction
    
    Returns:
        True if deletion successful, False otherwise
    """
    s3_key = f"reports/{user_id}/{report_id}.pdf"
    
    try:
        s3_client.delete_object(
            Bucket=PDF_BUCKET,
            Key=s3_key
        )
        
        logger.info(f"Deleted PDF from S3: {s3_key}")
        return True
        
    except ClientError as e:
        logger.error(f"Failed to delete PDF from S3: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error deleting PDF from S3: {e}")
        return False


def check_pdf_exists(report_id: str, user_id: str) -> bool:
    """
    Check if PDF report exists in S3 bucket.
    
    Args:
        report_id: Unique report identifier
        user_id: User ID for path construction
    
    Returns:
        True if PDF exists, False otherwise
    """
    s3_key = f"reports/{user_id}/{report_id}.pdf"
    
    try:
        s3_client.head_object(Bucket=PDF_BUCKET, Key=s3_key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        logger.error(f"Error checking PDF existence: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error checking PDF existence: {e}")
        return False


# ============================================================================
# PDF REPORT GENERATOR WITH PAGE HEADERS
# ============================================================================

class SecurityReportGenerator:
    """
    Generates professional security audit PDF reports.
    
    Features:
    - Professional header/footer on every page
    - White-label support for enterprise customers
    - Color-coded vulnerability sections
    - AI-powered recommendations formatting
    - International standard certificate
    - No text overlapping with proper spacing
    """

    def __init__(
        self,
        brand_name: str = "AiVedha Guard",
        logo_url: str = None,
        white_label: WhiteLabelConfig = None
    ):
        """
        Initialize the report generator.
        
        Args:
            brand_name: Company/brand name for header
            logo_url: URL to logo image
            white_label: White-label configuration object
        """
        self.brand_name = brand_name
        self.logo_url = logo_url
        self.white_label = white_label or WhiteLabelConfig()
        self.styles = get_custom_styles(self.white_label)
        self.report_info = {}
        
        # Override brand name if white-label is enabled
        if self.white_label.enabled and self.white_label.company_name:
            self.brand_name = self.white_label.company_name

    def generate_report(
        self,
        scan_results: Dict,
        user_email: str
    ) -> Optional[bytes]:
        """
        Generate a complete security audit PDF report.
        
        Args:
            scan_results: Dictionary containing all scan results
            user_email: Email of the user who requested the scan
        
        Returns:
            PDF file content as bytes, or None if generation fails
        """
        if not PDF_AVAILABLE:
            logger.error("ReportLab not available - cannot generate PDF")
            return None

        try:
            buffer = io.BytesIO()

            # Extract report info
            report_id = scan_results.get('report_id', str(uuid.uuid4()))
            url = scan_results.get('url', 'Unknown')
            timestamp = scan_results.get('scan_timestamp', datetime.utcnow().isoformat())

            # Generate certificate number if not provided
            certificate_number = scan_results.get('certificate_number')
            if not certificate_number:
                certificate_number = generate_certificate_number(report_id, url, timestamp)

            # Store for header/footer
            self.report_info = {
                'report_id': report_id,
                'certificate_number': certificate_number,
                'url': url,
                'timestamp': timestamp,
                'user_email': user_email
            }

            # Create document with custom page template
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=1.5*cm,
                leftMargin=1.5*cm,
                topMargin=3*cm,  # Space for header
                bottomMargin=2*cm  # Space for footer
            )

            story = []

            # Build report sections - dynamic flow, no fixed page breaks
            story.extend(self._build_cover_page(scan_results, certificate_number))
            story.append(PageBreak())  # Cover page always on its own

            # Website properties section
            story.extend(self._build_website_properties(scan_results))
            story.append(Spacer(1, 12))

            # Executive summary
            story.extend(self._build_executive_summary(scan_results))
            story.append(Spacer(1, 12))

            # Score section
            story.extend(self._build_score_section(scan_results))
            story.append(Spacer(1, 12))

            # Vulnerability summary
            story.extend(self._build_vulnerability_summary(scan_results))
            story.append(Spacer(1, 12))

            # SSL analysis
            story.extend(self._build_ssl_analysis(scan_results))
            story.append(Spacer(1, 12))

            # Headers analysis
            story.extend(self._build_headers_analysis(scan_results))
            story.append(Spacer(1, 12))

            # WAF analysis
            story.extend(self._build_waf_analysis(scan_results))
            story.append(Spacer(1, 12))

            # CORS analysis
            story.extend(self._build_cors_analysis(scan_results))
            story.append(Spacer(1, 12))

            # Cloud security
            story.extend(self._build_cloud_security_analysis(scan_results))
            story.append(Spacer(1, 12))

            # Subdomain analysis
            story.extend(self._build_subdomain_analysis(scan_results))
            story.append(Spacer(1, 12))

            # Detailed findings - ALL vulnerabilities with AI recommendations
            story.extend(self._build_detailed_findings(scan_results))
            story.append(Spacer(1, 12))

            # Recommendations section
            story.extend(self._build_recommendations(scan_results))
            story.append(PageBreak())  # Certificate on its own page

            # Certificate page
            story.extend(self._build_certificate_page(
                scan_results, certificate_number, user_email
            ))

            # Build PDF with custom header/footer
            doc.build(
                story,
                onFirstPage=self._add_header_footer,
                onLaterPages=self._add_header_footer
            )
            
            buffer.seek(0)
            pdf_bytes = buffer.getvalue()
            
            logger.info(f"Generated PDF report: {report_id}, size: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except Exception as e:
            logger.error(f"PDF generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def _add_header_footer(self, canvas, doc):
        """
        Add header and footer to each page.
        
        Args:
            canvas: ReportLab canvas object
            doc: Document object
        """
        canvas.saveState()

        page_width, page_height = A4
        
        # Get colors from white-label or defaults
        header_bg = self.white_label.get_header_bg_color() if self.white_label else AiVedhaColors.HEADER_BG

        # ===== HEADER =====
        # Header background
        canvas.setFillColor(header_bg)
        canvas.rect(0, page_height - 2.2*cm, page_width, 2.2*cm, fill=True, stroke=False)

        # Draw shield logo icon (left side)
        logo_x = 1.2*cm
        logo_y = page_height - 1.8*cm
        shield_size = 18

        # Shield shape path
        canvas.setFillColor(colors.HexColor('#0ea5e9'))  # Cyan color
        p = canvas.beginPath()
        p.moveTo(logo_x + shield_size/2, logo_y + shield_size)  # Top center
        p.lineTo(logo_x + shield_size, logo_y + shield_size * 0.7)  # Top right
        p.lineTo(logo_x + shield_size, logo_y + shield_size * 0.3)  # Right side
        p.lineTo(logo_x + shield_size/2, logo_y)  # Bottom point
        p.lineTo(logo_x, logo_y + shield_size * 0.3)  # Left side
        p.lineTo(logo_x, logo_y + shield_size * 0.7)  # Top left
        p.close()
        canvas.drawPath(p, fill=True, stroke=False)

        # Checkmark inside shield
        canvas.setStrokeColor(colors.white)
        canvas.setLineWidth(1.5)
        canvas.line(logo_x + 5, logo_y + shield_size * 0.45, logo_x + 8, logo_y + shield_size * 0.3)
        canvas.line(logo_x + 8, logo_y + shield_size * 0.3, logo_x + 13, logo_y + shield_size * 0.65)

        # Logo/Brand text (after shield)
        canvas.setFillColor(colors.white)
        canvas.setFont(FONT_BOLD, 14)
        canvas.drawString(1.5*cm + shield_size + 5, page_height - 1.4*cm, self.brand_name)

        # Report number (center)
        canvas.setFont(FONT_REGULAR, 9)
        cert_num = self.report_info.get('certificate_number', '')
        canvas.drawCentredString(page_width/2, page_height - 1.4*cm, f"Report: {cert_num}")

        # Date (right side)
        try:
            ts = self.report_info.get('timestamp', '')
            if ts:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                date_str = dt.strftime('%d %b %Y %H:%M UTC')
            else:
                date_str = datetime.utcnow().strftime('%d %b %Y %H:%M UTC')
        except:
            date_str = datetime.utcnow().strftime('%d %b %Y %H:%M UTC')

        canvas.drawRightString(page_width - 1.5*cm, page_height - 1.4*cm, date_str)

        # URL in header (second line)
        canvas.setFont(FONT_REGULAR, 8)
        url = self.report_info.get('url', '')
        # Truncate URL if too long
        if len(url) > 60:
            url = url[:57] + '...'
        canvas.drawCentredString(page_width/2, page_height - 2*cm, url)

        # ===== FOOTER =====
        # Page number
        canvas.setFillColor(AiVedhaColors.DARK)
        canvas.setFont(FONT_REGULAR, 8)
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(page_width/2, 1*cm, f"Page {page_num}")

        # Copyright (left)
        canvas.setFont(FONT_REGULAR, 7)
        canvas.setFillColor(AiVedhaColors.GRAY)
        
        if self.white_label.enabled and not self.white_label.show_powered_by:
            copyright_text = f"© {datetime.utcnow().year} {self.brand_name} | Confidential"
        else:
            copyright_text = f"© {datetime.utcnow().year} AiVibe Software Services Pvt Ltd | Confidential"
        
        canvas.drawString(1.5*cm, 0.6*cm, copyright_text)

        # Website URL (right)
        website = self.white_label.website_url if self.white_label.enabled else "https://aivedha.ai"
        canvas.drawRightString(page_width - 1.5*cm, 0.6*cm, website)

        canvas.restoreState()

    def _build_cover_page(self, scan_results: Dict, certificate_number: str) -> List:
        """Build the cover page."""
        elements = []

        elements.append(Spacer(1, 1*cm))

        # Title
        elements.append(Paragraph(
            f"<font size='28' color='#1e40af'><b>SECURITY AUDIT REPORT</b></font>",
            self.styles['ReportTitle']
        ))
        elements.append(Spacer(1, 5))
        elements.append(Paragraph(
            "Enterprise Security Assessment",
            self.styles['ReportSubtitle']
        ))

        # Decorative line
        elements.append(HRFlowable(
            width="70%",
            thickness=3,
            color=AiVedhaColors.PRIMARY,
            spaceAfter=25,
            hAlign='CENTER'
        ))

        # Target URL
        url = scan_results.get('url', 'N/A')
        elements.append(Paragraph(
            f"<b>Target Website:</b>",
            self.styles['ReportBodyText']
        ))
        elements.append(Paragraph(
            f"<font size='12' color='#0ea5e9'>{self._safe_text(url, 80)}</font>",
            self.styles['ReportBodyText']
        ))
        elements.append(Spacer(1, 20))

        # Score display - Fixed layout to prevent overlap
        score = scan_results.get('security_score', 0)
        if isinstance(score, (int, float)) and score > 10:
            score = score / 10  # Convert if stored as integer (0-100 scale)
        grade = scan_results.get('grade', 'F')
        grade_color = get_grade_color(grade)

        # Score and Grade display - clear vertical layout to prevent overlap
        # Score value (large, centered)
        elements.append(Paragraph(
            f"<font size='42' color='#{grade_color.hexval()[2:]}'><b>{score:.1f}</b></font>",
            self.styles['ReportTitle']
        ))
        elements.append(Spacer(1, 2))

        # "out of 10" text (smaller, muted)
        elements.append(Paragraph(
            f"<font size='12' color='#6b7280'>out of 10</font>",
            self.styles['ReportTitle']
        ))
        elements.append(Spacer(1, 12))

        # Grade label - separate with clear spacing
        elements.append(Paragraph(
            f"<font size='20' color='#{grade_color.hexval()[2:]}'><b>Grade: {grade}</b></font>",
            self.styles['ReportTitle']
        ))
        elements.append(Spacer(1, 25))

        # Quick stats
        vulns = scan_results.get('vulnerabilities', [])
        critical = sum(1 for v in vulns if v.get('severity', '').upper() == 'CRITICAL')
        high = sum(1 for v in vulns if v.get('severity', '').upper() == 'HIGH')
        medium = sum(1 for v in vulns if v.get('severity', '').upper() == 'MEDIUM')
        low = sum(1 for v in vulns if v.get('severity', '').upper() == 'LOW')

        stats_data = [
            ['Total Issues', 'Critical', 'High', 'Medium', 'Low'],
            [str(len(vulns)), str(critical), str(high), str(medium), str(low)]
        ]

        stats_table = Table(stats_data, colWidths=[90, 70, 70, 70, 70])
        stats_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, 1), 14),
            ('TEXTCOLOR', (1, 1), (1, 1), AiVedhaColors.SEVERITY_CRITICAL),
            ('TEXTCOLOR', (2, 1), (2, 1), AiVedhaColors.SEVERITY_HIGH),
            ('TEXTCOLOR', (3, 1), (3, 1), AiVedhaColors.SEVERITY_MEDIUM),
            ('TEXTCOLOR', (4, 1), (4, 1), AiVedhaColors.SEVERITY_LOW),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, AiVedhaColors.LIGHT),
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.LIGHT),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 20))

        # Certificate number
        elements.append(Paragraph(
            f"<b>Certificate Number:</b> <font color='#1e40af'>{certificate_number}</font>",
            self.styles['ReportBodyText']
        ))

        # Scan timestamp
        try:
            ts = scan_results.get('scan_timestamp', '')
            if ts:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%B %d, %Y at %H:%M UTC')
            else:
                formatted_date = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        except:
            formatted_date = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        
        elements.append(Paragraph(
            f"<b>Scan Date:</b> {formatted_date}",
            self.styles['ReportBodyText']
        ))

        return elements

    def _build_website_properties(self, scan_results: Dict) -> List:
        """Build website properties section."""
        elements = []

        elements.append(Paragraph("Website Properties", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        url = scan_results.get('url', 'N/A')
        ssl_info = scan_results.get('ssl_info', {})
        dns_info = scan_results.get('dns_security', {})
        tech_stack = scan_results.get('technology_stack', [])

        # Properties table
        props_data = [
            ['Property', 'Value'],
            ['Target URL', self._safe_text(url, 50)],
            ['SSL Certificate', 'Valid' if ssl_info.get('valid') else 'Invalid'],
            ['SSL Issuer', self._safe_text(ssl_info.get('issuer', 'N/A'), 40)],
            ['SSL Expiry', ssl_info.get('expires', 'N/A')],
            ['Protocol', ssl_info.get('protocol', 'N/A')],
            ['Key Size', f"{ssl_info.get('key_size', 'N/A')} bits" if ssl_info.get('key_size') else 'N/A'],
            ['DNSSEC', 'Enabled' if dns_info.get('dnssec_enabled') else 'Disabled'],
            ['SPF Record', 'Configured' if dns_info.get('spf_record') else 'Not Found'],
            ['DMARC Record', 'Configured' if dns_info.get('dmarc_record') else 'Not Found'],
        ]

        if tech_stack:
            tech_str = ', '.join(tech_stack[:5])
            if len(tech_stack) > 5:
                tech_str += f' (+{len(tech_stack) - 5} more)'
            props_data.append(['Technologies', self._safe_text(tech_str, 45)])

        props_table = Table(props_data, colWidths=[150, 320])
        props_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [AiVedhaColors.WHITE, AiVedhaColors.LIGHT]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(props_table)

        return elements

    def _build_executive_summary(self, scan_results: Dict) -> List:
        """Build executive summary section."""
        elements = []

        elements.append(Paragraph("Executive Summary", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        url = scan_results.get('url', 'N/A')
        score = scan_results.get('security_score', 0)
        if isinstance(score, (int, float)) and score > 10:
            score = score / 10

        summary = f"""This security assessment was conducted against <b>{self._safe_text(url, 50)}</b> using 
        {self.brand_name}'s enterprise-grade security scanning platform. The assessment evaluated the target against 
        OWASP Top 10 vulnerabilities, SSL/TLS configuration, security headers, DNS security, 
        and content analysis."""
        elements.append(Paragraph(summary, self.styles['ReportBodyJustified']))
        elements.append(Spacer(1, 8))

        # Assessment level based on score
        if score >= 8:
            assessment = "The target demonstrates a <b>strong security posture</b> with well-implemented security controls."
            color = AiVedhaColors.SUCCESS
        elif score >= 6:
            assessment = "The target has a <b>moderate security posture</b> with some areas requiring attention."
            color = AiVedhaColors.WARNING
        elif score >= 4:
            assessment = "The target has a <b>weak security posture</b> with significant vulnerabilities that need remediation."
            color = AiVedhaColors.DANGER
        else:
            assessment = "The target has a <b>critical security posture</b> requiring immediate remediation action."
            color = AiVedhaColors.SEVERITY_CRITICAL

        elements.append(Paragraph(
            f"<font color='#{color.hexval()[2:]}'>{assessment}</font>",
            self.styles['ReportBodyText']
        ))

        return elements

    def _build_score_section(self, scan_results: Dict) -> List:
        """Build score breakdown section."""
        elements = []

        elements.append(Paragraph("Security Score Breakdown", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        ssl_info = scan_results.get('ssl_info', {})
        headers = scan_results.get('security_headers', {})

        factors = [
            ['Category', 'Status', 'Score/Grade'],
            ['SSL/TLS Certificate', 'Valid' if ssl_info.get('valid') else 'Invalid', ssl_info.get('grade', 'N/A')],
            ['Security Headers', f"{headers.get('score', 0)}/100", 'Variable'],
            ['OWASP Compliance', 'Assessed', 'Based on findings'],
            ['Content Security', 'Analyzed', 'Variable'],
            ['DNS Security', 'Checked', 'Variable'],
        ]

        factors_table = Table(factors, colWidths=[160, 140, 140])
        factors_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [AiVedhaColors.WHITE, AiVedhaColors.LIGHT]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(factors_table)

        return elements

    def _build_vulnerability_summary(self, scan_results: Dict) -> List:
        """Build vulnerability summary section."""
        elements = []

        elements.append(Paragraph("Vulnerability Summary", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        vulns = scan_results.get('vulnerabilities', [])

        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0, 'INFO': 0}
        for vuln in vulns:
            sev = vuln.get('severity', 'INFO').upper()
            if sev in severity_counts:
                severity_counts[sev] += 1

        summary_data = [
            ['Severity', 'Count', 'Priority', 'Action Required'],
            ['CRITICAL', str(severity_counts['CRITICAL']), 'Immediate', 'Fix within 24 hours'],
            ['HIGH', str(severity_counts['HIGH']), 'Urgent', 'Fix within 1 week'],
            ['MEDIUM', str(severity_counts['MEDIUM']), 'Important', 'Fix within 1 month'],
            ['LOW', str(severity_counts['LOW']), 'Low', 'Schedule for fix'],
            ['INFO', str(severity_counts['INFO']), 'Informational', 'Review as needed'],
        ]

        summary_table = Table(summary_data, colWidths=[90, 60, 100, 150])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('BACKGROUND', (0, 1), (0, 1), AiVedhaColors.SEVERITY_CRITICAL),
            ('TEXTCOLOR', (0, 1), (0, 1), AiVedhaColors.WHITE),
            ('BACKGROUND', (0, 2), (0, 2), AiVedhaColors.SEVERITY_HIGH),
            ('TEXTCOLOR', (0, 2), (0, 2), AiVedhaColors.WHITE),
            ('BACKGROUND', (0, 3), (0, 3), AiVedhaColors.SEVERITY_MEDIUM),
            ('TEXTCOLOR', (0, 3), (0, 3), AiVedhaColors.WHITE),
            ('BACKGROUND', (0, 4), (0, 4), AiVedhaColors.SEVERITY_LOW),
            ('BACKGROUND', (0, 5), (0, 5), AiVedhaColors.SEVERITY_INFO),
            ('TEXTCOLOR', (0, 5), (0, 5), AiVedhaColors.WHITE),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(summary_table)

        return elements

    def _build_ssl_analysis(self, scan_results: Dict) -> List:
        """Build SSL/TLS analysis section."""
        elements = []

        elements.append(Paragraph("SSL/TLS Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        ssl_info = scan_results.get('ssl_info', {})

        if not ssl_info:
            elements.append(Paragraph(
                "SSL/TLS information not available for this target.",
                self.styles['ReportBodyText']
            ))
            return elements

        ssl_data = [
            ['Property', 'Value', 'Status'],
            ['Certificate Valid', 'Yes' if ssl_info.get('valid') else 'No', 
             'OK' if ssl_info.get('valid') else 'FAIL'],
            ['SSL Grade', ssl_info.get('grade', 'N/A'), ''],
            ['Protocol', ssl_info.get('protocol', 'N/A'), ''],
            ['Issuer', self._safe_text(ssl_info.get('issuer', 'N/A'), 35), ''],
            ['Expiry Date', ssl_info.get('expires', 'N/A'), ''],
            ['Key Size', f"{ssl_info.get('key_size', 'N/A')} bits" if ssl_info.get('key_size') else 'N/A', ''],
            ['Signature Algorithm', self._safe_text(ssl_info.get('signature_algorithm', 'N/A'), 30), ''],
        ]

        ssl_table = Table(ssl_data, colWidths=[140, 240, 60])
        ssl_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [AiVedhaColors.WHITE, AiVedhaColors.LIGHT]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(ssl_table)

        return elements

    def _build_headers_analysis(self, scan_results: Dict) -> List:
        """Build security headers analysis section."""
        elements = []

        elements.append(Paragraph("Security Headers Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        headers = scan_results.get('security_headers', {})
        score = headers.get('score', 0)

        elements.append(Paragraph(
            f"<b>Headers Score: {score}/100</b>",
            self.styles['ReportBodyText']
        ))
        elements.append(Spacer(1, 8))

        # Important headers to check
        important_headers = [
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Referrer-Policy',
            'Permissions-Policy',
            'Cross-Origin-Opener-Policy',
            'Cross-Origin-Embedder-Policy',
        ]

        present = headers.get('present_headers', [])
        present_lower = [p.lower() for p in present]

        header_data = [['Security Header', 'Status']]
        for h in important_headers:
            if h.lower() in present_lower:
                header_data.append([h, 'Present'])
            else:
                header_data.append([h, 'Missing'])

        header_table = Table(header_data, colWidths=[300, 100])
        
        # Base style
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]

        # Add color coding for status
        for i in range(1, len(header_data)):
            if header_data[i][1] == 'Present':
                table_style.append(('TEXTCOLOR', (1, i), (1, i), AiVedhaColors.SUCCESS))
            else:
                table_style.append(('TEXTCOLOR', (1, i), (1, i), AiVedhaColors.DANGER))

        header_table.setStyle(TableStyle(table_style))
        elements.append(header_table)

        return elements

    def _build_waf_analysis(self, scan_results: Dict) -> List:
        """Build WAF (Web Application Firewall) detection section."""
        elements = []

        elements.append(Paragraph("Web Application Firewall (WAF) Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        waf_info = scan_results.get('waf_detection', {})

        if not waf_info:
            # No WAF data - show success
            elements.append(Paragraph(
                "<font color='#f59e0b'><b>WAF Status: Not Detected</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "No Web Application Firewall was detected protecting this website. "
                "Consider implementing a WAF solution for enhanced protection against "
                "SQL injection, XSS, and other OWASP Top 10 attacks.",
                self.styles['ReportBodyJustified']
            ))
            return elements

        detected = waf_info.get('detected', False)
        waf_name = waf_info.get('waf_name', 'Unknown')
        confidence = waf_info.get('confidence', 'low')

        if detected:
            elements.append(Paragraph(
                f"<font color='#10b981'><b>WAF Detected: {waf_name}</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                f"Detection Confidence: {confidence.capitalize()}",
                self.styles['SmallText']
            ))
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "Your website is protected by a Web Application Firewall, providing defense-in-depth "
                "against common web attacks including SQL injection, cross-site scripting (XSS), "
                "and other OWASP Top 10 vulnerabilities.",
                self.styles['ReportBodyJustified']
            ))
        else:
            elements.append(Paragraph(
                "<font color='#f59e0b'><b>No WAF Protection Detected</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "<b>Recommendation:</b> Implement a Web Application Firewall (WAF) such as Cloudflare, "
                "AWS WAF, or ModSecurity to add an additional layer of protection against web attacks.",
                self.styles['ReportBodyText']
            ))

        return elements

    def _build_cors_analysis(self, scan_results: Dict) -> List:
        """Build CORS (Cross-Origin Resource Sharing) security analysis section."""
        elements = []

        elements.append(Paragraph("CORS (Cross-Origin Resource Sharing) Policy Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        cors_info = scan_results.get('cors_analysis', {})

        if not cors_info:
            elements.append(Paragraph(
                "<font color='#3b82f6'><b>CORS Status: Not Configured</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "No CORS headers detected. Cross-origin requests are governed by the browser's "
                "same-origin policy by default.",
                self.styles['ReportBodyJustified']
            ))
            return elements

        cors_configured = cors_info.get('cors_configured', False)
        allow_origin = cors_info.get('allow_origin', '')
        allow_credentials = cors_info.get('allow_credentials', False)

        cors_data = [
            ['CORS Property', 'Value', 'Risk Level'],
            ['CORS Configured', 'Yes' if cors_configured else 'No', 'N/A'],
            ['Access-Control-Allow-Origin', self._safe_text(allow_origin or 'Not Set', 30),
             'HIGH' if allow_origin == '*' else 'LOW'],
            ['Allow Credentials', 'Yes' if allow_credentials else 'No',
             'HIGH' if allow_credentials and allow_origin == '*' else 'LOW'],
        ]

        cors_table = Table(cors_data, colWidths=[180, 150, 80])
        cors_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [AiVedhaColors.WHITE, AiVedhaColors.LIGHT]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(cors_table)

        # Security assessment
        if allow_origin == '*' and allow_credentials:
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "<font color='#ef4444'><b>CRITICAL:</b> Wildcard origin (*) with credentials enabled "
                "is a severe security misconfiguration that allows any website to steal user data.</font>",
                self.styles['ReportBodyText']
            ))
        elif allow_origin == '*':
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "<font color='#f59e0b'><b>Warning:</b> Wildcard origin allows any website to make "
                "cross-origin requests. Consider restricting to specific trusted domains.</font>",
                self.styles['ReportBodyText']
            ))

        return elements

    def _build_cloud_security_analysis(self, scan_results: Dict) -> List:
        """Build cloud security and infrastructure analysis section."""
        elements = []

        elements.append(Paragraph("Cloud Security & Infrastructure Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        cloud_info = scan_results.get('cloud_security', {})

        if not cloud_info:
            elements.append(Paragraph(
                "<font color='#10b981'><b>Cloud Security Status: No Exposed Resources</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "No publicly accessible cloud storage buckets, SSRF indicators, or cloud "
                "misconfigurations were detected during the scan.",
                self.styles['ReportBodyJustified']
            ))
            return elements

        s3_buckets = cloud_info.get('s3_buckets', [])
        azure_blobs = cloud_info.get('azure_blobs', [])
        cloud_resources = cloud_info.get('cloud_resources_found', [])

        if not s3_buckets and not azure_blobs and not cloud_resources:
            elements.append(Paragraph(
                "<font color='#10b981'><b>All Clear - No Exposed Cloud Resources</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "No cloud storage misconfigurations or exposed resources were detected. "
                "This is a positive indicator of proper cloud security hygiene.",
                self.styles['ReportBodyJustified']
            ))
        else:
            elements.append(Paragraph(
                f"<font color='#f59e0b'><b>Cloud Resources Found: {len(cloud_resources)}</b></font>",
                self.styles['ReportBodyText']
            ))

            if s3_buckets:
                elements.append(Spacer(1, 8))
                elements.append(Paragraph("<b>AWS S3 Buckets Referenced:</b>", self.styles['ReportBodyText']))
                for bucket in s3_buckets[:5]:
                    elements.append(Paragraph(f"• s3://{self._safe_text(bucket, 50)}", self.styles['SmallText']))

            if azure_blobs:
                elements.append(Spacer(1, 8))
                elements.append(Paragraph("<b>Azure Blob Storage Referenced:</b>", self.styles['ReportBodyText']))
                for blob in azure_blobs[:5]:
                    elements.append(Paragraph(f"• {self._safe_text(blob, 50)}.blob.core.windows.net", self.styles['SmallText']))

            elements.append(Spacer(1, 10))
            elements.append(Paragraph(
                "<b>Recommendations:</b> Enable S3 Block Public Access, use IAM policies to restrict access, "
                "and implement IMDSv2 to prevent SSRF attacks.",
                self.styles['ReportBodyText']
            ))

        return elements

    def _build_subdomain_analysis(self, scan_results: Dict) -> List:
        """Build subdomain enumeration and takeover analysis section."""
        elements = []

        elements.append(Paragraph("Subdomain Security & Takeover Analysis", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        subdomain_info = scan_results.get('subdomain_enumeration', {})

        if not subdomain_info:
            elements.append(Paragraph(
                "<font color='#10b981'><b>Subdomain Status: Secure</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "No subdomain takeover vulnerabilities were detected. All DNS records "
                "appear to be properly configured.",
                self.styles['ReportBodyJustified']
            ))
            return elements

        subdomains_found = subdomain_info.get('subdomains_found', [])
        takeover_vulnerable = subdomain_info.get('takeover_vulnerable', [])

        elements.append(Paragraph(
            f"<b>Subdomains Discovered:</b> {len(subdomains_found)}",
            self.styles['ReportBodyText']
        ))

        if takeover_vulnerable:
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                f"<font color='#ef4444'><b>CRITICAL: {len(takeover_vulnerable)} Subdomain Takeover "
                f"Vulnerabilities Detected</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Spacer(1, 6))

            # Table of vulnerable subdomains
            vuln_data = [['Subdomain', 'CNAME Target', 'Service']]
            for vuln in takeover_vulnerable[:5]:
                vuln_data.append([
                    self._safe_text(vuln.get('subdomain', ''), 25),
                    self._safe_text(vuln.get('cname', ''), 25),
                    vuln.get('service', 'Unknown')
                ])

            vuln_table = Table(vuln_data, colWidths=[150, 150, 100])
            vuln_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), AiVedhaColors.DANGER),
                ('TEXTCOLOR', (0, 0), (-1, 0), AiVedhaColors.WHITE),
                ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(vuln_table)

            elements.append(Spacer(1, 10))
            elements.append(Paragraph(
                "<b>Immediate Action Required:</b> Remove dangling DNS records or claim the "
                "resources on the respective cloud platforms to prevent subdomain takeover attacks.",
                self.styles['ReportBodyText']
            ))
        else:
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "<font color='#10b981'><b>No Subdomain Takeover Risks Detected</b></font>",
                self.styles['ReportBodyText']
            ))
            elements.append(Paragraph(
                "All enumerated subdomains are properly configured with no dangling DNS records.",
                self.styles['ReportBodyJustified']
            ))

        # List discovered subdomains (sample)
        if subdomains_found and len(subdomains_found) > 0:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("<b>Sample Discovered Subdomains:</b>", self.styles['SmallText']))
            for subdomain in subdomains_found[:8]:
                elements.append(Paragraph(f"• {self._safe_text(subdomain, 40)}", self.styles['SmallText']))
            if len(subdomains_found) > 8:
                elements.append(Paragraph(
                    f"<i>...and {len(subdomains_found) - 8} more</i>",
                    self.styles['SmallText']
                ))

        return elements

    def _build_detailed_findings(self, scan_results: Dict) -> List:
        """Build detailed findings section with AI recommendations."""
        elements = []

        elements.append(Paragraph(
            "Detailed Findings & AI Recommendations",
            self.styles['SectionHeading']
        ))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        vulns = scan_results.get('vulnerabilities', [])

        if not vulns:
            elements.append(Paragraph(
                "<i>No vulnerabilities detected during this assessment. Excellent security posture!</i>",
                self.styles['ReportBodyText']
            ))
            return elements

        # Process ALL vulnerabilities - no limits
        for i, vuln in enumerate(vulns, 1):
            severity = vuln.get('severity', 'INFO').upper()
            sev_color = get_severity_color(severity)

            # Finding header with severity badge
            elements.append(Paragraph(
                f"<font color='#{sev_color.hexval()[2:]}'><b>[{severity}]</b></font> "
                f"<b>{i}. {self._safe_text(vuln.get('title', 'Unknown Vulnerability'), 60)}</b>",
                self.styles['VulnTitle']
            ))

            # Description - display actual data from scan
            description = vuln.get('description', '')
            description = self._safe_text(description, 800)
            elements.append(Paragraph(
                f"<i>Description:</i> {description}",
                self.styles['ReportBodyText']
            ))

            # OWASP Category
            owasp = vuln.get('owasp_category', '')
            if owasp:
                elements.append(Paragraph(
                    f"<b>OWASP:</b> {self._safe_text(owasp, 60)}",
                    self.styles['SmallText']
                ))

            # CWE ID
            cwe = vuln.get('cwe_id', '')
            if cwe:
                elements.append(Paragraph(
                    f"<b>CWE:</b> {cwe}",
                    self.styles['SmallText']
                ))

            # CVSS Score
            cvss = vuln.get('cvss_score')
            if cvss:
                elements.append(Paragraph(
                    f"<b>CVSS Score:</b> {cvss}",
                    self.styles['SmallText']
                ))

            # Affected URL
            affected_url = vuln.get('url', '')
            if affected_url:
                elements.append(Paragraph(
                    f"<b>Affected URL:</b> {self._safe_text(affected_url, 60)}",
                    self.styles['SmallText']
                ))

            # Recommendation - display actual data from scan
            recommendation = vuln.get('recommendation', '')
            if recommendation:
                recommendation = self._safe_text(recommendation, 600)
                elements.append(Paragraph(
                    f"<font color='#10b981'><b>Recommendation:</b></font> {recommendation}",
                    self.styles['ReportBodyText']
                ))

            # AI Fix Guide - Full content, no truncation
            ai_fix = vuln.get('ai_fix_steps', '')
            if ai_fix:
                ai_fix_clean = self._format_ai_text(ai_fix, max_length=99999)
                elements.append(Paragraph(
                    f"<font color='#0ea5e9'><b>AI Fix Guide:</b></font>",
                    self.styles['ReportBodyText']
                ))
                elements.append(Paragraph(ai_fix_clean, self.styles['SmallText']))

            # Separator
            elements.append(Spacer(1, 10))
            elements.append(HRFlowable(
                width="100%", thickness=0.5, color=AiVedhaColors.LIGHT, spaceAfter=8
            ))

        # All vulnerabilities are shown - no limits

        return elements

    def _build_recommendations(self, scan_results: Dict) -> List:
        """Build priority recommendations section."""
        elements = []

        elements.append(Paragraph("Priority Recommendations", self.styles['SectionHeading']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=AiVedhaColors.PRIMARY, spaceAfter=10
        ))

        vulns = scan_results.get('vulnerabilities', [])
        priority_vulns = [
            v for v in vulns 
            if v.get('severity', '').upper() in ['CRITICAL', 'HIGH']
        ]

        if not priority_vulns:
            elements.append(Paragraph(
                "No critical or high severity issues found. Continue maintaining good security practices.",
                self.styles['ReportBodyText']
            ))
            elements.append(Spacer(1, 10))
            
            # General recommendations
            elements.append(Paragraph(
                "<b>General Security Recommendations:</b>",
                self.styles['ReportBodyText']
            ))
            general_recs = [
                "• Regularly update all software components and dependencies",
                "• Implement a Web Application Firewall (WAF)",
                "• Conduct periodic security assessments",
                "• Enable comprehensive logging and monitoring",
                "• Implement rate limiting and DDoS protection"
            ]
            for rec in general_recs:
                elements.append(Paragraph(rec, self.styles['SmallText']))
        else:
            elements.append(Paragraph(
                f"The following <b>{len(priority_vulns)}</b> issues require immediate attention:",
                self.styles['ReportBodyText']
            ))
            elements.append(Spacer(1, 8))

            # Show ALL priority recommendations - no limit, actual data only
            for i, vuln in enumerate(priority_vulns, 1):
                title = vuln.get('title', '')
                rec = vuln.get('recommendation', '')
                sev = vuln.get('severity', 'HIGH').upper()
                sev_color = get_severity_color(sev)

                # Show title and recommendation (actual data only)
                elements.append(Paragraph(
                    f"<font color='#{sev_color.hexval()[2:]}'><b>{i}. [{sev}]</b></font> {self._safe_text(title, 100)}",
                    self.styles['ReportBodyText']
                ))

                if rec:
                    elements.append(Paragraph(
                        f"<font color='#10b981'><i>Fix:</i></font> {self._safe_text(rec, 300)}",
                        self.styles['SmallText']
                    ))

                # Include AI fix steps if available (actual AI data)
                ai_fix = vuln.get('ai_fix_steps', '')
                if ai_fix:
                    ai_summary = self._safe_text(ai_fix, 400)
                    elements.append(Paragraph(
                        f"<font color='#0ea5e9'><i>AI Analysis:</i></font> {ai_summary}",
                        self.styles['SmallText']
                    ))

        return elements

    def _create_rubber_stamp_seal(self, grade: str, score: float) -> Drawing:
        """
        Create a professional rubber stamp style certified seal.

        Args:
            grade: Security grade (A+, A, B, C, D, F)
            score: Security score (0-10)

        Returns:
            Drawing object containing the rubber stamp seal
        """
        # Seal dimensions
        seal_size = 120
        drawing = Drawing(seal_size + 20, seal_size + 20)

        # Determine seal color based on grade
        if grade in ['A+', 'A']:
            seal_color = colors.HexColor('#10b981')  # Green
            inner_color = colors.HexColor('#059669')
        elif grade == 'B':
            seal_color = colors.HexColor('#22c55e')  # Light green
            inner_color = colors.HexColor('#16a34a')
        elif grade == 'C':
            seal_color = colors.HexColor('#f59e0b')  # Amber
            inner_color = colors.HexColor('#d97706')
        elif grade == 'D':
            seal_color = colors.HexColor('#f97316')  # Orange
            inner_color = colors.HexColor('#ea580c')
        else:
            seal_color = colors.HexColor('#ef4444')  # Red
            inner_color = colors.HexColor('#dc2626')

        cx, cy = seal_size / 2 + 10, seal_size / 2 + 10

        # Outer circle with dashed effect (stamp border)
        outer_radius = seal_size / 2
        for i in range(0, 360, 5):
            angle = math.radians(i)
            x1 = cx + (outer_radius - 2) * math.cos(angle)
            y1 = cy + (outer_radius - 2) * math.sin(angle)
            x2 = cx + outer_radius * math.cos(angle)
            y2 = cy + outer_radius * math.sin(angle)
            line = Line(x1, y1, x2, y2, strokeColor=seal_color, strokeWidth=2)
            drawing.add(line)

        # Main outer ring
        outer_ring = Circle(cx, cy, outer_radius - 5, strokeColor=seal_color, strokeWidth=3, fillColor=None)
        drawing.add(outer_ring)

        # Inner ring
        inner_ring = Circle(cx, cy, outer_radius - 15, strokeColor=seal_color, strokeWidth=2, fillColor=None)
        drawing.add(inner_ring)

        # Center circle with grade
        center_circle = Circle(cx, cy, 28, strokeColor=inner_color, strokeWidth=2, fillColor=colors.white)
        drawing.add(center_circle)

        # AiVedha brand logo - Shield with checkmark in center
        shield_color = inner_color

        # Draw shield shape using Path
        from reportlab.graphics.shapes import Path
        shield_path = Path()
        shield_w = 18
        shield_h = 22
        shield_cx = cx
        shield_cy = cy + 2

        # Shield outline path
        shield_path.moveTo(shield_cx, shield_cy + shield_h/2)  # Top center
        shield_path.lineTo(shield_cx + shield_w/2, shield_cy + shield_h/3)  # Top right
        shield_path.lineTo(shield_cx + shield_w/2, shield_cy - shield_h/6)  # Right side
        shield_path.lineTo(shield_cx, shield_cy - shield_h/2)  # Bottom point
        shield_path.lineTo(shield_cx - shield_w/2, shield_cy - shield_h/6)  # Left side
        shield_path.lineTo(shield_cx - shield_w/2, shield_cy + shield_h/3)  # Top left
        shield_path.closePath()
        shield_path.fillColor = shield_color
        shield_path.strokeColor = inner_color
        shield_path.strokeWidth = 1.5
        drawing.add(shield_path)

        # Checkmark inside shield
        check_line1 = Line(shield_cx - 5, shield_cy, shield_cx - 1, shield_cy - 4,
                          strokeColor=colors.white, strokeWidth=2)
        check_line2 = Line(shield_cx - 1, shield_cy - 4, shield_cx + 6, shield_cy + 5,
                          strokeColor=colors.white, strokeWidth=2)
        drawing.add(check_line1)
        drawing.add(check_line2)

        # Grade text below shield
        grade_text = String(cx, cy - 22, grade, fontName=FONT_BOLD, fontSize=14,
                           fillColor=inner_color, textAnchor='middle')

        # "AIVEDHA CERTIFIED" text at top (curved effect)
        cert_text = "AIVEDHA CERTIFIED"
        for i, char in enumerate(cert_text):
            angle = math.radians(160 - i * 10)
            radius = outer_radius - 10
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            char_string = String(x, y, char, fontName=FONT_BOLD, fontSize=7,
                                fillColor=seal_color, textAnchor='middle')
            drawing.add(char_string)

        # "SECURITY AUDIT" text at bottom (curved)
        audit_text = "SECURITY AUDIT"
        for i, char in enumerate(audit_text):
            angle = math.radians(-150 + i * 11)
            radius = outer_radius - 10
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            char_string = String(x, y, char, fontName=FONT_BOLD, fontSize=7,
                                fillColor=seal_color, textAnchor='middle')
            drawing.add(char_string)

        # Stars decoration with encryption indicator
        star_positions = [(cx - 35, cy), (cx + 35, cy)]
        for sx, sy in star_positions:
            star = String(sx, sy - 3, "★", fontName=FONT_REGULAR, fontSize=10,
                         fillColor=seal_color, textAnchor='middle')
            drawing.add(star)

        # Add "256-BIT" encryption indicator at bottom
        enc_text = String(cx, cy - outer_radius + 18, "256-BIT SSL", fontName=FONT_BOLD, fontSize=5,
                         fillColor=seal_color, textAnchor='middle')
        drawing.add(enc_text)

        return drawing

    def _build_certificate_page(
        self,
        scan_results: Dict,
        certificate_number: str,
        user_email: str
    ) -> List:
        """Build the certificate page with professional rubber stamp seal."""
        elements = []

        elements.append(Spacer(1, 0.5*cm))

        # Decorative border frame (top)
        elements.append(HRFlowable(
            width="100%",
            thickness=3,
            color=AiVedhaColors.CERT_BORDER,
            spaceAfter=5,
            hAlign='CENTER'
        ))
        elements.append(HRFlowable(
            width="98%",
            thickness=1,
            color=AiVedhaColors.CERT_GOLD,
            spaceAfter=15,
            hAlign='CENTER'
        ))

        # Certificate header
        elements.append(Paragraph(
            "<font size='28' color='#1e3a5f'><b>CERTIFICATE OF SECURITY AUDIT</b></font>",
            self.styles['CertTitle']
        ))
        elements.append(Spacer(1, 3))

        # Subtitle
        elements.append(Paragraph(
            "<font size='11' color='#6b7280'><i>International Standard Compliance Assessment</i></font>",
            self.styles['CertBody']
        ))
        elements.append(Spacer(1, 5))

        # Gold decorative line
        elements.append(HRFlowable(
            width="40%",
            thickness=2,
            color=AiVedhaColors.CERT_GOLD,
            spaceAfter=12,
            hAlign='CENTER'
        ))

        # Certificate body text
        elements.append(Paragraph(
            "This is to certify that the digital assets described below have undergone "
            "an independent security assessment in accordance with internationally recognised "
            "application security practices including OWASP Top 10, SANS CWE Top 25, and ISO 27001 standards.",
            self.styles['CertBody']
        ))
        elements.append(Spacer(1, 12))

        # Certified details in a bordered box
        url = scan_results.get('url', 'N/A')
        score = scan_results.get('security_score', 0)
        if isinstance(score, (int, float)) and score > 10:
            score = score / 10
        grade = scan_results.get('grade', 'F')

        # Get grade color
        grade_color = get_grade_color(grade)

        # Details table with professional styling
        details_data = [
            [Paragraph("<b>Certified Asset:</b>", self.styles['ReportBodyText']),
             Paragraph(f"<font color='#0ea5e9'><b>{self._safe_text(url, 50)}</b></font>", self.styles['ReportBodyText'])],
            [Paragraph("<b>Security Score:</b>", self.styles['ReportBodyText']),
             Paragraph(f"<font color='#{grade_color.hexval()[2:]}'><b>{score:.1f}/10</b></font>", self.styles['ReportBodyText'])],
            [Paragraph("<b>Security Grade:</b>", self.styles['ReportBodyText']),
             Paragraph(f"<font color='#{grade_color.hexval()[2:]}'><b>{grade}</b></font>", self.styles['ReportBodyText'])],
        ]

        # Assessment date
        try:
            ts = scan_results.get('scan_timestamp', '')
            if ts:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%B %d, %Y at %H:%M UTC')
            else:
                formatted_date = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')
        except:
            formatted_date = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')

        details_data.append([
            Paragraph("<b>Assessment Date:</b>", self.styles['ReportBodyText']),
            Paragraph(formatted_date, self.styles['ReportBodyText'])
        ])

        # Validity statement - professional wording
        details_data.append([
            Paragraph("<b>Validity:</b>", self.styles['ReportBodyText']),
            Paragraph(
                "<font size='9'>This certificate remains valid unless revoked or until significant changes "
                "are made to the audited system that may affect its security posture.</font>",
                self.styles['ReportBodyText']
            )
        ])

        details_table = Table(details_data, colWidths=[120, 300])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 2, AiVedhaColors.CERT_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 15))

        # Certificate number with decorative styling
        cert_box_data = [[
            Paragraph(
                f"<font size='12' color='#1e40af'><b>Certificate Number: {certificate_number}</b></font>",
                self.styles['CertBody']
            )
        ]]
        cert_box = Table(cert_box_data, colWidths=[420])
        cert_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eff6ff')),
            ('BOX', (0, 0), (-1, -1), 1, AiVedhaColors.PRIMARY),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(cert_box)
        elements.append(Spacer(1, 15))

        # Rubber stamp seal and verification section
        seal_drawing = self._create_rubber_stamp_seal(grade, score)

        # Create a table with seal and verification info side by side
        website = self.white_label.website_url if self.white_label.enabled else "https://aivedha.ai"

        seal_verify_data = [[
            seal_drawing,
            [
                Paragraph("<b>Official Certification</b>", self.styles['CertBody']),
                Spacer(1, 8),
                Paragraph("Verify this certificate online:", self.styles['SmallText']),
                Paragraph(
                    f"<font color='#0ea5e9'><u>{website}/certificate/{certificate_number}</u></font>",
                    self.styles['SmallText']
                ),
                Spacer(1, 10),
                Paragraph(
                    f"<font size='8' color='#6b7280'>Issued by: {self.brand_name}</font>",
                    self.styles['SmallText']
                ),
            ]
        ]]

        seal_verify_table = Table(seal_verify_data, colWidths=[150, 280])
        seal_verify_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('LEFTPADDING', (1, 0), (1, 0), 20),
        ]))
        elements.append(seal_verify_table)
        elements.append(Spacer(1, 15))

        # Decorative line before disclaimer
        elements.append(HRFlowable(
            width="80%", thickness=1, color=AiVedhaColors.LIGHT, spaceAfter=8, hAlign='CENTER'
        ))

        # Disclaimer in a light box
        disclaimer_data = [[
            Paragraph(
                "<font size='7' color='#6b7280'><b>Disclaimer:</b> This certificate represents a point-in-time assessment. "
                "It does not constitute a guarantee of continuous security and remains subject to "
                "ongoing maintenance by the certified entity. The certificate holder is responsible for "
                "maintaining security posture. Valid for 12 months from assessment date.</font>",
                self.styles['SmallText']
            )
        ]]
        disclaimer_box = Table(disclaimer_data, colWidths=[440])
        disclaimer_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (-1, -1), 0.5, AiVedhaColors.LIGHT),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(disclaimer_box)

        # Note: Issuer/company info is already in the page footer - not duplicated here

        # Decorative border frame (bottom)
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(
            width="98%",
            thickness=1,
            color=AiVedhaColors.CERT_GOLD,
            spaceAfter=3,
            hAlign='CENTER'
        ))
        elements.append(HRFlowable(
            width="100%",
            thickness=3,
            color=AiVedhaColors.CERT_BORDER,
            spaceAfter=5,
            hAlign='CENTER'
        ))

        return elements

    def _safe_text(self, text: str, max_length: int = 100) -> str:
        """
        Safely truncate text to prevent overlapping.

        Args:
            text: Text to process
            max_length: Maximum allowed length

        Returns:
            Truncated text with ellipsis if needed
        """
        if not text:
            return ''  # Return empty string, not N/A - caller should handle empty values
        
        text = str(text).strip()
        
        # Remove problematic characters for PDF
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        
        if len(text) > max_length:
            return text[:max_length - 3] + '...'
        return text

    def _format_ai_text(self, text: str, max_length: int = 800) -> str:
        """
        Format AI-generated text by cleaning up markdown and structuring sections.

        Args:
            text: AI-generated text with markdown
            max_length: Maximum allowed length

        Returns:
            Cleaned, structured text suitable for PDF
        """
        if not text:
            return ""

        import re

        # Remove excessive markdown but preserve structure
        text = text.replace('```', '')
        text = text.replace('`', '')

        # Convert markdown headers to bold sections
        text = re.sub(r'^###\s*(.+)$', r'<b>\1</b>', text, flags=re.MULTILINE)
        text = re.sub(r'^##\s*(.+)$', r'<b>\1</b>', text, flags=re.MULTILINE)
        text = re.sub(r'^#\s*(.+)$', r'<b>\1</b>', text, flags=re.MULTILINE)

        # Convert **bold** to <b>bold</b>
        text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)

        # Convert bullet points to proper symbols
        text = text.replace('- ', '• ')
        text = text.replace('* ', '• ')

        # Clean up numbered lists but keep numbers
        text = re.sub(r'^(\d+)\.\s+', r'\1. ', text, flags=re.MULTILINE)

        # Escape HTML entities BEFORE markdown conversion (protect existing content)
        # But preserve our own <b> tags we just added
        text = text.replace('&', '&amp;')

        # Clean up extra whitespace and newlines, preserve structure
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        # Join with line breaks for PDF paragraph
        text = '<br/>'.join(cleaned_lines)

        # Truncate if too long (but try to break at sentence)
        if len(text) > max_length:
            truncated = text[:max_length]
            # Try to break at a sentence end
            last_period = truncated.rfind('.')
            if last_period > max_length * 0.7:
                text = truncated[:last_period + 1]
            else:
                text = truncated + '...'

        return text


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def generate_security_report(
    scan_results: Dict,
    user_email: str,
    brand_name: str = "AiVedha Guard",
    white_label: WhiteLabelConfig = None
) -> Optional[bytes]:
    """
    Convenience function to generate a security report PDF.
    
    Args:
        scan_results: Dictionary containing all scan results
        user_email: Email of the user who requested the scan
        brand_name: Company/brand name for header
        white_label: Optional white-label configuration
    
    Returns:
        PDF file content as bytes, or None if generation fails
    """
    generator = SecurityReportGenerator(
        brand_name=brand_name,
        white_label=white_label
    )
    return generator.generate_report(scan_results, user_email)


def generate_and_save_report(
    scan_results: Dict,
    user_email: str,
    user_id: str,
    brand_name: str = "AiVedha Guard",
    white_label: WhiteLabelConfig = None
) -> Dict[str, Any]:
    """
    Generate PDF report and save to S3.
    
    Args:
        scan_results: Dictionary containing all scan results
        user_email: Email of the user who requested the scan
        user_id: User ID for S3 path construction
        brand_name: Company/brand name for header
        white_label: Optional white-label configuration
    
    Returns:
        Dict with success status, S3 key, presigned URL, and metadata
    """
    report_id = scan_results.get('report_id', str(uuid.uuid4()))
    
    # Generate PDF
    pdf_bytes = generate_security_report(
        scan_results=scan_results,
        user_email=user_email,
        brand_name=brand_name,
        white_label=white_label
    )
    
    if not pdf_bytes:
        return {
            'success': False,
            'error': 'Failed to generate PDF report'
        }
    
    # Save to S3
    s3_key = save_pdf_to_s3(
        pdf_bytes=pdf_bytes,
        report_id=report_id,
        user_id=user_id,
        metadata={
            'report_id': report_id,
            'user_email': user_email,
            'url': scan_results.get('url', ''),
            'generated_at': datetime.utcnow().isoformat()
        }
    )
    
    if not s3_key:
        return {
            'success': False,
            'error': 'Failed to save PDF to S3'
        }
    
    # Generate presigned URL for immediate access
    url_result = get_report_download_url(
        report_id=report_id,
        user_id=user_id,
        expiration_seconds=3600,
        force_download=False
    )
    
    return {
        'success': True,
        'report_id': report_id,
        's3_key': s3_key,
        'pdf_size_bytes': len(pdf_bytes),
        'download_url': url_result.get('url') if url_result else None,
        'expires_at': url_result.get('expires_at') if url_result else None
    }


# ============================================================================
# LAMBDA HANDLER FOR REPORT ACCESS API
# ============================================================================

def lambda_handler_report_access(event: Dict, context: Any) -> Dict:
    """
    Lambda handler for report access API endpoint.
    
    Handles GET requests to retrieve presigned URLs for report PDFs.
    
    Expected event structure (API Gateway):
    {
        "pathParameters": {"report_id": "xxx"},
        "requestContext": {
            "authorizer": {
                "claims": {"sub": "user_id"}
            }
        },
        "queryStringParameters": {"download": "true/false"}
    }
    """
    try:
        # Extract user from JWT/Cognito authorizer
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://aivedha.ai'
                },
                'body': json.dumps({'error': 'Unauthorized: User not authenticated'})
            }
        
        # Get report_id from path parameters
        report_id = event.get('pathParameters', {}).get('report_id')
        
        if not report_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://aivedha.ai'
                },
                'body': json.dumps({'error': 'Bad Request: report_id is required'})
            }
        
        # Check if force download requested
        query_params = event.get('queryStringParameters') or {}
        force_download = query_params.get('download', '').lower() == 'true'
        
        # Get secure URL with authorization check
        result = get_secure_report_url(
            report_id=report_id,
            user_id=user_id,
            expiration_seconds=3600,
            force_download=force_download
        )
        
        if result['success']:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://aivedha.ai'
                },
                'body': json.dumps({
                    'url': result['url'],
                    'expires_at': result['expires_at'],
                    'report_id': report_id
                })
            }
        else:
            status_code = 403 if 'Access denied' in result['error'] else 404
            return {
                'statusCode': status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://aivedha.ai'
                },
                'body': json.dumps({'error': result['error']})
            }
            
    except Exception as e:
        logger.error(f"Error in report access handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://aivedha.ai'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }


# ============================================================================
# MODULE EXPORTS
# ============================================================================

__all__ = [
    # Classes
    'AiVedhaColors',
    'WhiteLabelConfig',
    'SecurityReportGenerator',
    
    # Certificate functions
    'generate_certificate_number',
    'verify_certificate_number',
    
    # Style functions
    'get_custom_styles',
    'get_severity_color',
    'get_grade_color',
    
    # S3 functions
    'generate_presigned_url',
    'get_report_download_url',
    'get_report_view_url',
    'verify_report_access',
    'get_secure_report_url',
    'save_pdf_to_s3',
    'delete_pdf_from_s3',
    'check_pdf_exists',
    
    # Report generation
    'generate_security_report',
    'generate_and_save_report',
    
    # Lambda handler
    'lambda_handler_report_access',
    
    # Constants
    'PDF_AVAILABLE',
    'PDF_BUCKET',
]