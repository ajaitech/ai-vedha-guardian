"""
AiVedha Guard - Credit Top-up Lambda Function
Version: 2.0.0 - PayPal Integration

This Lambda function handles credit pack purchases via PayPal:
1. Triggered by PayPal webhook on successful order/subscription payment
2. Validates the payment via PayPal API
3. Adds credits to user's existing balance
4. Updates DynamoDB with new credit balance
5. Logs transaction details with IP, location, timestamps

Environment Variables:
- PAYPAL_CLIENT_ID: PayPal OAuth Client ID
- PAYPAL_CLIENT_SECRET: PayPal OAuth Client Secret
- PAYPAL_WEBHOOK_ID: PayPal Webhook ID for signature verification
- PAYPAL_MODE: 'live' or 'sandbox'
- DYNAMODB_USERS_TABLE: DynamoDB table for users
- DYNAMODB_CREDITS_LOG_TABLE: DynamoDB table for credit transactions
- DYNAMODB_TRANSACTIONS_TABLE: DynamoDB table for payment transactions
- SNS_TOPIC_ARN: SNS topic for notifications
"""

import json
import os
import logging
import boto3
import urllib.request
import urllib.parse
import base64
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')

# Environment variables
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', '')
PAYPAL_WEBHOOK_ID = os.environ.get('PAYPAL_WEBHOOK_ID', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'live')
PAYPAL_API_BASE = 'https://api-m.paypal.com' if PAYPAL_MODE == 'live' else 'https://api-m.sandbox.paypal.com'

USERS_TABLE = os.environ.get('DYNAMODB_USERS_TABLE', 'aivedha_users')
CREDITS_LOG_TABLE = os.environ.get('DYNAMODB_CREDITS_LOG_TABLE', 'aivedha_credits_log')
TRANSACTIONS_TABLE = os.environ.get('DYNAMODB_TRANSACTIONS_TABLE', 'aivedha_transactions')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

# Credit Pack Definitions (USD only - matching PayPal product codes)
CREDIT_PACKS = {
    'credits-5': {'credits': 5, 'price': 5},
    'credits-10': {'credits': 10, 'price': 9},
    'credits-25': {'credits': 25, 'price': 20},
    'credits-50': {'credits': 50, 'price': 35},
    'credits-100': {'credits': 100, 'price': 60},
}

# Paid plan IDs (credit packs available for all users)
PAID_PLANS = ['aarambh', 'raksha', 'suraksha', 'vajra', 'chakra']

# Token cache
_paypal_token_cache = {
    'access_token': None,
    'expiry': None
}


# ============================================================================
# PAYPAL API INTEGRATION
# ============================================================================

def get_paypal_access_token() -> Optional[str]:
    """Get valid PayPal access token using client credentials."""
    global _paypal_token_cache

    # Check cached token
    if _paypal_token_cache['access_token'] and _paypal_token_cache['expiry']:
        if datetime.utcnow() < _paypal_token_cache['expiry']:
            return _paypal_token_cache['access_token']

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        logger.error("PayPal credentials not configured")
        return None

    try:
        auth_str = f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}"
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
                expires_in = result.get('expires_in', 32400)
                _paypal_token_cache['expiry'] = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                return result['access_token']

        return None
    except Exception as e:
        logger.error(f"PayPal token error: {e}")
        return None


def paypal_api_request(endpoint: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
    """Make a request to PayPal API."""
    access_token = get_paypal_access_token()
    if not access_token:
        return None

    url = f"{PAYPAL_API_BASE}/{endpoint.lstrip('/')}"

    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        body = json.dumps(data).encode('utf-8') if data else None
        request = urllib.request.Request(url, data=body, method=method)
        for key, value in headers.items():
            request.add_header(key, value)

        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        logger.error(f"PayPal API error {e.code}: {error_body}")
        return None
    except Exception as e:
        logger.error(f"PayPal API error: {e}")
        return None


def verify_paypal_webhook(headers: Dict[str, str], body: str) -> bool:
    """Verify PayPal webhook signature."""
    if not PAYPAL_WEBHOOK_ID:
        logger.warning("PayPal webhook ID not configured, skipping verification")
        return True

    access_token = get_paypal_access_token()
    if not access_token:
        return False

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
        'webhook_id': PAYPAL_WEBHOOK_ID,
        'webhook_event': json.loads(body) if isinstance(body, str) else body
    }

    try:
        result = paypal_api_request('/v1/notifications/verify-webhook-signature', 'POST', verification_data)
        return result and result.get('verification_status') == 'SUCCESS'
    except Exception as e:
        logger.error(f"Webhook verification error: {e}")
        return False


def get_order_details(order_id: str) -> Optional[Dict]:
    """Get order details from PayPal."""
    return paypal_api_request(f'/v2/checkout/orders/{order_id}')


def get_subscription_details(subscription_id: str) -> Optional[Dict]:
    """Get subscription details from PayPal."""
    return paypal_api_request(f'/v1/billing/subscriptions/{subscription_id}')


# ============================================================================
# DYNAMODB OPERATIONS
# ============================================================================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user from DynamoDB by email."""
    table = dynamodb.Table(USERS_TABLE)

    try:
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email.lower()}
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"Error getting user by email: {e}")
        return None


def get_user_by_paypal_payer_id(payer_id: str) -> Optional[Dict[str, Any]]:
    """Get user from DynamoDB by PayPal payer ID."""
    table = dynamodb.Table(USERS_TABLE)

    try:
        response = table.query(
            IndexName='paypal_payer_id-index',
            KeyConditionExpression='paypal_payer_id = :pid',
            ExpressionAttributeValues={':pid': payer_id}
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"Error getting user by payer ID: {e}")
        return None


def get_user_credits(user_id: str) -> int:
    """Get current credit balance for a user."""
    table = dynamodb.Table(USERS_TABLE)

    try:
        response = table.get_item(Key={'user_id': user_id})
        user = response.get('Item', {})
        return int(user.get('credits_remaining', 0))
    except Exception as e:
        logger.error(f"Error getting credits: {e}")
        return 0


def add_credits(user_id: str, credits_to_add: int, transaction_id: str, pack_code: str) -> Dict[str, Any]:
    """Add credits to user's balance."""
    table = dynamodb.Table(USERS_TABLE)
    current_credits = get_user_credits(user_id)
    new_credits = current_credits + credits_to_add

    try:
        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits_remaining = :credits, updated_at = :updated',
            ExpressionAttributeValues={
                ':credits': new_credits,
                ':updated': datetime.utcnow().isoformat()
            }
        )

        # Log the transaction
        log_credit_transaction(
            user_id=user_id,
            transaction_id=transaction_id,
            transaction_type='credit_pack_purchase',
            credits_added=credits_to_add,
            credits_before=current_credits,
            credits_after=new_credits,
            pack_code=pack_code
        )

        return {
            'success': True,
            'credits_added': credits_to_add,
            'previous_balance': current_credits,
            'new_balance': new_credits
        }
    except Exception as e:
        logger.error(f"Error adding credits: {e}")
        return {'success': False, 'error': str(e)}


def log_credit_transaction(
    user_id: str,
    transaction_id: str,
    transaction_type: str,
    credits_added: int,
    credits_before: int,
    credits_after: int,
    pack_code: str
) -> bool:
    """Log credit transaction to DynamoDB."""
    table = dynamodb.Table(CREDITS_LOG_TABLE)

    try:
        table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'transaction_type': transaction_type,
            'pack_code': pack_code,
            'credits_added': credits_added,
            'credits_before': credits_before,
            'credits_after': credits_after,
            'currency': 'USD',
            'payment_gateway': 'paypal',
            'timestamp': datetime.utcnow().isoformat(),
            'ttl': int((datetime.utcnow() + timedelta(days=730)).timestamp())  # 2 year retention
        })
        return True
    except Exception as e:
        logger.error(f"Error logging transaction: {e}")
        return False


def log_payment_transaction(
    transaction_id: str,
    user_id: str,
    user_email: str,
    event_type: str,
    amount: float,
    currency: str,
    pack_code: str,
    paypal_data: Dict,
    ip_address: str = None,
    user_agent: str = None
) -> bool:
    """Log complete payment transaction details for analytics."""
    table = dynamodb.Table(TRANSACTIONS_TABLE)

    try:
        table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'user_email': user_email,
            'event_type': event_type,
            'amount': Decimal(str(amount)),
            'currency': currency,
            'pack_code': pack_code,
            'payment_gateway': 'paypal',
            'paypal_order_id': paypal_data.get('order_id'),
            'paypal_payer_id': paypal_data.get('payer_id'),
            'paypal_capture_id': paypal_data.get('capture_id'),
            'ip_address': ip_address or 'unknown',
            'user_agent': user_agent or 'unknown',
            'status': 'completed',
            'timestamp': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat(),
            'ttl': int((datetime.utcnow() + timedelta(days=1825)).timestamp())  # 5 year retention
        })
        return True
    except Exception as e:
        logger.error(f"Error logging payment transaction: {e}")
        return False


# ============================================================================
# NOTIFICATION
# ============================================================================

def send_notification(user_email: str, subject: str, message: str) -> bool:
    """Send notification via SNS."""
    if not SNS_TOPIC_ARN:
        logger.warning("SNS topic not configured")
        return False

    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=json.dumps({
                'email': user_email,
                'cc': 'payments@aivibe.in',
                'subject': subject,
                'message': message
            })
        )
        return True
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        return False


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Main Lambda handler for credit top-up via PayPal.

    PayPal Webhook Events:
    - PAYMENT.CAPTURE.COMPLETED: Order payment captured (credit pack purchase)
    - BILLING.SUBSCRIPTION.ACTIVATED: Subscription started
    - BILLING.SUBSCRIPTION.RENEWED: Subscription renewed

    Direct API Call:
    {
        "action": "add_credits",
        "user_id": "user_123",
        "credits": 10,
        "transaction_id": "tx_123",
        "pack_code": "credits-10"
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Extract IP and user agent for logging
    headers = event.get('headers', {}) or {}
    ip_address = headers.get('X-Forwarded-For', headers.get('x-forwarded-for', 'unknown'))
    if ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()
    user_agent = headers.get('User-Agent', headers.get('user-agent', 'unknown'))

    # Check if this is a webhook event
    if 'body' in event:
        body = event.get('body', '')

        # Verify webhook signature
        if not verify_paypal_webhook(headers, body):
            logger.error("Invalid webhook signature")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid signature'})
            }

        webhook_data = json.loads(body) if isinstance(body, str) else body
        event_type = webhook_data.get('event_type', '')
        resource = webhook_data.get('resource', {})

        logger.info(f"Processing PayPal event: {event_type}")

        # Handle order payment completed (credit pack purchase)
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            return handle_payment_capture(resource, ip_address, user_agent)

        # Handle subscription activated
        elif event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
            return handle_subscription_activated(resource, ip_address, user_agent)

        # Handle subscription renewed (monthly credits)
        elif event_type == 'BILLING.SUBSCRIPTION.RENEWED':
            return handle_subscription_renewed(resource, ip_address, user_agent)

        else:
            logger.info(f"Ignoring event type: {event_type}")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': f'Event {event_type} acknowledged'})
            }

    # Direct API call
    action = event.get('action')

    if action == 'add_credits':
        user_id = event.get('user_id')
        credits = event.get('credits', 0)
        transaction_id = event.get('transaction_id', f"manual_{datetime.utcnow().timestamp()}")
        pack_code = event.get('pack_code', 'manual_credit')

        if not user_id or credits <= 0:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id and positive credits required'})
            }

        result = add_credits(user_id, credits, transaction_id, pack_code)

        return {
            'statusCode': 200 if result.get('success') else 500,
            'body': json.dumps(result)
        }

    elif action == 'get_credits':
        user_id = event.get('user_id')
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id required'})
            }

        credits = get_user_credits(user_id)
        return {
            'statusCode': 200,
            'body': json.dumps({'user_id': user_id, 'credits': credits})
        }

    return {
        'statusCode': 400,
        'body': json.dumps({'error': 'Invalid request'})
    }


def handle_payment_capture(resource: Dict[str, Any], ip_address: str, user_agent: str) -> Dict[str, Any]:
    """Handle PayPal payment capture completed event (credit pack purchase)."""
    capture_id = resource.get('id')
    amount = resource.get('amount', {})
    amount_value = float(amount.get('value', 0))
    currency = amount.get('currency_code', 'USD')

    # Get order details from custom_id or supplementary_data
    custom_id = resource.get('custom_id', '')
    supplementary_data = resource.get('supplementary_data', {})
    related_ids = supplementary_data.get('related_ids', {})
    order_id = related_ids.get('order_id', '')

    # Parse custom_id for user and pack info (format: user_id|pack_code)
    user_id = None
    pack_code = None

    if custom_id and '|' in custom_id:
        parts = custom_id.split('|')
        user_id = parts[0]
        pack_code = parts[1] if len(parts) > 1 else None

    # If no custom_id, try to get from order
    if not user_id and order_id:
        order = get_order_details(order_id)
        if order:
            payer = order.get('payer', {})
            payer_email = payer.get('email_address', '')
            payer_id = payer.get('payer_id', '')

            # Find user by PayPal payer ID or email
            user = get_user_by_paypal_payer_id(payer_id)
            if not user and payer_email:
                user = get_user_by_email(payer_email)

            if user:
                user_id = user.get('user_id')

            # Get pack code from purchase units
            purchase_units = order.get('purchase_units', [])
            if purchase_units:
                custom_id = purchase_units[0].get('custom_id', '')
                if '|' in custom_id:
                    pack_code = custom_id.split('|')[1]
                else:
                    # Determine pack from amount
                    pack_code = get_pack_from_amount(amount_value)

    if not user_id:
        logger.error(f"Could not find user for capture {capture_id}")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'User not found'})
        }

    if not pack_code:
        pack_code = get_pack_from_amount(amount_value)

    # Get credit pack details
    credit_pack = CREDIT_PACKS.get(pack_code)
    if not credit_pack:
        logger.error(f"Unknown pack code: {pack_code}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Unknown pack: {pack_code}'})
        }

    credits_to_add = credit_pack['credits']
    transaction_id = f"paypal_{capture_id}_{datetime.utcnow().timestamp()}"

    # Get user email for notification
    table = dynamodb.Table(USERS_TABLE)
    user_response = table.get_item(Key={'user_id': user_id})
    user = user_response.get('Item', {})
    user_email = user.get('email', '')

    # Add credits
    result = add_credits(user_id, credits_to_add, transaction_id, pack_code)

    if result.get('success'):
        # Log detailed transaction
        log_payment_transaction(
            transaction_id=transaction_id,
            user_id=user_id,
            user_email=user_email,
            event_type='credit_pack_purchase',
            amount=amount_value,
            currency=currency,
            pack_code=pack_code,
            paypal_data={
                'order_id': order_id,
                'capture_id': capture_id,
                'payer_id': resource.get('payer_id', '')
            },
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Send notification
        send_notification(
            user_email,
            'Credits Added - AiVedha Guard',
            f'{credits_to_add} credits have been added to your account. '
            f'New balance: {result.get("new_balance")} credits.'
        )

        logger.info(f"Added {credits_to_add} credits for user {user_id}")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': result.get('success', False),
            'user_id': user_id,
            'credits_added': credits_to_add,
            'capture_id': capture_id
        })
    }


def handle_subscription_activated(resource: Dict[str, Any], ip_address: str, user_agent: str) -> Dict[str, Any]:
    """Handle subscription activated event - add initial plan credits."""
    subscription_id = resource.get('id')
    plan_id = resource.get('plan_id', '')
    subscriber = resource.get('subscriber', {})
    email = subscriber.get('email_address', '')

    # Find user
    user = get_user_by_email(email)
    if not user:
        logger.error(f"User not found for subscription {subscription_id}")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'User not found'})
        }

    user_id = user.get('user_id')

    # Determine credits based on plan
    plan_credits = get_plan_credits_from_paypal_plan_id(plan_id)

    if plan_credits > 0:
        transaction_id = f"sub_{subscription_id}_{datetime.utcnow().timestamp()}"
        result = add_credits(user_id, plan_credits, transaction_id, f'plan_{plan_id}')

        if result.get('success'):
            log_payment_transaction(
                transaction_id=transaction_id,
                user_id=user_id,
                user_email=email,
                event_type='subscription_activated',
                amount=0,
                currency='USD',
                pack_code=f'plan_{plan_id}',
                paypal_data={'subscription_id': subscription_id},
                ip_address=ip_address,
                user_agent=user_agent
            )

    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'subscription_id': subscription_id,
            'credits_added': plan_credits
        })
    }


def handle_subscription_renewed(resource: Dict[str, Any], ip_address: str, user_agent: str) -> Dict[str, Any]:
    """Handle subscription renewal - add monthly credits."""
    subscription_id = resource.get('id')

    # Get full subscription details
    subscription = get_subscription_details(subscription_id)
    if not subscription:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Subscription not found'})
        }

    plan_id = subscription.get('plan_id', '')
    subscriber = subscription.get('subscriber', {})
    email = subscriber.get('email_address', '')

    user = get_user_by_email(email)
    if not user:
        logger.error(f"User not found for subscription renewal {subscription_id}")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'User not found'})
        }

    user_id = user.get('user_id')
    plan_credits = get_plan_credits_from_paypal_plan_id(plan_id)

    if plan_credits > 0:
        transaction_id = f"renewal_{subscription_id}_{datetime.utcnow().timestamp()}"
        result = add_credits(user_id, plan_credits, transaction_id, f'renewal_{plan_id}')

        if result.get('success'):
            log_payment_transaction(
                transaction_id=transaction_id,
                user_id=user_id,
                user_email=email,
                event_type='subscription_renewed',
                amount=0,
                currency='USD',
                pack_code=f'renewal_{plan_id}',
                paypal_data={'subscription_id': subscription_id},
                ip_address=ip_address,
                user_agent=user_agent
            )

            send_notification(
                email,
                'Subscription Renewed - AiVedha Guard',
                f'Your subscription has been renewed. {plan_credits} credits added. '
                f'New balance: {result.get("new_balance")} credits.'
            )

    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'subscription_id': subscription_id,
            'credits_added': plan_credits
        })
    }


def get_pack_from_amount(amount: float) -> str:
    """Determine credit pack from payment amount."""
    amount_to_pack = {
        5: 'credits-5',
        9: 'credits-10',
        20: 'credits-25',
        35: 'credits-50',
        60: 'credits-100',
    }
    return amount_to_pack.get(int(amount), 'credits-5')


def get_plan_credits_from_paypal_plan_id(plan_id: str) -> int:
    """
    Get credits for a PayPal subscription plan ID.

    IMPORTANT: Credits must match frontend src/constants/plans.ts
    Monthly credits: aarambh=3, raksha=10, suraksha=50, vajra=200, chakra=500
    Yearly credits: monthly * 12 (with 10% price discount)
    """
    plan_credits = {
        # Monthly plans - Credits per month
        'P-1JC933532V162793LNFDMXLY': 3,    # Aarambh Monthly
        'P-9DE80034NW8103644NFDMXMI': 10,   # Raksha Monthly
        'P-9B208585UV344253JNFDMXNA': 50,   # Suraksha Monthly (was 30)
        'P-9FM13449DU368353XNFDMXNY': 200,  # Vajra Monthly (was 100)
        'P-97P76054M44105114NFDMXOI': 500,  # Chakra Monthly (was -1 unlimited)
        # Yearly plans - Credits per year (monthly * 12)
        'P-37E07153GU572264RNFDMXMA': 36,    # Aarambh Yearly (3 * 12)
        'P-91V72263GL6122913NFDMXMY': 120,   # Raksha Yearly (10 * 12)
        'P-3NA45044HW267203SNFDMXNI': 600,   # Suraksha Yearly (50 * 12)
        'P-33C53817PE4737058NFDMXOA': 2400,  # Vajra Yearly (200 * 12)
        'P-99U671102N720504TNFDMXOQ': 6000,  # Chakra Yearly (500 * 12)
    }
    return plan_credits.get(plan_id, 0)
