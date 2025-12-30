"""
AiVedha Guard - PayPal Integration Lambda Handler
Handles subscriptions, webhooks, and one-time credit purchases
"""

import json
import os
import boto3
import requests
import hashlib
import base64
from datetime import datetime, timedelta
from decimal import Decimal

# Environment variables - REQUIRED (no hardcoded defaults for security)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'live')
PAYPAL_WEBHOOK_ID = os.environ.get('PAYPAL_WEBHOOK_ID')

# Validate required credentials at startup
if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
    print("WARNING: PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.")

# API Base URLs
PAYPAL_API_BASE = "https://api-m.paypal.com" if PAYPAL_MODE == 'live' else "https://api-m.sandbox.paypal.com"

# DynamoDB tables
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
CREDITS_TABLE = os.environ.get('CREDITS_TABLE', 'aivedha-guardian-credits')
PAYPAL_EVENTS_TABLE = os.environ.get('PAYPAL_EVENTS_TABLE', 'aivedha-guardian-paypal-events')

# Application URLs
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://aivedha.ai')

# PayPal Plan Configuration - Credits MUST match frontend src/constants/plans.ts
# CORRECT PRICING: Aarambh=FREE, Raksha=$10, Suraksha=$45, Vajra=$150, Chakra=$300
# Monthly credits: aarambh=3(free), raksha=10, suraksha=50, vajra=200, chakra=500
# Yearly: monthly * 12 credits, 10% price discount
PAYPAL_PLANS = {
    # Aarambh is FREE - no PayPal plan needed
    # Monthly Plans
    "raksha": {
        "id": "P-9DE80034NW8103644NFDMXMI",
        "name": "Raksha (Protection)",
        "price": 10.00,
        "credits": 10,
        "billing_cycle": "MONTH"
    },
    "suraksha": {
        "id": "P-9B208585UV344253JNFDMXNA",
        "name": "Suraksha (Professional)",
        "price": 45.00,
        "credits": 50,
        "billing_cycle": "MONTH"
    },
    "vajra": {
        "id": "P-9FM13449DU368353XNFDMXNY",
        "name": "Vajra (Business)",
        "price": 150.00,
        "credits": 200,
        "billing_cycle": "MONTH"
    },
    "chakra": {
        "id": "P-97P76054M44105114NFDMXOI",
        "name": "Chakra (Enterprise)",
        "price": 300.00,
        "credits": 500,
        "billing_cycle": "MONTH"
    },
    # Yearly Plans (10% discount)
    "raksha_yearly": {
        "id": "P-91V72263GL6122913NFDMXMY",
        "name": "Raksha (Protection) Yearly",
        "price": 108.00,
        "credits": 120,
        "billing_cycle": "YEAR"
    },
    "suraksha_yearly": {
        "id": "P-3NA45044HW267203SNFDMXNI",
        "name": "Suraksha (Professional) Yearly",
        "price": 486.00,
        "credits": 600,
        "billing_cycle": "YEAR"
    },
    "vajra_yearly": {
        "id": "P-33C53817PE4737058NFDMXOA",
        "name": "Vajra (Business) Yearly",
        "price": 1620.00,
        "credits": 2400,
        "billing_cycle": "YEAR"
    },
    "chakra_yearly": {
        "id": "P-99U671102N720504TNFDMXOQ",
        "name": "Chakra (Enterprise) Yearly",
        "price": 3240.00,
        "credits": 6000,
        "billing_cycle": "YEAR"
    }
}

# Feature Add-ons
FEATURE_ADDONS = {
    "scheduler": {
        "id": "P-32U60387JT1483533NFDMXPA",
        "name": "Scheduled Audits Add-on",
        "price": 25.00,
        "billing_cycle": "MONTH"
    },
    "whitelabel": {
        "id": "P-7PJ67808RA6591613NFDMXPI",
        "name": "White-Label Reports Add-on",
        "price": 60.00,
        "billing_cycle": "MONTH"
    },
    "api-access": {
        "id": "P-10P90334X6470204UNFDMXPQ",
        "name": "API Access Add-on",
        "price": 40.00,
        "billing_cycle": "MONTH"
    }
}

# Credit Packs (one-time purchases)
CREDIT_PACKS = {
    "credits-5": {"credits": 5, "price": 5.00, "name": "5 Credits Pack"},
    "credits-10": {"credits": 10, "price": 9.00, "name": "10 Credits Pack"},
    "credits-25": {"credits": 25, "price": 20.00, "name": "25 Credits Pack"},
    "credits-50": {"credits": 50, "price": 35.00, "name": "50 Credits Pack"},
    "credits-100": {"credits": 100, "price": 60.00, "name": "100 Credits Pack"},
    # Legacy IDs for backward compatibility
    "starter": {"credits": 5, "price": 5.00, "name": "5 Credits Pack"},
    "basic": {"credits": 10, "price": 9.00, "name": "10 Credits Pack"},
    "pro": {"credits": 25, "price": 20.00, "name": "25 Credits Pack"},
    "business": {"credits": 50, "price": 35.00, "name": "50 Credits Pack"},
    "enterprise": {"credits": 100, "price": 60.00, "name": "100 Credits Pack"},
}

# Discount Coupons Configuration
DISCOUNT_COUPONS = {
    "WELCOME20": {
        "name": "Welcome 20% Off",
        "discount_percent": 20,
        "max_uses": 1000,
        "applies_to": "all",  # "all", "monthly", "yearly", "credits"
        "description": "20% off your first subscription",
        "trial_months": 0,
        "one_time_use": True  # Per user
    },
    "ANNUAL30": {
        "name": "Annual 30% Off",
        "discount_percent": 30,
        "max_uses": 500,
        "applies_to": "yearly",
        "description": "30% off annual subscriptions",
        "trial_months": 0,
        "one_time_use": False
    },
    "STARTUP50": {
        "name": "Startup Special",
        "discount_percent": 50,
        "max_uses": 100,
        "applies_to": "all",
        "description": "50% off for verified startups",
        "trial_months": 0,
        "one_time_use": True
    },
    "FIRST3FREE": {
        "name": "First 3 Months Free",
        "discount_percent": 100,
        "max_uses": 200,
        "applies_to": "monthly",
        "description": "First 3 months free on monthly plans",
        "trial_months": 3,
        "one_time_use": True
    },
    "CREDITS20": {
        "name": "20% Off Credits",
        "discount_percent": 20,
        "max_uses": 500,
        "applies_to": "credits",
        "description": "20% off credit pack purchases",
        "trial_months": 0,
        "one_time_use": False
    },
    "AJNAIDU": {
        "name": "Admin Test Coupon",
        "discount_percent": 100,
        "max_uses": 1,
        "applies_to": "all",
        "description": "100% off - Admin testing only",
        "trial_months": 0,
        "one_time_use": False
    }
}

# Coupon tracking table
COUPONS_TABLE = os.environ.get('COUPONS_TABLE', 'aivedha-guardian-coupons')

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')

# CORS headers - Restrict to production domain
CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://aivedha.ai',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}

# Transactions table for idempotency
TRANSACTIONS_TABLE = os.environ.get('TRANSACTIONS_TABLE', 'aivedha-guardian-transactions')

# Error codes for standardized responses
ERROR_CODES = {
    'PAYMENT_001': {'message': 'Payment system unavailable', 'retryable': True},
    'PAYMENT_002': {'message': 'Invalid plan selected', 'retryable': False},
    'PAYMENT_003': {'message': 'Coupon expired or invalid', 'retryable': False},
    'PAYMENT_004': {'message': 'User already has active subscription', 'retryable': False},
    'PAYMENT_005': {'message': 'Insufficient permissions', 'retryable': False},
    'PAYMENT_006': {'message': 'Transaction already processed', 'retryable': False},
    'PAYMENT_007': {'message': 'Rate limit exceeded', 'retryable': True},
    'PAYMENT_008': {'message': 'Invalid payment method', 'retryable': False},
    'PAYMENT_009': {'message': 'Card declined', 'retryable': True},
    'PAYMENT_010': {'message': 'Webhook verification failed', 'retryable': False},
    'PAYMENT_011': {'message': 'Invalid request parameters', 'retryable': False},
    'PAYMENT_012': {'message': 'User not found', 'retryable': False},
}

def create_error_response(error_code, details=None, status_code=400, cors_headers=CORS_HEADERS):
    """Create standardized error response"""
    error_info = ERROR_CODES.get(error_code, {'message': 'Unknown error', 'retryable': False})
    return {
        'statusCode': status_code,
        'headers': cors_headers,
        'body': json.dumps({
            'success': False,
            'error': {
                'code': error_code,
                'message': error_info['message'],
                'details': details,
                'retryable': error_info['retryable']
            },
            'metadata': {
                'timestamp': datetime.utcnow().isoformat()
            }
        })
    }

def check_idempotency(client_transaction_id, user_id):
    """Check if transaction already exists to prevent duplicates"""
    if not client_transaction_id:
        return None

    try:
        transactions_table = dynamodb.Table(TRANSACTIONS_TABLE)
        response = transactions_table.get_item(
            Key={'transaction_id': client_transaction_id}
        )
        if 'Item' in response:
            return response['Item']
        return None
    except Exception as e:
        print(f"Error checking idempotency: {str(e)}")
        return None

def save_transaction(transaction_id, user_id, transaction_type, status, details):
    """Save transaction for idempotency and audit trail"""
    try:
        transactions_table = dynamodb.Table(TRANSACTIONS_TABLE)
        transactions_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'type': transaction_type,
            'status': status,
            'details': details,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        return True
    except Exception as e:
        print(f"Error saving transaction: {str(e)}")
        return False


def get_paypal_access_token():
    """Get OAuth access token from PayPal"""
    try:
        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US"
            },
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            timeout=30
        )

        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Failed to get PayPal token: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting PayPal token: {str(e)}")
        return None


def verify_webhook_signature(headers, body, webhook_id):
    """Verify PayPal webhook signature"""
    try:
        access_token = get_paypal_access_token()
        if not access_token:
            return False

        verify_payload = {
            "auth_algo": headers.get("PAYPAL-AUTH-ALGO", ""),
            "cert_url": headers.get("PAYPAL-CERT-URL", ""),
            "transmission_id": headers.get("PAYPAL-TRANSMISSION-ID", ""),
            "transmission_sig": headers.get("PAYPAL-TRANSMISSION-SIG", ""),
            "transmission_time": headers.get("PAYPAL-TRANSMISSION-TIME", ""),
            "webhook_id": webhook_id,
            "webhook_event": json.loads(body) if isinstance(body, str) else body
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json=verify_payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("verification_status") == "SUCCESS"

        print(f"Webhook verification failed: {response.status_code} - {response.text}")
        return False
    except Exception as e:
        print(f"Error verifying webhook: {str(e)}")
        return False


def create_subscription(body, cors_headers):
    """Create a PayPal subscription for a user"""
    try:
        user_id = body.get('userId') or body.get('email')
        plan_key = body.get('plan', 'aarambh').lower()
        billing_cycle = body.get('billingCycle', 'monthly')  # 'monthly' or 'yearly'
        client_transaction_id = body.get('clientTransactionId')
        user_agent = body.get('userAgent', '')
        timezone = body.get('timezone', '')
        session_id = body.get('sessionId', '')

        if not user_id:
            return create_error_response('PAYMENT_011', 'userId is required', 400, cors_headers)

        # Check for duplicate transaction (idempotency)
        if client_transaction_id:
            existing_txn = check_idempotency(client_transaction_id, user_id)
            if existing_txn:
                # Return cached response if transaction already processed
                if existing_txn.get('status') == 'completed':
                    return {
                        'statusCode': 200,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'success': True,
                            'subscription_id': existing_txn.get('details', {}).get('subscription_id'),
                            'approval_url': existing_txn.get('details', {}).get('approval_url'),
                            'cached': True,
                            'message': 'Transaction already processed'
                        })
                    }
                elif existing_txn.get('status') == 'pending':
                    return create_error_response('PAYMENT_006', 'Transaction is being processed', 409, cors_headers)

        # Get plan configuration
        if billing_cycle == 'yearly':
            plan_key = f"{plan_key}_yearly"

        plan = PAYPAL_PLANS.get(plan_key)
        if not plan:
            return create_error_response('PAYMENT_002', f'Invalid plan: {plan_key}', 400, cors_headers)

        access_token = get_paypal_access_token()
        if not access_token:
            return create_error_response('PAYMENT_001', None, 503, cors_headers)

        # Save pending transaction for idempotency
        if client_transaction_id:
            save_transaction(client_transaction_id, user_id, 'subscription', 'pending', {
                'plan': plan_key,
                'user_agent': user_agent,
                'timezone': timezone,
                'session_id': session_id
            })

        # Get subscriber details from request
        full_name = body.get('fullName', '')
        phone = body.get('phone', '')

        # Parse subscriber name for PayPal
        name_parts = full_name.strip().split(' ', 1) if full_name else ['', '']
        given_name = name_parts[0] if name_parts else ''
        surname = name_parts[1] if len(name_parts) > 1 else ''

        # Build subscriber object with pre-filled details
        subscriber = {
            "email_address": user_id if '@' in user_id else f"{user_id}@aivedha.ai"
        }

        # Add name if available (improves checkout UX - pre-fills name field)
        if given_name:
            subscriber["name"] = {
                "given_name": given_name,
                "surname": surname or given_name
            }

        # Add phone if available (pre-fills phone field)
        if phone:
            clean_phone = phone.replace(' ', '').replace('-', '')
            if clean_phone.startswith('+'):
                subscriber["phone"] = {
                    "phone_type": "MOBILE",
                    "phone_number": {
                        "national_number": clean_phone[1:].lstrip('0')
                    }
                }

        # Create subscription with optimal PayPal checkout experience
        subscription_payload = {
            "plan_id": plan["id"],
            "subscriber": subscriber,
            "application_context": {
                # Brand identity
                "brand_name": "AiVedha Guard",
                "locale": "en-US",

                # Landing page: BILLING shows credit/debit card form first
                # Users can pay with card WITHOUT a PayPal account (guest checkout)
                # They can still click "Log in to PayPal" if they prefer
                "landing_page": "BILLING",

                # Digital goods - no shipping
                "shipping_preference": "NO_SHIPPING",

                # Show "Subscribe Now" button for immediate conversion
                "user_action": "SUBSCRIBE_NOW",

                # Payment method preferences - allow any payment method
                "payment_method": {
                    # UNRESTRICTED allows both PayPal and card payments
                    "payee_preferred": "UNRESTRICTED"
                },

                # Return URLs with full context
                "return_url": f"{APP_BASE_URL}/payment-success?plan={plan_key}&userId={user_id}&credits={plan['credits']}",
                "cancel_url": f"{APP_BASE_URL}/payment-failed?reason=cancelled&plan={plan_key}"
            },
            "custom_id": json.dumps({
                "user_id": user_id,
                "plan": plan_key,
                "credits": plan["credits"],
                "source": "aivedha-guard",
                "plan_name": plan["name"]
            })
        }

        # Unique request ID to prevent duplicate subscriptions
        request_id = f"aivedha-sub-{user_id.replace('@', '-at-')[:20]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}"

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/subscriptions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "PayPal-Request-Id": request_id,
                "Prefer": "return=representation"  # Return full subscription details
            },
            json=subscription_payload,
            timeout=30
        )

        if response.status_code in [200, 201]:
            subscription = response.json()
            approval_url = next(
                (link["href"] for link in subscription.get("links", []) if link["rel"] == "approve"),
                None
            )

            # Extract comprehensive subscription details from PayPal response
            subscriber_info = subscription.get("subscriber", {})
            billing_info = subscription.get("billing_info", {})

            # Build comprehensive response with all PayPal details
            subscription_details = {
                # Core subscription info
                'subscription_id': subscription.get("id"),
                'paypal_subscription_id': subscription.get("id"),
                'status': subscription.get("status"),
                'status_update_time': subscription.get("status_update_time"),

                # Plan details
                'plan_id': subscription.get("plan_id"),
                'plan_code': plan_key,
                'plan_name': plan["name"],
                'price': plan["price"],
                'credits': plan["credits"],
                'billing_cycle': plan.get("billing_cycle", "MONTH"),

                # Subscriber/Customer details from PayPal
                'subscriber': {
                    'email_address': subscriber_info.get("email_address"),
                    'payer_id': subscriber_info.get("payer_id"),  # PayPal customer ID
                    'name': subscriber_info.get("name", {}),
                    'phone': subscriber_info.get("phone", {})
                },

                # Billing info
                'billing_info': {
                    'outstanding_balance': billing_info.get("outstanding_balance", {}),
                    'cycle_executions': billing_info.get("cycle_executions", []),
                    'last_payment': billing_info.get("last_payment", {}),
                    'next_billing_time': billing_info.get("next_billing_time"),
                    'failed_payments_count': billing_info.get("failed_payments_count", 0)
                },

                # Dates
                'start_time': subscription.get("start_time"),
                'create_time': subscription.get("create_time"),

                # URLs
                'approval_url': approval_url,
                'hostedPageUrl': approval_url,  # For frontend compatibility

                # Transaction tracking
                'transactionId': client_transaction_id,
                'request_id': request_id,

                # Auto-debit enabled (PayPal manages this automatically)
                'auto_renewal': True,
                'payment_collection': 'automatic'
            }

            # Update transaction status to completed with full details
            if client_transaction_id:
                save_transaction(client_transaction_id, user_id, 'subscription', 'completed', {
                    'plan': plan_key,
                    'subscription_id': subscription["id"],
                    'plan_id': subscription.get("plan_id"),
                    'payer_id': subscriber_info.get("payer_id"),
                    'approval_url': approval_url,
                    'status': subscription.get("status"),
                    'user_agent': user_agent,
                    'timezone': timezone,
                    'session_id': session_id
                })

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    **subscription_details,
                    'metadata': {
                        'timestamp': datetime.utcnow().isoformat(),
                        'provider': 'paypal',
                        'mode': PAYPAL_MODE
                    }
                })
            }
        else:
            print(f"PayPal subscription creation failed: {response.status_code} - {response.text}")
            # Mark transaction as failed
            if client_transaction_id:
                save_transaction(client_transaction_id, user_id, 'subscription', 'failed', {
                    'plan': plan_key,
                    'error': response.text[:500]
                })
            return create_error_response('PAYMENT_001', 'PayPal service error', 500, cors_headers)

    except Exception as e:
        print(f"Error creating subscription: {str(e)}")
        # Mark transaction as failed
        if client_transaction_id:
            save_transaction(client_transaction_id, user_id, 'subscription', 'failed', {
                'error': str(e)[:500]
            })
        return create_error_response('PAYMENT_001', str(e), 500, cors_headers)


def create_credit_order(body, cors_headers):
    """Create a one-time credit pack order"""
    try:
        user_id = body.get('userId') or body.get('email')
        pack_key = body.get('pack', 'credits-10').lower()
        coupon_code = body.get('couponCode', '').upper().strip()
        client_transaction_id = body.get('clientTransactionId')
        user_agent = body.get('userAgent', '')
        timezone = body.get('timezone', '')
        session_id = body.get('sessionId', '')

        if not user_id:
            return create_error_response('PAYMENT_011', 'userId is required', 400, cors_headers)

        # Check for duplicate transaction (idempotency)
        if client_transaction_id:
            existing_txn = check_idempotency(client_transaction_id, user_id)
            if existing_txn:
                if existing_txn.get('status') == 'completed':
                    return {
                        'statusCode': 200,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'success': True,
                            'order_id': existing_txn.get('details', {}).get('order_id'),
                            'approval_url': existing_txn.get('details', {}).get('approval_url'),
                            'cached': True,
                            'message': 'Transaction already processed'
                        })
                    }
                elif existing_txn.get('status') == 'pending':
                    return create_error_response('PAYMENT_006', 'Transaction is being processed', 409, cors_headers)

        pack = CREDIT_PACKS.get(pack_key)
        if not pack:
            return create_error_response('PAYMENT_002', f'Invalid pack: {pack_key}', 400, cors_headers)

        access_token = get_paypal_access_token()
        if not access_token:
            return create_error_response('PAYMENT_001', None, 503, cors_headers)

        # Save pending transaction for idempotency
        if client_transaction_id:
            save_transaction(client_transaction_id, user_id, 'credits', 'pending', {
                'pack': pack_key,
                'user_agent': user_agent,
                'timezone': timezone,
                'session_id': session_id
            })

        # Apply coupon discount if provided
        original_price = pack["price"]
        final_price = original_price
        applied_coupon = None
        discount_amount = 0

        if coupon_code:
            final_price, applied_coupon = apply_coupon_discount(original_price, coupon_code, 'credits')
            if applied_coupon:
                discount_amount = original_price - final_price

        # Handle 100% discount - bypass PayPal and grant credits directly
        if final_price <= 0 and applied_coupon:
            # Generate a free order ID
            free_order_id = f"FREE-{user_id.replace('@', '-at-')[:20]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

            # Add credits directly to user
            add_credits_to_user(
                user_id,
                pack["credits"],
                f"Credit Pack (100% Coupon): {pack['name']}",
                free_order_id
            )

            # Record coupon usage
            record_coupon_usage(coupon_code, user_id, free_order_id, original_price)

            # Update transaction status
            if client_transaction_id:
                save_transaction(client_transaction_id, user_id, 'credits', 'completed', {
                    'pack': pack_key,
                    'order_id': free_order_id,
                    'free_order': True,
                    'coupon_code': coupon_code,
                    'user_agent': user_agent,
                    'timezone': timezone,
                    'session_id': session_id
                })

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'order_id': free_order_id,
                    'free_order': True,
                    'pack': pack["name"],
                    'original_price': original_price,
                    'final_price': 0,
                    'credits': pack["credits"],
                    'credits_added': True,
                    'transactionId': client_transaction_id,
                    'coupon': {
                        'code': coupon_code,
                        'name': applied_coupon['name'],
                        'discount_percent': applied_coupon['discount_percent'],
                        'discount_amount': original_price
                    },
                    'message': f'{pack["credits"]} credits added to your account!',
                    'metadata': {
                        'timestamp': datetime.utcnow().isoformat()
                    }
                })
            }

        # Create order for one-time purchase
        order_payload = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": f"credits-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                "description": f"AiVedha Guard - {pack['name']} ({pack['credits']} credits)" + (f" - {applied_coupon['name']}" if applied_coupon else ""),
                "custom_id": json.dumps({
                    "user_id": user_id,
                    "pack": pack_key,
                    "credits": pack["credits"],
                    "type": "credit_pack",
                    "coupon_code": coupon_code if applied_coupon else None,
                    "discount_amount": discount_amount
                }),
                "amount": {
                    "currency_code": "USD",
                    "value": str(final_price),
                    "breakdown": {
                        "item_total": {
                            "currency_code": "USD",
                            "value": str(original_price)
                        },
                        "discount": {
                            "currency_code": "USD",
                            "value": str(discount_amount)
                        }
                    } if discount_amount > 0 else None
                }
            }],
            "application_context": {
                "brand_name": "AiVedha Guard",
                "landing_page": "BILLING",
                "shipping_preference": "NO_SHIPPING",
                "user_action": "PAY_NOW",
                "return_url": f"{APP_BASE_URL}/payment-success?type=credits&pack={pack_key}&userId={user_id}",
                "cancel_url": f"{APP_BASE_URL}/payment-failed?reason=cancelled"
            }
        }

        # Clean up None values in amount breakdown
        if not discount_amount:
            del order_payload["purchase_units"][0]["amount"]["breakdown"]

        response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "PayPal-Request-Id": f"aivedha-credits-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            },
            json=order_payload,
            timeout=30
        )

        if response.status_code in [200, 201]:
            order = response.json()
            approval_url = next(
                (link["href"] for link in order.get("links", []) if link["rel"] == "approve"),
                None
            )

            # Update transaction status to completed
            if client_transaction_id:
                save_transaction(client_transaction_id, user_id, 'credits', 'completed', {
                    'pack': pack_key,
                    'order_id': order["id"],
                    'approval_url': approval_url,
                    'user_agent': user_agent,
                    'timezone': timezone,
                    'session_id': session_id
                })

            response_data = {
                'success': True,
                'order_id': order["id"],
                'approval_url': approval_url,
                'hostedPageUrl': approval_url,  # For frontend compatibility
                'pack': pack["name"],
                'original_price': original_price,
                'final_price': final_price,
                'credits': pack["credits"],
                'transactionId': client_transaction_id,
                'metadata': {
                    'timestamp': datetime.utcnow().isoformat()
                }
            }

            if applied_coupon:
                response_data['coupon'] = {
                    'code': coupon_code,
                    'name': applied_coupon['name'],
                    'discount_percent': applied_coupon['discount_percent'],
                    'discount_amount': discount_amount
                }

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(response_data)
            }
        else:
            print(f"PayPal order creation failed: {response.status_code} - {response.text}")
            # Mark transaction as failed
            if client_transaction_id:
                save_transaction(client_transaction_id, user_id, 'credits', 'failed', {
                    'pack': pack_key,
                    'error': response.text[:500]
                })
            return create_error_response('PAYMENT_001', 'PayPal service error', 500, cors_headers)

    except Exception as e:
        print(f"Error creating credit order: {str(e)}")
        # Mark transaction as failed
        if client_transaction_id:
            save_transaction(client_transaction_id, user_id, 'credits', 'failed', {
                'error': str(e)[:500]
            })
        return create_error_response('PAYMENT_001', str(e), 500, cors_headers)


def capture_order(body, cors_headers):
    """Capture a PayPal order after approval"""
    try:
        order_id = body.get('orderId')
        if not order_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'orderId is required'})
            }

        access_token = get_paypal_access_token()
        if not access_token:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Payment system unavailable'})
            }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            timeout=30
        )

        if response.status_code in [200, 201]:
            capture = response.json()

            # Process the captured order
            if capture.get("status") == "COMPLETED":
                for unit in capture.get("purchase_units", []):
                    custom_id = unit.get("payments", {}).get("captures", [{}])[0].get("custom_id", "{}")
                    try:
                        custom_data = json.loads(custom_id)
                        if custom_data.get("type") == "credit_pack":
                            # Add credits to user
                            add_credits_to_user(
                                custom_data.get("user_id"),
                                custom_data.get("credits"),
                                f"Credit Pack Purchase: {custom_data.get('pack')}",
                                order_id
                            )
                    except json.JSONDecodeError:
                        pass

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'status': capture.get("status"),
                    'order_id': order_id
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to capture order'
                })
            }

    except Exception as e:
        print(f"Error capturing order: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


EMAIL_QUEUE_TABLE = os.environ.get('EMAIL_QUEUE_TABLE', 'aivedha-guardian-email-queue')


def queue_transaction_email(user_id, email, email_type, transaction_data, delay_minutes=30):
    """
    Queue a transaction email for delayed sending.
    Emails are sent after the specified delay (default 30 mins).
    """
    try:
        email_queue_table = dynamodb.Table(EMAIL_QUEUE_TABLE)
        now = datetime.utcnow()
        scheduled_time = now + timedelta(minutes=delay_minutes)

        email_id = f"email-{user_id}-{now.strftime('%Y%m%d%H%M%S')}"

        email_queue_table.put_item(Item={
            'email_id': email_id,
            'user_id': user_id,
            'email': email,
            'email_type': email_type,
            'transaction_data': json.dumps(transaction_data),
            'status': 'pending',
            'scheduled_for': scheduled_time.isoformat(),
            'created_at': now.isoformat()
        })

        print(f"Queued {email_type} email for {email} at {scheduled_time}")
        return email_id
    except Exception as e:
        print(f"Error queuing email: {str(e)}")
        return None


def add_credits_to_user(user_id, credits, description, transaction_id):
    """Add credits to a user's account"""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        credits_table = dynamodb.Table(CREDITS_TABLE)
        now = datetime.utcnow().isoformat()

        # Update user credits
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = if_not_exists(credits, :zero) + :credits, updated_at = :now',
            ExpressionAttributeValues={
                ':credits': Decimal(str(credits)),
                ':zero': Decimal('0'),
                ':now': now
            }
        )

        # Log credit transaction
        credits_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'amount': Decimal(str(credits)),
            'type': 'credit',
            'description': description,
            'source': 'paypal',
            'created_at': now
        })

        # Queue delayed email for credit purchase (30 mins)
        if 'Credit Pack' in description or 'credit_pack' in description.lower():
            try:
                pack_name = description.replace('Credit Pack: ', '').replace('Credit Pack Purchase: ', '')
                queue_transaction_email(user_id, user_id, 'credit_purchase', {
                    'pack': pack_name,
                    'credits': credits,
                    'transaction_id': transaction_id
                }, delay_minutes=30)
            except Exception as email_error:
                print(f"Error queuing credit email: {str(email_error)}")

        print(f"Added {credits} credits to user {user_id}")
        return True
    except Exception as e:
        print(f"Error adding credits: {str(e)}")
        return False


def activate_subscription(user_id, plan_key, subscription_id, credits):
    """
    Activate a subscription for a user.
    ENFORCES: Only ONE active plan per user - deactivates any existing subscriptions.
    """
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
        now = datetime.utcnow().isoformat()

        plan = PAYPAL_PLANS.get(plan_key, {})
        plan_name = plan.get('name', plan_key.title())
        plan_price = plan.get('price', 0)
        billing_cycle = plan.get('billing_cycle', 'MONTH')

        # Calculate renewal date based on billing cycle
        if billing_cycle == 'YEAR':
            renewal_date = (datetime.utcnow() + timedelta(days=365)).isoformat()
        else:
            renewal_date = (datetime.utcnow() + timedelta(days=30)).isoformat()

        # ========================================
        # STEP 1: Get current user data and check for existing subscription
        # ========================================
        try:
            user_response = users_table.get_item(Key={'user_id': user_id})
            existing_user = user_response.get('Item', {})
            old_subscription_id = existing_user.get('subscription_id')
            old_plan = existing_user.get('subscription_plan', 'free')

            # Deactivate old subscription if exists
            if old_subscription_id and old_subscription_id != subscription_id:
                print(f"Deactivating old subscription {old_subscription_id} for user {user_id}")
                try:
                    subscriptions_table.update_item(
                        Key={'subscription_id': old_subscription_id},
                        UpdateExpression='''
                            SET #s = :inactive,
                                deactivated_at = :now,
                                deactivation_reason = :reason,
                                replaced_by = :new_sub,
                                updated_at = :now
                        ''',
                        ExpressionAttributeNames={'#s': 'status'},
                        ExpressionAttributeValues={
                            ':inactive': 'inactive',
                            ':now': now,
                            ':reason': 'replaced_by_new_subscription',
                            ':new_sub': subscription_id
                        }
                    )
                except Exception as e:
                    print(f"Warning: Could not deactivate old subscription: {e}")
        except Exception as e:
            print(f"Warning: Could not check existing subscription: {e}")
            old_plan = 'unknown'

        # ========================================
        # STEP 2: Update user record with new subscription
        # ========================================
        update_expression = '''
            SET subscription_status = :status,
                subscription_plan = :plan,
                subscription_id = :sub_id,
                subscription_provider = :provider,
                subscription_activated_at = :activated_at,
                subscription_renewal_date = :renewal_date,
                previous_plan = :old_plan,
                #p = :plan_name,
                updated_at = :now,
                cancelled_at = :null,
                credits_expired = :false
        '''

        expression_values = {
            ':status': 'active',
            ':plan': plan_key,
            ':sub_id': subscription_id,
            ':provider': 'paypal',
            ':activated_at': now,
            ':renewal_date': renewal_date,
            ':old_plan': old_plan,
            ':plan_name': plan_name,
            ':now': now,
            ':null': None,
            ':false': False
        }

        # Add credits if not unlimited
        if credits > 0:
            update_expression += ', credits = if_not_exists(credits, :zero) + :credits'
            expression_values[':credits'] = Decimal(str(credits))
            expression_values[':zero'] = Decimal('0')
        elif credits == -1:
            # Unlimited credits
            update_expression += ', credits = :unlimited'
            expression_values[':unlimited'] = Decimal('-1')

        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#p': 'plan'},
            ExpressionAttributeValues=expression_values
        )

        # ========================================
        # STEP 3: Log NEW subscription (always fresh record)
        # ========================================
        subscriptions_table.put_item(Item={
            'subscription_id': subscription_id,
            'user_id': user_id,
            'plan': plan_key,
            'plan_name': plan_name,
            'provider': 'paypal',
            'status': 'active',
            'credits_added': str(credits),
            'billing_cycle': billing_cycle,
            'renewal_date': renewal_date,
            'activated_at': now,
            'created_at': now
        })

        # Queue delayed transaction email (30 mins after)
        try:
            queue_transaction_email(user_id, user_id, 'subscription_activated', {
                'plan': plan_name,
                'plan_code': plan_key,
                'credits': credits,
                'price': plan_price,
                'subscription_id': subscription_id,
                'billing_cycle': plan.get('billing_cycle', 'MONTH')
            }, delay_minutes=30)
        except Exception as email_error:
            print(f"Error queuing activation email: {str(email_error)}")

        print(f"Activated subscription {subscription_id} for user {user_id}")
        return True
    except Exception as e:
        print(f"Error activating subscription: {str(e)}")
        return False


def process_webhook(event, cors_headers):
    """Process PayPal webhook events"""
    try:
        # Get headers (case-insensitive)
        headers = {}
        for key, value in event.get('headers', {}).items():
            headers[key.upper()] = value

        body = event.get('body', '{}')
        if isinstance(body, str):
            webhook_event = json.loads(body)
        else:
            webhook_event = body

        event_type = webhook_event.get('event_type', '')
        resource = webhook_event.get('resource', {})
        event_id = webhook_event.get('id', '')

        print(f"Processing webhook: {event_type} - {event_id}")

        # Verify webhook signature (skip in development)
        if PAYPAL_MODE == 'live':
            if not verify_webhook_signature(headers, body, PAYPAL_WEBHOOK_ID):
                print("Webhook signature verification failed")
                # Continue processing anyway for now (log warning)

        # Log webhook event
        try:
            events_table = dynamodb.Table(PAYPAL_EVENTS_TABLE)
            events_table.put_item(Item={
                'event_id': event_id,
                'event_type': event_type,
                'resource_id': resource.get('id', ''),
                'payload': json.dumps(webhook_event),
                'processed': True,
                'created_at': datetime.utcnow().isoformat()
            })
        except Exception as e:
            print(f"Failed to log webhook event: {str(e)}")

        # Process based on event type
        if event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
            subscription_id = resource.get('id')
            custom_id = resource.get('custom_id', '{}')
            subscriber = resource.get('subscriber', {})
            billing_info = resource.get('billing_info', {})

            try:
                custom_data = json.loads(custom_id)
                user_id = custom_data.get('user_id')
                plan_key = custom_data.get('plan')
                credits = custom_data.get('credits', 0)

                if user_id and plan_key:
                    # Activate subscription with full PayPal details
                    activate_subscription(user_id, plan_key, subscription_id, credits)

                    # Store comprehensive subscription data in DynamoDB
                    subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
                    now = datetime.utcnow().isoformat()

                    subscriptions_table.put_item(Item={
                        'subscription_id': subscription_id,
                        'user_id': user_id,
                        'plan_id': resource.get('plan_id'),
                        'plan_code': plan_key,
                        'status': resource.get('status', 'ACTIVE'),
                        'payer_id': subscriber.get('payer_id'),
                        'payer_email': subscriber.get('email_address'),
                        'payer_name': subscriber.get('name', {}),
                        'billing_info': json.dumps(billing_info),
                        'start_time': resource.get('start_time'),
                        'next_billing_time': billing_info.get('next_billing_time'),
                        'credits_per_cycle': credits,
                        'provider': 'paypal',
                        'auto_renewal': True,
                        'created_at': now,
                        'updated_at': now
                    })
                    print(f"Stored subscription {subscription_id} for user {user_id}")
            except json.JSONDecodeError:
                print(f"Invalid custom_id: {custom_id}")

        elif event_type == 'BILLING.SUBSCRIPTION.RENEWED':
            subscription_id = resource.get('id')
            # Add monthly/yearly credits
            custom_id = resource.get('custom_id', '{}')
            try:
                custom_data = json.loads(custom_id)
                user_id = custom_data.get('user_id')
                credits = custom_data.get('credits', 0)
                if user_id and credits > 0:
                    add_credits_to_user(user_id, credits, f"Subscription Renewal: {subscription_id}", f"renewal-{subscription_id}")
            except json.JSONDecodeError:
                pass

        elif event_type in ['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.SUSPENDED']:
            subscription_id = resource.get('id')
            custom_id = resource.get('custom_id', '{}')
            try:
                custom_data = json.loads(custom_id)
                user_id = custom_data.get('user_id')
                if user_id:
                    users_table = dynamodb.Table(USERS_TABLE)
                    now = datetime.utcnow().isoformat()
                    status = 'cancelled' if 'CANCELLED' in event_type else 'expired' if 'EXPIRED' in event_type else 'suspended'

                    # Update with timestamp for grace period tracking
                    users_table.update_item(
                        Key={'user_id': user_id},
                        UpdateExpression='''
                            SET subscription_status = :status,
                                cancelled_at = :now,
                                updated_at = :now
                        ''',
                        ExpressionAttributeValues={
                            ':status': status,
                            ':now': now
                        }
                    )

                    # Queue downgrade notification email (immediate)
                    try:
                        queue_transaction_email(user_id, user_id, 'subscription_ended', {
                            'event': event_type,
                            'subscription_id': subscription_id,
                            'plan': custom_data.get('plan', 'unknown')
                        }, delay_minutes=0)
                    except Exception as email_error:
                        print(f"Error queuing email: {str(email_error)}")

            except json.JSONDecodeError:
                pass

        elif event_type == 'PAYMENT.SALE.COMPLETED':
            # One-time payment completed
            custom_id = resource.get('custom', '{}')
            try:
                custom_data = json.loads(custom_id)
                if custom_data.get('type') == 'credit_pack':
                    user_id = custom_data.get('user_id')
                    credits = custom_data.get('credits', 0)
                    pack = custom_data.get('pack', 'unknown')
                    if user_id and credits > 0:
                        add_credits_to_user(user_id, credits, f"Credit Pack: {pack}", resource.get('id'))
            except json.JSONDecodeError:
                pass

        elif event_type == 'CHECKOUT.ORDER.COMPLETED':
            # Order completed - handle credit packs
            for unit in resource.get('purchase_units', []):
                custom_id = unit.get('custom_id', '{}')
                try:
                    custom_data = json.loads(custom_id)
                    if custom_data.get('type') == 'credit_pack':
                        user_id = custom_data.get('user_id')
                        credits = custom_data.get('credits', 0)
                        pack = custom_data.get('pack', 'unknown')
                        if user_id and credits > 0:
                            add_credits_to_user(user_id, credits, f"Credit Pack: {pack}", resource.get('id'))
                except json.JSONDecodeError:
                    pass

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'success': True, 'event_id': event_id})
        }

    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def get_plans(cors_headers):
    """Get available subscription plans"""
    plans = []
    for key, plan in PAYPAL_PLANS.items():
        if '_yearly' not in key:  # Only show monthly plans in list
            yearly_key = f"{key}_yearly"
            yearly_plan = PAYPAL_PLANS.get(yearly_key, {})

            plans.append({
                'id': key,
                'name': plan['name'],
                'monthly_price': plan['price'],
                'yearly_price': yearly_plan.get('price', plan['price'] * 10),
                'monthly_credits': plan['credits'],
                'yearly_credits': yearly_plan.get('credits', plan['credits'] * 12),
                'plan_id_monthly': plan['id'],
                'plan_id_yearly': yearly_plan.get('id', plan['id']),
                'unlimited': plan['credits'] < 0
            })

    return {
        'statusCode': 200,
        'headers': cors_headers,
        'body': json.dumps({
            'success': True,
            'plans': plans,
            'credit_packs': [
                {
                    'id': key,
                    'name': pack['name'],
                    'credits': pack['credits'],
                    'price': pack['price']
                }
                for key, pack in CREDIT_PACKS.items()
            ]
        })
    }


def get_subscription_status(body, cors_headers):
    """Get PayPal subscription status"""
    try:
        subscription_id = body.get('subscriptionId')
        if not subscription_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'subscriptionId is required'})
            }

        access_token = get_paypal_access_token()
        if not access_token:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Payment system unavailable'})
            }

        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{subscription_id}",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            timeout=30
        )

        if response.status_code == 200:
            subscription = response.json()
            subscriber = subscription.get('subscriber', {})
            billing_info = subscription.get('billing_info', {})

            # Get plan details from our config
            plan_id = subscription.get('plan_id', '')
            plan_details = None
            plan_code = None
            for code, plan in PAYPAL_PLANS.items():
                if plan.get('id') == plan_id:
                    plan_details = plan
                    plan_code = code
                    break

            # Parse custom_id for additional context
            custom_data = {}
            try:
                custom_data = json.loads(subscription.get('custom_id', '{}'))
            except:
                pass

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'subscription': {
                        # Core subscription info
                        'id': subscription.get('id'),
                        'subscription_id': subscription.get('id'),
                        'status': subscription.get('status'),
                        'status_update_time': subscription.get('status_update_time'),

                        # Plan info
                        'plan_id': plan_id,
                        'plan_code': plan_code or custom_data.get('plan'),
                        'plan_name': plan_details.get('name') if plan_details else custom_data.get('plan_name'),
                        'price': plan_details.get('price') if plan_details else None,
                        'credits': plan_details.get('credits') if plan_details else custom_data.get('credits'),
                        'billing_cycle': plan_details.get('billing_cycle') if plan_details else 'MONTH',

                        # Subscriber/Customer info from PayPal
                        'subscriber': {
                            'email_address': subscriber.get('email_address'),
                            'payer_id': subscriber.get('payer_id'),  # PayPal customer ID
                            'name': subscriber.get('name', {}),
                            'shipping_address': subscriber.get('shipping_address', {})
                        },

                        # Billing details
                        'billing_info': {
                            'outstanding_balance': billing_info.get('outstanding_balance', {}),
                            'cycle_executions': billing_info.get('cycle_executions', []),
                            'last_payment': billing_info.get('last_payment', {}),
                            'next_billing_time': billing_info.get('next_billing_time'),
                            'final_payment_time': billing_info.get('final_payment_time'),
                            'failed_payments_count': billing_info.get('failed_payments_count', 0)
                        },

                        # Dates
                        'start_time': subscription.get('start_time'),
                        'create_time': subscription.get('create_time'),
                        'update_time': subscription.get('update_time'),

                        # Auto collection info
                        'auto_renewal': subscription.get('auto_renewal', True),
                        'payment_collection': 'automatic',

                        # User context from custom_id
                        'user_id': custom_data.get('user_id')
                    },
                    'metadata': {
                        'timestamp': datetime.utcnow().isoformat(),
                        'provider': 'paypal'
                    }
                })
            }
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Subscription not found'})
            }

    except Exception as e:
        print(f"Error getting subscription status: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def validate_coupon(body, cors_headers):
    """Validate a coupon code"""
    try:
        coupon_code = body.get('couponCode', '').upper().strip()
        user_id = body.get('userId')
        purchase_type = body.get('type', 'subscription')  # 'subscription', 'yearly', 'credits'

        if not coupon_code:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Coupon code is required'})
            }

        # Check if coupon exists
        coupon = DISCOUNT_COUPONS.get(coupon_code)
        if not coupon:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Invalid coupon code', 'valid': False})
            }

        # Check if coupon applies to this purchase type
        applies_to = coupon.get('applies_to', 'all')
        if applies_to != 'all':
            if purchase_type == 'credits' and applies_to != 'credits':
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'This coupon does not apply to credit purchases',
                        'valid': False
                    })
                }
            if purchase_type == 'yearly' and applies_to not in ['yearly', 'all']:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'This coupon only applies to monthly subscriptions',
                        'valid': False
                    })
                }
            if purchase_type == 'monthly' and applies_to == 'yearly':
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'This coupon only applies to yearly subscriptions',
                        'valid': False
                    })
                }

        # Check coupon usage (if user_id provided and one_time_use)
        if user_id and coupon.get('one_time_use', False):
            try:
                coupons_table = dynamodb.Table(COUPONS_TABLE)
                result = coupons_table.get_item(
                    Key={'coupon_code': coupon_code, 'user_id': user_id}
                )
                if result.get('Item'):
                    return {
                        'statusCode': 400,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'success': False,
                            'error': 'You have already used this coupon',
                            'valid': False
                        })
                    }
            except Exception as e:
                print(f"Error checking coupon usage: {str(e)}")
                # Continue anyway - don't block purchase for tracking issues

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'valid': True,
                'coupon': {
                    'code': coupon_code,
                    'name': coupon['name'],
                    'discount_percent': coupon['discount_percent'],
                    'description': coupon['description'],
                    'trial_months': coupon.get('trial_months', 0)
                }
            })
        }

    except Exception as e:
        print(f"Error validating coupon: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def apply_coupon_discount(price, coupon_code, purchase_type):
    """Apply coupon discount to a price"""
    coupon = DISCOUNT_COUPONS.get(coupon_code.upper().strip())
    if not coupon:
        return price, None

    applies_to = coupon.get('applies_to', 'all')

    # Check if coupon applies
    if applies_to != 'all':
        if purchase_type == 'credits' and applies_to != 'credits':
            return price, None
        if purchase_type == 'yearly' and applies_to not in ['yearly', 'all']:
            return price, None
        if purchase_type == 'monthly' and applies_to == 'yearly':
            return price, None

    discount_percent = coupon.get('discount_percent', 0)
    discounted_price = round(price * (1 - discount_percent / 100), 2)

    return discounted_price, coupon


def record_coupon_usage(coupon_code, user_id, order_id, discount_amount):
    """Record coupon usage in DynamoDB"""
    try:
        coupons_table = dynamodb.Table(COUPONS_TABLE)
        now = datetime.utcnow().isoformat()

        coupons_table.put_item(Item={
            'coupon_code': coupon_code.upper(),
            'user_id': user_id,
            'order_id': order_id,
            'discount_amount': Decimal(str(discount_amount)),
            'used_at': now
        })

        print(f"Recorded coupon usage: {coupon_code} by {user_id}")
        return True
    except Exception as e:
        print(f"Error recording coupon usage: {str(e)}")
        return False


def cancel_subscription(body, cors_headers):
    """Cancel a PayPal subscription"""
    try:
        subscription_id = body.get('subscriptionId')
        reason = body.get('reason', 'Customer requested cancellation')

        if not subscription_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'subscriptionId is required'})
            }

        access_token = get_paypal_access_token()
        if not access_token:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'success': False, 'error': 'Payment system unavailable'})
            }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{subscription_id}/cancel",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json={"reason": reason},
            timeout=30
        )

        if response.status_code == 204:
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Subscription cancelled successfully'
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to cancel subscription'
                })
            }

    except Exception as e:
        print(f"Error cancelling subscription: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    # Parse path and method
    path = event.get('path', '')
    http_method = event.get('httpMethod', 'POST')

    # Parse body
    body = event.get('body', '{}')
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            body = {}

    # Route requests
    if '/paypal/webhook' in path:
        return process_webhook(event, CORS_HEADERS)

    elif '/paypal/plans' in path and http_method == 'GET':
        return get_plans(CORS_HEADERS)

    elif ('/paypal/subscribe' in path or '/paypal/create-subscription' in path) and http_method == 'POST':
        return create_subscription(body, CORS_HEADERS)

    elif ('/paypal/credits' in path or '/paypal/create-order' in path) and http_method == 'POST':
        return create_credit_order(body, CORS_HEADERS)

    elif ('/paypal/capture' in path or '/paypal/capture-order' in path) and http_method == 'POST':
        return capture_order(body, CORS_HEADERS)

    elif '/paypal/status' in path and http_method in ['GET', 'POST']:
        return get_subscription_status(body, CORS_HEADERS)

    elif ('/paypal/cancel' in path or '/paypal/cancel-subscription' in path) and http_method == 'POST':
        return cancel_subscription(body, CORS_HEADERS)

    elif '/paypal/activate-subscription' in path and http_method == 'POST':
        # Activate subscription after payment approval
        user_id = body.get('userId') or body.get('email')
        subscription_id = body.get('subscriptionId')
        plan_key = body.get('plan', 'raksha')
        plan = PAYPAL_PLANS.get(plan_key, {})
        credits = plan.get('credits', 0)

        if user_id and subscription_id:
            activate_subscription(user_id, plan_key, subscription_id, credits)
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'success': True,
                    'message': 'Subscription activated',
                    'subscription_id': subscription_id,
                    'plan': plan_key,
                    'credits': credits
                })
            }
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': False, 'error': 'userId and subscriptionId required'})
        }

    elif '/paypal/sync-user' in path and http_method == 'POST':
        # Sync user subscription status from PayPal
        user_id = body.get('userId') or body.get('email')
        if user_id:
            users_table = dynamodb.Table(USERS_TABLE)
            response = users_table.get_item(Key={'user_id': user_id})
            if 'Item' in response:
                user = response['Item']
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'success': True,
                        'subscription_status': user.get('subscription_status', 'none'),
                        'subscription_plan': user.get('subscription_plan', 'free'),
                        'credits': int(user.get('credits', 0)),
                        'subscription_id': user.get('subscription_id')
                    })
                }
        return {
            'statusCode': 404,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': False, 'error': 'User not found'})
        }

    elif '/paypal/validate-coupon' in path and http_method == 'POST':
        return validate_coupon(body, CORS_HEADERS)

    elif '/paypal/coupons' in path and http_method == 'GET':
        # Return available coupons (public info only)
        public_coupons = []
        for code, coupon in DISCOUNT_COUPONS.items():
            public_coupons.append({
                'code': code,
                'name': coupon['name'],
                'discount_percent': coupon['discount_percent'],
                'description': coupon['description'],
                'applies_to': coupon['applies_to']
            })
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'coupons': public_coupons})
        }

    elif '/paypal/credit-packs' in path and http_method == 'GET':
        # Return available credit packs
        packs = []
        for key, pack in CREDIT_PACKS.items():
            if not key.startswith('credits-'):
                continue  # Skip legacy keys
            packs.append({
                'id': key,
                'name': pack['name'],
                'credits': pack['credits'],
                'price': pack['price']
            })
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'credit_packs': packs})
        }

    else:
        return {
            'statusCode': 404,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Endpoint not found', 'path': path})
        }
