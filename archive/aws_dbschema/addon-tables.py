"""
AiVedha Guardian - Addon DynamoDB Tables
Version: 1.0.0

Creates the required DynamoDB tables for addon functionality:
- aivedha_whitelabel: White Label Certificate configurations
- aivedha_schedules: Scheduled Audits configurations
- aivedha_credits_log: Credit pack purchase logs
- aivedha_user_addons: User addon subscriptions tracking
"""

import boto3
from datetime import datetime

def create_addon_tables():
    """Create DynamoDB tables for addon functionality"""
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')

    addon_tables = [
        {
            'TableName': 'aivedha_whitelabel',
            'AttributeDefinitions': [
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'domain', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                {'AttributeName': 'domain', 'KeyType': 'RANGE'}
            ],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'domain-index',
                'KeySchema': [{'AttributeName': 'domain', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha_schedules',
            'AttributeDefinitions': [
                {'AttributeName': 'schedule_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'schedule_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'user-schedules-index',
                'KeySchema': [
                    {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha_credits_log',
            'AttributeDefinitions': [
                {'AttributeName': 'transaction_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'timestamp', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'transaction_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'user-credits-index',
                'KeySchema': [
                    {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha_user_addons',
            'AttributeDefinitions': [
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'addon_code', 'AttributeType': 'S'},
                {'AttributeName': 'status', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                {'AttributeName': 'addon_code', 'KeyType': 'RANGE'}
            ],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'addon-status-index',
                'KeySchema': [
                    {'AttributeName': 'addon_code', 'KeyType': 'HASH'},
                    {'AttributeName': 'status', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        }
    ]

    # Create tables
    for table in addon_tables:
        try:
            dynamodb.create_table(**table)
            print(f"Created {table['TableName']}")
        except dynamodb.exceptions.ResourceInUseException:
            print(f"Table {table['TableName']} already exists")
        except Exception as e:
            print(f"Error creating {table['TableName']}: {e}")


def describe_tables():
    """Describe the addon tables to verify creation"""
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')

    tables = [
        'aivedha_whitelabel',
        'aivedha_schedules',
        'aivedha_credits_log',
        'aivedha_user_addons'
    ]

    for table_name in tables:
        try:
            response = dynamodb.describe_table(TableName=table_name)
            status = response['Table']['TableStatus']
            item_count = response['Table'].get('ItemCount', 0)
            print(f"{table_name}: Status={status}, Items={item_count}")
        except Exception as e:
            print(f"{table_name}: Not found or error - {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("AiVedha Guardian - Addon Tables Setup")
    print("=" * 60)
    print()
    print("Creating addon tables...")
    create_addon_tables()
    print()
    print("Verifying table creation...")
    describe_tables()
    print()
    print("Addon tables setup complete!")
    print("=" * 60)
