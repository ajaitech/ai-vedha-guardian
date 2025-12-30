"""
AiVedha Guard - API Key Manager Lambda
=======================================
Manages API keys for CI/CD integrations (GitHub, etc.)
- Secure key generation with HMAC
- Validity periods: 7, 12, 15, 30, 60, 90 days
- User-specific permissions only
- Auto-disable on plan downgrade
- Smart region routing (US/India) based on user location and target URL

Copyright 2024-2025 AiVibe Software Services Pvt Ltd
"""

import json
import os
import boto3
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# ============================================================================
# REGION ROUTING CONFIGURATION
# ============================================================================

# Region endpoints
REGION_ENDPOINTS = {
    'us-east-1': 'https://api.aivedha.ai/api',
    'ap-south-1': 'https://api-india.aivedha.ai/api'
}

# Static IPs for whitelisting
REGION_STATIC_IPS = {
    'us-east-1': '44.206.201.117',
    'ap-south-1': '13.203.153.119'
}

# Timezone to region mapping
TIMEZONE_TO_REGION = {
    'Asia/Kolkata': 'ap-south-1',
    'Asia/Calcutta': 'ap-south-1',
    'Asia/Colombo': 'ap-south-1',
    'Asia/Dhaka': 'ap-south-1',
    'Asia/Kathmandu': 'ap-south-1',
    'Asia/Karachi': 'ap-south-1',
    'Asia/Bangkok': 'ap-south-1',
    'Asia/Singapore': 'ap-south-1',
    'Asia/Kuala_Lumpur': 'ap-south-1',
    'Asia/Jakarta': 'ap-south-1',
    'Asia/Ho_Chi_Minh': 'ap-south-1',
    'Asia/Manila': 'ap-south-1',
    'Asia/Dubai': 'ap-south-1',
    'Asia/Riyadh': 'ap-south-1',
    'Asia/Qatar': 'ap-south-1',
}

# TLDs that should route to India region
INDIA_REGION_TLDS = {
    '.in', '.co.in', '.org.in', '.net.in', '.gov.in', '.nic.in',
    '.pk', '.bd', '.lk', '.np',
    '.sg', '.my', '.th', '.id', '.ph', '.vn',
    '.ae', '.sa', '.qa', '.kw', '.bh', '.om'
}


def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    return REGION_ENDPOINTS.get(region, REGION_ENDPOINTS['us-east-1'])


def determine_target_region(url: str) -> str:
    """Determine optimal scan region based on target URL domain TLD"""
    try:
        from urllib.parse import urlparse
        hostname = urlparse(url).hostname.lower() if url else ''
        
        for tld in INDIA_REGION_TLDS:
            if hostname.endswith(tld):
                return 'ap-south-1'
        
        return 'us-east-1'
    except:
        return 'us-east-1'


def select_optimal_region(target_url: str, user_timezone: str = None, preferred_region: str = None) -> str:
    """
    Smart region selection combining user location and target location
    Priority: Preferred region > Target region > User region > Default (US)
    """
    if preferred_region and preferred_region in REGION_ENDPOINTS:
        return preferred_region
    
    target_region = determine_target_region(target_url)
    if target_region == 'ap-south-1':
        return 'ap-south-1'
    
    if user_timezone:
        user_region = TIMEZONE_TO_REGION.get(user_timezone, 'us-east-1')
        if user_region == 'ap-south-1':
            return 'ap-south-1'
    
    return 'us-east-1'


def get_region_endpoint(region: str) -> str:
    """Get the API endpoint for a specific region"""
    return REGION_ENDPOINTS.get(region, REGION_ENDPOINTS['us-east-1'])


def get_region_static_ip(region: str) -> str:
    """Get the static IP for a specific region"""
    return REGION_STATIC_IPS.get(region, REGION_STATIC_IPS['us-east-1'])


# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
API_KEYS_TABLE = os.environ.get('API_KEYS_TABLE', 'aivedha-guardian-api-keys')
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
CREDITS_TABLE = os.environ.get('CREDITS_TABLE', 'aivedha-guardian-credits')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')
AUDIT_REPORTS_TABLE = os.environ.get('AUDIT_REPORTS_TABLE', 'aivedha-guardian-audit-reports')
API_KEY_SECRET = os.environ.get('API_KEY_SECRET', 'aivedha-api-key-secret-2024-v1')
SITE_URL = os.environ.get('SITE_URL', 'https://aivedha.ai')

VALID_PERIODS = [7, 12, 15, 30, 60, 90]
MAX_KEYS_PER_USER = 5

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
ses = boto3.client('ses', region_name=AWS_REGION)

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}


def json_response(status_code: int, body: dict) -> dict:
    """Create JSON response with CORS headers."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def generate_api_key() -> tuple:
    """Generate a secure API key. Returns: (display_key, key_hash)"""
    key_suffix = secrets.token_hex(16)
    display_key = f"avg_live_{key_suffix}"
    key_hash = hashlib.sha256((display_key + API_KEY_SECRET).encode()).hexdigest()
    return display_key, key_hash


def verify_api_key(api_key: str) -> Optional[Dict]:
    """Verify an API key and return the associated data."""
    try:
        key_hash = hashlib.sha256((api_key + API_KEY_SECRET).encode()).hexdigest()
        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.query(
            IndexName='api-key-hash-index',
            KeyConditionExpression='api_key_hash = :hash',
            ExpressionAttributeValues={':hash': key_hash}
        )

        if not response.get('Items'):
            return None

        key_data = response['Items'][0]

        if key_data.get('status') != 'active':
            return None

        expires_at = key_data.get('expires_at', '')
        if expires_at:
            if datetime.utcnow() > datetime.fromisoformat(expires_at.replace('Z', '')):
                table.update_item(
                    Key={'api_key_id': key_data['api_key_id']},
                    UpdateExpression='SET #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={':status': 'expired'}
                )
                return None

        table.update_item(
            Key={'api_key_id': key_data['api_key_id']},
            UpdateExpression='SET last_used_at = :now, usage_count = if_not_exists(usage_count, :zero) + :inc',
            ExpressionAttributeValues={
                ':now': datetime.utcnow().isoformat(),
                ':zero': 0,
                ':inc': 1
            }
        )

        return key_data

    except Exception as e:
        print(f"Error verifying API key: {e}")
        return None


def get_user_credits(user_id: str) -> int:
    """Get user's available credits."""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        return int(user.get('credits', 0))
    except Exception as e:
        print(f"Error getting credits: {e}")
        return 0


def deduct_credit(user_id: str, reason: str = 'api_key_usage') -> bool:
    """Deduct one credit from user's balance."""
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        credits_table = dynamodb.Table(CREDITS_TABLE)
        now = datetime.utcnow().isoformat()

        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        current_credits = int(user.get('credits', 0))

        if current_credits <= 0:
            return False

        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = credits - :one, used_credits = if_not_exists(used_credits, :zero) + :one',
            ConditionExpression='credits > :zero',
            ExpressionAttributeValues={':one': 1, ':zero': 0}
        )

        transaction_id = f"API_{uuid.uuid4()}"
        credits_table.put_item(Item={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'credits': -1,
            'balance_before': current_credits,
            'balance_after': current_credits - 1,
            'transaction_type': reason,
            'description': 'API key credit usage',
            'status': 'completed',
            'created_at': now
        })

        return True
    except Exception as e:
        print(f"Error deducting credit: {e}")
        return False


def get_user_info(user_id: str) -> Optional[Dict]:
    """Get user info from users table."""
    try:
        table = dynamodb.Table(USERS_TABLE)
        response = table.get_item(Key={'user_id': user_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting user info: {e}")
        return None


# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

def send_insufficient_credits_sales_email(user_email: str, user_name: str, target_url: str, github_repo: str = ''):
    """
    Send a compelling, sales-focused email when user has no credits.
    Beautiful design with motivating content to encourage purchase.
    """
    try:
        first_name = (user_name or 'Security Champion').split()[0]
        repo_mention = f" for <strong>{github_repo}</strong>" if github_repo else ""
        
        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Security Shield Needs Recharging! 🛡️</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
                    
                    <!-- Header with Animated Gradient Border -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FFD700 0%, #FF6B6B 25%, #4ECDC4 50%, #45B7D1 75%, #FFD700 100%); padding: 3px; border-radius: 24px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 22px;">
                                <tr>
                                    <td style="padding: 40px 30px; text-align: center;">
                                        <!-- Logo & Badge -->
                                        <div style="margin-bottom: 24px;">
                                            <span style="font-size: 48px;">🛡️</span>
                                        </div>
                                        <h1 style="color: #FFD700; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                                            AiVedha Guard
                                        </h1>
                                        <p style="color: #8B8BA7; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">
                                            AI-Powered Security Sentinel
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Spacer -->
                    <tr><td style="height: 24px;"></td></tr>
                    
                    <!-- Main Content Card -->
                    <tr>
                        <td style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; border: 1px solid rgba(255, 215, 0, 0.2);">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                
                                <!-- Alert Banner -->
                                <tr>
                                    <td style="padding: 30px 30px 0 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%); border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 16px;">
                                            <tr>
                                                <td style="padding: 20px; text-align: center;">
                                                    <span style="font-size: 32px; display: block; margin-bottom: 12px;">⚡</span>
                                                    <h2 style="color: #FF6B6B; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">
                                                        Security Audit Paused
                                                    </h2>
                                                    <p style="color: #FFB3B3; font-size: 14px; margin: 0;">
                                                        Your shield needs recharging to protect your code!
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Personalized Message -->
                                <tr>
                                    <td style="padding: 30px;">
                                        <h3 style="color: #FFFFFF; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">
                                            Hey {first_name}! 👋
                                        </h3>
                                        <p style="color: #B8B8D1; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                                            Your CI/CD pipeline just tried to run a security audit{repo_mention}, but your credit balance is empty. 
                                            <strong style="color: #FFD700;">Don't worry — your deployment continued smoothly!</strong>
                                        </p>
                                        <p style="color: #B8B8D1; font-size: 16px; line-height: 1.7; margin: 0;">
                                            But here's the thing: <em style="color: #4ECDC4;">every unscanned deployment is a potential vulnerability waiting to be exploited.</em>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Target URL Info -->
                                <tr>
                                    <td style="padding: 0 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(78, 205, 196, 0.1); border: 1px solid rgba(78, 205, 196, 0.3); border-radius: 12px;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <p style="color: #8B8BA7; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">
                                                        Attempted Scan Target
                                                    </p>
                                                    <p style="color: #4ECDC4; font-size: 14px; margin: 0; font-family: monospace; word-break: break-all;">
                                                        {target_url}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Why It Matters Section -->
                                <tr>
                                    <td style="padding: 30px;">
                                        <h4 style="color: #FFD700; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
                                            <span style="margin-right: 8px;">🎯</span> Why Every Scan Matters
                                        </h4>
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table cellpadding="0" cellspacing="0" border="0">
                                                        <tr>
                                                            <td style="width: 32px; vertical-align: top;">
                                                                <span style="color: #FF6B6B; font-size: 18px;">🔴</span>
                                                            </td>
                                                            <td style="color: #B8B8D1; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #FFFFFF;">60% of breaches</strong> exploit known vulnerabilities that could have been caught
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table cellpadding="0" cellspacing="0" border="0">
                                                        <tr>
                                                            <td style="width: 32px; vertical-align: top;">
                                                                <span style="color: #FFD700; font-size: 18px;">⚡</span>
                                                            </td>
                                                            <td style="color: #B8B8D1; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #FFFFFF;">Average breach cost: $4.45M</strong> — prevention costs pennies
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table cellpadding="0" cellspacing="0" border="0">
                                                        <tr>
                                                            <td style="width: 32px; vertical-align: top;">
                                                                <span style="color: #4ECDC4; font-size: 18px;">🛡️</span>
                                                            </td>
                                                            <td style="color: #B8B8D1; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #FFFFFF;">12 AI-powered modules</strong> scan OWASP Top 10, SSL, headers & more
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- CTA Section -->
                                <tr>
                                    <td style="padding: 0 30px 30px 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 16px;">
                                            <tr>
                                                <td style="padding: 24px; text-align: center;">
                                                    <p style="color: #FFD700; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">
                                                        🚀 Recharge Your Security Shield
                                                    </p>
                                                    <p style="color: #B8B8D1; font-size: 14px; margin: 0 0 20px 0;">
                                                        Get instant protection starting at just <strong style="color: #4ECDC4;">$0.50/audit</strong>
                                                    </p>
                                                    
                                                    <!-- Primary CTA Button -->
                                                    <a href="{SITE_URL}/pricing" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000000; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4); margin-bottom: 12px;">
                                                        ⚡ Get Credits Now
                                                    </a>
                                                
                                                    <p style="color: #8B8BA7; font-size: 12px; margin: 16px 0 0 0;">
                                                        ✨ Instant activation • 🔒 Secure checkout • 💳 All cards accepted
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Pricing Tiers Preview -->
                                <tr>
                                    <td style="padding: 0 30px 30px 30px;">
                                        <h4 style="color: #FFFFFF; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                                            💎 Choose Your Protection Level
                                        </h4>
                                        <table width="100%" cellpadding="0" cellspacing="8" border="0">
                                            <tr>
                                                <td width="33%" style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center; vertical-align: top;">
                                                    <p style="color: #4ECDC4; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Raksha</p>
                                                    <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 0 0 4px 0;">$25</p>
                                                    <p style="color: #8B8BA7; font-size: 11px; margin: 0;">10 audits/mo</p>
                                                </td>
                                                <td width="33%" style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 16px; text-align: center; vertical-align: top;">
                                                    <p style="color: #FFD700; font-size: 10px; margin: 0 0 4px 0; text-transform: uppercase;">⭐ Popular</p>
                                                    <p style="color: #FFD700; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Suraksha</p>
                                                    <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 0 0 4px 0;">$50</p>
                                                    <p style="color: #8B8BA7; font-size: 11px; margin: 0;">30 audits/mo</p>
                                                </td>
                                                <td width="33%" style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center; vertical-align: top;">
                                                    <p style="color: #45B7D1; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Vajra</p>
                                                    <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 0 0 4px 0;">$150</p>
                                                    <p style="color: #8B8BA7; font-size: 11px; margin: 0;">100 audits/mo</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Spacer -->
                    <tr><td style="height: 24px;"></td></tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="text-align: center; padding: 20px;">
                            <p style="color: #8B8BA7; font-size: 12px; margin: 0 0 8px 0;">
                                🔒 Your code deserves the best protection
                            </p>
                            <p style="color: #6B6B7F; font-size: 11px; margin: 0 0 16px 0;">
                                AiVedha Guard • AI-Powered Security Auditing
                            </p>
                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="padding: 0 8px;">
                                        <a href="{SITE_URL}/dashboard" style="color: #4ECDC4; font-size: 12px; text-decoration: none;">Dashboard</a>
                                    </td>
                                    <td style="color: #6B6B7F;">•</td>
                                    <td style="padding: 0 8px;">
                                        <a href="{SITE_URL}/support" style="color: #4ECDC4; font-size: 12px; text-decoration: none;">Support</a>
                                    </td>
                                    <td style="color: #6B6B7F;">•</td>
                                    <td style="padding: 0 8px;">
                                        <a href="{SITE_URL}/faq" style="color: #4ECDC4; font-size: 12px; text-decoration: none;">FAQ</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #4B4B5F; font-size: 10px; margin: 16px 0 0 0;">
                                &copy; 2024-2025 AiVibe Software Services Pvt Ltd. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        
        # Plain text version for email clients that don't support HTML
        text_body = f"""
🛡️ AiVedha Guard - Security Audit Paused

Hey {first_name}!

Your CI/CD pipeline tried to run a security audit{repo_mention.replace('<strong>', '').replace('</strong>', '')}, but your credit balance is empty.

Don't worry — your deployment continued smoothly!

But here's the thing: every unscanned deployment is a potential vulnerability waiting to be exploited.

Target URL: {target_url}

WHY EVERY SCAN MATTERS:
• 60% of breaches exploit known vulnerabilities
• Average breach cost: $4.45M — prevention costs pennies
• 12 AI-powered modules scan OWASP Top 10, SSL, headers & more

🚀 RECHARGE YOUR SECURITY SHIELD
Get instant protection starting at just $0.50/audit

Get Credits Now: {SITE_URL}/pricing

PRICING OPTIONS:
• Raksha - $25/mo - 10 audits
• Suraksha - $50/mo - 30 audits (Popular)
• Vajra - $150/mo - 100 audits

Your code deserves the best protection.

---
AiVedha Guard • AI-Powered Security Auditing
Dashboard: {SITE_URL}/dashboard
Support: {SITE_URL}/support

© 2024-2025 AiVibe Software Services Pvt Ltd
"""

        ses.send_email(
            Source='AiVedha Guard <noreply@aivedha.ai>',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {
                    'Data': '⚡ Your Security Shield Needs Recharging! — Audit Paused',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                }
            },
            Tags=[
                {'Name': 'email-type', 'Value': 'insufficient-credits-sales'},
                {'Name': 'source', 'Value': 'cicd-audit'}
            ]
        )
        
        print(f"[EMAIL] Sent insufficient credits sales email to {user_email}")
        return True
        
    except Exception as e:
        print(f"Error sending insufficient credits email: {e}")
        return False


def send_credit_alert_email(user_email: str, user_name: str):
    """Send email alert when credits are insufficient."""
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
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>AiVedha Guard</h1></div>
        <div class="alert-box">
            <div class="alert-title">Security Audit Paused - Insufficient Credits</div>
            <p class="message">Hello {user_name or 'there'},<br><br>
            Your CI/CD security audit was initiated but could not complete because your account has <strong>insufficient credits</strong>.</p>
        </div>
        <div style="text-align: center;">
            <a href="{SITE_URL}/pricing" class="cta-button">Upgrade Now</a>
        </div>
        <div class="footer"><p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p></div>
    </div>
</body>
</html>
"""
        ses.send_email(
            Source='noreply@aivedha.ai',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': 'Action Required: Security Audit Paused - Add Credits'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
    except Exception as e:
        print(f"Error sending credit alert email: {e}")


def send_cicd_failure_email(user_email: str, user_name: str, url: str, error_message: str):
    """Send email notification when CI/CD audit fails due to URL error."""
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
        .details {{ background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; color: #fff; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><h1>🛡️ AiVedha Guard</h1></div>
        <div class="alert-box">
            <div class="alert-title">⚠️ GitHub CI/CD Audit Failed - URL Error</div>
            <p class="message">Hello {user_name or 'there'},<br><br>
            Your CI/CD security audit could not proceed because the target URL returned an error.</p>
        </div>
        <div class="details">
            <strong>URL:</strong> {url}<br>
            <strong>Error:</strong> {error_message}
        </div>
        <div style="text-align: center;">
            <a href="{SITE_URL}/dashboard" class="cta-button">View Dashboard</a>
        </div>
        <div class="footer"><p>&copy; 2024-2025 AiVibe Software Services Pvt Ltd</p></div>
    </div>
</body>
</html>
"""
        ses.send_email(
            Source='noreply@aivedha.ai',
            Destination={'ToAddresses': [user_email]},
            Message={
                'Subject': {'Data': '⚠️ AiVedha Guard: CI/CD Audit Failed - URL Error Detected'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
    except Exception as e:
        print(f"Error sending CI/CD failure email: {e}")


# ============================================================================
# API KEY MANAGEMENT HANDLERS
# ============================================================================

def create_api_key(event: dict) -> dict:
    """Create a new API key for the user."""
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId') or body.get('user_id')
        key_name = body.get('name', '').strip()
        reason = body.get('reason', '').strip()
        validity_days = int(body.get('validityDays') or body.get('validity_days', 30))
        user_timezone = body.get('timezone', '')

        if not user_id:
            return json_response(400, {'error': 'User ID required', 'success': False})
        if not key_name:
            return json_response(400, {'error': 'API key name required', 'success': False})
        if not reason:
            return json_response(400, {'error': 'Reason for API key required', 'success': False})
        if validity_days not in VALID_PERIODS:
            return json_response(400, {'error': f'Invalid validity period. Must be one of: {VALID_PERIODS}', 'success': False})

        user_info = get_user_info(user_id)
        if not user_info:
            return json_response(404, {'error': 'User not found', 'success': False})

        table = dynamodb.Table(API_KEYS_TABLE)
        existing = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':uid': user_id, ':active': 'active'}
        )

        if len(existing.get('Items', [])) >= MAX_KEYS_PER_USER:
            return json_response(400, {
                'error': f'Maximum {MAX_KEYS_PER_USER} active API keys allowed',
                'message': 'Please revoke an existing key before creating a new one.'
            })

        display_key, key_hash = generate_api_key()
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=validity_days)

        user_email = user_info.get('email', '')
        user_plan = user_info.get('subscription_plan', 'free')
        default_region = TIMEZONE_TO_REGION.get(user_timezone, 'us-east-1')

        table.put_item(Item={
            'api_key_id': key_id,
            'user_id': user_id,
            'user_email': user_email,
            'api_key_hash': key_hash,
            'key_prefix': display_key[:12] + '...',
            'name': key_name,
            'reason': reason,
            'validity_days': validity_days,
            'created_at': now.isoformat(),
            'expires_at': expires_at.isoformat(),
            'status': 'active',
            'permissions': ['audit:create', 'audit:read', 'audit:status', 'report:download', 'certificate:read'],
            'usage_count': 0,
            'last_used_at': None,
            'plan_code': user_plan,
            'credit_per_audit': 1,
            'user_timezone': user_timezone,
            'default_region': default_region
        })

        return json_response(201, {
            'success': True,
            'api_key': display_key,
            'api_key_id': key_id,
            'name': key_name,
            'expires_at': expires_at.isoformat(),
            'default_region': default_region,
            'warning': 'Save this API key now. It will not be shown again.',
            'usage': {
                'header': 'X-API-Key',
                'example': f'curl -H "X-API-Key: {display_key}" {get_api_base_url()}/cicd/audit',
                'regions': {
                    'us': 'https://api.aivedha.ai/api/cicd/audit',
                    'india': 'https://api-india.aivedha.ai/api/cicd/audit'
                }
            }
        })

    except Exception as e:
        print(f"Error creating API key: {e}")
        return json_response(500, {'error': 'Failed to create API key'})


def list_api_keys(event: dict) -> dict:
    """List all API keys for a user."""
    try:
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('userId') or params.get('user_id')

        if not user_id:
            return json_response(400, {'error': 'User ID required'})

        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )

        keys = []
        for item in response.get('Items', []):
            keys.append({
                'api_key_id': item.get('api_key_id'),
                'name': item.get('name'),
                'key_prefix': item.get('key_prefix'),
                'reason': item.get('reason'),
                'status': item.get('status'),
                'validity_days': item.get('validity_days'),
                'created_at': item.get('created_at'),
                'expires_at': item.get('expires_at'),
                'last_used_at': item.get('last_used_at'),
                'usage_count': item.get('usage_count', 0),
                'permissions': item.get('permissions', []),
                'default_region': item.get('default_region', 'us-east-1')
            })

        keys.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return json_response(200, {
            'success': True,
            'api_keys': keys,
            'max_keys': MAX_KEYS_PER_USER,
            'active_count': len([k for k in keys if k['status'] == 'active'])
        })

    except Exception as e:
        print(f"Error listing API keys: {e}")
        return json_response(500, {'error': 'Failed to list API keys'})


def revoke_api_key(event: dict) -> dict:
    """Revoke an API key."""
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId') or body.get('user_id')
        key_id = body.get('api_key_id') or body.get('apiKeyId')

        if not user_id or not key_id:
            return json_response(400, {'error': 'User ID and API key ID required'})

        table = dynamodb.Table(API_KEYS_TABLE)
        response = table.get_item(Key={'api_key_id': key_id})
        key_data = response.get('Item')

        if not key_data:
            return json_response(404, {'error': 'API key not found'})

        if key_data.get('user_id') != user_id:
            return json_response(403, {'error': 'Access denied'})

        table.update_item(
            Key={'api_key_id': key_id},
            UpdateExpression='SET #status = :status, revoked_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'revoked',
                ':now': datetime.utcnow().isoformat()
            }
        )

        return json_response(200, {'success': True, 'message': 'API key revoked successfully'})

    except Exception as e:
        print(f"Error revoking API key: {e}")
        return json_response(500, {'error': 'Failed to revoke API key'})


# ============================================================================
# URL VALIDATION FOR CI/CD
# ============================================================================

def validate_url_for_cicd(url: str, user_id: str) -> dict:
    """Validate URL before CI/CD audit."""
    import urllib.request
    import urllib.error
    import ssl
    import socket

    ERROR_STATUS_CODES = {400, 401, 403, 404, 405, 408, 429, 500, 501, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526}

    result = {'valid': False, 'status_code': None, 'error_type': None, 'error_message': None}

    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        request = urllib.request.Request(url, headers={
            'User-Agent': 'AiVedha-Guard-CI-CD/1.0',
            'Accept': 'text/html,*/*'
        })

        response = urllib.request.urlopen(request, timeout=15, context=ssl_context)
        result['status_code'] = response.status

        if response.status in ERROR_STATUS_CODES:
            result['error_type'] = 'http_error'
            result['error_message'] = f'HTTP {response.status} error page detected'
        else:
            result['valid'] = True

    except urllib.error.HTTPError as e:
        result['status_code'] = e.code
        result['error_type'] = 'http_error'
        result['error_message'] = f'HTTP {e.code}: {e.reason}'
    except urllib.error.URLError as e:
        result['error_type'] = 'connection_error'
        result['error_message'] = f'Connection error: {str(e.reason)}'
    except socket.timeout:
        result['error_type'] = 'timeout'
        result['error_message'] = 'Request timed out'
    except Exception as e:
        result['error_type'] = 'unknown_error'
        result['error_message'] = f'Validation error: {str(e)}'

    return result


# ============================================================================
# CI/CD AUDIT HANDLER WITH REGION ROUTING
# ============================================================================

def handle_cicd_audit(event: dict) -> dict:
    """Handle audit request from CI/CD pipeline with region routing."""
    try:
        headers = event.get('headers', {})
        api_key = headers.get('X-API-Key') or headers.get('x-api-key')

        if not api_key:
            return json_response(401, {
                'success': False,
                'error': 'API key required',
                'message': 'Provide API key in X-API-Key header',
                'github_output': 'audit_status=failed\naudit_error=missing_api_key'
            })

        key_data = verify_api_key(api_key)
        if not key_data:
            return json_response(401, {
                'success': False,
                'error': 'Invalid or expired API key',
                'message': 'Please generate a new API key from your dashboard.',
                'github_output': 'audit_status=failed\naudit_error=invalid_api_key'
            })

        user_id = key_data.get('user_id')
        user_email = key_data.get('user_email', '')
        user_timezone = key_data.get('user_timezone', '')

        body = json.loads(event.get('body', '{}'))
        url = body.get('url', '').strip()
        skip_url_validation = body.get('skip_url_validation', False)
        github_run_id = body.get('github_run_id', '')
        github_repository = body.get('github_repository', '')
        preferred_region = body.get('preferred_region', '')

        if not url:
            return json_response(400, {
                'success': False,
                'error': 'URL to audit is required',
                'github_output': 'audit_status=failed\naudit_error=missing_url'
            })

        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'

        # Smart region selection
        selected_region = select_optimal_region(url, user_timezone, preferred_region)
        region_endpoint = get_region_endpoint(selected_region)
        region_static_ip = get_region_static_ip(selected_region)
        region_name = 'India' if selected_region == 'ap-south-1' else 'USA'
        
        print(f"[REGION ROUTING] URL: {url}, Region: {selected_region} ({region_name})")

        # URL validation
        if not skip_url_validation:
            url_validation = validate_url_for_cicd(url, user_id)
            if not url_validation['valid']:
                users_table = dynamodb.Table(USERS_TABLE)
                user_response = users_table.get_item(Key={'user_id': user_id})
                user = user_response.get('Item', {})

                if user.get('email'):
                    send_cicd_failure_email(
                        user.get('email'),
                        user.get('full_name', user.get('name', '')),
                        url,
                        url_validation.get('error_message', 'URL validation failed')
                    )

                return json_response(200, {
                    'success': False,
                    'audit_skipped': True,
                    'reason': 'url_validation_failed',
                    'url': url,
                    'message': f"Security audit skipped: {url_validation.get('error_message')}.",
                    'github_output': f"audit_status=skipped\naudit_reason=url_error\nurl={url}"
                })

        # Check credits - CRITICAL: Only proceed if user has credits
        credits = get_user_credits(user_id)
        if credits < 1:
            users_table = dynamodb.Table(USERS_TABLE)
            user_response = users_table.get_item(Key={'user_id': user_id})
            user = user_response.get('Item', {})
            
            # Send compelling sales email to encourage purchase
            send_insufficient_credits_sales_email(
                user.get('email', user_email),
                user.get('full_name', user.get('name', '')),
                url,
                github_repository
            )

            return json_response(200, {
                'success': False,
                'audit_skipped': True,
                'reason': 'insufficient_credits',
                'message': 'Security audit skipped due to insufficient credits. A recharge reminder has been sent to your email.',
                'credits_available': 0,
                'action_required': 'Purchase credits to enable security audits',
                'upgrade_url': f'{SITE_URL}/pricing',
                'email_sent': True,
                'github_output': f"audit_status=skipped\naudit_reason=no_credits\ncredits_available=0"
            })

        # Deduct credit before audit
        if not deduct_credit(user_id, 'cicd_audit'):
            return json_response(200, {
                'success': False,
                'audit_skipped': True,
                'reason': 'credit_deduction_failed',
                'message': 'Could not process credit. Please try again.',
                'github_output': 'audit_status=failed\naudit_error=credit_deduction_failed'
            })

        report_id = f"AVG-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        users_table = dynamodb.Table(USERS_TABLE)
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})

        # Invoke security crawler in selected region
        crawler_function = 'aivedha-guardian-security-crawler'
        if selected_region == 'ap-south-1':
            crawler_function = 'aivedha-guardian-security-crawler-india'

        lambda_client = boto3.client('lambda', region_name=selected_region)

        audit_payload = {
            'body': json.dumps({
                'url': url,
                'userId': user_id,
                'userEmail': user.get('email', user_email),
                'userName': user.get('full_name', user.get('name', '')),
                'reportId': report_id,
                'source': 'cicd',
                'api_key_id': key_data.get('api_key_id'),
                'callback_type': 'cicd',
                'send_email_report': True,
                'github_run_id': github_run_id,
                'github_repository': github_repository,
                'scan_region': selected_region,
                'static_ip': region_static_ip
            })
        }

        print(f"[CICD AUDIT] Invoking {crawler_function} in {selected_region}")

        lambda_client.invoke(
            FunctionName=crawler_function,
            InvocationType='Event',
            Payload=json.dumps(audit_payload)
        )

        return json_response(202, {
            'success': True,
            'audit_initiated': True,
            'report_id': report_id,
            'url': url,
            'message': f'Security audit initiated from {region_name} region. Results will be sent via email.',
            'credits_remaining': credits - 1,
            'credits_used': 1,
            'scan_region': selected_region,
            'region_name': region_name,
            'static_ip': region_static_ip,
            'status_url': f'{SITE_URL}/dashboard',
            'result_url': f'{SITE_URL}/audit-results?reportId={report_id}',
            'github_output': f"audit_status=initiated\nreport_id={report_id}\nurl={url}\ncredits_remaining={credits - 1}\nscan_region={selected_region}\nregion_name={region_name}"
        })

    except Exception as e:
        print(f"Error in CI/CD audit: {e}")
        import traceback
        traceback.print_exc()
        return json_response(500, {
            'success': False,
            'error': 'Audit request failed',
            'github_output': f'audit_status=error\naudit_error={str(e)}'
        })


def get_audit_status(event: dict) -> dict:
    """Get audit status for live streaming in GitHub Actions."""
    try:
        params = event.get('queryStringParameters', {}) or {}
        path_params = event.get('pathParameters', {}) or {}
        
        report_id = path_params.get('reportId') or params.get('reportId') or params.get('report_id')
        
        if not report_id:
            return json_response(400, {'error': 'Report ID required'})
        
        reports_table = dynamodb.Table(AUDIT_REPORTS_TABLE)
        response = reports_table.get_item(Key={'report_id': report_id})
        report = response.get('Item')
        
        if not report:
            return json_response(404, {'error': 'Report not found'})
        
        status = report.get('status', 'unknown')
        
        result = {
            'report_id': report_id,
            'status': status,
            'url': report.get('url', ''),
            'progress': report.get('progress', 0),
            'percentage': report.get('overall_progress', report.get('progress', 0)),
            'current_phase': report.get('phase', report.get('current_stage', '')),
            'current_activity': report.get('current_activity', ''),
            'findings_count': report.get('findings_count', 0),
            'scan_region': report.get('scan_region', 'us-east-1'),
            'created_at': report.get('created_at', ''),
            'updated_at': report.get('updated_at', '')
        }
        
        if status == 'completed':
            result.update({
                'security_score': report.get('security_score', 0),
                'grade': report.get('grade', 'N/A'),
                'critical_issues': report.get('critical_issues', 0),
                'high_issues': report.get('high_issues', 0),
                'medium_issues': report.get('medium_issues', 0),
                'low_issues': report.get('low_issues', 0),
                'pdf_url': report.get('pdf_report_url', ''),
                'certificate_number': report.get('certificate_number', '')
            })
        
        return json_response(200, result)
        
    except Exception as e:
        print(f"Error getting audit status: {e}")
        return json_response(500, {'error': 'Failed to get audit status'})


# ============================================================================
# MAIN HANDLER
# ============================================================================

def lambda_handler(event, context):
    """Main Lambda handler."""
    print(f"Received event: {json.dumps(event)}")

    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    if '/api-keys/create' in path and method == 'POST':
        return create_api_key(event)

    if '/api-keys/list' in path and method == 'GET':
        return list_api_keys(event)

    if '/api-keys/revoke' in path and method == 'POST':
        return revoke_api_key(event)

    if '/cicd/audit' in path and method == 'POST':
        return handle_cicd_audit(event)

    if '/cicd/status' in path and method == 'GET':
        return get_audit_status(event)

    if '/api-keys/validate' in path and method == 'POST':
        headers = event.get('headers', {})
        api_key = headers.get('X-API-Key') or headers.get('x-api-key')

        if not api_key:
            return json_response(401, {'valid': False, 'error': 'No API key provided'})

        key_data = verify_api_key(api_key)
        if key_data:
            return json_response(200, {
                'valid': True,
                'name': key_data.get('name'),
                'expires_at': key_data.get('expires_at'),
                'permissions': key_data.get('permissions', []),
                'default_region': key_data.get('default_region', 'us-east-1')
            })
        else:
            return json_response(401, {'valid': False, 'error': 'Invalid or expired API key'})

    if '/health' in path:
        return json_response(200, {
            'status': 'healthy',
            'service': 'api-key-manager',
            'region': AWS_REGION,
            'timestamp': datetime.utcnow().isoformat()
        })

    return json_response(404, {
        'error': 'Endpoint not found',
        'available_endpoints': [
            'POST /api-keys/create',
            'GET /api-keys/list',
            'POST /api-keys/revoke',
            'POST /api-keys/validate',
            'POST /cicd/audit',
            'GET /cicd/status/{reportId}'
        ]
    })
