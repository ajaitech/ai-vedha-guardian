"""
AiVedha Guard - Scheduled Audit Lambda Function
Version: 3.0.0 - PayPal USD Only

This Lambda function handles scheduled security audits:
1. Triggered by EventBridge Scheduler
2. Validates user subscription (DynamoDB)
3. Checks addon status (Scheduled Audits must be active)
4. Verifies available credits
5. Validates URL for error pages (404, 500, 502, etc.)
6. Executes security audit
7. Deducts credit and updates usage
8. Sends failure email for URL validation errors

Environment Variables:
- DYNAMODB_SCHEDULES_TABLE: DynamoDB table for schedules
- DYNAMODB_USERS_TABLE: DynamoDB table for users
- DYNAMODB_SUBSCRIPTIONS_TABLE: DynamoDB table for subscriptions
- AUDIT_LAMBDA_ARN: ARN of the security audit Lambda
- SNS_TOPIC_ARN: SNS topic for notifications
- SENDER_EMAIL: SES sender email
- SITE_URL: Website URL for dashboard links
"""

import json
import os
import logging
import boto3
import urllib.request
import urllib.error
import ssl
import socket
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
lambda_client = boto3.client('lambda', region_name=AWS_REGION)
sns_client = boto3.client('sns', region_name=AWS_REGION)
ses_client = boto3.client('ses', region_name=AWS_REGION)
eventbridge_client = boto3.client('events', region_name=AWS_REGION)

# Environment variables
SCHEDULES_TABLE = os.environ.get('DYNAMODB_SCHEDULES_TABLE', 'aivedha-guardian-schedules')
USERS_TABLE = os.environ.get('DYNAMODB_USERS_TABLE', 'aivedha-guardian-users')
SUBSCRIPTIONS_TABLE = os.environ.get('DYNAMODB_SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
AUDIT_LAMBDA_ARN = os.environ.get('AUDIT_LAMBDA_ARN', 'aivedha-guardian-security-crawler')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@aivedha.ai')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

# Error status codes that indicate an error page
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


# ============================================================================
# URL VALIDATION FOR ERROR PAGES
# ============================================================================

def validate_url_for_scheduler(url: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Validate URL before scheduled audit to detect error pages.
    Returns validation result with status code and error details.
    """
    result = {
        'valid': False,
        'status_code': None,
        'status_text': None,
        'error_type': None,
        'error_message': None,
        'response_time_ms': None,
        'ssl_valid': None,
        'checked_at': datetime.utcnow().isoformat()
    }

    start_time = datetime.utcnow()

    try:
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED

        # Create request with headers
        request = urllib.request.Request(url, headers={
            'User-Agent': 'AiVedha-Guard-Scheduler/2.0 (Pre-Audit Validation)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
        })

        try:
            response = urllib.request.urlopen(request, timeout=timeout, context=ssl_context)
            result['ssl_valid'] = True
        except ssl.SSLError as ssl_err:
            # Try without strict SSL
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            try:
                response = urllib.request.urlopen(request, timeout=timeout, context=ssl_context)
                result['ssl_valid'] = False
            except Exception:
                raise ssl_err

        # Calculate response time
        end_time = datetime.utcnow()
        result['response_time_ms'] = int((end_time - start_time).total_seconds() * 1000)

        # Get response details
        result['status_code'] = response.status
        result['status_text'] = response.reason

        # Check if it's an error status code
        if result['status_code'] in ERROR_STATUS_CODES:
            result['error_type'] = 'http_error'
            result['error_message'] = f"HTTP {result['status_code']}: {ERROR_STATUS_CODES[result['status_code']]}"
        else:
            result['valid'] = True

    except urllib.error.HTTPError as e:
        result['status_code'] = e.code
        result['status_text'] = e.reason
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

    except socket.timeout:
        result['error_type'] = 'timeout'
        result['error_message'] = 'Request timed out'

    except Exception as e:
        result['error_type'] = 'unknown_error'
        result['error_message'] = f'Unexpected error: {str(e)}'

    return result


def send_scheduler_failure_email(
    user_email: str,
    user_name: str,
    url: str,
    schedule_name: str,
    validation_result: Dict[str, Any]
) -> bool:
    """Send email notification when scheduled audit fails due to URL validation."""
    try:
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
            <div class="alert-title">⚠️ Scheduled Audit Failed - URL Validation Error</div>
            <p class="message">
                Hello {user_name or 'there'},<br><br>
                Your scheduled security audit could not proceed because the target URL returned an error page.
            </p>
        </div>

        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Schedule:</span>
                <span class="detail-value">{schedule_name or 'Unnamed Schedule'}</span>
            </div>
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
            The URL appears to be returning an error page (HTTP {validation_result.get('status_code', 'error')}).
            Auditing error pages provides no useful security insights and would waste your credits.
            <br><br>
            <strong>No credits were deducted.</strong> Your scheduled audit has been paused.
        </p>

        <p class="message">
            <strong>Recommended actions:</strong>
        </p>
        <ul style="color: #ddd; line-height: 2;">
            <li>Verify the URL is correct and the site is online</li>
            <li>Check if there are any server issues</li>
            <li>Update the schedule URL if the site has moved</li>
            <li>Resume the schedule once the issue is resolved</li>
        </ul>

        <div style="text-align: center;">
            <a href="{SITE_URL}/dashboard/scheduler" class="cta-button">Manage Schedules</a>
        </div>

        <div class="footer">
            <p>This notification was sent because your scheduled audit failed validation.</p>
            <p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p>
        </div>
    </div>
</body>
</html>
"""

        ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': f'⚠️ AiVedha Guard: Scheduled Audit Failed - {url}'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        logger.info(f"Sent scheduler failure email to {user_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending scheduler failure email: {e}")
        return False


def log_scheduler_event(
    schedule_id: str,
    user_id: str,
    event_type: str,
    status: str,
    details: Dict[str, Any]
) -> bool:
    """Log scheduler event to DynamoDB for audit trail."""
    try:
        events_table = dynamodb.Table('aivedha-guardian-scheduler-events')
        events_table.put_item(Item={
            'event_id': f"{schedule_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'schedule_id': schedule_id,
            'user_id': user_id,
            'event_type': event_type,
            'status': status,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        })
        return True
    except Exception as e:
        logger.error(f"Error logging scheduler event: {e}")
        return False


# ============================================================================
# ADDON VERIFICATION (DynamoDB - PayPal USD Only)
# ============================================================================

def has_active_scheduler_addon(user_id: str) -> Tuple[bool, Optional[str]]:
    """
    Check if user has active Scheduled Audits addon via DynamoDB.
    Returns (has_addon, expires_at).
    """
    try:
        subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)

        # Query subscriptions for this user
        response = subscriptions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':uid': user_id,
                ':active': 'active'
            }
        )

        for sub in response.get('Items', []):
            addons = sub.get('addons', [])
            if isinstance(addons, list):
                if 'scheduler' in addons or 'scheduled_audits' in addons:
                    return True, sub.get('expires_at')

            # Also check addon_subscriptions field
            addon_subs = sub.get('addon_subscriptions', [])
            for addon in addon_subs:
                addon_id = addon.get('addon_id', '') if isinstance(addon, dict) else addon
                if addon_id in ['scheduler', 'scheduled_audits']:
                    return True, addon.get('expires_at') if isinstance(addon, dict) else sub.get('expires_at')

        return False, None

    except Exception as e:
        logger.error(f"Error checking scheduler addon: {e}")
        return False, None


def get_user_credits(user_id: str) -> int:
    """Get user's remaining credits from DynamoDB."""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        response = users_table.get_item(Key={'user_id': user_id})
        user = response.get('Item', {})
        credits = user.get('credits', 0)

        # Convert Decimal to int
        if isinstance(credits, Decimal):
            credits = int(credits)

        return credits
    except Exception as e:
        logger.error(f"Error getting user credits: {e}")
        return 0


def deduct_user_credit(user_id: str) -> bool:
    """Deduct one credit from user's account in DynamoDB."""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = credits - :dec',
            ConditionExpression='credits > :zero',
            ExpressionAttributeValues={':dec': 1, ':zero': 0}
        )
        return True
    except Exception as e:
        logger.error(f"Error deducting credit: {e}")
        return False


# ============================================================================
# DYNAMODB OPERATIONS
# ============================================================================

def get_schedule(schedule_id: str) -> Optional[Dict[str, Any]]:
    """Get schedule from DynamoDB."""
    table = dynamodb.Table(SCHEDULES_TABLE)
    
    try:
        response = table.get_item(Key={'schedule_id': schedule_id})
        return response.get('Item')
    except Exception as e:
        logger.error(f"Error getting schedule: {str(e)}")
        return None


def update_schedule_status(schedule_id: str, status: str, next_run: Optional[str] = None, last_run: Optional[str] = None) -> bool:
    """Update schedule status and run times."""
    table = dynamodb.Table(SCHEDULES_TABLE)
    
    update_expr = 'SET #status = :status, updated_at = :updated_at'
    expr_values = {
        ':status': status,
        ':updated_at': datetime.utcnow().isoformat()
    }
    
    if next_run:
        update_expr += ', next_run = :next_run'
        expr_values[':next_run'] = next_run
    
    if last_run:
        update_expr += ', last_run = :last_run'
        expr_values[':last_run'] = last_run
    
    try:
        table.update_item(
            Key={'schedule_id': schedule_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues=expr_values
        )
        return True
    except Exception as e:
        logger.error(f"Error updating schedule: {str(e)}")
        return False


def increment_credits_used(schedule_id: str) -> bool:
    """Increment credits used counter for a schedule."""
    table = dynamodb.Table(SCHEDULES_TABLE)
    
    try:
        table.update_item(
            Key={'schedule_id': schedule_id},
            UpdateExpression='SET credits_used = if_not_exists(credits_used, :zero) + :inc',
            ExpressionAttributeValues={':zero': 0, ':inc': 1}
        )
        return True
    except Exception as e:
        logger.error(f"Error incrementing credits: {str(e)}")
        return False


def get_user_schedules(user_id: str) -> list:
    """Get all schedules for a user."""
    table = dynamodb.Table(SCHEDULES_TABLE)

    try:
        # Use scan with filter since table doesn't have user_id GSI
        response = table.scan(
            FilterExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error getting user schedules: {str(e)}")
        return []


def disable_user_schedules(user_id: str) -> int:
    """Disable all schedules for a user (addon expired)."""
    schedules = get_user_schedules(user_id)
    disabled_count = 0
    
    for schedule in schedules:
        if schedule.get('status') == 'active':
            update_schedule_status(schedule['schedule_id'], 'expired')
            disabled_count += 1
    
    return disabled_count


# ============================================================================
# AUDIT EXECUTION
# ============================================================================

def calculate_next_run(frequency: str, current_time: datetime) -> datetime:
    """Calculate next run time based on frequency."""
    if frequency == 'daily':
        return current_time + timedelta(days=1)
    elif frequency == 'weekly':
        return current_time + timedelta(weeks=1)
    elif frequency == 'biweekly':
        return current_time + timedelta(weeks=2)
    elif frequency == 'monthly':
        return current_time + timedelta(days=30)
    else:
        return current_time + timedelta(days=1)


def execute_audit(url: str, user_id: str, schedule_id: str, user_email: str = None) -> Dict[str, Any]:
    """
    Execute security audit by invoking the audit Lambda.

    v4.0.0: Updated to use new request format with augmentation support.
    Maintains backward compatibility with legacy response format.
    """
    # Build v4.0.0 compatible request payload
    payload = {
        'url': url,
        'user_id': user_id,
        'userId': user_id,  # Alias for compatibility
        'userEmail': user_email or '',
        'schedule_id': schedule_id,
        'source': 'scheduled_audit',
        'auditMetadata': {
            'source': 'scheduled_audit',
            'schedule_id': schedule_id,
            'timestamp': datetime.utcnow().isoformat(),
            'consentAccepted': True,  # Scheduled audits have implicit consent
        },
        # Use parallel-augment mode for scheduled audits
        'augmentationMode': 'parallel-augment',
        'scanDepth': 'standard',
        # Disable async mode for scheduled audits (we want synchronous execution)
        'async_start': False,
        'is_background_execution': False
    }

    try:
        logger.info(f"Invoking audit Lambda for scheduled audit: {url}")

        response = lambda_client.invoke(
            FunctionName=AUDIT_LAMBDA_ARN,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        response_payload = response['Payload'].read()
        result = json.loads(response_payload)

        # Handle API Gateway wrapped response
        if 'body' in result:
            try:
                body = json.loads(result['body']) if isinstance(result['body'], str) else result['body']
                result = body
            except:
                pass

        # Normalize response for backward compatibility
        normalized_result = {
            'success': result.get('status') == 'completed' or result.get('report_id') is not None,
            'report_id': result.get('report_id'),
            'security_score': result.get('security_score', 0),
            'grade': result.get('grade', 'F'),
            'vulnerabilities_count': result.get('vulnerabilities_count', 0),
            'critical_issues': result.get('critical_issues', 0),
            'medium_issues': result.get('medium_issues', 0),
            'low_issues': result.get('low_issues', 0),
            'certificate_number': result.get('certificate_number'),
            'pdf_report_url': result.get('pdf_report_url'),
            # v4.0.0 fields
            'attackChains': result.get('attackChains', []),
            'augmentationMode': result.get('augmentationMode'),
            'scanVersion': result.get('scanVersion', '3.0.0'),
            'progressPercent': result.get('progressPercent', 100),
        }

        # Check for errors
        if result.get('statusCode', 200) >= 400:
            normalized_result['success'] = False
            normalized_result['error'] = result.get('error', result.get('message', 'Audit failed'))

        logger.info(f"Audit completed: report_id={normalized_result.get('report_id')}, score={normalized_result.get('security_score')}")

        return normalized_result

    except Exception as e:
        logger.error(f"Error executing audit: {str(e)}")
        return {'success': False, 'error': str(e)}


def send_notification(user_email: str, subject: str, message: str) -> bool:
    """Send notification via SNS."""
    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=json.dumps({
                'email': user_email,
                'subject': subject,
                'message': message
            })
        )
        return True
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return False


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Main Lambda handler for scheduled audits.
    
    Event Structure:
    {
        "schedule_id": "schedule_123",
        "user_id": "user_456",
        "action": "execute" | "check_addon" | "disable_all"
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    action = event.get('action', 'execute')
    schedule_id = event.get('schedule_id')
    user_id = event.get('user_id')

    # ========================================================================
    # ACTION: CHECK ADDON STATUS (Called by webhook on addon changes)
    # ========================================================================
    if action == 'check_addon':
        if not user_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'user_id required'})}

        # Check addon status in DynamoDB
        has_addon, expires_at = has_active_scheduler_addon(user_id)
        
        if not has_addon:
            # Disable all schedules
            disabled_count = disable_user_schedules(user_id)
            logger.info(f"Disabled {disabled_count} schedules for user {user_id}")

            # Get user email for notification
            users_table = dynamodb.Table(USERS_TABLE)
            user = users_table.get_item(Key={'user_id': user_id}).get('Item', {})

            # Send notification
            send_notification(
                user.get('email', ''),
                'Scheduled Audits Addon Expired',
                f'Your Scheduled Audits addon has expired. {disabled_count} scheduled audits have been disabled. '
                f'Renew your addon to resume automated security monitoring.'
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'addon_active': False,
                    'schedules_disabled': disabled_count
                })
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'addon_active': True,
                'expires_at': expires_at
            })
        }
    
    # ========================================================================
    # ACTION: DISABLE ALL SCHEDULES FOR USER
    # ========================================================================
    if action == 'disable_all':
        if not user_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'user_id required'})}
        
        disabled_count = disable_user_schedules(user_id)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'schedules_disabled': disabled_count
            })
        }
    
    # ========================================================================
    # ACTION: EXECUTE SCHEDULED AUDIT
    # ========================================================================
    if action == 'execute':
        if not schedule_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'schedule_id required'})}
        
        # Get schedule details
        schedule = get_schedule(schedule_id)
        if not schedule:
            return {'statusCode': 404, 'body': json.dumps({'error': 'Schedule not found'})}
        
        user_id = schedule.get('user_id')
        url = schedule.get('url')
        frequency = schedule.get('frequency', 'weekly')
        end_date = schedule.get('end_date')
        
        # Check if schedule has ended
        if end_date and datetime.fromisoformat(end_date) < datetime.utcnow():
            update_schedule_status(schedule_id, 'completed')
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Schedule completed', 'status': 'completed'})
            }
        
        # Check if schedule is paused
        if schedule.get('status') != 'active':
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Schedule not active', 'status': schedule.get('status')})
            }
        
        # Get user details
        users_table = dynamodb.Table(USERS_TABLE)
        user = users_table.get_item(Key={'user_id': user_id}).get('Item', {})

        # Validate addon is active (check DynamoDB)
        has_addon, _ = has_active_scheduler_addon(user_id)
        if not has_addon:
            update_schedule_status(schedule_id, 'expired')
            send_notification(
                user.get('email', ''),
                'Scheduled Audit Failed - Addon Expired',
                f'Your scheduled audit for {url} could not run because your Scheduled Audits addon has expired.'
            )
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Scheduled Audits addon not active'})
            }
        
        # ====================================================================
        # CREDIT CHECK - SINGLE VALIDATION AT START ONLY
        # This is the ONLY place credits are checked for scheduled audits.
        # Once validated, the audit will complete regardless of credit changes.
        # ====================================================================
        credits = get_user_credits(user_id)
        if credits <= 0:
            update_schedule_status(schedule_id, 'paused')
            send_notification(
                user.get('email', ''),
                'Scheduled Audit Paused - No Credits',
                f'Your scheduled audit for {url} has been paused due to insufficient credits. '
                f'Purchase more credits to resume.'
            )
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Insufficient credits', 'credits_remaining': 0})
            }

        # ====================================================================
        # CREDIT DEDUCTION - IMMEDIATELY AFTER VALIDATION
        # Deduct credit NOW, before URL validation or audit.
        # This ensures credit is consumed even if audit fails later.
        # ====================================================================
        deduct_user_credit(user_id)
        logger.info(f"Credit deducted for scheduled audit: user={user_id}, url={url}")

        # ====================================================================
        # URL VALIDATION - Check for error pages before audit
        # ====================================================================
        logger.info(f"Validating URL before scheduled audit: {url}")
        url_validation = validate_url_for_scheduler(url)

        if not url_validation['valid']:
            # URL returned an error page - don't proceed with audit
            logger.warning(f"URL validation failed for scheduled audit: {url} - {url_validation.get('error_message')}")

            # Pause the schedule
            update_schedule_status(schedule_id, 'paused')

            # Log the event
            log_scheduler_event(
                schedule_id=schedule_id,
                user_id=user_id,
                event_type='url_validation_failed',
                status='failed',
                details={
                    'url': url,
                    'status_code': url_validation.get('status_code'),
                    'error_type': url_validation.get('error_type'),
                    'error_message': url_validation.get('error_message'),
                    'checked_at': url_validation.get('checked_at')
                }
            )

            # Send failure email to user
            user_email = user.get('email', '')
            if user_email:
                send_scheduler_failure_email(
                    user_email=user_email,
                    user_name=user.get('full_name', user.get('name', '')),
                    url=url,
                    schedule_name=schedule.get('name', schedule.get('schedule_name', '')),
                    validation_result=url_validation
                )

            return {
                'statusCode': 200,  # Return 200 to not trigger Lambda error retry
                'body': json.dumps({
                    'success': False,
                    'audit_skipped': True,
                    'reason': 'url_validation_failed',
                    'status_code': url_validation.get('status_code'),
                    'error_type': url_validation.get('error_type'),
                    'error_message': url_validation.get('error_message'),
                    'message': 'Scheduled audit paused - URL returned error page. 1 credit was used.',
                    'notification_sent': bool(user_email)
                })
            }

        logger.info(f"URL validation passed: {url} (HTTP {url_validation.get('status_code')})")

        # Execute the audit with user email for notifications
        logger.info(f"Executing scheduled audit for {url}")
        user_email = user.get('email', '')
        audit_result = execute_audit(url, user_id, schedule_id, user_email)
        
        if audit_result.get('success', True):
            # NOTE: Credit was already deducted at start (before URL validation)
            # Just get current balance for notification
            new_credits = get_user_credits(user_id)
            
            # Update schedule
            now = datetime.utcnow()
            next_run = calculate_next_run(frequency, now)
            update_schedule_status(
                schedule_id, 
                'active', 
                next_run=next_run.isoformat(),
                last_run=now.isoformat()
            )
            increment_credits_used(schedule_id)
            
            # Send success notification
            send_notification(
                user.get('email', ''),
                f'Scheduled Audit Complete - {url}',
                f'Your scheduled security audit for {url} has completed. '
                f'View the report in your dashboard. Credits remaining: {new_credits}'
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'url': url,
                    'credits_remaining': new_credits,
                    'next_run': next_run.isoformat(),
                    'audit_result': audit_result
                })
            }
        else:
            logger.error(f"Audit failed: {audit_result.get('error')}")
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'success': False,
                    'error': audit_result.get('error', 'Audit execution failed')
                })
            }
    
    # ========================================================================
    # ACTION: PROCESS DUE SCHEDULES (Triggered by EventBridge)
    # ========================================================================
    if action == 'process_due' or event.get('source') == 'aws.events':
        logger.info("Processing due schedules triggered by EventBridge")

        # Scan all active schedules
        schedules_table = dynamodb.Table(SCHEDULES_TABLE)
        response = schedules_table.scan(
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':active': 'active'}
        )

        active_schedules = response.get('Items', [])
        now = datetime.utcnow()
        processed = 0
        executed = 0
        errors = []

        for schedule in active_schedules:
            processed += 1
            schedule_id = schedule.get('schedule_id')
            next_run_str = schedule.get('next_run')

            # If no next_run set, calculate it from start_date/time
            if not next_run_str:
                start_date = schedule.get('start_date', now.strftime('%Y-%m-%d'))
                start_time = schedule.get('start_time', '09:00')
                try:
                    next_run = datetime.fromisoformat(f"{start_date}T{start_time}:00")
                except:
                    next_run = now
            else:
                try:
                    next_run = datetime.fromisoformat(next_run_str.replace('Z', ''))
                except:
                    next_run = now

            # Check if schedule is due
            if next_run <= now:
                logger.info(f"Executing due schedule: {schedule_id}")

                # Invoke self with execute action for this schedule
                try:
                    lambda_client.invoke(
                        FunctionName=context.function_name,
                        InvocationType='Event',  # Async
                        Payload=json.dumps({
                            'action': 'execute',
                            'schedule_id': schedule_id
                        })
                    )
                    executed += 1
                except Exception as e:
                    logger.error(f"Failed to invoke for schedule {schedule_id}: {e}")
                    errors.append({'schedule_id': schedule_id, 'error': str(e)})

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'schedules_checked': processed,
                'schedules_executed': executed,
                'errors': errors
            })
        }

    return {
        'statusCode': 400,
        'body': json.dumps({'error': f'Unknown action: {action}'})
    }
