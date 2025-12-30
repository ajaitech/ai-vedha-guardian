"""
AiVedha Guard - Audit Logs DynamoDB Table Schema
Version: 1.0.0

This table stores detailed audit metadata for compliance, analytics, and legal purposes.

Schema:
- log_id (PK): Unique log entry ID
- user_id: User identifier (email)
- GSI: user_id-index for querying by user
- GSI: url-index for querying by audited URL
- GSI: timestamp-index for time-based queries
"""

import boto3
from datetime import datetime

# AWS Configuration
REGION = 'us-east-1'
TABLE_NAME = 'aivedha-guardian-audit-logs'

# Initialize DynamoDB
dynamodb = boto3.client('dynamodb', region_name=REGION)

def create_audit_logs_table():
    """
    Create the audit-logs DynamoDB table with required indexes
    """
    try:
        response = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'log_id',
                    'KeyType': 'HASH'  # Partition key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'log_id',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'user_id',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'url',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'timestamp',
                    'AttributeType': 'S'
                }
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'user_id-index',
                    'KeySchema': [
                        {
                            'AttributeName': 'user_id',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'timestamp',
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    },
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                {
                    'IndexName': 'url-index',
                    'KeySchema': [
                        {
                            'AttributeName': 'url',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'timestamp',
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    },
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            },
            Tags=[
                {
                    'Key': 'Project',
                    'Value': 'AiVedha Guard'
                },
                {
                    'Key': 'Purpose',
                    'Value': 'Audit Logging'
                },
                {
                    'Key': 'Environment',
                    'Value': 'Production'
                }
            ]
        )

        print(f"Table {TABLE_NAME} created successfully!")
        print(f"Table ARN: {response['TableDescription']['TableArn']}")
        return response

    except dynamodb.exceptions.ResourceInUseException:
        print(f"Table {TABLE_NAME} already exists.")
        return None
    except Exception as e:
        print(f"Error creating table: {str(e)}")
        raise e

def describe_table():
    """
    Describe the audit-logs table
    """
    try:
        response = dynamodb.describe_table(TableName=TABLE_NAME)
        print(f"\nTable: {TABLE_NAME}")
        print(f"Status: {response['Table']['TableStatus']}")
        print(f"Item Count: {response['Table']['ItemCount']}")
        print(f"Table Size (bytes): {response['Table']['TableSizeBytes']}")
        return response
    except Exception as e:
        print(f"Error describing table: {str(e)}")
        return None

"""
Sample Audit Log Entry Schema:
{
    "log_id": "audit_20251208_abc123",           # Unique log ID
    "user_id": "user@example.com",               # User email (for querying)
    "user_email": "user@example.com",            # User email
    "user_name": "John Doe",                     # User full name
    "identity_id": "cognito-identity-123",       # Cognito identity ID

    # Location Information
    "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States"
    },
    "location_permission_status": "granted",     # granted | denied | unavailable
    "ip_address": "203.0.113.42",                # Client IP address

    # Audit Details
    "url": "https://example.com",                # Audited URL
    "timestamp": "2025-12-08T10:30:00.000Z",     # ISO 8601 timestamp
    "timezone": "America/Los_Angeles",           # User's timezone

    # Consent & Verification
    "consent_accepted": true,                    # Legal consent accepted
    "recaptcha_verified": true,                  # reCAPTCHA verification passed
    "recaptcha_score": 0.9,                      # reCAPTCHA risk score

    # Browser Information
    "browser_info": {
        "user_agent": "Mozilla/5.0...",
        "language": "en-US",
        "platform": "Win32"
    },

    # Audit Results
    "report_id": "rpt_abc123",                   # Report reference ID
    "security_score": 8.5,                       # Security score (0-10)
    "vulnerabilities_count": 3,                  # Total vulnerabilities found
    "critical_issues": 0,                        # Critical severity count
    "medium_issues": 2,                          # Medium severity count
    "low_issues": 1,                             # Low severity count
    "ssl_grade": "A+",                           # SSL/TLS grade

    # Metadata
    "created_at": "2025-12-08T10:30:00.000Z",    # Record creation time
    "credit_used": true,                         # Credit was deducted
    "plan": "Starter"                            # User's subscription plan
}
"""

if __name__ == '__main__':
    print("=" * 60)
    print("AiVedha Guard - Audit Logs Table Setup")
    print("=" * 60)

    # Create table
    create_audit_logs_table()

    # Wait for table to be active
    print("\nWaiting for table to be active...")
    waiter = dynamodb.get_waiter('table_exists')
    waiter.wait(TableName=TABLE_NAME)

    # Describe table
    describe_table()

    print("\n" + "=" * 60)
    print("Table setup complete!")
    print("=" * 60)
