import boto3
import json
import hashlib
from datetime import datetime

def create_admin_tables():
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')
    
    admin_tables = [
        {
            'TableName': 'aivedha-admin-users',
            'AttributeDefinitions': [
                {'AttributeName': 'admin_id', 'AttributeType': 'S'},
                {'AttributeName': 'email', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'admin_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'email-index',
                'KeySchema': [{'AttributeName': 'email', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-support-tickets',
            'AttributeDefinitions': [
                {'AttributeName': 'ticket_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'ticket_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'user-tickets-index',
                'KeySchema': [
                    {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-payment-gateways',
            'AttributeDefinitions': [
                {'AttributeName': 'gateway_id', 'AttributeType': 'S'},
                {'AttributeName': 'gateway_name', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'gateway_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'gateway-name-index',
                'KeySchema': [{'AttributeName': 'gateway_name', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-transactions',
            'AttributeDefinitions': [
                {'AttributeName': 'transaction_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'transaction_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'user-transactions-index',
                'KeySchema': [
                    {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-coupons',
            'AttributeDefinitions': [
                {'AttributeName': 'coupon_id', 'AttributeType': 'S'},
                {'AttributeName': 'coupon_code', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'coupon_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'coupon-code-index',
                'KeySchema': [{'AttributeName': 'coupon_code', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-pdf-templates',
            'AttributeDefinitions': [
                {'AttributeName': 'template_id', 'AttributeType': 'S'},
                {'AttributeName': 'template_name', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'template_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'template-name-index',
                'KeySchema': [{'AttributeName': 'template_name', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-system-logs',
            'AttributeDefinitions': [
                {'AttributeName': 'log_id', 'AttributeType': 'S'},
                {'AttributeName': 'timestamp', 'AttributeType': 'S'},
                {'AttributeName': 'log_level', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'log_id', 'KeyType': 'HASH'},
                {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
            ],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'log-level-time-index',
                'KeySchema': [
                    {'AttributeName': 'log_level', 'KeyType': 'HASH'},
                    {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        }
    ]
    
    # Create tables
    for table in admin_tables:
        try:
            dynamodb.create_table(**table)
            print(f"Created {table['TableName']}")
        except Exception as e:
            print(f"Table {table['TableName']} exists or error: {e}")

def seed_super_admin():
    """Seed the super admin user"""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    admin_table = dynamodb.Table('aivedha-admin-users')
    
    # Hash password (in production, use proper bcrypt)
    password_hash = hashlib.sha256('123456'.encode()).hexdigest()
    
    super_admin = {
        'admin_id': 'admin_001',
        'email': 'aravind@aivibe.in',
        'password_hash': password_hash,
        'full_name': 'Aravind Jayamohan',
        'role': 'Super Admin',
        'location': 'Coimbatore, India',
        'permissions': ['all'],
        'created_at': datetime.now().isoformat(),
        'last_login': None,
        'status': 'active',
        'credits_granted': 10000
    }
    
    try:
        admin_table.put_item(Item=super_admin)
        print("Super admin seeded successfully")
    except Exception as e:
        print(f"Error seeding super admin: {e}")

def seed_payment_gateways():
    """Seed default payment gateways"""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    gateway_table = dynamodb.Table('aivedha-payment-gateways')
    
    gateways = [
        {
            'gateway_id': 'razorpay_001',
            'gateway_name': 'Razorpay',
            'status': 'active',
            'priority': 1,
            'currency': 'INR',
            'success_rate': 96.5,
            'configuration': {
                'api_key': '',
                'api_secret': '',
                'webhook_secret': ''
            },
            'created_at': datetime.now().isoformat()
        },
        {
            'gateway_id': 'payu_001',
            'gateway_name': 'PayU',
            'status': 'active',
            'priority': 2,
            'currency': 'INR',
            'success_rate': 94.2,
            'configuration': {
                'merchant_key': '',
                'salt': '',
                'test_mode': False
            },
            'created_at': datetime.now().isoformat()
        },
        {
            'gateway_id': 'zoho_001',
            'gateway_name': 'Zoho',
            'status': 'active',
            'priority': 3,
            'currency': 'USD',
            'success_rate': 98.1,
            'configuration': {
                'client_id': '',
                'client_secret': '',
                'organization_id': '',
                'environment': 'production'
            },
            'created_at': datetime.now().isoformat()
        },
        {
            'gateway_id': 'phonepe_001',
            'gateway_name': 'PhonePe',
            'status': 'maintenance',
            'priority': 4,
            'currency': 'INR',
            'success_rate': 92.8,
            'configuration': {
                'merchant_id': '',
                'salt_key': '',
                'salt_index': 1
            },
            'created_at': datetime.now().isoformat()
        },
        {
            'gateway_id': 'stripe_001',
            'gateway_name': 'Stripe',
            'status': 'active',
            'priority': 5,
            'currency': 'USD',
            'success_rate': 97.3,
            'configuration': {
                'publishable_key': '',
                'secret_key': '',
                'webhook_endpoint_secret': ''
            },
            'created_at': datetime.now().isoformat()
        }
    ]
    
    for gateway in gateways:
        try:
            gateway_table.put_item(Item=gateway)
            print(f"Seeded gateway: {gateway['gateway_name']}")
        except Exception as e:
            print(f"Error seeding gateway {gateway['gateway_name']}: {e}")

if __name__ == "__main__":
    print("Creating admin tables...")
    create_admin_tables()
    print("Seeding super admin...")
    seed_super_admin()
    print("Seeding payment gateways...")
    seed_payment_gateways()
    print("Admin setup complete!")