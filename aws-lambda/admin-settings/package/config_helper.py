"""
Dynamic Configuration Helper
============================
Helper module for Lambda functions to read configuration from DynamoDB.
This allows secrets and settings to be managed through the admin UI
instead of environment variables.

Usage:
    from config_helper import get_config, get_jwt_secret, get_payment_config

    # Get a single config value
    jwt_secret = get_config('jwt', 'admin_jwt_secret')

    # Get all values for a category (PayPal USD only)
    paypal_config = get_payment_config('paypal')
"""

import boto3
import base64
import os
from functools import lru_cache

# Configuration table name
SETTINGS_TABLE = 'admin-system-settings'

# Cache TTL (in seconds)
CACHE_TTL = 300  # 5 minutes

# Boto3 resources (reused across invocations)
_dynamodb = None


def get_dynamodb():
    """Get or create DynamoDB resource."""
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    return _dynamodb


def decrypt_value(value):
    """Decrypt sensitive value."""
    if not value or not value.startswith('ENC:'):
        return value
    try:
        encoded = value.replace('ENC:', '')
        return base64.b64decode(encoded).decode()
    except:
        return value


@lru_cache(maxsize=128)
def _get_setting_cached(category, key):
    """
    Internal cached function to get a setting.
    Cache is per Lambda container, cleared on cold start.
    """
    dynamodb = get_dynamodb()
    table = dynamodb.Table(SETTINGS_TABLE)

    try:
        response = table.get_item(
            Key={'setting_category': category, 'setting_key': key}
        )
        if 'Item' in response:
            value = response['Item'].get('value', '')
            return decrypt_value(value)
    except Exception as e:
        print(f"Config error for {category}/{key}: {e}")

    return None


def get_config(category, key, default=None):
    """
    Get a configuration value from DynamoDB.
    Falls back to environment variable if not found in DB.

    Args:
        category: The setting category (e.g., 'jwt', 'payment_paypal')
        key: The setting key (e.g., 'admin_jwt_secret')
        default: Default value if not found

    Returns:
        The configuration value or default
    """
    # First try DynamoDB
    value = _get_setting_cached(category, key)
    if value:
        return value

    # Fall back to environment variable
    env_key = f"{category.upper()}_{key.upper()}"
    env_value = os.environ.get(env_key)
    if env_value:
        return env_value

    # Check for common env var names
    if key == 'admin_jwt_secret':
        env_value = os.environ.get('ADMIN_JWT_SECRET')
        if env_value:
            return env_value
    elif key == 'user_jwt_secret':
        env_value = os.environ.get('USER_JWT_SECRET') or os.environ.get('JWT_SECRET')
        if env_value:
            return env_value

    return default


def get_jwt_secret(admin=False):
    """
    Get JWT secret for token signing/verification.

    Args:
        admin: If True, get admin JWT secret; otherwise user JWT secret

    Returns:
        JWT secret string
    """
    key = 'admin_jwt_secret' if admin else 'user_jwt_secret'
    return get_config('jwt', key)


def get_jwt_expiry():
    """Get JWT expiry hours."""
    value = get_config('jwt', 'jwt_expiry_hours', '24')
    try:
        return int(value)
    except:
        return 24


def get_payment_config(provider='paypal'):
    """
    Get payment gateway configuration (PayPal USD only).

    Args:
        provider: 'paypal' (USD only - no other providers supported)

    Returns:
        Dict with payment configuration
    """
    category = f'payment_{provider}'
    dynamodb = get_dynamodb()
    table = dynamodb.Table(SETTINGS_TABLE)

    config = {}
    try:
        response = table.query(
            KeyConditionExpression='setting_category = :cat',
            ExpressionAttributeValues={':cat': category}
        )

        for item in response.get('Items', []):
            key = item['setting_key']
            value = decrypt_value(item.get('value', ''))
            config[key] = value

    except Exception as e:
        print(f"Payment config error for {provider}: {e}")

    return config


def get_ses_config():
    """Get AWS SES email configuration."""
    return {
        'sender_email': get_config('aws_ses', 'sender_email', 'noreply@aivedha.ai'),
        'admin_email': get_config('aws_ses', 'admin_email', 'admin@aivedha.ai'),
        'support_email': get_config('aws_ses', 'support_email', 'support@aivedha.ai'),
        'region': get_config('aws_ses', 'region', 'us-east-1'),
        'configuration_set': get_config('aws_ses', 'configuration_set', '')
    }


def get_s3_config():
    """Get AWS S3 configuration."""
    return {
        'reports_bucket': get_config('aws_s3', 'reports_bucket', 'aivedha-guardian-reports-us-east-1'),
        'website_bucket': get_config('aws_s3', 'website_bucket', 'aivedha-ai-website'),
        'region': get_config('aws_s3', 'region', 'us-east-1')
    }


def get_cognito_config():
    """Get AWS Cognito configuration."""
    return {
        'user_pool_id': get_config('aws_cognito', 'user_pool_id', ''),
        'app_client_id': get_config('aws_cognito', 'app_client_id', ''),
        'identity_pool_id': get_config('aws_cognito', 'identity_pool_id', ''),
        'region': get_config('aws_cognito', 'region', 'us-east-1')
    }


def get_subscription_plans():
    """Get subscription plan configuration."""
    return {
        'starter_price_usd': float(get_config('subscription_plans', 'starter_price_usd', '10')),
        'starter_credits': int(get_config('subscription_plans', 'starter_credits', '10')),
        'enterprise_price_usd': float(get_config('subscription_plans', 'enterprise_price_usd', '199')),
        'enterprise_credits': int(get_config('subscription_plans', 'enterprise_credits', '-1')),  # -1 = unlimited
        'free_credits': int(get_config('subscription_plans', 'free_credits', '1'))
    }


def get_security_audit_config():
    """Get security audit scanner configuration."""
    return {
        'max_scan_depth': int(get_config('security_audit', 'max_scan_depth', '3')),
        'timeout_seconds': int(get_config('security_audit', 'timeout_seconds', '120')),
        'rate_limit_per_minute': int(get_config('security_audit', 'rate_limit_per_minute', '10')),
        'enable_deep_scan': get_config('security_audit', 'enable_deep_scan', 'true').lower() == 'true',
        'enable_ai_analysis': get_config('security_audit', 'enable_ai_analysis', 'true').lower() == 'true'
    }


def get_feature_flag(flag_name, default=False):
    """
    Check if a feature flag is enabled.

    Args:
        flag_name: Name of the feature flag
        default: Default value if flag not found

    Returns:
        Boolean indicating if feature is enabled
    """
    value = get_config('feature_flags', flag_name)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'enabled')


def is_maintenance_mode():
    """Check if maintenance mode is enabled."""
    return get_feature_flag('maintenance_mode', False)


def clear_cache():
    """
    Clear the configuration cache.
    Call this if you need to force refresh of config values.
    """
    _get_setting_cached.cache_clear()


# Convenience functions for common patterns
def get_api_key(service):
    """Get API key for a service (google_recaptcha, github, etc.)"""
    key_map = {
        'recaptcha': 'google_recaptcha_secret',
        'recaptcha_site': 'google_recaptcha_site_key',
        'github': 'github_client_secret',
        'github_id': 'github_client_id'
    }
    key = key_map.get(service, f'{service}_key')
    return get_config('api_keys', key)
