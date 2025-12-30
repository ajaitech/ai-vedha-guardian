"""
AiVedha Guard - Subscription Scheduler Lambda
Handles:
- Auto-downgrade for expired/cancelled subscriptions
- Free credits expiry after 90 days
- Scheduled transaction email notifications (30 mins delay)
- Retention offer emails for paid users approaching renewal
- Daily subscription health checks

Triggered by: EventBridge Scheduler (daily at 00:00 UTC)
"""

import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError
import os

# Configuration
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
CREDITS_TABLE = os.environ.get('CREDITS_TABLE', 'aivedha-guardian-credits')
EMAIL_QUEUE_TABLE = os.environ.get('EMAIL_QUEUE_TABLE', 'aivedha-guardian-email-queue')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@aivedha.ai')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://aivedha.ai')

# Free credits expiry period (days)
FREE_CREDITS_EXPIRY_DAYS = 90
FREE_CREDITS = 3

# Renewal reminder periods (days before renewal)
RENEWAL_REMINDER_DAYS = [7, 3, 1]

# Grace period after subscription expires (days)
DOWNGRADE_GRACE_PERIOD_DAYS = 3

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
ses = boto3.client('ses', region_name='us-east-1')
eventbridge = boto3.client('events', region_name='us-east-1')

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def json_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


# ============================================================
# AUTO-DOWNGRADE FUNCTIONS
# ============================================================
#
# PERFORMANCE NOTE: This Lambda uses table scans for batch operations.
# This is acceptable for scheduled jobs because:
# 1. Runs once daily at off-peak hours (00:00 UTC)
# 2. Not user-facing - no latency requirements
# 3. Needs to find ALL matching records (not just one user's data)
# 4. Multiple filter conditions (OR on subscription_status) make GSI impractical
# 5. DynamoDB on-demand billing handles burst capacity automatically
#
# For user-facing operations, always use GSI queries instead.
# ============================================================

def process_auto_downgrades():
    """
    Downgrade users with expired/cancelled subscriptions to free plan.
    Runs daily to catch users whose subscriptions have lapsed.
    """
    users_table = dynamodb.Table(USERS_TABLE)
    now = datetime.utcnow()
    downgrade_cutoff = (now - timedelta(days=DOWNGRADE_GRACE_PERIOD_DAYS)).isoformat()

    downgraded_count = 0
    errors = []

    try:
        # Batch scan for users needing downgrade - acceptable for scheduled jobs
        # (see PERFORMANCE NOTE above)
        response = users_table.scan(
            FilterExpression='(subscription_status = :expired OR subscription_status = :cancelled OR subscription_status = :suspended) AND subscription_plan <> :free_plan',
            ExpressionAttributeValues={
                ':expired': 'expired',
                ':cancelled': 'cancelled',
                ':suspended': 'suspended',
                ':free_plan': 'free'
            }
        )

        users_to_downgrade = response.get('Items', [])

        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = users_table.scan(
                FilterExpression='(subscription_status = :expired OR subscription_status = :cancelled OR subscription_status = :suspended) AND subscription_plan <> :free_plan',
                ExpressionAttributeValues={
                    ':expired': 'expired',
                    ':cancelled': 'cancelled',
                    ':suspended': 'suspended',
                    ':free_plan': 'free'
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            users_to_downgrade.extend(response.get('Items', []))

        for user in users_to_downgrade:
            user_id = user.get('user_id')
            cancelled_at = user.get('cancelled_at') or user.get('updated_at')

            # Check if grace period has passed
            if cancelled_at:
                try:
                    cancelled_date = datetime.fromisoformat(cancelled_at.replace('Z', '+00:00').replace('+00:00', ''))
                    grace_end = cancelled_date + timedelta(days=DOWNGRADE_GRACE_PERIOD_DAYS)

                    if now < grace_end:
                        # Still in grace period, skip
                        continue
                except (ValueError, TypeError):
                    # If date parsing fails, proceed with downgrade
                    pass

            try:
                downgrade_user_to_free(user_id, user)
                downgraded_count += 1

                # Send downgrade notification email
                send_downgrade_email(user)

            except Exception as e:
                errors.append({'user_id': user_id, 'error': str(e)})
                print(f"Error downgrading user {user_id}: {str(e)}")

        print(f"Auto-downgrade complete: {downgraded_count} users downgraded, {len(errors)} errors")

    except Exception as e:
        print(f"Error in process_auto_downgrades: {str(e)}")
        errors.append({'error': str(e)})

    return {
        'downgraded_count': downgraded_count,
        'errors': errors
    }


def downgrade_user_to_free(user_id, user_data):
    """
    Downgrade a user to free plan.
    - Reset subscription_plan to 'free'
    - ADD 3 FREE CREDITS (fresh start on free plan)
    - Set subscription_status to 'free'
    - Clear subscription_id
    - Deactivate old subscription record
    - Record downgrade in credits table for audit
    """
    users_table = dynamodb.Table(USERS_TABLE)
    credits_table = dynamodb.Table(CREDITS_TABLE)
    subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
    now = datetime.utcnow().isoformat()

    previous_plan = user_data.get('subscription_plan', 'unknown')
    previous_subscription_id = user_data.get('subscription_id')

    # Update user to free plan WITH 3 FREE CREDITS
    users_table.update_item(
        Key={'user_id': user_id},
        UpdateExpression='''
            SET subscription_status = :status,
                subscription_plan = :plan,
                subscription_id = :null,
                downgraded_at = :now,
                previous_plan = :prev_plan,
                credits = :free_credits,
                credits_reset_at = :now,
                updated_at = :now
        ''',
        ExpressionAttributeValues={
            ':status': 'free',
            ':plan': 'free',
            ':null': None,
            ':now': now,
            ':prev_plan': previous_plan,
            ':free_credits': Decimal(str(FREE_CREDITS))
        }
    )

    # Deactivate old subscription in subscriptions table
    if previous_subscription_id:
        try:
            subscriptions_table.update_item(
                Key={'subscription_id': previous_subscription_id},
                UpdateExpression='''
                    SET #s = :inactive,
                        deactivated_at = :now,
                        deactivation_reason = :reason,
                        updated_at = :now
                ''',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={
                    ':inactive': 'inactive',
                    ':now': now,
                    ':reason': 'auto_downgrade_expired'
                }
            )
        except Exception as e:
            print(f"Could not deactivate old subscription {previous_subscription_id}: {e}")

    # Log downgrade event with credits added
    credits_table.put_item(Item={
        'transaction_id': f"downgrade-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        'user_id': user_id,
        'amount': Decimal(str(FREE_CREDITS)),
        'type': 'downgrade_credits',
        'description': f"Auto-downgrade from {previous_plan} to free - {FREE_CREDITS} free credits added",
        'source': 'scheduler',
        'previous_plan': previous_plan,
        'created_at': now
    })

    print(f"Downgraded user {user_id} to free plan with {FREE_CREDITS} credits")
    return True


# ============================================================
# FREE CREDITS EXPIRY
# ============================================================

def process_free_credits_expiry():
    """
    Expire/reset free credits for users on free plan after 90 days.
    Only affects users who:
    - Are on free plan (subscription_status = 'free' OR subscription_plan = 'free')
    - Have been on free plan for more than 90 days
    - Still have their initial free credits
    """
    users_table = dynamodb.Table(USERS_TABLE)
    credits_table = dynamodb.Table(CREDITS_TABLE)
    now = datetime.utcnow()
    expiry_cutoff = (now - timedelta(days=FREE_CREDITS_EXPIRY_DAYS)).isoformat()

    expired_count = 0
    errors = []

    try:
        # Scan for free users with credits
        response = users_table.scan(
            FilterExpression='(subscription_status = :free_status OR subscription_plan = :free_plan) AND credits > :zero AND attribute_not_exists(credits_expired)',
            ExpressionAttributeValues={
                ':free_status': 'free',
                ':free_plan': 'free',
                ':zero': Decimal('0')
            }
        )

        free_users = response.get('Items', [])

        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = users_table.scan(
                FilterExpression='(subscription_status = :free_status OR subscription_plan = :free_plan) AND credits > :zero AND attribute_not_exists(credits_expired)',
                ExpressionAttributeValues={
                    ':free_status': 'free',
                    ':free_plan': 'free',
                    ':zero': Decimal('0')
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            free_users.extend(response.get('Items', []))

        for user in free_users:
            user_id = user.get('user_id')
            created_at = user.get('created_at')

            if not created_at:
                continue

            try:
                # Check if user has been on free plan for more than 90 days
                created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00').replace('+00:00', ''))
                expiry_date = created_date + timedelta(days=FREE_CREDITS_EXPIRY_DAYS)

                if now < expiry_date:
                    # Credits not yet expired
                    continue

                # Check if user has upgraded at any point (don't expire if they were ever paid)
                if user.get('subscription_activated_at') or user.get('previous_plan'):
                    continue

                # Expire the free credits
                expire_free_credits(user_id, user)
                expired_count += 1

                # Send expiry notification
                send_credits_expiry_email(user)

            except Exception as e:
                errors.append({'user_id': user_id, 'error': str(e)})
                print(f"Error expiring credits for user {user_id}: {str(e)}")

        print(f"Free credits expiry complete: {expired_count} users expired, {len(errors)} errors")

    except Exception as e:
        print(f"Error in process_free_credits_expiry: {str(e)}")
        errors.append({'error': str(e)})

    return {
        'expired_count': expired_count,
        'errors': errors
    }


def expire_free_credits(user_id, user_data):
    """
    Expire free credits for a user.
    Reset credits to 0 and mark as expired.
    """
    users_table = dynamodb.Table(USERS_TABLE)
    credits_table = dynamodb.Table(CREDITS_TABLE)
    now = datetime.utcnow().isoformat()

    current_credits = int(user_data.get('credits', 0))

    # Update user credits
    users_table.update_item(
        Key={'user_id': user_id},
        UpdateExpression='''
            SET credits = :zero,
                credits_expired = :true,
                credits_expired_at = :now,
                credits_expired_amount = :amount,
                updated_at = :now
        ''',
        ExpressionAttributeValues={
            ':zero': Decimal('0'),
            ':true': True,
            ':now': now,
            ':amount': Decimal(str(current_credits))
        }
    )

    # Log expiry event
    credits_table.put_item(Item={
        'transaction_id': f"expiry-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        'user_id': user_id,
        'amount': Decimal(str(-current_credits)),
        'type': 'expiry',
        'description': f"Free credits expired after {FREE_CREDITS_EXPIRY_DAYS} days",
        'source': 'scheduler',
        'created_at': now
    })

    print(f"Expired {current_credits} free credits for user {user_id}")
    return True


def reset_free_credits(user_id):
    """
    Hard reset of free credits for a free user.
    - Only works for users on free plan
    - Resets credits to FREE_CREDITS (3)
    - Resets expiry timer
    - Logs the reset transaction
    Returns: {'success': bool, 'message': str, 'credits': int}
    """
    users_table = dynamodb.Table(USERS_TABLE)
    credits_table = dynamodb.Table(CREDITS_TABLE)
    now = datetime.utcnow().isoformat()

    try:
        # Get current user data
        response = users_table.get_item(Key={'user_id': user_id})
        if 'Item' not in response:
            return {'success': False, 'message': 'User not found', 'credits': 0}

        user = response['Item']
        current_plan = user.get('subscription_plan', 'free')
        subscription_status = user.get('subscription_status', 'free')

        # Only allow reset for free users
        if current_plan not in ['free', 'aarambh_free', None] or subscription_status == 'active':
            return {'success': False, 'message': 'Credit reset only available for free plan users', 'credits': int(user.get('credits', 0))}

        current_credits = int(user.get('credits', 0))

        # Update user with reset credits
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='''
                SET credits = :free_credits,
                    credits_reset_at = :now,
                    credits_expired = :false,
                    last_free_reset = :now,
                    free_reset_count = if_not_exists(free_reset_count, :zero) + :one,
                    updated_at = :now
            ''',
            ExpressionAttributeValues={
                ':free_credits': Decimal(str(FREE_CREDITS)),
                ':now': now,
                ':false': False,
                ':zero': Decimal('0'),
                ':one': Decimal('1')
            }
        )

        # Log the reset transaction
        credits_table.put_item(Item={
            'transaction_id': f"reset-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'user_id': user_id,
            'amount': Decimal(str(FREE_CREDITS)),
            'previous_credits': Decimal(str(current_credits)),
            'type': 'free_reset',
            'description': f"Free credits hard reset - {FREE_CREDITS} credits restored",
            'source': 'user_request',
            'created_at': now
        })

        print(f"Reset free credits for user {user_id}: {current_credits} -> {FREE_CREDITS}")
        return {'success': True, 'message': f'Credits reset to {FREE_CREDITS}', 'credits': FREE_CREDITS}

    except Exception as e:
        print(f"Error resetting credits for user {user_id}: {str(e)}")
        return {'success': False, 'message': str(e), 'credits': 0}


# ============================================================
# DELAYED EMAIL PROCESSING
# ============================================================

def process_delayed_emails():
    """
    Process emails that were queued for delayed sending.
    Emails are sent 30 minutes after the transaction.
    """
    email_queue_table = dynamodb.Table(EMAIL_QUEUE_TABLE)
    now = datetime.utcnow()

    sent_count = 0
    errors = []

    try:
        # Query for emails ready to be sent
        response = email_queue_table.scan(
            FilterExpression='#status = :pending AND scheduled_for <= :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':pending': 'pending',
                ':now': now.isoformat()
            }
        )

        emails_to_send = response.get('Items', [])

        for email_item in emails_to_send:
            email_id = email_item.get('email_id')

            try:
                # Send the email
                send_email_from_queue(email_item)

                # Mark as sent
                email_queue_table.update_item(
                    Key={'email_id': email_id},
                    UpdateExpression='SET #status = :sent, sent_at = :now',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':sent': 'sent',
                        ':now': now.isoformat()
                    }
                )

                sent_count += 1

            except Exception as e:
                # Mark as failed
                email_queue_table.update_item(
                    Key={'email_id': email_id},
                    UpdateExpression='SET #status = :failed, error_message = :error, failed_at = :now',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':failed': 'failed',
                        ':error': str(e)[:500],
                        ':now': now.isoformat()
                    }
                )
                errors.append({'email_id': email_id, 'error': str(e)})
                print(f"Error sending email {email_id}: {str(e)}")

        print(f"Delayed email processing complete: {sent_count} sent, {len(errors)} errors")

    except Exception as e:
        print(f"Error in process_delayed_emails: {str(e)}")
        errors.append({'error': str(e)})

    return {
        'sent_count': sent_count,
        'errors': errors
    }


def queue_transaction_email(user_id, email, transaction_type, transaction_data, delay_minutes=30):
    """
    Queue a transaction email for delayed sending.
    """
    email_queue_table = dynamodb.Table(EMAIL_QUEUE_TABLE)
    now = datetime.utcnow()
    scheduled_time = now + timedelta(minutes=delay_minutes)

    email_id = f"email-{user_id}-{now.strftime('%Y%m%d%H%M%S')}"

    email_queue_table.put_item(Item={
        'email_id': email_id,
        'user_id': user_id,
        'email': email,
        'email_type': transaction_type,
        'transaction_data': json.dumps(transaction_data, cls=DecimalEncoder),
        'status': 'pending',
        'scheduled_for': scheduled_time.isoformat(),
        'created_at': now.isoformat()
    })

    print(f"Queued {transaction_type} email for {email} at {scheduled_time}")
    return email_id


def send_email_from_queue(email_item):
    """
    Send an email from the queue.
    """
    email_type = email_item.get('email_type')
    email = email_item.get('email')
    transaction_data = json.loads(email_item.get('transaction_data', '{}'))

    # Generate email content based on type
    if email_type == 'subscription_activated':
        subject, html_body, text_body = generate_subscription_email(transaction_data)
    elif email_type == 'credit_purchase':
        subject, html_body, text_body = generate_credit_purchase_email(transaction_data)
    elif email_type == 'renewal':
        subject, html_body, text_body = generate_renewal_email(transaction_data)
    else:
        subject, html_body, text_body = generate_generic_transaction_email(transaction_data)

    # Send via SES
    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )

    print(f"Sent {email_type} email to {email}")
    return True


# ============================================================
# RENEWAL REMINDER EMAILS
# ============================================================

def process_renewal_reminders():
    """
    Send renewal reminder emails to users approaching renewal.
    """
    users_table = dynamodb.Table(USERS_TABLE)
    now = datetime.utcnow()

    sent_count = 0
    errors = []

    try:
        # Scan for active paid users
        response = users_table.scan(
            FilterExpression='subscription_status = :active AND subscription_plan <> :free',
            ExpressionAttributeValues={
                ':active': 'active',
                ':free': 'free'
            }
        )

        paid_users = response.get('Items', [])

        for user in paid_users:
            user_id = user.get('user_id')
            renewal_date_str = user.get('current_period_end') or user.get('subscription_activated_at')

            if not renewal_date_str:
                continue

            try:
                # Parse renewal date
                renewal_date = datetime.fromisoformat(renewal_date_str.replace('Z', '+00:00').replace('+00:00', ''))
                days_until_renewal = (renewal_date - now).days

                # Check if we should send a reminder
                for reminder_days in RENEWAL_REMINDER_DAYS:
                    if days_until_renewal == reminder_days:
                        # Check if reminder already sent
                        reminder_key = f"reminder_{reminder_days}d_sent"
                        if not user.get(reminder_key):
                            send_renewal_reminder_email(user, reminder_days)

                            # Mark reminder as sent
                            users_table.update_item(
                                Key={'user_id': user_id},
                                UpdateExpression=f'SET {reminder_key} = :true, updated_at = :now',
                                ExpressionAttributeValues={
                                    ':true': True,
                                    ':now': now.isoformat()
                                }
                            )
                            sent_count += 1
                        break

            except Exception as e:
                errors.append({'user_id': user_id, 'error': str(e)})
                print(f"Error processing renewal reminder for {user_id}: {str(e)}")

        print(f"Renewal reminders complete: {sent_count} sent, {len(errors)} errors")

    except Exception as e:
        print(f"Error in process_renewal_reminders: {str(e)}")
        errors.append({'error': str(e)})

    return {
        'sent_count': sent_count,
        'errors': errors
    }


# ============================================================
# RETENTION OFFER EMAILS
# ============================================================

def process_retention_offers():
    """
    Send retention offer emails to users who might churn.
    Targets:
    - Cancelled users (win-back)
    - Users with low credit usage
    - Users approaching 1-year anniversary
    """
    users_table = dynamodb.Table(USERS_TABLE)
    now = datetime.utcnow()

    sent_count = 0
    errors = []

    try:
        # 1. Win-back emails for cancelled users (7 days after cancellation)
        winback_cutoff = (now - timedelta(days=7)).isoformat()
        winback_response = users_table.scan(
            FilterExpression='subscription_status = :cancelled AND cancelled_at >= :cutoff AND attribute_not_exists(winback_email_sent)',
            ExpressionAttributeValues={
                ':cancelled': 'cancelled',
                ':cutoff': winback_cutoff
            }
        )

        for user in winback_response.get('Items', []):
            try:
                send_winback_email(user)
                users_table.update_item(
                    Key={'user_id': user['user_id']},
                    UpdateExpression='SET winback_email_sent = :true, winback_sent_at = :now',
                    ExpressionAttributeValues={
                        ':true': True,
                        ':now': now.isoformat()
                    }
                )
                sent_count += 1
            except Exception as e:
                errors.append({'user_id': user['user_id'], 'error': str(e)})

        # 2. Anniversary offers (11 months after subscription)
        anniversary_cutoff_start = (now - timedelta(days=335)).isoformat()  # ~11 months
        anniversary_cutoff_end = (now - timedelta(days=330)).isoformat()

        anniversary_response = users_table.scan(
            FilterExpression='subscription_status = :active AND subscription_activated_at BETWEEN :start AND :end AND attribute_not_exists(anniversary_offer_sent)',
            ExpressionAttributeValues={
                ':active': 'active',
                ':start': anniversary_cutoff_start,
                ':end': anniversary_cutoff_end
            }
        )

        for user in anniversary_response.get('Items', []):
            try:
                send_anniversary_offer_email(user)
                users_table.update_item(
                    Key={'user_id': user['user_id']},
                    UpdateExpression='SET anniversary_offer_sent = :true, anniversary_sent_at = :now',
                    ExpressionAttributeValues={
                        ':true': True,
                        ':now': now.isoformat()
                    }
                )
                sent_count += 1
            except Exception as e:
                errors.append({'user_id': user['user_id'], 'error': str(e)})

        print(f"Retention offers complete: {sent_count} sent, {len(errors)} errors")

    except Exception as e:
        print(f"Error in process_retention_offers: {str(e)}")
        errors.append({'error': str(e)})

    return {
        'sent_count': sent_count,
        'errors': errors
    }


# ============================================================
# EMAIL TEMPLATES
# ============================================================

def get_email_base_style():
    """Return base email CSS styles"""
    return """
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a1a; color: #e0e0e0; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; }
        .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(99, 102, 241, 0.2); }
        .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
        .content { padding: 30px 0; }
        h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px; }
        p { color: #a0a0a0; line-height: 1.6; margin: 10px 0; }
        .highlight { color: #6366f1; font-weight: 600; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .details-box { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(99, 102, 241, 0.2); color: #666; font-size: 12px; }
    </style>
    """


def send_downgrade_email(user):
    """Send email when user is downgraded to free plan"""
    email = user.get('email')
    name = user.get('full_name', email.split('@')[0])
    previous_plan = user.get('subscription_plan', 'paid plan')

    subject = "Your AiVedha Guard Subscription Has Ended"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AiVedha Guard</div>
            </div>
            <div class="content">
                <h1>Your Subscription Has Ended</h1>
                <p>Hi {name},</p>
                <p>Your <span class="highlight">{previous_plan}</span> subscription has ended and your account has been moved to the free tier.</p>

                <div class="details-box">
                    <p><strong>What this means:</strong></p>
                    <ul>
                        <li>Your remaining credits are still available</li>
                        <li>You won't receive new monthly credits</li>
                        <li>Premium features are no longer accessible</li>
                    </ul>
                </div>

                <p>We'd love to have you back! Reactivate your subscription to continue protecting your websites.</p>

                <a href="{APP_BASE_URL}/pricing" class="cta-button">View Plans</a>
            </div>
            <div class="footer">
                <p>AiVedha Guard - AI-Powered Security Audits</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Your Subscription Has Ended

    Hi {name},

    Your {previous_plan} subscription has ended and your account has been moved to the free tier.

    What this means:
    - Your remaining credits are still available
    - You won't receive new monthly credits
    - Premium features are no longer accessible

    Reactivate your subscription: {APP_BASE_URL}/pricing

    AiVedha Guard - AI-Powered Security Audits
    """

    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )


def send_credits_expiry_email(user):
    """Send email when free credits expire"""
    email = user.get('email')
    name = user.get('full_name', email.split('@')[0])
    credits = int(user.get('credits', 0))

    subject = "Your Free Credits Have Expired"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AiVedha Guard</div>
            </div>
            <div class="content">
                <h1>Your Free Credits Have Expired</h1>
                <p>Hi {name},</p>
                <p>Your <span class="highlight">{credits} free credits</span> have expired after {FREE_CREDITS_EXPIRY_DAYS} days of inactivity.</p>

                <p>Subscribe to a plan to get fresh credits and protect your websites with AI-powered security audits.</p>

                <a href="{APP_BASE_URL}/pricing" class="cta-button">Get Started</a>

                <div class="details-box">
                    <p><strong>Why subscribe?</strong></p>
                    <ul>
                        <li>Unlimited security audits</li>
                        <li>Real-time vulnerability detection</li>
                        <li>Compliance certificates</li>
                        <li>Priority support</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>AiVedha Guard - AI-Powered Security Audits</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Your Free Credits Have Expired

    Hi {name},

    Your {credits} free credits have expired after {FREE_CREDITS_EXPIRY_DAYS} days of inactivity.

    Subscribe to get fresh credits: {APP_BASE_URL}/pricing

    AiVedha Guard - AI-Powered Security Audits
    """

    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )


def send_renewal_reminder_email(user, days_until):
    """Send renewal reminder email"""
    email = user.get('email')
    name = user.get('full_name', email.split('@')[0])
    plan = user.get('subscription_plan', 'subscription')

    subject = f"Your AiVedha Guard Subscription Renews in {days_until} Day{'s' if days_until > 1 else ''}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AiVedha Guard</div>
            </div>
            <div class="content">
                <h1>Renewal Reminder</h1>
                <p>Hi {name},</p>
                <p>Your <span class="highlight">{plan}</span> subscription will renew in <span class="highlight">{days_until} day{'s' if days_until > 1 else ''}</span>.</p>

                <div class="details-box">
                    <p>You can manage your subscription in your dashboard.</p>
                </div>

                <a href="{APP_BASE_URL}/dashboard/subscription" class="cta-button">Manage Subscription</a>
            </div>
            <div class="footer">
                <p>AiVedha Guard - AI-Powered Security Audits</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Renewal Reminder

    Hi {name},

    Your {plan} subscription will renew in {days_until} day{'s' if days_until > 1 else ''}.

    Manage your subscription: {APP_BASE_URL}/dashboard/subscription

    AiVedha Guard - AI-Powered Security Audits
    """

    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )


def send_winback_email(user):
    """Send win-back email to cancelled users"""
    email = user.get('email')
    name = user.get('full_name', email.split('@')[0])

    subject = "We Miss You! Here's 20% Off Your Next Subscription"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AiVedha Guard</div>
            </div>
            <div class="content">
                <h1>We Miss You!</h1>
                <p>Hi {name},</p>
                <p>We noticed you cancelled your subscription. We'd love to have you back!</p>

                <div class="details-box" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border-color: rgba(34, 197, 94, 0.3);">
                    <p style="color: #22c55e; font-size: 20px; font-weight: bold; text-align: center;">Special Offer: 20% OFF</p>
                    <p style="text-align: center;">Use code <strong style="color: #6366f1;">WELCOME20</strong> at checkout</p>
                </div>

                <a href="{APP_BASE_URL}/pricing?coupon=WELCOME20" class="cta-button">Reactivate Now</a>
            </div>
            <div class="footer">
                <p>AiVedha Guard - AI-Powered Security Audits</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    We Miss You!

    Hi {name},

    We noticed you cancelled your subscription. We'd love to have you back!

    Special Offer: 20% OFF with code WELCOME20

    Reactivate now: {APP_BASE_URL}/pricing?coupon=WELCOME20

    AiVedha Guard - AI-Powered Security Audits
    """

    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )


def send_anniversary_offer_email(user):
    """Send anniversary/loyalty offer email"""
    email = user.get('email')
    name = user.get('full_name', email.split('@')[0])

    subject = "Happy Anniversary! Here's a Special Gift"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AiVedha Guard</div>
            </div>
            <div class="content">
                <h1>Happy Anniversary!</h1>
                <p>Hi {name},</p>
                <p>You've been with AiVedha Guard for almost a year! Thank you for trusting us with your security.</p>

                <div class="details-box" style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); border-color: rgba(251, 191, 36, 0.3);">
                    <p style="color: #fbbf24; font-size: 20px; font-weight: bold; text-align: center;">Loyalty Reward: 30% OFF Annual Plan</p>
                    <p style="text-align: center;">Use code <strong style="color: #6366f1;">ANNUAL30</strong> to switch to annual billing</p>
                </div>

                <a href="{APP_BASE_URL}/pricing?coupon=ANNUAL30" class="cta-button">Upgrade to Annual</a>
            </div>
            <div class="footer">
                <p>AiVedha Guard - AI-Powered Security Audits</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Happy Anniversary!

    Hi {name},

    You've been with AiVedha Guard for almost a year! Thank you for trusting us.

    Loyalty Reward: 30% OFF Annual Plan with code ANNUAL30

    Upgrade now: {APP_BASE_URL}/pricing?coupon=ANNUAL30

    AiVedha Guard - AI-Powered Security Audits
    """

    ses.send_email(
        Source=f"AiVedha Guard <{SENDER_EMAIL}>",
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }
    )


def generate_subscription_email(data):
    """Generate subscription activation email"""
    plan = data.get('plan', 'subscription')
    credits = data.get('credits', 0)
    price = data.get('price', 0)

    subject = f"Welcome to AiVedha Guard {plan}!"
    html_body = f"""
    <html><head>{get_email_base_style()}</head>
    <body><div class="container">
        <div class="header"><div class="logo">AiVedha Guard</div></div>
        <div class="content">
            <h1>Subscription Activated!</h1>
            <p>Your {plan} plan is now active with {credits} credits.</p>
            <a href="{APP_BASE_URL}/dashboard" class="cta-button">Start Auditing</a>
        </div>
    </div></body></html>
    """
    text_body = f"Your {plan} subscription is active with {credits} credits."

    return subject, html_body, text_body


def generate_credit_purchase_email(data):
    """Generate credit purchase email"""
    pack = data.get('pack', 'credits')
    credits = data.get('credits', 0)

    subject = f"Your {credits} Credits Have Been Added!"
    html_body = f"""
    <html><head>{get_email_base_style()}</head>
    <body><div class="container">
        <div class="header"><div class="logo">AiVedha Guard</div></div>
        <div class="content">
            <h1>{credits} Credits Added!</h1>
            <p>Your {pack} purchase is complete.</p>
            <a href="{APP_BASE_URL}/dashboard" class="cta-button">Use Your Credits</a>
        </div>
    </div></body></html>
    """
    text_body = f"Your {pack} purchase is complete. {credits} credits added."

    return subject, html_body, text_body


def generate_renewal_email(data):
    """Generate renewal email"""
    plan = data.get('plan', 'subscription')
    credits = data.get('credits', 0)

    subject = f"Your AiVedha Guard Subscription Has Been Renewed!"
    html_body = f"""
    <html><head>{get_email_base_style()}</head>
    <body><div class="container">
        <div class="header"><div class="logo">AiVedha Guard</div></div>
        <div class="content">
            <h1>Subscription Renewed!</h1>
            <p>Your {plan} plan has been renewed with {credits} new credits.</p>
            <a href="{APP_BASE_URL}/dashboard" class="cta-button">View Dashboard</a>
        </div>
    </div></body></html>
    """
    text_body = f"Your {plan} subscription renewed with {credits} credits."

    return subject, html_body, text_body


def generate_generic_transaction_email(data):
    """Generate generic transaction email"""
    transaction_type = data.get('type', 'transaction')

    subject = f"AiVedha Guard Transaction Confirmation"
    html_body = f"""
    <html><head>{get_email_base_style()}</head>
    <body><div class="container">
        <div class="header"><div class="logo">AiVedha Guard</div></div>
        <div class="content">
            <h1>Transaction Complete</h1>
            <p>Your {transaction_type} has been processed successfully.</p>
            <a href="{APP_BASE_URL}/dashboard" class="cta-button">View Dashboard</a>
        </div>
    </div></body></html>
    """
    text_body = f"Your {transaction_type} has been processed."

    return subject, html_body, text_body


# ============================================================
# MAIN HANDLER
# ============================================================

def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    # Determine action
    action = event.get('action') or event.get('queryStringParameters', {}).get('action', 'all')

    results = {}

    try:
        if action == 'all' or action == 'auto_downgrade':
            results['auto_downgrade'] = process_auto_downgrades()

        if action == 'all' or action == 'credits_expiry':
            results['credits_expiry'] = process_free_credits_expiry()

        if action == 'all' or action == 'delayed_emails':
            results['delayed_emails'] = process_delayed_emails()

        if action == 'all' or action == 'renewal_reminders':
            results['renewal_reminders'] = process_renewal_reminders()

        if action == 'all' or action == 'retention_offers':
            results['retention_offers'] = process_retention_offers()

        return json_response(200, {
            'success': True,
            'action': action,
            'results': results,
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return json_response(500, {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
