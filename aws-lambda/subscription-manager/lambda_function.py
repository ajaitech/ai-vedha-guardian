"""
AiVedha Guard - Subscription Manager Lambda
Manages subscriptions, credits, and user data via DynamoDB and PayPal
"""

import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError
import os
import urllib.request
import urllib.parse
import urllib.error
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
CREDITS_TABLE = os.environ.get('CREDITS_TABLE', 'aivedha-guardian-credits')
AUDIT_REPORTS_TABLE = os.environ.get('AUDIT_REPORTS_TABLE', 'aivedha-guardian-audit-reports')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@aivedha.ai')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://aivedha.ai')

def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'

PAYPAL_HANDLER_URL = os.environ.get('PAYPAL_HANDLER_URL', f'{get_api_base_url()}/paypal')

# Initialize AWS clients
# CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
# This allows India region Lambda to access US region data
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')

# PayPal Plan Configuration - Credits must match frontend src/constants/plans.ts
# CORRECT PRICING: Aarambh=FREE, Raksha=$10, Suraksha=$45, Vajra=$150, Chakra=$300
# Monthly credits: aarambh=3(free), raksha=10, suraksha=50, vajra=200, chakra=500
# Yearly credits: monthly * 12 (with 10% price discount)
PAYPAL_PLANS = {
    # Aarambh is FREE - no PayPal plan, handled separately
    "raksha": {"id": "P-9DE80034NW8103644NFDMXMI", "name": "Raksha (Protection)", "price": 10.00, "credits": 10, "billing_cycle": "MONTH"},
    "suraksha": {"id": "P-9B208585UV344253JNFDMXNA", "name": "Suraksha (Professional)", "price": 45.00, "credits": 50, "billing_cycle": "MONTH"},
    "vajra": {"id": "P-9FM13449DU368353XNFDMXNY", "name": "Vajra (Business)", "price": 150.00, "credits": 200, "billing_cycle": "MONTH"},
    "chakra": {"id": "P-97P76054M44105114NFDMXOI", "name": "Chakra (Enterprise)", "price": 300.00, "credits": 500, "billing_cycle": "MONTH"},
    "raksha_yearly": {"id": "P-91V72263GL6122913NFDMXMY", "name": "Raksha Yearly", "price": 108.00, "credits": 120, "billing_cycle": "YEAR"},
    "suraksha_yearly": {"id": "P-3NA45044HW267203SNFDMXNI", "name": "Suraksha Yearly", "price": 486.00, "credits": 600, "billing_cycle": "YEAR"},
    "vajra_yearly": {"id": "P-33C53817PE4737058NFDMXOA", "name": "Vajra Yearly", "price": 1620.00, "credits": 2400, "billing_cycle": "YEAR"},
    "chakra_yearly": {"id": "P-99U671102N720504TNFDMXOQ", "name": "Chakra Yearly", "price": 3240.00, "credits": 6000, "billing_cycle": "YEAR"},
}

# Special promotional/test plans with coupon codes
# AJNAIDU: 12 months at $0.01/month (essentially free) for admin testing
# Plan created in PayPal: P-3MN405483H558342VNFE6TMI
COUPON_PLANS = {
    "AJNAIDU": {
        "plan_id": "P-3MN405483H558342VNFE6TMI",
        "name": "AJNAIDU Test Plan - 100% Off",
        "credits": 10,  # Same as Raksha
        "description": "Admin test coupon - 100% off for 12 months ($0.01/month trial)"
    }
}

# Feature Add-ons
# NOTE: API Access (id: P-10P90334X6470204UNFDMXPQ) is FREE and auto-assigned for all paid users
FEATURE_ADDONS = {
    "scheduler": {"id": "P-32U60387JT1483533NFDMXPA", "name": "Scheduled Audits", "price": 25.00},
    "whitelabel": {"id": "P-7PJ67808RA6591613NFDMXPI", "name": "White-Label Reports", "price": 60.00},
    "api-access": {"id": "P-10P90334X6470204UNFDMXPQ", "name": "API Access", "price": 0.00, "auto_assign_paid": True},
}

# Credit Packs
CREDIT_PACKS = {
    "credits-5": {"credits": 5, "price": 5.00, "name": "5 Credits Pack"},
    "credits-10": {"credits": 10, "price": 9.00, "name": "10 Credits Pack"},
    "credits-25": {"credits": 25, "price": 20.00, "name": "25 Credits Pack"},
    "credits-50": {"credits": 50, "price": 35.00, "name": "50 Credits Pack"},
    "credits-100": {"credits": 100, "price": 60.00, "name": "100 Credits Pack"},
}

# CORS headers - Restrict to production domain
CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://aivedha.ai',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def json_response(status_code, body, headers=None):
    """Create a JSON response"""
    response_headers = CORS_HEADERS.copy()
    if headers:
        response_headers.update(headers)
    return {
        'statusCode': status_code,
        'headers': response_headers,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def disable_user_api_keys(user_id: str, reason: str = 'plan_downgrade') -> int:
    """
    Disable all API keys for a user when subscription is cancelled/downgraded.
    Directly updates the API keys table instead of calling another Lambda.
    """
    try:
        API_KEYS_TABLE = os.environ.get('API_KEYS_TABLE', 'aivedha-guardian-api-keys')
        table = dynamodb.Table(API_KEYS_TABLE)

        # Query for active API keys
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        disabled_count = 0
        now = datetime.utcnow().isoformat()

        for item in response.get('Items', []):
            table.update_item(
                Key={'api_key_id': item['api_key_id']},
                UpdateExpression='SET #status = :status, disabled_reason = :reason, disabled_at = :now',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'disabled',
                    ':reason': reason,
                    ':now': now
                }
            )
            disabled_count += 1

        print(f"Disabled {disabled_count} API keys for user {user_id} (reason: {reason})")
        return disabled_count

    except Exception as e:
        print(f"Error disabling API keys for user {user_id}: {e}")
        return 0


# ============================================================
# PLAN AND ADDON FUNCTIONS
# ============================================================

def get_plans(cors_headers):
    """Get all available subscription plans"""
    plans = []
    for key, plan in PAYPAL_PLANS.items():
        if '_yearly' not in key:
            yearly_key = f"{key}_yearly"
            yearly_plan = PAYPAL_PLANS.get(yearly_key, {})
            plans.append({
                'id': key,
                'plan_code': key,
                'name': plan['name'],
                'monthly_price': plan['price'],
                'yearly_price': yearly_plan.get('price', plan['price'] * 10),
                'monthly_credits': plan['credits'],
                'yearly_credits': yearly_plan.get('credits', plan['credits'] * 12),
                'paypal_plan_id': plan['id'],
                'paypal_yearly_plan_id': yearly_plan.get('id', plan['id']),
                'unlimited': plan['credits'] < 0,
                'currency': 'USD'
            })

    return json_response(200, {
        'success': True,
        'plans': plans,
        'addons': [
            {'id': k, 'name': v['name'], 'price': v['price'], 'paypal_plan_id': v['id']}
            for k, v in FEATURE_ADDONS.items()
        ],
        'credit_packs': [
            {'id': k, 'name': v['name'], 'credits': v['credits'], 'price': v['price']}
            for k, v in CREDIT_PACKS.items()
        ]
    })


def get_plan_by_code(plan_code):
    """Get plan details by code"""
    plan_code_lower = plan_code.lower().replace('-', '_')
    return PAYPAL_PLANS.get(plan_code_lower)


def get_addon_by_code(addon_code):
    """Get addon details by code"""
    addon_code_lower = addon_code.lower().replace('-', '_')
    return FEATURE_ADDONS.get(addon_code_lower)


# ============================================================
# USER AND SUBSCRIPTION FUNCTIONS
# ============================================================

def get_user_by_email(email):
    """Get user from DynamoDB by email"""
    try:
        table = dynamodb.Table(USERS_TABLE)

        # Try direct lookup first (if email is the primary key)
        response = table.get_item(Key={'user_id': email})
        if 'Item' in response:
            return response['Item']

        # Try GSI lookup
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )

        if response.get('Items'):
            return response['Items'][0]

        return None
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        return None


def create_user(email, full_name='', provider='email'):
    """Create a new user in DynamoDB"""
    try:
        table = dynamodb.Table(USERS_TABLE)
        now = datetime.utcnow().isoformat()

        user_item = {
            'user_id': email,
            'email': email,
            'full_name': full_name or email.split('@')[0],
            'credits': Decimal('0'),
            'subscription_status': 'none',
            'subscription_plan': 'free',
            'provider': provider,
            'is_overseas': True,  # Default to USD
            'currency_preference': 'USD',
            'created_at': now,
            'updated_at': now
        }

        table.put_item(Item=user_item)
        return user_item
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return None


def update_user_subscription(user_id, plan_code, subscription_id, status='active', credits=0):
    """Update user subscription in DynamoDB.
    Auto-assigns FREE API Access addon for all paid plans.
    """
    try:
        table = dynamodb.Table(USERS_TABLE)
        now = datetime.utcnow().isoformat()

        update_expression = '''
            SET subscription_status = :status,
                subscription_plan = :plan,
                subscription_id = :sub_id,
                subscription_provider = :provider,
                subscription_activated_at = :activated_at,
                updated_at = :now
        '''

        expression_values = {
            ':status': status,
            ':plan': plan_code,
            ':sub_id': subscription_id,
            ':provider': 'paypal',
            ':activated_at': now,
            ':now': now
        }

        # Add credits if provided
        if credits > 0:
            update_expression += ', credits = if_not_exists(credits, :zero) + :credits'
            expression_values[':credits'] = Decimal(str(credits))
            expression_values[':zero'] = Decimal('0')

        # Auto-assign FREE API Access addon for paid plans
        # This gives all paid subscribers API access without additional cost
        if status == 'active' and plan_code not in ['free', 'aarambh_free', None, '']:
            api_access_addon = FEATURE_ADDONS.get('api-access', {})
            if api_access_addon:
                update_expression += ', active_addons = :addons'
                expression_values[':addons'] = [{
                    'addon_id': 'api-access',
                    'plan_id': api_access_addon.get('id', 'P-10P90334X6470204UNFDMXPQ'),
                    'name': api_access_addon.get('name', 'API Access'),
                    'price': 0.00,
                    'activated_at': now,
                    'auto_assigned': True
                }]
                print(f"Auto-assigned FREE API Access addon to user {user_id} with plan {plan_code}")

        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )

        return True
    except Exception as e:
        print(f"Error updating user subscription: {str(e)}")
        return False


def add_credits_to_user(user_id, credits, description='', transaction_id=''):
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
        if not transaction_id:
            transaction_id = f"credit-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        credits_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'amount': Decimal(str(credits)),
            'type': 'credit',
            'description': description or 'Credit addition',
            'source': 'system',
            'created_at': now
        })

        print(f"Added {credits} credits to user {user_id}")
        return True
    except Exception as e:
        print(f"Error adding credits: {str(e)}")
        return False


def deduct_credits_from_user(user_id, credits, description='', force=False):
    """
    Deduct credits from a user's account.

    Args:
        user_id: User email/ID
        credits: Number of credits to deduct
        description: Description for transaction log
        force: If True, allows deduction even if it would result in negative balance
               (used when audit already started - NEVER stop a running audit)
    """
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        credits_table = dynamodb.Table(CREDITS_TABLE)
        now = datetime.utcnow().isoformat()

        # Check current credits
        user = get_user_by_email(user_id)
        if not user:
            return False, "User not found"

        current_credits = int(user.get('credits', 0))

        # Check for unlimited credits (enterprise plan)
        if current_credits == -1:
            return True, "Unlimited credits"

        # Only check for sufficient credits if NOT forced
        # When force=True, we allow negative balance (audit already started)
        if not force and current_credits < credits:
            return False, "Insufficient credits"

        # Deduct credits (may go negative if forced)
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = credits - :credits, updated_at = :now',
            ExpressionAttributeValues={
                ':credits': Decimal(str(credits)),
                ':now': now
            }
        )

        # Log credit transaction
        transaction_id = f"debit-{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        credits_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'amount': Decimal(str(-credits)),
            'type': 'debit',
            'description': description or 'Credit deduction',
            'source': 'system',
            'forced': force,
            'balance_before': current_credits,
            'balance_after': current_credits - credits,
            'created_at': now
        })

        return True, "Credits deducted"
    except Exception as e:
        print(f"Error deducting credits: {str(e)}")
        return False, str(e)


# ============================================================
# SUBSCRIPTION STATUS
# ============================================================

def get_subscription_status(body, cors_headers):
    """Get user's subscription status from DynamoDB"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)

        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        # Get plan details
        plan_code = user.get('subscription_plan', 'free')
        plan = get_plan_by_code(plan_code)

        credits = int(user.get('credits', 0))
        is_overseas = user.get('is_overseas', True)
        currency = 'USD' if is_overseas else user.get('currency_preference', 'USD')

        return json_response(200, {
            'success': True,
            'subscription': {
                'status': user.get('subscription_status', 'none'),
                'plan': plan_code,
                'plan_name': plan['name'] if plan else 'Free',
                'subscription_id': user.get('subscription_id'),
                'provider': user.get('subscription_provider', 'none'),
                'activated_at': user.get('subscription_activated_at')
            },
            'credits': credits,
            'unlimited_credits': credits == -1,
            'is_overseas': is_overseas,
            'currency_preference': currency,
            'user': {
                'email': user.get('email'),
                'full_name': user.get('full_name'),
                'created_at': user.get('created_at')
            }
        })
    except Exception as e:
        print(f"Error getting subscription status: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# CHECKOUT FUNCTIONS - Redirect to PayPal
# ============================================================

def create_checkout_session(body, cors_headers):
    """Create a PayPal checkout session for subscription - calls PayPal API"""
    try:
        user_id = body.get('userId') or body.get('email')
        plan_code = body.get('planCode', 'raksha').lower()  # Default to raksha (aarambh is free)
        billing_cycle = body.get('billingCycle', 'monthly')
        full_name = body.get('fullName', '')
        phone = body.get('phone', '')
        coupon_code = body.get('couponCode', '').upper().strip()

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        # Check for promotional/test coupon codes
        if coupon_code and coupon_code in COUPON_PLANS:
            coupon_plan = COUPON_PLANS[coupon_code]
            print(f"Applying coupon {coupon_code} for user {user_id}")

            # Get or create user
            user = get_user_by_email(user_id)
            if not user:
                user = create_user(user_id)

            if phone:
                save_user_phone(user_id, phone)

            # Create subscription with the coupon plan
            paypal_result = create_paypal_subscription(
                user_id=user_id,
                plan_id=coupon_plan['plan_id'],
                plan_key=f"coupon_{coupon_code.lower()}",
                credits=coupon_plan['credits'],
                full_name=full_name,
                phone=phone
            )

            if not paypal_result or not paypal_result.get('approval_url'):
                return json_response(500, {'success': False, 'error': 'Failed to create PayPal subscription'})

            return json_response(200, {
                'success': True,
                'hostedPageUrl': paypal_result['approval_url'],
                'hostedPageId': paypal_result.get('subscription_id', ''),
                'checkout_url': paypal_result['approval_url'],
                'subscription_id': paypal_result.get('subscription_id'),
                'paypal_plan_id': coupon_plan['plan_id'],
                'plan': coupon_code.lower(),
                'plan_name': coupon_plan['name'],
                'price': 0,
                'original_price': 10.00,
                'credits': coupon_plan['credits'],
                'billing_cycle': 'monthly',
                'coupon_applied': coupon_code,
                'message': f'Coupon {coupon_code} applied - Redirect to PayPal'
            })

        # Handle free Aarambh plan - no PayPal needed
        if plan_code == 'aarambh' or plan_code.startswith('aarambh_'):
            # Activate free plan directly
            activate_free_plan(user_id, full_name, phone)
            return json_response(200, {
                'success': True,
                'message': 'Free plan activated',
                'plan': 'aarambh',
                'credits': 3,
                'redirect_url': f'{APP_BASE_URL}/dashboard?plan=activated'
            })

        # Get or create user
        user = get_user_by_email(user_id)
        if not user:
            user = create_user(user_id)

        # Save phone to user profile if provided
        if phone:
            save_user_phone(user_id, phone)

        # Build PayPal plan key
        if billing_cycle == 'yearly':
            plan_key = f"{plan_code.replace('_yearly', '').replace('_monthly', '')}_yearly"
        else:
            plan_key = plan_code.replace('_yearly', '').replace('_monthly', '')

        plan = PAYPAL_PLANS.get(plan_key)
        if not plan:
            return json_response(400, {'success': False, 'error': f'Invalid plan: {plan_key}'})

        # Call PayPal API to create subscription with optimal checkout
        paypal_result = create_paypal_subscription(
            user_id=user_id,
            plan_id=plan['id'],
            plan_key=plan_key,
            credits=plan['credits'],
            full_name=full_name,
            phone=phone
        )

        if not paypal_result or not paypal_result.get('approval_url'):
            return json_response(500, {'success': False, 'error': 'Failed to create PayPal subscription'})

        return json_response(200, {
            'success': True,
            'hostedPageUrl': paypal_result['approval_url'],  # Frontend expects this key
            'hostedPageId': paypal_result.get('subscription_id', ''),
            'checkout_url': paypal_result['approval_url'],  # Backward compatibility
            'subscription_id': paypal_result.get('subscription_id'),
            'paypal_plan_id': plan['id'],
            'plan': plan_key,
            'plan_name': plan['name'],
            'price': plan['price'],
            'credits': plan['credits'],
            'billing_cycle': billing_cycle,
            'message': 'Redirect to PayPal to complete subscription'
        })
    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def save_user_phone(user_id, phone):
    """Save phone number to user profile"""
    try:
        table = dynamodb.Table(USERS_TABLE)
        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET phone = :phone, updated_at = :now',
            ExpressionAttributeValues={
                ':phone': phone,
                ':now': datetime.utcnow().isoformat()
            }
        )
        print(f"Saved phone for user {user_id}")
    except Exception as e:
        print(f"Error saving phone: {e}")


def activate_free_plan(user_id, full_name='', phone=''):
    """
    Activate free Aarambh plan for user.
    SECURITY: Only grants 3 free credits ONCE per user (first-time only).
    Uses aarambh_credits_claimed flag to prevent credit farming abuse.
    """
    try:
        table = dynamodb.Table(USERS_TABLE)
        now = datetime.utcnow().isoformat()

        # SECURITY: First check if user already claimed free credits
        try:
            existing = table.get_item(Key={'user_id': user_id})
            if 'Item' in existing:
                user = existing['Item']
                # Check if free credits already claimed
                if user.get('aarambh_credits_claimed', False):
                    print(f"SECURITY: User {user_id} already claimed free credits. Skipping.")
                    # Still set plan status but don't add credits
                    table.update_item(
                        Key={'user_id': user_id},
                        UpdateExpression='SET subscription_status = :status, subscription_plan = :plan, updated_at = :now',
                        ExpressionAttributeValues={
                            ':status': 'active',
                            ':plan': 'aarambh',
                            ':now': now
                        }
                    )
                    return {'success': True, 'credits_added': 0, 'reason': 'already_claimed'}
        except Exception as e:
            print(f"Warning: Could not check existing user: {e}")

        # First-time free credits: Set flag AND add credits
        update_expr = '''
            SET subscription_status = :status,
                subscription_plan = :plan,
                #p = :plan_name,
                credits = if_not_exists(credits, :zero) + :credits,
                aarambh_credits_claimed = :claimed,
                aarambh_claimed_at = :now,
                updated_at = :now
        '''
        expr_values = {
            ':status': 'active',
            ':plan': 'aarambh',
            ':plan_name': 'Aarambh (Free)',
            ':credits': Decimal('3'),
            ':zero': Decimal('0'),
            ':claimed': True,
            ':now': now
        }

        if full_name:
            update_expr += ', full_name = :fname'
            expr_values[':fname'] = full_name
        if phone:
            update_expr += ', phone = :phone'
            expr_values[':phone'] = phone

        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#p': 'plan'},
            ExpressionAttributeValues=expr_values
        )
        print(f"Activated free plan for user {user_id} with 3 credits (first-time)")
        return {'success': True, 'credits_added': 3}
    except Exception as e:
        print(f"Error activating free plan: {e}")
        return {'success': False, 'error': str(e)}


def create_paypal_subscription(user_id, plan_id, plan_key, credits, full_name='', phone=''):
    """
    Call PayPal API to create subscription with optimal checkout experience.

    PayPal Best Practices Applied:
    - landing_page: NO_PREFERENCE - Let PayPal choose best UX (card form for guests, login for returning users)
    - user_action: SUBSCRIBE_NOW - Shows "Subscribe Now" button for immediate conversion
    - shipping_preference: NO_SHIPPING - Digital goods, no shipping needed
    - Subscriber details pre-filled for faster checkout
    - Custom ID for webhook processing
    """
    import ssl

    # Get PayPal credentials from environment
    paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
    paypal_client_secret = os.environ.get('PAYPAL_CLIENT_SECRET')
    paypal_mode = os.environ.get('PAYPAL_MODE', 'live')

    if not paypal_client_id or not paypal_client_secret:
        print("PayPal credentials not configured, using redirect URL fallback")
        return {
            'approval_url': f"https://www.paypal.com/webapps/billing/plans/subscribe?plan_id={plan_id}",
            'subscription_id': None
        }

    paypal_api_base = "https://api-m.paypal.com" if paypal_mode == 'live' else "https://api-m.sandbox.paypal.com"

    try:
        # Get OAuth token
        token_url = f"{paypal_api_base}/v1/oauth2/token"
        auth_string = f"{paypal_client_id}:{paypal_client_secret}"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = __import__('base64').b64encode(auth_bytes).decode('ascii')

        token_request = urllib.request.Request(
            token_url,
            data=b"grant_type=client_credentials",
            headers={
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )

        ssl_context = ssl.create_default_context()
        with urllib.request.urlopen(token_request, timeout=30, context=ssl_context) as response:
            token_data = json.loads(response.read().decode())
            access_token = token_data.get('access_token')

        if not access_token:
            print("Failed to get PayPal access token")
            return None

        # Create subscription with optimal PayPal checkout experience
        subscription_url = f"{paypal_api_base}/v1/billing/subscriptions"

        # Parse subscriber name
        name_parts = full_name.strip().split(' ', 1) if full_name else ['', '']
        given_name = name_parts[0] if name_parts else ''
        surname = name_parts[1] if len(name_parts) > 1 else ''

        # Get plan details for description
        plan_info = PAYPAL_PLANS.get(plan_key, {})
        plan_name = plan_info.get('name', plan_key.title())

        # Build subscriber object with pre-filled details
        subscriber = {
            "email_address": user_id if '@' in user_id else f"{user_id}@aivedha.ai"
        }

        # Add name if available (improves checkout UX)
        if given_name:
            subscriber["name"] = {
                "given_name": given_name,
                "surname": surname or given_name  # Use given_name if no surname
            }

        # Add phone if available (pre-fills phone field)
        if phone:
            # Format phone for PayPal (remove leading zeros, ensure proper format)
            clean_phone = phone.replace(' ', '').replace('-', '')
            if clean_phone.startswith('+'):
                # Extract country code and number
                subscriber["phone"] = {
                    "phone_type": "MOBILE",
                    "phone_number": {
                        "national_number": clean_phone[1:].lstrip('0')  # Remove + and leading zeros
                    }
                }

        subscription_payload = {
            "plan_id": plan_id,
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

                # Return URLs with plan info
                "return_url": f"{APP_BASE_URL}/payment-success?plan={plan_key}&userId={urllib.parse.quote(user_id)}&credits={credits}",
                "cancel_url": f"{APP_BASE_URL}/payment-failed?reason=cancelled&plan={plan_key}"
            },
            # Custom data for webhook processing
            "custom_id": json.dumps({
                "user_id": user_id,
                "plan": plan_key,
                "credits": credits,
                "source": "aivedha-guard",
                "plan_name": plan_name
            })
        }

        # Make unique request ID to prevent duplicates
        request_id = f"aivedha-sub-{user_id.replace('@', '-at-')[:20]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}"

        subscription_request = urllib.request.Request(
            subscription_url,
            data=json.dumps(subscription_payload).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
                'PayPal-Request-Id': request_id,
                'Prefer': 'return=representation'  # Return full subscription details
            },
            method='POST'
        )

        with urllib.request.urlopen(subscription_request, timeout=30, context=ssl_context) as response:
            subscription_data = json.loads(response.read().decode())

            # Find approval URL
            approval_url = None
            for link in subscription_data.get('links', []):
                if link.get('rel') == 'approve':
                    approval_url = link.get('href')
                    break

            print(f"Created PayPal subscription: {subscription_data.get('id')} for {user_id}")

            return {
                'subscription_id': subscription_data.get('id'),
                'approval_url': approval_url,
                'status': subscription_data.get('status')
            }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        print(f"PayPal API HTTP error: {e.code} - {error_body}")
        # Fallback: Return static URL
        return {
            'approval_url': f"https://www.paypal.com/webapps/billing/plans/subscribe?plan_id={plan_id}",
            'subscription_id': None,
            'error': f"HTTP {e.code}"
        }
    except Exception as e:
        print(f"Error calling PayPal API: {e}")
        # Fallback: Return static URL
        return {
            'approval_url': f"https://www.paypal.com/webapps/billing/plans/subscribe?plan_id={plan_id}",
            'subscription_id': None,
            'error': str(e)
        }


def create_credits_checkout(body, cors_headers):
    """Create a checkout session for credit pack purchase"""
    try:
        user_id = body.get('userId') or body.get('email')
        pack_id = body.get('packId', 'credits-10').lower()

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        pack = CREDIT_PACKS.get(pack_id)
        if not pack:
            return json_response(400, {'success': False, 'error': f'Invalid pack: {pack_id}'})

        # Return redirect to PayPal credits endpoint
        return json_response(200, {
            'success': True,
            'redirect_url': f"{APP_BASE_URL}/purchase?type=credits&pack={pack_id}",
            'pack': pack_id,
            'pack_name': pack['name'],
            'credits': pack['credits'],
            'price': pack['price'],
            'message': 'Use PayPal API to complete credit purchase'
        })
    except Exception as e:
        print(f"Error creating credits checkout: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# CANCEL SUBSCRIPTION
# ============================================================

def cancel_subscription(body, cors_headers):
    """Cancel a user's subscription"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        subscription_id = user.get('subscription_id')

        # Update user status in DynamoDB
        table = dynamodb.Table(USERS_TABLE)
        now = datetime.utcnow().isoformat()

        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET subscription_status = :status, cancelled_at = :cancelled, updated_at = :now',
            ExpressionAttributeValues={
                ':status': 'cancelled',
                ':cancelled': now,
                ':now': now
            }
        )

        # Disable all API keys for this user (plan downgrade)
        api_keys_disabled = disable_user_api_keys(user_id, 'subscription_cancelled')

        # Note: PayPal cancellation should be done via PayPal handler
        return json_response(200, {
            'success': True,
            'message': 'Subscription cancelled in database',
            'subscription_id': subscription_id,
            'api_keys_disabled': api_keys_disabled,
            'note': 'PayPal subscription cancellation should be done via PayPal API'
        })
    except Exception as e:
        print(f"Error cancelling subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# WEBHOOK HANDLER
# ============================================================

def handle_webhook(event, cors_headers):
    """Handle PayPal webhook events (forwarded from paypal-handler)"""
    try:
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)

        event_type = body.get('event_type', '')
        resource = body.get('resource', {})

        print(f"Processing webhook: {event_type}")

        # Handle subscription activation
        if event_type == 'subscription_activated':
            userId = body.get('userId')
            planCode = body.get('plan')
            subscriptionId = body.get('subscriptionId')
            credits = body.get('credits', 0)

            if userId:
                update_user_subscription(userId, planCode, subscriptionId, 'active', credits)

        # Handle subscription cancellation
        elif event_type == 'subscription_cancelled':
            userId = body.get('userId')
            if userId:
                table = dynamodb.Table(USERS_TABLE)
                table.update_item(
                    Key={'user_id': userId},
                    UpdateExpression='SET subscription_status = :status, updated_at = :now',
                    ExpressionAttributeValues={
                        ':status': 'cancelled',
                        ':now': datetime.utcnow().isoformat()
                    }
                )
                # Disable all API keys for this user
                disable_user_api_keys(userId, 'subscription_cancelled_webhook')

        # Handle credit purchase
        elif event_type == 'credits_purchased':
            userId = body.get('userId')
            credits = body.get('credits', 0)
            transactionId = body.get('transactionId')

            if userId and credits > 0:
                add_credits_to_user(userId, credits, 'Credit Pack Purchase', transactionId)

        return json_response(200, {'success': True, 'event_type': event_type})
    except Exception as e:
        print(f"Error handling webhook: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# CREDIT MANAGEMENT
# ============================================================

def get_user_credits(body, cors_headers):
    """Get user's credit balance"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)

        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        credits = int(user.get('credits', 0))

        return json_response(200, {
            'success': True,
            'credits': credits,
            'unlimited': credits == -1,
            'subscription_plan': user.get('subscription_plan', 'free'),
            'subscription_status': user.get('subscription_status', 'none')
        })
    except Exception as e:
        print(f"Error getting credits: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def use_credit(body, cors_headers):
    """Use a credit for an audit"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        success, message = deduct_credits_from_user(user_id, 1, 'Security Audit')

        if success:
            return json_response(200, {'success': True, 'message': message})
        else:
            return json_response(400, {'success': False, 'error': message})
    except Exception as e:
        print(f"Error using credit: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def reset_free_credits(body, cors_headers):
    """
    Hard reset of free credits for a free user.
    Only works for users on free plan - resets to 3 credits.
    """
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        # Get current user data
        table = dynamodb.Table(USERS_TABLE)
        response = table.get_item(Key={'user_id': user_id})

        if 'Item' not in response:
            # Try email lookup
            users_table = dynamodb.Table(USERS_TABLE)
            email_response = users_table.query(
                IndexName='email-index',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': user_id}
            )
            if not email_response.get('Items'):
                return json_response(404, {'success': False, 'error': 'User not found'})
            user = email_response['Items'][0]
            user_id = user.get('user_id')
        else:
            user = response['Item']

        current_plan = user.get('subscription_plan', 'free')
        subscription_status = user.get('subscription_status', 'free')
        current_credits = int(user.get('credits', 0))

        # Only allow reset for free users
        if current_plan not in ['free', 'aarambh_free', None] or subscription_status == 'active':
            return json_response(403, {
                'success': False,
                'error': 'Credit reset only available for free plan users',
                'current_plan': current_plan,
                'credits': current_credits
            })

        now = datetime.utcnow().isoformat()
        FREE_CREDITS = 3

        # Update user with reset credits
        table.update_item(
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
        credits_table = dynamodb.Table(CREDITS_TABLE)
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
        return json_response(200, {
            'success': True,
            'message': f'Credits reset to {FREE_CREDITS}',
            'credits': FREE_CREDITS,
            'previous_credits': current_credits
        })
    except Exception as e:
        print(f"Error resetting credits: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# INVOICES - From DynamoDB
# ============================================================

def get_user_invoices(body, cors_headers):
    """Get user's payment history from DynamoDB"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        # Query credits table for payment history
        table = dynamodb.Table(CREDITS_TABLE)
        response = table.query(
            IndexName='user_id-index',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user_id},
            ScanIndexForward=False,
            Limit=50
        )

        transactions = response.get('Items', [])

        return json_response(200, {
            'success': True,
            'transactions': transactions,
            'count': len(transactions)
        })
    except Exception as e:
        print(f"Error getting invoices: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# ACCOUNT DELETION
# ============================================================

def check_deletion_eligibility(body, cors_headers):
    """
    Check if user can delete account - returns subscription status for warning.
    Called before actual deletion to show paid plan warning if needed.
    """
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        actual_user_id = user.get('user_id', user_id)

        # Check for active paid subscription
        subscription_status = user.get('subscription_status', 'free')
        subscription_plan = user.get('subscription_plan', 'free')
        renewal_date = user.get('renewal_date') or user.get('subscription_end_date')
        credits = int(user.get('credits', 0))

        has_active_paid = subscription_status == 'active' and subscription_plan not in ['free', 'aarambh_free', None, '']

        return json_response(200, {
            'success': True,
            'canDelete': True,
            'hasActivePaidPlan': has_active_paid,
            'subscriptionPlan': subscription_plan,
            'subscriptionStatus': subscription_status,
            'planEndDate': renewal_date,
            'credits': credits,
            'requiresConfirmation': has_active_paid,
            'warningMessage': f'You have an active {subscription_plan} plan until {renewal_date}. Deletion will forfeit remaining subscription time and {credits} credits.' if has_active_paid else None
        })
    except Exception as e:
        print(f"Error checking deletion eligibility: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def delete_account(body, cors_headers):
    """
    Soft-delete user account.
    - Sets status to 'inactive' (not visible in UI)
    - Stores deletion reason
    - Sets 90-day retention date for legal compliance
    - Deactivates any active subscriptions
    - Same email can register as new user after deletion
    """
    try:
        user_id = body.get('userId') or body.get('email')
        deletion_reason = body.get('reason', 'User requested deletion')
        confirmed_paid_deletion = body.get('confirmedPaidDeletion', False)

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        actual_user_id = user.get('user_id', user_id)

        # Check for active paid subscription - require explicit confirmation
        subscription_status = user.get('subscription_status', 'free')
        subscription_plan = user.get('subscription_plan', 'free')
        renewal_date = user.get('renewal_date') or user.get('subscription_end_date')

        has_active_paid = subscription_status == 'active' and subscription_plan not in ['free', 'aarambh_free', None, '']

        if has_active_paid and not confirmed_paid_deletion:
            return json_response(409, {
                'success': False,
                'error': 'Paid plan confirmation required',
                'requiresConfirmation': True,
                'hasActivePaidPlan': True,
                'subscriptionPlan': subscription_plan,
                'planEndDate': renewal_date,
                'warningMessage': f'You have an active {subscription_plan} plan until {renewal_date}. Please confirm you want to delete your account and forfeit the remaining subscription time.'
            })

        # Proceed with soft delete
        table = dynamodb.Table(USERS_TABLE)
        now = datetime.utcnow().isoformat()
        retention_expiry = (datetime.utcnow() + timedelta(days=90)).isoformat()

        # Soft delete - mark as inactive
        table.update_item(
            Key={'user_id': actual_user_id},
            UpdateExpression='''
                SET #status = :inactive,
                    account_status = :deleted,
                    deletion_requested_at = :now,
                    deletion_reason = :reason,
                    retention_expiry_date = :retention,
                    subscription_status = :sub_inactive,
                    previous_subscription_plan = subscription_plan,
                    subscription_plan = :free,
                    credits = :zero,
                    updated_at = :now
            ''',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':inactive': 'inactive',
                ':deleted': 'deleted',
                ':now': now,
                ':reason': deletion_reason,
                ':retention': retention_expiry,
                ':sub_inactive': 'inactive',
                ':free': 'free',
                ':zero': Decimal('0')
            }
        )

        # Deactivate any active subscriptions in subscriptions table
        subscription_id = user.get('subscription_id')
        if subscription_id:
            try:
                subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
                subscriptions_table.update_item(
                    Key={'subscription_id': subscription_id},
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
                        ':reason': 'account_deleted'
                    }
                )
            except Exception as sub_error:
                print(f"Could not deactivate subscription {subscription_id}: {sub_error}")

        # Log the deletion for audit
        try:
            credits_table = dynamodb.Table(CREDITS_TABLE)
            credits_table.put_item(Item={
                'transaction_id': f"del-{actual_user_id}-{now.replace(':', '-')}",
                'user_id': actual_user_id,
                'type': 'account_deletion',
                'reason': deletion_reason,
                'previous_credits': int(user.get('credits', 0)),
                'previous_plan': subscription_plan,
                'timestamp': now,
                'retention_expiry': retention_expiry
            })
        except Exception as log_error:
            print(f"Could not log deletion: {log_error}")

        return json_response(200, {
            'success': True,
            'message': 'Account permanently deleted',
            'retentionNotice': 'Your data will be retained for 90 days for legal compliance, then permanently purged.',
            'retentionExpiryDate': retention_expiry
        })
    except Exception as e:
        print(f"Error deleting account: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# USER PROFILE FUNCTIONS
# ============================================================

def get_user_profile(body, cors_headers):
    """Get user profile data"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        # Return profile data (exclude sensitive fields)
        profile = {
            'user_id': user.get('user_id'),
            'email': user.get('email'),
            'full_name': user.get('full_name', ''),
            'phone': user.get('phone', ''),
            'company': user.get('company', ''),
            'role': user.get('role', ''),
            'website': user.get('website', ''),
            'timezone': user.get('timezone', ''),
            'avatar_url': user.get('avatar_url', ''),
            'is_overseas': user.get('is_overseas', True),
            'currency_preference': user.get('currency_preference', 'USD'),
            'notification_preferences': user.get('notification_preferences', {}),
            'created_at': user.get('created_at'),
            'updated_at': user.get('updated_at')
        }

        return json_response(200, {
            'success': True,
            'profile': profile
        })
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def update_user_profile(body, cors_headers):
    """Update user profile data"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        # Allowed fields to update
        allowed_fields = ['full_name', 'phone', 'company', 'role', 'website',
                          'timezone', 'avatar_url', 'is_overseas', 'currency_preference',
                          'notification_preferences']

        update_expressions = ['updated_at = :now']
        expression_values = {':now': datetime.utcnow().isoformat()}
        expression_names = {}

        for field in allowed_fields:
            if field in body and body[field] is not None:
                # Handle reserved words
                safe_name = f'#{field}' if field in ['role', 'status'] else field
                if field in ['role', 'status']:
                    expression_names[safe_name] = field
                    update_expressions.append(f'{safe_name} = :{field}')
                else:
                    update_expressions.append(f'{field} = :{field}')
                expression_values[f':{field}'] = body[field]

        if len(update_expressions) == 1:
            return json_response(400, {'success': False, 'error': 'No fields to update'})

        table = dynamodb.Table(USERS_TABLE)
        update_kwargs = {
            'Key': {'user_id': user.get('user_id', user_id)},
            'UpdateExpression': 'SET ' + ', '.join(update_expressions),
            'ExpressionAttributeValues': expression_values
        }
        if expression_names:
            update_kwargs['ExpressionAttributeNames'] = expression_names

        table.update_item(**update_kwargs)

        return json_response(200, {
            'success': True,
            'message': 'Profile updated successfully'
        })
    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def get_user_addons(body, cors_headers):
    """Get user's active add-ons"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        # Get add-ons from user record
        active_addons = user.get('addons', [])
        addon_details = []

        for addon_id in active_addons:
            addon = get_addon_by_code(addon_id)
            if addon:
                addon_details.append({
                    'id': addon_id,
                    'name': addon['name'],
                    'price': addon['price'],
                    'status': 'active'
                })

        return json_response(200, {
            'success': True,
            'addons': addon_details,
            'count': len(addon_details)
        })
    except Exception as e:
        print(f"Error getting user addons: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def get_user_dashboard(body, cors_headers):
    """Get user dashboard data including subscription, credits, audits, and recent activity.

    PERFORMANCE OPTIMIZED: Uses parallel DynamoDB queries to reduce latency by ~50%.
    - User lookup: ~100ms
    - Credit transactions: ~100ms (parallel)
    - Audit reports: ~200ms (parallel)
    Total: ~200ms instead of ~400ms sequential
    """
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        # First, get user data (required to get actual_user_id for subsequent queries)
        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        actual_user_id = user.get('user_id', user_id)

        # Get subscription details
        plan_code = user.get('subscription_plan', 'free')
        plan = get_plan_by_code(plan_code)
        credits = int(user.get('credits', 0))

        # ============================================================
        # PARALLEL QUERIES - Run credit transactions and audits simultaneously
        # ============================================================
        recent_transactions = []
        audits = []

        def fetch_credit_transactions():
            """Fetch recent credit transactions using GSI"""
            try:
                credits_table = dynamodb.Table(CREDITS_TABLE)
                response = credits_table.query(
                    IndexName='user-date-index',
                    KeyConditionExpression='user_id = :user_id',
                    ExpressionAttributeValues={':user_id': actual_user_id},
                    ScanIndexForward=False,
                    Limit=10
                )
                return response.get('Items', [])
            except Exception as e:
                print(f"Error getting transactions: {e}")
                return []

        def fetch_audit_reports():
            """Fetch audit reports using GSI"""
            try:
                reports_table = dynamodb.Table(AUDIT_REPORTS_TABLE)
                response = reports_table.query(
                    IndexName='user-created-index',
                    KeyConditionExpression='user_id = :user_id',
                    ExpressionAttributeValues={':user_id': actual_user_id},
                    ScanIndexForward=False,
                    Limit=50
                )
                return response.get('Items', [])
            except Exception as e:
                print(f"Error getting audits: {e}")
                return []

        # Execute queries in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            transactions_future = executor.submit(fetch_credit_transactions)
            audits_future = executor.submit(fetch_audit_reports)

            # Wait for both to complete
            recent_transactions = transactions_future.result()
            raw_audits = audits_future.result()

        # Convert Decimal to int/float for JSON serialization
        for audit in raw_audits:
            audits.append({
                'report_id': audit.get('report_id'),
                'url': audit.get('url', ''),
                'created_at': audit.get('created_at', ''),
                'status': audit.get('status', 'pending'),
                'security_score': float(audit.get('security_score', 0)) if audit.get('security_score') else None,
                'vulnerabilities_count': int(audit.get('vulnerabilities_count', 0)) if audit.get('vulnerabilities_count') else 0,
                'critical_count': int(audit.get('critical_count', 0)) if audit.get('critical_count') else 0,
                'high_count': int(audit.get('high_count', 0)) if audit.get('high_count') else 0,
                'medium_count': int(audit.get('medium_count', 0)) if audit.get('medium_count') else 0,
                'low_count': int(audit.get('low_count', 0)) if audit.get('low_count') else 0,
                'ssl_valid': audit.get('ssl_valid', False),
                'ssl_grade': audit.get('ssl_grade', ''),
                'headers_score': int(audit.get('headers_score', 0)) if audit.get('headers_score') else 0,
                'pdf_report_url': 'available' if audit.get('pdf_report_url') else None,
                'progressPercent': int(audit.get('progress_percent', 0)) if audit.get('progress_percent') else None,
                'currentStage': audit.get('current_stage', ''),
                'stageDescription': audit.get('stage_description', ''),
            })

        return json_response(200, {
            'success': True,
            'dashboard': {
                'subscription': {
                    'status': user.get('subscription_status', 'none'),
                    'plan': plan_code,
                    'plan_name': plan['name'] if plan else 'Free',
                    'provider': user.get('subscription_provider', 'none'),
                    'activated_at': user.get('subscription_activated_at'),
                    'renewal_date': user.get('renewal_date')
                },
                'credits': {
                    'balance': credits,
                    'unlimited': credits == -1
                },
                'addons': user.get('addons', []),
                'recent_transactions': recent_transactions,
            },
            'user': {
                'email': user.get('email'),
                'fullName': user.get('full_name'),
                'full_name': user.get('full_name'),
                'credits': credits,
                'plan': plan_code,
                'totalAudits': len(audits),
                'onboardingRequired': not user.get('onboarding', {}).get('completed', False) and not user.get('onboarding', {}).get('skipped', False),
                'created_at': user.get('created_at')
            },
            'audits': audits
        })
    except Exception as e:
        print(f"Error getting user dashboard: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# ONBOARDING FUNCTIONS
# ============================================================

def get_onboarding_status(body, cors_headers):
    """Get user's onboarding completion status"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        onboarding = user.get('onboarding', {})

        return json_response(200, {
            'success': True,
            'onboarding': {
                'completed': onboarding.get('completed', False),
                'current_step': onboarding.get('current_step', 0),
                'total_steps': onboarding.get('total_steps', 5),
                'steps_completed': onboarding.get('steps_completed', []),
                'skipped': onboarding.get('skipped', False),
                'completed_at': onboarding.get('completed_at')
            }
        })
    except Exception as e:
        print(f"Error getting onboarding status: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def save_onboarding(body, cors_headers):
    """Save user's onboarding progress or completion"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        current_step = body.get('currentStep', 0)
        steps_completed = body.get('stepsCompleted', [])
        completed = body.get('completed', False)
        skipped = body.get('skipped', False)

        now = datetime.utcnow().isoformat()
        onboarding_data = {
            'current_step': current_step,
            'steps_completed': steps_completed,
            'completed': completed,
            'skipped': skipped,
            'updated_at': now
        }

        if completed:
            onboarding_data['completed_at'] = now

        table = dynamodb.Table(USERS_TABLE)
        table.update_item(
            Key={'user_id': user.get('user_id', user_id)},
            UpdateExpression='SET onboarding = :onboarding, updated_at = :now',
            ExpressionAttributeValues={
                ':onboarding': onboarding_data,
                ':now': now
            }
        )

        return json_response(200, {
            'success': True,
            'message': 'Onboarding progress saved',
            'onboarding': onboarding_data
        })
    except Exception as e:
        print(f"Error saving onboarding: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# SUBSCRIPTION MANAGEMENT FUNCTIONS
# ============================================================

def activate_subscription_route(body, cors_headers):
    """Activate a subscription after PayPal confirmation"""
    try:
        user_id = body.get('userId') or body.get('email')
        subscription_id = body.get('subscriptionId')
        plan_code = body.get('planCode') or body.get('plan')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        if not subscription_id:
            return json_response(400, {'success': False, 'error': 'subscriptionId is required'})

        # Get plan details
        plan = get_plan_by_code(plan_code) if plan_code else None
        credits = plan['credits'] if plan else 0

        # Update user subscription
        success = update_user_subscription(
            user_id=user_id,
            plan_code=plan_code or 'raksha',
            subscription_id=subscription_id,
            status='active',
            credits=credits
        )

        if success:
            return json_response(200, {
                'success': True,
                'message': 'Subscription activated successfully',
                'subscription_id': subscription_id,
                'plan': plan_code,
                'credits_added': credits
            })
        else:
            return json_response(500, {'success': False, 'error': 'Failed to activate subscription'})
    except Exception as e:
        print(f"Error activating subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def confirm_subscription(body, cors_headers):
    """Confirm a subscription after payment (called from PaymentSuccess page)"""
    try:
        user_id = body.get('userId') or body.get('email')
        subscription_id = body.get('subscriptionId')
        plan_code = body.get('planCode') or body.get('plan')
        token = body.get('token')  # PayPal token from redirect

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        # Get user
        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        # If subscription already active, return success
        if user.get('subscription_status') == 'active' and user.get('subscription_id') == subscription_id:
            return json_response(200, {
                'success': True,
                'message': 'Subscription already confirmed',
                'subscription_id': subscription_id,
                'status': 'active'
            })

        # Get plan credits
        plan = get_plan_by_code(plan_code) if plan_code else None
        credits = plan['credits'] if plan else 0

        # Activate subscription
        success = update_user_subscription(
            user_id=user_id,
            plan_code=plan_code or 'raksha',
            subscription_id=subscription_id or f"sub_{user_id}_{datetime.utcnow().strftime('%Y%m%d')}",
            status='active',
            credits=credits
        )

        return json_response(200, {
            'success': success,
            'message': 'Subscription confirmed' if success else 'Failed to confirm subscription',
            'subscription_id': subscription_id,
            'plan': plan_code,
            'credits_added': credits
        })
    except Exception as e:
        print(f"Error confirming subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def get_portal_token(body, cors_headers):
    """Get a token for accessing the subscription management portal"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        subscription_id = user.get('subscription_id')

        if not subscription_id:
            return json_response(400, {'success': False, 'error': 'No active subscription found'})

        # For PayPal, redirect to PayPal subscription management
        # PayPal doesn't have a portal token concept - users manage via PayPal.com
        paypal_manage_url = f"https://www.paypal.com/myaccount/autopay/"

        return json_response(200, {
            'success': True,
            'portal_url': paypal_manage_url,
            'subscription_id': subscription_id,
            'provider': 'paypal',
            'message': 'Manage your subscription on PayPal'
        })
    except Exception as e:
        print(f"Error getting portal token: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def reactivate_subscription(body, cors_headers):
    """Reactivate a cancelled subscription"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        subscription_status = user.get('subscription_status')
        subscription_id = user.get('subscription_id')

        if subscription_status == 'active':
            return json_response(400, {'success': False, 'error': 'Subscription is already active'})

        if not subscription_id:
            # No previous subscription - redirect to checkout
            return json_response(200, {
                'success': True,
                'action': 'new_subscription',
                'redirect_url': f"{APP_BASE_URL}/pricing",
                'message': 'Please select a plan to subscribe'
            })

        # For PayPal, we need to create a new subscription
        # PayPal doesn't support reactivating cancelled subscriptions
        return json_response(200, {
            'success': True,
            'action': 'new_subscription',
            'redirect_url': f"{APP_BASE_URL}/pricing",
            'message': 'Please create a new subscription. PayPal subscriptions cannot be reactivated after cancellation.',
            'previous_plan': user.get('subscription_plan')
        })
    except Exception as e:
        print(f"Error reactivating subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def sync_subscription(body, cors_headers):
    """Sync subscription status with PayPal"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        subscription_id = user.get('subscription_id')

        if not subscription_id:
            return json_response(200, {
                'success': True,
                'synced': True,
                'subscription_status': 'none',
                'message': 'No subscription to sync'
            })

        # TODO: Call PayPal API to get subscription status
        # For now, return current database status
        return json_response(200, {
            'success': True,
            'synced': True,
            'subscription_id': subscription_id,
            'subscription_status': user.get('subscription_status', 'none'),
            'subscription_plan': user.get('subscription_plan', 'free'),
            'credits': int(user.get('credits', 0)),
            'message': 'Subscription status from database'
        })
    except Exception as e:
        print(f"Error syncing subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def update_payment_method(body, cors_headers):
    """Update payment method for subscription"""
    try:
        user_id = body.get('userId') or body.get('email')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        subscription_id = user.get('subscription_id')

        if not subscription_id:
            return json_response(400, {'success': False, 'error': 'No active subscription found'})

        # For PayPal, users update payment method through PayPal.com
        paypal_manage_url = "https://www.paypal.com/myaccount/autopay/"

        return json_response(200, {
            'success': True,
            'redirect_url': paypal_manage_url,
            'subscription_id': subscription_id,
            'provider': 'paypal',
            'message': 'Update your payment method on PayPal'
        })
    except Exception as e:
        print(f"Error updating payment method: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def set_auto_renew(body, cors_headers):
    """Enable or disable auto-renewal for subscription"""
    try:
        subscription_id = body.get('subscriptionId')
        auto_renew = body.get('autoRenew', True)
        user_id = body.get('userId') or body.get('email')

        if not subscription_id:
            return json_response(400, {'success': False, 'error': 'subscriptionId is required'})

        # Get user by subscription_id if user_id not provided
        users_table = dynamodb.Table(USERS_TABLE)

        if user_id:
            user = get_user_by_email(user_id)
        else:
            # Query by subscription_id
            response = users_table.scan(
                FilterExpression='subscription_id = :sid',
                ExpressionAttributeValues={':sid': subscription_id},
                Limit=1
            )
            items = response.get('Items', [])
            user = items[0] if items else None

        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        actual_user_id = user.get('user_id')

        # Update auto_renewal status in database
        users_table.update_item(
            Key={'user_id': actual_user_id},
            UpdateExpression='SET auto_renewal = :ar, updated_at = :ua',
            ExpressionAttributeValues={
                ':ar': auto_renew,
                ':ua': datetime.utcnow().isoformat()
            }
        )

        return json_response(200, {
            'success': True,
            'autoRenew': auto_renew,
            'message': f'Auto-renewal {"enabled" if auto_renew else "disabled"} successfully'
        })
    except Exception as e:
        print(f"Error setting auto-renew: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


def upgrade_subscription(body, cors_headers):
    """Upgrade to a higher plan"""
    try:
        user_id = body.get('userId') or body.get('email')
        new_plan = body.get('planCode') or body.get('newPlan')
        billing_cycle = body.get('billingCycle', 'monthly')

        if not user_id:
            return json_response(400, {'success': False, 'error': 'userId is required'})

        if not new_plan:
            return json_response(400, {'success': False, 'error': 'planCode is required'})

        user = get_user_by_email(user_id)
        if not user:
            return json_response(404, {'success': False, 'error': 'User not found'})

        current_plan = user.get('subscription_plan', 'free')

        # Get plan details
        plan = get_plan_by_code(new_plan)
        if not plan:
            return json_response(400, {'success': False, 'error': f'Invalid plan: {new_plan}'})

        # For PayPal, upgrades require creating a new subscription
        # First cancel the old one, then create new
        # Return redirect to checkout with upgrade flag
        return json_response(200, {
            'success': True,
            'action': 'checkout',
            'redirect_url': f"{APP_BASE_URL}/purchase?plan={new_plan}&billingCycle={billing_cycle}&upgrade=true",
            'current_plan': current_plan,
            'new_plan': new_plan,
            'price': plan['price'],
            'credits': plan['credits'],
            'message': 'Proceed to checkout to complete upgrade'
        })
    except Exception as e:
        print(f"Error upgrading subscription: {str(e)}")
        return json_response(500, {'success': False, 'error': str(e)})


# ============================================================
# ADDON PURCHASE HANDLER (Scheduler, Credits, WhiteLabel)
# ============================================================

SCHEDULES_TABLE = os.environ.get('SCHEDULES_TABLE', 'aivedha-guardian-schedules')
SCHEDULER_LAMBDA = os.environ.get('SCHEDULER_LAMBDA_ARN', 'aivedha-guardian-scheduler')

def handle_addon_purchase(body, cors_headers):
    """
    Handle addon purchase and management requests.
    Routes based on addon_type: scheduler, credits, whitelabel
    """
    import uuid

    addonType = body.get('addonType', '').lower()
    action = body.get('action', '')
    userId = body.get('userId')

    print(f"Addon purchase: addonType={addonType}, action={action}, userId={userId}")

    # Handle scheduler addon
    if addonType == 'scheduler' or action in ['create', 'update', 'delete', 'toggle', 'list', 'validate_addon', 'run_now']:
        return handle_scheduler_addon(body, action, cors_headers)

    # Handle credits addon
    elif addonType == 'credits':
        return handle_credits_addon(body, action, cors_headers)

    # Handle whitelabel addon
    elif addonType == 'whitelabel':
        return handle_whitelabel_addon(body, action, cors_headers)

    else:
        return json_response(400, {
            'error': 'Invalid addonType',
            'message': f'Unknown addonType: {addonType}',
            'supported_types': ['scheduler', 'credits', 'whitelabel']
        })


def handle_scheduler_addon(body, action, cors_headers):
    """Handle scheduler addon operations."""
    import uuid

    userId = body.get('userId')
    if not userId and action not in ['validate_addon']:
        return json_response(400, {'error': 'userId is required'})

    schedules_table = dynamodb.Table(SCHEDULES_TABLE)
    now = datetime.utcnow().isoformat()

    if action == 'create':
        # Check if user has scheduler addon
        has_addon, expires_at = check_scheduler_addon_active(userId)
        if not has_addon:
            return json_response(403, {
                'error': 'Scheduled Audits addon required',
                'message': 'Please purchase the Scheduled Audits addon to use this feature.',
                'addonRequired': 'scheduler'
            })

        url = body.get('url')
        if not url:
            return json_response(400, {'error': 'url is required'})

        frequency = body.get('frequency', 'weekly')
        startDate = body.get('startDate') or now[:10]
        startTime = body.get('startTime', '09:00')
        endDate = body.get('endDate')
        scheduleName = body.get('name', body.get('scheduleName', f"Audit for {url}"))

        scheduleId = f"sched-{uuid.uuid4().hex[:12]}"
        nextRun = f"{startDate}T{startTime}:00" if startDate and startTime else now

        schedule_item = {
            'schedule_id': scheduleId,
            'user_id': userId,
            'url': url,
            'name': scheduleName,
            'frequency': frequency,
            'start_date': startDate,
            'start_time': startTime,
            'end_date': endDate,
            'end_time': body.get('endTime'),
            'status': 'active',
            'next_run': nextRun,
            'last_run': None,
            'credits_used': 0,
            'created_at': now,
            'updated_at': now
        }

        schedules_table.put_item(Item=schedule_item)

        return json_response(200, {
            'success': True,
            'message': 'Schedule created successfully',
            'schedule': schedule_item
        })

    elif action == 'update':
        scheduleId = body.get('scheduleId')
        if not scheduleId:
            return json_response(400, {'error': 'scheduleId is required'})

        # Verify ownership
        existing = schedules_table.get_item(Key={'schedule_id': scheduleId})
        if 'Item' not in existing:
            return json_response(404, {'error': 'Schedule not found'})
        if existing['Item'].get('user_id') != userId:
            return json_response(403, {'error': 'Unauthorized'})

        update_fields = ['url', 'frequency', 'startDate', 'startTime', 'endDate', 'endTime', 'name']
        db_field_map = {'startDate': 'start_date', 'startTime': 'start_time', 'endDate': 'end_date', 'endTime': 'end_time'}
        update_expr_parts = ['updated_at = :now']
        expr_values = {':now': now}

        for field in update_fields:
            if field in body and body[field] is not None:
                db_field = db_field_map.get(field, field)
                update_expr_parts.append(f'{db_field} = :{field}')
                expr_values[f':{field}'] = body[field]

        schedules_table.update_item(
            Key={'schedule_id': scheduleId},
            UpdateExpression='SET ' + ', '.join(update_expr_parts),
            ExpressionAttributeValues=expr_values
        )

        return json_response(200, {'success': True, 'message': 'Schedule updated', 'scheduleId': scheduleId})

    elif action == 'delete':
        scheduleId = body.get('scheduleId')
        if not scheduleId:
            return json_response(400, {'error': 'scheduleId is required'})

        existing = schedules_table.get_item(Key={'schedule_id': scheduleId})
        if 'Item' not in existing:
            return json_response(404, {'error': 'Schedule not found'})
        if existing['Item'].get('user_id') != userId:
            return json_response(403, {'error': 'Unauthorized'})

        schedules_table.delete_item(Key={'schedule_id': scheduleId})
        return json_response(200, {'success': True, 'message': 'Schedule deleted', 'scheduleId': scheduleId})

    elif action == 'toggle':
        scheduleId = body.get('scheduleId')
        if not scheduleId:
            return json_response(400, {'error': 'scheduleId is required'})

        existing = schedules_table.get_item(Key={'schedule_id': scheduleId})
        if 'Item' not in existing:
            return json_response(404, {'error': 'Schedule not found'})

        schedule = existing['Item']
        if schedule.get('user_id') != userId:
            return json_response(403, {'error': 'Unauthorized'})

        currentStatus = schedule.get('status', 'active')
        newStatus = 'paused' if currentStatus == 'active' else 'active'

        schedules_table.update_item(
            Key={'schedule_id': scheduleId},
            UpdateExpression='SET #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': newStatus, ':now': now}
        )

        return json_response(200, {'success': True, 'scheduleId': scheduleId, 'status': newStatus})

    elif action == 'list':
        response = schedules_table.scan(
            FilterExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        schedules = response.get('Items', [])
        schedules.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return json_response(200, {'success': True, 'schedules': schedules, 'count': len(schedules)})

    elif action == 'validate_addon':
        has_addon, expires_at = check_scheduler_addon_active(user_id)
        response = schedules_table.scan(
            FilterExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
            Select='COUNT'
        )
        return json_response(200, {
            'success': True,
            'has_addon': has_addon,
            'expires_at': expires_at,
            'schedule_count': response.get('Count', 0),
            'max_schedulers': 10 if has_addon else 0
        })

    elif action == 'run_now':
        scheduleId = body.get('scheduleId')
        if not scheduleId:
            return json_response(400, {'error': 'scheduleId is required'})

        # Invoke scheduler Lambda async
        try:
            lambda_client = boto3.client('lambda', region_name='us-east-1')
            lambda_client.invoke(
                FunctionName=SCHEDULER_LAMBDA,
                InvocationType='Event',
                Payload=json.dumps({
                    'action': 'execute',
                    'scheduleId': scheduleId,
                    'userId': userId,
                    'manualRun': True
                })
            )
            return json_response(200, {'success': True, 'message': 'Audit started', 'scheduleId': scheduleId})
        except Exception as e:
            return json_response(500, {'error': 'Failed to start audit', 'message': str(e)})

    else:
        return json_response(400, {'error': f'Unknown scheduler action: {action}'})


def check_scheduler_addon_active(user_id):
    """Check if user has active scheduler addon."""
    try:
        subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
        response = subscriptions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        for sub in response.get('Items', []):
            addons = sub.get('addons', [])
            if isinstance(addons, list):
                if 'scheduler' in addons or 'scheduled_audits' in addons:
                    return True, sub.get('expires_at')

            addon_subs = sub.get('addon_subscriptions', [])
            for addon in addon_subs:
                addon_id = addon.get('addon_id', '') if isinstance(addon, dict) else addon
                if addon_id in ['scheduler', 'scheduled_audits']:
                    return True, addon.get('expires_at') if isinstance(addon, dict) else sub.get('expires_at')

        return False, None
    except Exception as e:
        print(f"Error checking scheduler addon: {e}")
        return False, None


def handle_credits_addon(body, action, cors_headers):
    """Handle credits pack purchase/addition."""
    userId = body.get('userId')
    credits = body.get('credits', 0)
    packId = body.get('packId', '')

    if action == 'add_credits':
        if not userId or credits <= 0:
            return json_response(400, {'error': 'userId and positive credits required'})

        success = add_credits_to_user(userId, credits, f"Credits pack: {packId}")
        if success:
            user = get_user_by_email(userId)
            return json_response(200, {
                'success': True,
                'newBalance': int(user.get('credits', 0)) if user else credits
            })
        return json_response(500, {'error': 'Failed to add credits'})

    elif action == 'purchase':
        # Redirect to PayPal checkout
        return create_credits_checkout(body, cors_headers)

    return json_response(400, {'error': f'Unknown credits action: {action}'})


def handle_whitelabel_addon(body, action, cors_headers):
    """Handle white-label addon configuration."""
    userId = body.get('userId')
    brandName = body.get('brandName', '')
    domain = body.get('domain', '')

    if action in ['configure', 'update']:
        if not userId or not brandName:
            return json_response(400, {'error': 'userId and brandName required'})

        users_table = dynamodb.Table(USERS_TABLE)
        users_table.update_item(
            Key={'user_id': userId},
            UpdateExpression='SET whitelabel_config = :config, updated_at = :now',
            ExpressionAttributeValues={
                ':config': {'brandName': brandName, 'domain': domain, 'enabled': True},
                ':now': datetime.utcnow().isoformat()
            }
        )
        return json_response(200, {
            'success': True,
            'config': {'brandName': brandName, 'domain': domain}
        })

    elif action == 'get':
        user = get_user_by_email(userId)
        if user:
            return json_response(200, {
                'success': True,
                'config': user.get('whitelabel_config', {})
            })
        return json_response(404, {'error': 'User not found'})

    return json_response(400, {'error': f'Unknown whitelabel action: {action}'})


# ============================================================
# MAIN HANDLER
# ============================================================

def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    path = event.get('path', '')
    http_method = event.get('httpMethod', 'POST')

    # Parse body
    body = event.get('body')
    if body is None:
        body = {}
    elif isinstance(body, str):
        try:
            body = json.loads(body)
            if body is None:  # Handle "null" JSON string
                body = {}
        except json.JSONDecodeError:
            body = {}

    # Also check query parameters
    query_params = event.get('queryStringParameters') or {}
    body.update(query_params)

    # Route requests
    if '/subscription/plans' in path and http_method == 'GET':
        return get_plans(CORS_HEADERS)

    elif '/subscription/status' in path or '/subscription/current' in path:
        return get_subscription_status(body, CORS_HEADERS)

    elif '/subscription/checkout' in path and http_method == 'POST':
        return create_checkout_session(body, CORS_HEADERS)

    elif '/subscription/credits-checkout' in path and http_method == 'POST':
        return create_credits_checkout(body, CORS_HEADERS)

    elif '/subscription/cancel' in path and http_method == 'POST':
        return cancel_subscription(body, CORS_HEADERS)

    elif '/subscription/webhook' in path and http_method == 'POST':
        return handle_webhook(event, CORS_HEADERS)

    elif '/subscription/invoices' in path:
        return get_user_invoices(body, CORS_HEADERS)

    elif '/credits/balance' in path or '/user/credits' in path:
        return get_user_credits(body, CORS_HEADERS)

    elif '/credits/use' in path and http_method == 'POST':
        return use_credit(body, CORS_HEADERS)

    elif '/credits/reset' in path and http_method == 'POST':
        return reset_free_credits(body, CORS_HEADERS)

    elif '/account/check-deletion' in path and http_method == 'POST':
        return check_deletion_eligibility(body, CORS_HEADERS)

    elif '/account/delete' in path and http_method == 'POST':
        return delete_account(body, CORS_HEADERS)

    # Subscription management routes
    elif '/subscription/activate' in path and http_method == 'POST':
        return activate_subscription_route(body, CORS_HEADERS)

    elif '/subscription/confirm' in path and http_method == 'POST':
        return confirm_subscription(body, CORS_HEADERS)

    elif '/subscription/portal-token' in path:
        return get_portal_token(body, CORS_HEADERS)

    elif '/subscription/reactivate' in path and http_method == 'POST':
        return reactivate_subscription(body, CORS_HEADERS)

    elif '/subscription/sync' in path and http_method == 'POST':
        return sync_subscription(body, CORS_HEADERS)

    elif '/subscription/update-payment' in path and http_method == 'POST':
        return update_payment_method(body, CORS_HEADERS)

    elif '/subscription/upgrade' in path and http_method == 'POST':
        return upgrade_subscription(body, CORS_HEADERS)

    elif '/subscription/auto-renew' in path and http_method == 'POST':
        return set_auto_renew(body, CORS_HEADERS)

    # Credits routes
    elif '/credits/purchase' in path and http_method == 'POST':
        return create_credits_checkout(body, CORS_HEADERS)

    # User routes
    elif '/addons/purchase' in path and http_method == 'POST':
        return handle_addon_purchase(body, CORS_HEADERS)

    elif '/user/addons' in path:
        return get_user_addons(body, CORS_HEADERS)

    elif '/user/dashboard' in path:
        return get_user_dashboard(body, CORS_HEADERS)

    elif '/user/delete-account' in path and http_method == 'POST':
        return delete_account(body, CORS_HEADERS)

    elif '/user/onboarding' in path:
        if http_method == 'POST':
            return save_onboarding(body, CORS_HEADERS)
        else:
            return get_onboarding_status(body, CORS_HEADERS)

    elif '/user/profile' in path:
        if http_method == 'PUT' or http_method == 'POST':
            return update_user_profile(body, CORS_HEADERS)
        else:
            return get_user_profile(body, CORS_HEADERS)

    elif '/health' in path:
        return json_response(200, {
            'status': 'healthy',
            'service': 'subscription-manager',
            'timestamp': datetime.utcnow().isoformat(),
            'payment_provider': 'paypal'
        })

    else:
        return json_response(404, {
            'error': 'Endpoint not found',
            'path': path,
            'available_endpoints': [
                'GET /subscription/plans',
                'GET /subscription/current',
                'GET/POST /subscription/status',
                'POST /subscription/checkout',
                'POST /subscription/credits-checkout',
                'POST /subscription/cancel',
                'POST /subscription/webhook',
                'GET /subscription/invoices',
                'POST /subscription/activate',
                'POST /subscription/confirm',
                'GET /subscription/portal-token',
                'POST /subscription/reactivate',
                'POST /subscription/sync',
                'POST /subscription/update-payment',
                'POST /subscription/upgrade',
                'POST /subscription/auto-renew',
                'GET /credits/balance',
                'GET /user/credits',
                'POST /credits/use',
                'POST /credits/reset',
                'POST /credits/purchase',
                'GET /user/addons',
                'GET /user/dashboard',
                'GET/POST /user/profile',
                'GET/POST /user/onboarding',
                'POST /user/delete-account',
                'POST /account/check-deletion',
                'POST /account/delete',
                'GET /health'
            ]
        })
