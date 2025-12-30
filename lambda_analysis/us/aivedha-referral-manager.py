"""
AiVedha Guardian - Referral Management System v2.0
Complete referral system with DynamoDB integration.

Referral Logic:
- Each user gets ONE unique referral code tied to their email
- After first successful referral, user uses COMMON GENERIC code
- NEW USER (receiver): ALWAYS gets 10 credits on first signup - NO CONDITIONS
- SENDER (referrer):
  - First unique code: Gets 10 credits bonus (even on free plan - one time only)
  - Common code: Gets 10 credits ONLY if sender is on PAID plan
  - Free plan: Only 1 bonus total (from unique code)
  - Paid plan: Unlimited bonuses from common code referrals
"""

import json
import boto3
import hashlib
import secrets
import string
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
referrals_table = dynamodb.Table('aivedha-guardian-referrals')
users_table = dynamodb.Table('aivedha-guardian-users')

# Constants
REFERRAL_BONUS_CREDITS = 10
COMMON_REFERRAL_CODE = "AVGUARD2025"  # Generic code for all users after first referral
FREE_PLANS = ['aarambh_free', 'aarambh', 'free', '']

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 else int(obj)
    raise TypeError

def generate_unique_referral_code(email: str) -> str:
    """Generate a unique referral code for a user email."""
    # Create deterministic but unique code from email
    hash_input = f"aivedha:{email.lower()}:referral"
    hash_obj = hashlib.sha256(hash_input.encode())
    code_base = hash_obj.hexdigest()[:6].upper()

    # Add random suffix for extra uniqueness
    suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(2))

    return f"AV{code_base}{suffix}"

def get_user_by_email(email: str) -> dict:
    """Get user data from DynamoDB."""
    try:
        response = users_table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )
        if response.get('Items'):
            return response['Items'][0]
    except Exception as e:
        print(f"Error getting user: {e}")
    return {}

def get_user_plan(email: str) -> str:
    """Get user's current subscription plan."""
    user = get_user_by_email(email)
    return user.get('subscription_plan', user.get('plan', 'aarambh_free'))

def is_paid_plan(plan: str) -> bool:
    """Check if plan is a paid plan."""
    if not plan:
        return False
    plan_lower = plan.lower()
    return plan_lower not in FREE_PLANS and 'aarambh' not in plan_lower

def get_user_unique_code_bonus_used(email: str) -> bool:
    """Check if user has already received bonus from their unique code."""
    try:
        response = referrals_table.query(
            IndexName='owner-email-index',
            KeyConditionExpression=Key('owner_email').eq(email)
        )
        for item in response.get('Items', []):
            # Check if this is their unique code (not common) and bonus was credited
            if item.get('referral_code') != COMMON_REFERRAL_CODE:
                if item.get('bonus_credited_to_owner', False):
                    return True
    except Exception as e:
        print(f"Error checking bonus status: {e}")
    return False

def check_email_already_used_referral(email: str) -> bool:
    """Check if this email has already signed up using any referral code."""
    try:
        response = referrals_table.query(
            IndexName='used-by-email-index',
            KeyConditionExpression=Key('used_by_email').eq(email)
        )
        return len(response.get('Items', [])) > 0
    except Exception as e:
        print(f"Error checking referral usage: {e}")
    return False

def add_credits_to_user(email: str, credits_to_add: int, reason: str) -> bool:
    """Add credits to user in DynamoDB."""
    try:
        user = get_user_by_email(email)
        if not user:
            print(f"User not found: {email}")
            return False

        user_id = user.get('user_id')
        current_credits = int(user.get('credits', 0))
        new_credits = current_credits + credits_to_add

        # Update DynamoDB
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = :credits, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':credits': new_credits,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )

        print(f"Added {credits_to_add} credits to {email}. Reason: {reason}. New total: {new_credits}")
        return True

    except Exception as e:
        print(f"Error adding credits: {e}")
        return False

def create_user_with_referral_credits(email: str, referral_code: str) -> dict:
    """Create/update new user with referral bonus credits."""
    try:
        existing_user = get_user_by_email(email)

        if existing_user:
            # User exists - add referral bonus if first time
            if not check_email_already_used_referral(email):
                add_credits_to_user(email, REFERRAL_BONUS_CREDITS, f"Referral signup bonus via {referral_code}")
            return {'success': True, 'credits_added': REFERRAL_BONUS_CREDITS, 'user_exists': True}

        # New user - will be created by login flow with referral bonus
        return {'success': True, 'credits_to_add': REFERRAL_BONUS_CREDITS, 'user_exists': False}

    except Exception as e:
        print(f"Error creating user with referral: {e}")
        return {'success': False, 'error': str(e)}

def handler(event, context):
    """Main Lambda handler."""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        http_method = event.get('httpMethod', 'POST')
        path = event.get('path', '')
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        query_params = event.get('queryStringParameters') or {}
        action = body.get('action') or ''

        # Route handling
        if '/referral/generate' in path or action == 'generate':
            return generate_code_handler(body, headers)
        elif '/referral/validate' in path or action == 'validate':
            return validate_code_handler(body, query_params, headers)
        elif '/referral/activate' in path or action == 'activate':
            return activate_referral_handler(body, headers)
        elif '/referral/stats' in path or action == 'stats':
            return get_stats_handler(body, query_params, headers)
        elif '/referral/share-content' in path or action == 'share_content':
            return get_share_content_handler(body, query_params, headers)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid action', 'path': path})
            }

    except Exception as e:
        print(f"Handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def generate_code_handler(body: dict, headers: dict) -> dict:
    """Generate or retrieve referral code for user."""
    email = body.get('email', '').strip().lower()

    if not email:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Email is required'})
        }

    try:
        # Check if user already has used their unique code
        unique_code_used = get_user_unique_code_bonus_used(email)
        user_plan = get_user_plan(email)
        is_paid = is_paid_plan(user_plan)

        # Check existing referrals
        response = referrals_table.query(
            IndexName='owner-email-index',
            KeyConditionExpression=Key('owner_email').eq(email)
        )
        items = response.get('Items', [])

        # Find user's unique code
        unique_code = None
        unique_code_item = None
        for item in items:
            if item.get('referral_code') != COMMON_REFERRAL_CODE:
                unique_code = item.get('referral_code')
                unique_code_item = item
                break

        # If user has no unique code, create one
        if not unique_code:
            unique_code = generate_unique_referral_code(email)

            # Ensure uniqueness
            max_attempts = 10
            for _ in range(max_attempts):
                existing = referrals_table.get_item(Key={'referral_code': unique_code})
                if 'Item' not in existing:
                    break
                unique_code = generate_unique_referral_code(email + secrets.token_hex(2))

            now = datetime.now(timezone.utc).isoformat()
            # NOTE: Do NOT include used_by_email or used_at with empty strings
            # DynamoDB GSI keys cannot have empty string values
            # These fields are added only when the code is actually used
            referrals_table.put_item(Item={
                'referral_code': unique_code,
                'owner_email': email,
                'created_at': now,
                'is_used': False,
                'bonus_credited_to_owner': False,
                'is_unique_code': True
            })

        # Determine which code to return
        # If unique code is used AND user is on free plan -> return common code (no bonus for free)
        # If unique code is used AND user is on paid plan -> return common code (with bonus eligibility)
        # If unique code not used -> return unique code

        unique_is_used = unique_code_item.get('is_used', False) if unique_code_item else False

        if unique_is_used:
            # Return common code
            active_code = COMMON_REFERRAL_CODE
            can_earn_bonus = is_paid  # Only paid plans earn from common code
        else:
            # Return unique code
            active_code = unique_code
            can_earn_bonus = True  # First referral bonus available for all

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'referral_code': active_code,
                'unique_code': unique_code,
                'is_common_code': active_code == COMMON_REFERRAL_CODE,
                'can_earn_bonus': can_earn_bonus,
                'is_paid_plan': is_paid,
                'user_plan': user_plan,
                'unique_code_used': unique_is_used
            }, default=decimal_default)
        }

    except Exception as e:
        print(f"Error generating code: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def validate_code_handler(body: dict, query_params: dict, headers: dict) -> dict:
    """Validate a referral code."""
    referral_code = (body.get('referral_code') or query_params.get('code', '')).strip().upper()

    if not referral_code:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Referral code is required'})
        }

    try:
        # Common code is always valid
        if referral_code == COMMON_REFERRAL_CODE:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'valid': True,
                    'is_common_code': True,
                    'message': 'Valid referral code'
                })
            }

        # Check unique code
        response = referrals_table.get_item(Key={'referral_code': referral_code})

        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    'valid': False,
                    'error': 'Referral code not found'
                })
            }

        item = response['Item']
        is_used = item.get('is_used', False)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'valid': not is_used,
                'is_used': is_used,
                'is_common_code': False,
                'message': 'Code already used' if is_used else 'Valid referral code'
            }, default=decimal_default)
        }

    except Exception as e:
        print(f"Error validating code: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def activate_referral_handler(body: dict, headers: dict) -> dict:
    """
    Activate referral when new user signs up.

    Rules:
    - New user ALWAYS gets 10 credits (no conditions)
    - Sender gets bonus only if:
      a) Using unique code (first time) - even free plan gets this
      b) Using common code AND sender is on PAID plan
    """
    referral_code = (body.get('referral_code', '')).strip().upper()
    new_user_email = body.get('new_user_email', '').strip().lower()
    sender_email = body.get('sender_email', '').strip().lower()  # For common code

    if not referral_code or not new_user_email:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Referral code and new user email are required'})
        }

    try:
        # Check if new user already used a referral
        if check_email_already_used_referral(new_user_email):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'This email has already used a referral code',
                    'new_user_credits': 0
                })
            }

        now = datetime.now(timezone.utc).isoformat()
        owner_email = ''
        owner_gets_bonus = False
        is_common = referral_code == COMMON_REFERRAL_CODE

        if is_common:
            # Common code - need sender_email
            if not sender_email:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Sender email required for common referral code'})
                }

            owner_email = sender_email

            # Prevent self-referral
            if owner_email == new_user_email:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'Cannot use your own referral'
                    })
                }

            # Check if sender is on paid plan
            sender_plan = get_user_plan(owner_email)
            owner_gets_bonus = is_paid_plan(sender_plan)

            # Record in referrals table
            record_id = f"{COMMON_REFERRAL_CODE}_{new_user_email}_{now[:10]}"
            referrals_table.put_item(Item={
                'referral_code': record_id,
                'owner_email': owner_email,
                'created_at': now,
                'is_used': True,
                'used_by_email': new_user_email,
                'used_at': now,
                'bonus_credited_to_owner': owner_gets_bonus,
                'is_common_code_usage': True,
                'original_code': COMMON_REFERRAL_CODE
            })

        else:
            # Unique code
            response = referrals_table.get_item(Key={'referral_code': referral_code})

            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Referral code not found'})
                }

            item = response['Item']

            if item.get('is_used', False):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'This referral code has already been used'
                    })
                }

            owner_email = item.get('owner_email', '')

            # Prevent self-referral
            if owner_email.lower() == new_user_email:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'Cannot use your own referral code'
                    })
                }

            # Unique code - owner ALWAYS gets bonus (first time)
            owner_gets_bonus = True

            # Mark unique code as used
            referrals_table.update_item(
                Key={'referral_code': referral_code},
                UpdateExpression='SET is_used = :used, used_by_email = :used_by, used_at = :used_at, bonus_credited_to_owner = :bonus',
                ExpressionAttributeValues={
                    ':used': True,
                    ':used_by': new_user_email,
                    ':used_at': now,
                    ':bonus': True
                }
            )

        # NEW USER: Always gets 10 credits (no conditions)
        new_user_credited = add_credits_to_user(
            new_user_email,
            REFERRAL_BONUS_CREDITS,
            f"Referral signup bonus via {referral_code}"
        )

        # SENDER: Gets bonus only if eligible
        owner_credited = False
        if owner_gets_bonus and owner_email:
            owner_credited = add_credits_to_user(
                owner_email,
                REFERRAL_BONUS_CREDITS,
                f"Referral bonus - {new_user_email} joined via {'common' if is_common else 'unique'} code"
            )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'new_user_credits_added': REFERRAL_BONUS_CREDITS if new_user_credited else 0,
                'owner_credits_added': REFERRAL_BONUS_CREDITS if owner_credited else 0,
                'owner_bonus_eligible': owner_gets_bonus,
                'is_common_code': is_common,
                'message': 'Referral activated successfully'
            })
        }

    except Exception as e:
        print(f"Error activating referral: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def get_stats_handler(body: dict, query_params: dict, headers: dict) -> dict:
    """Get referral statistics for a user."""
    email = (body.get('email') or query_params.get('email', '')).strip().lower()

    if not email:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Email is required'})
        }

    try:
        response = referrals_table.query(
            IndexName='owner-email-index',
            KeyConditionExpression=Key('owner_email').eq(email)
        )

        items = response.get('Items', [])
        user_plan = get_user_plan(email)
        is_paid = is_paid_plan(user_plan)

        # Find unique code
        unique_code = None
        unique_code_used = False
        for item in items:
            code = item.get('referral_code', '')
            if not item.get('is_common_code_usage') and code != COMMON_REFERRAL_CODE:
                unique_code = code
                unique_code_used = item.get('is_used', False)
                break

        # Count stats
        total_referrals = sum(1 for item in items if item.get('is_used', False) or item.get('is_common_code_usage'))
        total_bonus = sum(
            REFERRAL_BONUS_CREDITS for item in items
            if item.get('bonus_credited_to_owner', False)
        )

        # Build history
        history = []
        for item in items:
            if item.get('is_used', False) or item.get('is_common_code_usage'):
                history.append({
                    'used_by': item.get('used_by_email', ''),
                    'used_at': item.get('used_at', ''),
                    'bonus_credited': item.get('bonus_credited_to_owner', False),
                    'is_common': item.get('is_common_code_usage', False)
                })

        # Sort history by date descending
        history.sort(key=lambda x: x.get('used_at', ''), reverse=True)

        # Determine active code
        if unique_code_used:
            active_code = COMMON_REFERRAL_CODE
            can_earn_bonus = is_paid
        else:
            active_code = unique_code or generate_unique_referral_code(email)
            can_earn_bonus = True

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'active_code': active_code,
                'unique_code': unique_code,
                'is_common_code_active': unique_code_used,
                'total_referrals': total_referrals,
                'total_bonus_earned': total_bonus,
                'user_plan': user_plan,
                'is_paid_plan': is_paid,
                'can_earn_bonus': can_earn_bonus,
                'history': history[:20]  # Limit to 20 recent
            }, default=decimal_default)
        }

    except Exception as e:
        print(f"Error getting stats: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def get_share_content_handler(body: dict, query_params: dict, headers: dict) -> dict:
    """Generate professional share content for referral."""
    referral_code = body.get('referral_code') or query_params.get('code', '')
    user_name = body.get('user_name') or query_params.get('name', 'a friend')
    owner_email = body.get('owner_email') or query_params.get('email', '')

    if not referral_code:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Referral code is required'})
        }

    base_url = "https://aivedha.ai"
    # Include owner_email in link for tracking (needed for common code bonus attribution)
    if owner_email:
        referral_link = f"{base_url}/login?ref={referral_code}&from={urllib.parse.quote(owner_email)}"
    else:
        referral_link = f"{base_url}/login?ref={referral_code}"

    # Professional share messages
    share_messages = {
        'default': f"""🛡️ Protect Your Website with AI-Powered Security

{user_name} invites you to try AiVedha Guard - Enterprise-grade security audits at startup pricing.

✨ Get 10 FREE credits when you join!
🔒 12 Advanced Security Modules
🤖 AI-Powered Vulnerability Detection
📊 Professional Audit Reports

Join now: {referral_link}

#CyberSecurity #WebSecurity #AiVedha""",

        'short': f"""🛡️ Get 10 FREE security audit credits!

Join AiVedha Guard - AI-powered website security.
{referral_link}""",

        'professional': f"""Secure your digital presence with AiVedha Guard.

I've been using this AI-powered security audit platform and wanted to share it with you. Use my referral link to get 10 free credits:

{referral_link}

Features include OWASP Top 10 scanning, SSL analysis, and AI-powered remediation suggestions.""",

        'whatsapp': f"""Hey! 👋

Check out AiVedha Guard - it's an amazing AI-powered security audit tool for websites.

Use my link and get 10 FREE credits: {referral_link}

It scans for vulnerabilities, SSL issues, and gives AI-powered fix suggestions! 🔐""",

        'twitter': f"""🛡️ Discovered @AiVedhaGuard - AI-powered security audits for websites

Get 10 FREE credits with my referral:
{referral_link}

#CyberSecurity #WebDev #InfoSec""",

        'linkedin': f"""🔐 Elevating Web Security with AI

I've been using AiVedha Guard for comprehensive security audits of web applications. The AI-powered vulnerability detection and remediation suggestions have been invaluable.

If you're looking to strengthen your web security posture, I highly recommend checking it out. Use my referral link for 10 free credits:

{referral_link}

#CyberSecurity #WebSecurity #AI #TechLeadership"""
    }

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'referral_link': referral_link,
            'referral_code': referral_code,
            'messages': share_messages
        })
    }
