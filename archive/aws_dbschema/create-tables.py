import boto3
import json
from datetime import datetime

def create_dynamodb_tables():
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')
    
    tables = [
        {
            'TableName': 'aivedha-users',
            'AttributeDefinitions': [
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'email', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-audit-reports',
            'AttributeDefinitions': [
                {'AttributeName': 'report_id', 'AttributeType': 'S'},
                {'AttributeName': 'certificate_number', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'report_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'certificate-index',
                'KeySchema': [{'AttributeName': 'certificate_number', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        }
    ]
    
    for table in tables:
        try:
            dynamodb.create_table(**table)
            print(f"Created {table['TableName']}")
        except Exception as e:
            print(f"Table {table['TableName']} exists or error: {e}")

if __name__ == "__main__":
    create_dynamodb_tables()