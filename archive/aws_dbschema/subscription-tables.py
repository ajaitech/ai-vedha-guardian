"""
AiVedha Guard - Subscription DynamoDB Tables
Creates tables for Zoho Billing integration with dual-sync capability

Tables:
1. aivedha-subscriptions - Main subscription records synced with Zoho
2. aivedha-credits - Credit transactions and balance tracking
3. aivedha-invoices - Invoice records from Zoho
4. aivedha-webhook-logs - Zoho webhook event logs
"""

import boto3
from datetime import datetime
from decimal import Decimal

def create_subscription_tables():
    """Create all subscription-related DynamoDB tables"""
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')

    subscription_tables = [
        # Main Subscriptions Table
        {
            'TableName': 'aivedha-subscriptions',
            'AttributeDefinitions': [
                {'AttributeName': 'subscription_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'email', 'AttributeType': 'S'},
                {'AttributeName': 'status', 'AttributeType': 'S'},
                {'AttributeName': 'zoho_subscription_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'subscription_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'user-subscriptions-index',
                    'KeySchema': [
                        {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'email-index',
                    'KeySchema': [
                        {'AttributeName': 'email', 'KeyType': 'HASH'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'status-index',
                    'KeySchema': [
                        {'AttributeName': 'status', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'zoho-subscription-index',
                    'KeySchema': [
                        {'AttributeName': 'zoho_subscription_id', 'KeyType': 'HASH'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST'
        },

        # Credits Table - Tracks credit balance and transactions
        {
            'TableName': 'aivedha-credits',
            'AttributeDefinitions': [
                {'AttributeName': 'credit_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'},
                {'AttributeName': 'transaction_type', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'credit_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'user-credits-index',
                    'KeySchema': [
                        {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'transaction-type-index',
                    'KeySchema': [
                        {'AttributeName': 'transaction_type', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST'
        },

        # Invoices Table - Synced from Zoho
        {
            'TableName': 'aivedha-invoices',
            'AttributeDefinitions': [
                {'AttributeName': 'invoice_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'subscription_id', 'AttributeType': 'S'},
                {'AttributeName': 'zoho_invoice_id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'invoice_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'user-invoices-index',
                    'KeySchema': [
                        {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'subscription-invoices-index',
                    'KeySchema': [
                        {'AttributeName': 'subscription_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'zoho-invoice-index',
                    'KeySchema': [
                        {'AttributeName': 'zoho_invoice_id', 'KeyType': 'HASH'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST'
        },

        # Webhook Logs Table - Audit trail for Zoho webhooks
        {
            'TableName': 'aivedha-webhook-logs',
            'AttributeDefinitions': [
                {'AttributeName': 'log_id', 'AttributeType': 'S'},
                {'AttributeName': 'event_type', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'S'},
                {'AttributeName': 'status', 'AttributeType': 'S'}
            ],
            'KeySchema': [
                {'AttributeName': 'log_id', 'KeyType': 'HASH'}
            ],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'event-type-index',
                    'KeySchema': [
                        {'AttributeName': 'event_type', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                },
                {
                    'IndexName': 'status-index',
                    'KeySchema': [
                        {'AttributeName': 'status', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',
            'TimeToLiveSpecification': {
                'Enabled': True,
                'AttributeName': 'ttl'
            }
        }
    ]

    # Create tables
    for table in subscription_tables:
        try:
            # Extract TTL config if present
            ttl_spec = table.pop('TimeToLiveSpecification', None)

            dynamodb.create_table(**table)
            print(f"Created {table['TableName']}")

            # Enable TTL if specified
            if ttl_spec:
                import time
                time.sleep(5)  # Wait for table to be active
                dynamodb.update_time_to_live(
                    TableName=table['TableName'],
                    TimeToLiveSpecification=ttl_spec
                )
                print(f"Enabled TTL on {table['TableName']}")

        except dynamodb.exceptions.ResourceInUseException:
            print(f"Table {table['TableName']} already exists")
        except Exception as e:
            print(f"Error creating {table['TableName']}: {e}")


# ============================================
# SCHEMA DOCUMENTATION
# ============================================

SUBSCRIPTION_SCHEMA = """
aivedha-subscriptions Table Schema:
-----------------------------------
Primary Key: subscription_id (String) - UUID

Attributes:
- subscription_id: String - Internal UUID
- zoho_subscription_id: String - Zoho's subscription ID
- zoho_subscription_number: String - Human-readable subscription number
- user_id: String - User's ID (email or user_id)
- email: String - User's email
- customer_id: String - Zoho customer ID

- plan_code: String - Plan code (aarambh_free, raksha_monthly_inr, etc.)
- plan_name: String - Display name (Aarambh, Raksha, etc.)
- billing_cycle: String - 'monthly' or 'yearly'
- currency: String - 'INR' or 'USD'

- status: String - 'active', 'cancelled', 'expired', 'past_due', 'trial', 'pending'
- auto_renewal: Boolean - Whether auto-renewal is enabled
- cancelled_at: String (ISO) - When subscription was cancelled
- cancel_reason: String - Reason for cancellation

- credits_total: Number - Total credits for the billing period
- credits_used: Number - Credits consumed
- credits_remaining: Number - Available credits (-1 for unlimited)

- amount: Number - Subscription amount
- discount_amount: Number - Any discount applied
- coupon_code: String - Applied coupon

- current_period_start: String (ISO) - Current billing period start
- current_period_end: String (ISO) - Current billing period end
- next_billing_at: String (ISO) - Next billing date
- trial_end_at: String (ISO) - Trial end date if applicable

- created_at: String (ISO) - When subscription was created
- updated_at: String (ISO) - Last update timestamp
- synced_at: String (ISO) - Last sync with Zoho

GSIs:
- user-subscriptions-index: user_id + created_at
- email-index: email
- status-index: status + created_at
- zoho-subscription-index: zoho_subscription_id
"""

CREDITS_SCHEMA = """
aivedha-credits Table Schema:
-----------------------------
Primary Key: credit_id (String) - UUID

Attributes:
- credit_id: String - UUID for the transaction
- user_id: String - User's ID
- subscription_id: String - Related subscription (if any)

- transaction_type: String - 'allocation', 'deduction', 'addon', 'refund', 'bonus', 'expiry'
- amount: Number - Credit amount (positive for add, negative for deduct)
- balance_after: Number - Balance after this transaction

- source: String - What triggered this (subscription_renewal, audit_complete, addon_purchase, admin_grant)
- reference_id: String - Related audit_id, addon_id, or admin_id

- description: String - Human-readable description
- metadata: Map - Additional context data

- created_at: String (ISO) - Transaction timestamp
- expires_at: String (ISO) - When these credits expire (if applicable)

GSIs:
- user-credits-index: user_id + created_at
- transaction-type-index: transaction_type + created_at

Example Credit Transactions:
1. New subscription:
   type='allocation', amount=10, source='subscription_renewal'

2. Audit completed:
   type='deduction', amount=-1, source='audit_complete', reference_id='audit_123'

3. Credit pack purchased:
   type='addon', amount=25, source='addon_purchase', reference_id='credit_pack_25'

4. Admin bonus:
   type='bonus', amount=5, source='admin_grant', reference_id='admin_001'
"""

INVOICES_SCHEMA = """
aivedha-invoices Table Schema:
------------------------------
Primary Key: invoice_id (String) - UUID

Attributes:
- invoice_id: String - Internal UUID
- zoho_invoice_id: String - Zoho's invoice ID
- zoho_invoice_number: String - Human-readable invoice number
- user_id: String - User's ID
- subscription_id: String - Related subscription

- invoice_date: String (ISO) - Invoice creation date
- due_date: String (ISO) - Payment due date

- amount: Number (Decimal) - Invoice amount
- tax_amount: Number (Decimal) - Tax component
- total_amount: Number (Decimal) - Total with tax
- balance: Number (Decimal) - Remaining balance
- currency: String - 'INR' or 'USD'

- status: String - 'paid', 'pending', 'overdue', 'void', 'refunded'
- payment_date: String (ISO) - When payment was received
- payment_method: String - 'card', 'upi', 'netbanking', etc.

- line_items: List - Invoice line items
- pdf_url: String - S3 URL to PDF invoice

- created_at: String (ISO)
- updated_at: String (ISO)
- synced_at: String (ISO)

GSIs:
- user-invoices-index: user_id + created_at
- subscription-invoices-index: subscription_id + created_at
- zoho-invoice-index: zoho_invoice_id
"""

WEBHOOK_LOGS_SCHEMA = """
aivedha-webhook-logs Table Schema:
----------------------------------
Primary Key: log_id (String) - UUID

Attributes:
- log_id: String - UUID
- event_type: String - 'subscription_created', 'subscription_renewed', 'payment_received', etc.
- event_id: String - Zoho's event ID
- webhook_id: String - Webhook configuration ID

- payload: Map - Full webhook payload
- headers: Map - Request headers

- status: String - 'received', 'processed', 'failed', 'ignored'
- error_message: String - Error details if failed
- retry_count: Number - Number of processing attempts

- processing_time_ms: Number - Time to process
- created_at: String (ISO)
- processed_at: String (ISO)
- ttl: Number - Unix timestamp for auto-deletion (30 days)

GSIs:
- event-type-index: event_type + created_at
- status-index: status + created_at

Zoho Webhook Event Types:
- subscription_created
- subscription_activated
- subscription_renewed
- subscription_upgraded
- subscription_downgraded
- subscription_cancelled
- subscription_expired
- payment_received
- payment_failed
- payment_refunded
- invoice_created
- customer_created
- customer_updated
"""


# ============================================
# PLAN CREDITS MAPPING
# ============================================

PLAN_CREDITS = {
    # Free Plan
    'aarambh_free': 3,

    # Raksha Plan (10 credits)
    'raksha_monthly_inr': 10,
    'raksha_monthly_usd': 10,
    'raksha_yearly_inr': 10,
    'raksha_yearly_usd': 10,

    # Suraksha Plan (50 credits)
    'suraksha_monthly_inr': 50,
    'suraksha_monthly_usd': 50,
    'suraksha_yearly_inr': 50,
    'suraksha_yearly_usd': 50,

    # Vajra Plan (200 credits)
    'vajra_monthly_inr': 200,
    'vajra_monthly_usd': 200,
    'vajra_yearly_inr': 200,
    'vajra_yearly_usd': 200,

    # Chakra Plan (Unlimited = -1)
    'chakra_monthly_inr': -1,
    'chakra_monthly_usd': -1,
    'chakra_yearly_inr': -1,
    'chakra_yearly_usd': -1,
}

ADDON_CREDITS = {
    'credit_pack_5': 5,
    'credit_pack_10': 10,
    'credit_pack_25': 25,
    'credit_pack_50': 50,
    'credit_pack_100': 100,
}


def seed_sample_subscription():
    """Seed a sample subscription for testing"""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

    # Sample subscription
    subscriptions_table = dynamodb.Table('aivedha-subscriptions')
    sample_subscription = {
        'subscription_id': 'sub_001',
        'zoho_subscription_id': 'zoho_sub_12345',
        'zoho_subscription_number': 'SUB-00001',
        'user_id': 'aravind@aivibe.in',
        'email': 'aravind@aivibe.in',
        'customer_id': 'cust_12345',

        'plan_code': 'suraksha_monthly_inr',
        'plan_name': 'Suraksha',
        'billing_cycle': 'monthly',
        'currency': 'INR',

        'status': 'active',
        'auto_renewal': True,
        'cancelled_at': None,
        'cancel_reason': None,

        'credits_total': 50,
        'credits_used': 5,
        'credits_remaining': 45,

        'amount': Decimal('1999'),
        'discount_amount': Decimal('0'),
        'coupon_code': None,

        'current_period_start': '2024-12-01T00:00:00Z',
        'current_period_end': '2025-01-01T00:00:00Z',
        'next_billing_at': '2025-01-01T00:00:00Z',
        'trial_end_at': None,

        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'synced_at': datetime.now().isoformat()
    }

    try:
        subscriptions_table.put_item(Item=sample_subscription)
        print("Sample subscription seeded")
    except Exception as e:
        print(f"Error seeding subscription: {e}")

    # Sample credit transaction
    credits_table = dynamodb.Table('aivedha-credits')
    sample_credit = {
        'credit_id': 'cred_001',
        'user_id': 'aravind@aivibe.in',
        'subscription_id': 'sub_001',

        'transaction_type': 'allocation',
        'amount': 50,
        'balance_after': 50,

        'source': 'subscription_activated',
        'reference_id': 'sub_001',

        'description': 'Initial credits for Suraksha plan activation',
        'metadata': {
            'plan_code': 'suraksha_monthly_inr',
            'plan_name': 'Suraksha'
        },

        'created_at': datetime.now().isoformat(),
        'expires_at': '2025-01-01T00:00:00Z'
    }

    try:
        credits_table.put_item(Item=sample_credit)
        print("Sample credit transaction seeded")
    except Exception as e:
        print(f"Error seeding credit: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("AiVedha Guard - Subscription Tables Setup")
    print("=" * 60)
    print("\nCreating subscription tables...")
    create_subscription_tables()

    print("\n" + "=" * 60)
    print("Schema Documentation")
    print("=" * 60)
    print(SUBSCRIPTION_SCHEMA)
    print(CREDITS_SCHEMA)
    print(INVOICES_SCHEMA)
    print(WEBHOOK_LOGS_SCHEMA)

    # Uncomment to seed sample data
    # print("\nSeeding sample data...")
    # seed_sample_subscription()

    print("\nSetup complete!")
