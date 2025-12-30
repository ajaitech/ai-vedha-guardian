import boto3
import json
from datetime import datetime

def create_email_receipt_tables():
    """
    Create DynamoDB tables for email templates, receipts, and template variables
    for Aivedha Guardian receipt generation and email management system
    """
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')
    
    tables = [
        {
            'TableName': 'aivedha-email-templates',
            'AttributeDefinitions': [
                {'AttributeName': 'template_id', 'AttributeType': 'S'},
                {'AttributeName': 'template_type', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'template_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'template-type-index',
                'KeySchema': [{'AttributeName': 'template_type', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-receipts',
            'AttributeDefinitions': [
                {'AttributeName': 'receipt_id', 'AttributeType': 'S'},
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'receipt_number', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'receipt_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'user-receipts-index',
                    'KeySchema': [{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
                    'Projection': {'ProjectionType': 'ALL'},
                    'BillingMode': 'PAY_PER_REQUEST'
                },
                {
                    'IndexName': 'receipt-number-index',
                    'KeySchema': [{'AttributeName': 'receipt_number', 'KeyType': 'HASH'}],
                    'Projection': {'ProjectionType': 'ALL'},
                    'BillingMode': 'PAY_PER_REQUEST'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST'
        },
        {
            'TableName': 'aivedha-template-variables',
            'AttributeDefinitions': [
                {'AttributeName': 'variable_id', 'AttributeType': 'S'},
                {'AttributeName': 'variable_type', 'AttributeType': 'S'}
            ],
            'KeySchema': [{'AttributeName': 'variable_id', 'KeyType': 'HASH'}],
            'GlobalSecondaryIndexes': [{
                'IndexName': 'variable-type-index',
                'KeySchema': [{'AttributeName': 'variable_type', 'KeyType': 'HASH'}],
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

def seed_default_templates():
    """Seed default email templates and variables"""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    
    # Seed email templates
    templates_table = dynamodb.Table('aivedha-email-templates')
    
    default_templates = [
        {
            'template_id': 'receipt-payment-confirmation',
            'template_name': 'Payment Receipt Confirmation',
            'template_type': 'receipt',
            'subject': 'Payment Confirmation - {{transaction.receiptNumber}} | Aivedha Guardian',
            'html_content': '''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Payment Receipt</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
                    .receipt-title { font-size: 28px; font-weight: bold; margin: 20px 0; }
                    .receipt-container { max-width: 600px; margin: 0 auto; }
                    .receipt-details { display: flex; justify-content: space-between; margin: 30px 0; }
                    .customer-info, .receipt-info { flex: 1; }
                    .receipt-info { text-align: right; }
                    .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    .table th { background-color: #f8f9fa; }
                    .total { font-size: 24px; font-weight: bold; text-align: right; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 40px; color: #6c757d; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header">
                        <div class="logo">AIVEDHA GUARDIAN</div>
                        <div class="receipt-title">PAYMENT RECEIPT</div>
                    </div>
                    
                    <div class="receipt-details">
                        <div class="customer-info">
                            <h3>CUSTOMER</h3>
                            <p>{{user.firstName}} {{user.lastName}}</p>
                            <p>{{user.email}}</p>
                            <p>{{user.location}}</p>
                        </div>
                        <div class="receipt-info">
                            <h3>RECEIPT #</h3>
                            <p>{{transaction.receiptNumber}}</p>
                            <p>{{transaction.date}}</p>
                            <p>{{transaction.paymentMethod}}</p>
                        </div>
                    </div>
                    
                    <table class="table">
                        <thead>
                            <tr>
                                <th>DESCRIPTION</th>
                                <th>CREDITS</th>
                                <th>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Security Audit Credits</td>
                                <td>{{transaction.creditsAdded}}</td>
                                <td>{{transaction.currency}} {{transaction.amount}}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="total">
                        TOTAL: {{transaction.currency}} {{transaction.amount}}
                    </div>
                    
                    <div class="footer">
                        <p>© 2024, Aivibe Software Services Pvt Ltd</p>
                        <p>{{company.supportEmail}} | {{company.website}}</p>
                    </div>
                </div>
            </body>
            </html>
            ''',
            'text_content': '''
            AIVEDHA GUARDIAN - PAYMENT RECEIPT
            
            Receipt Number: {{transaction.receiptNumber}}
            Date: {{transaction.date}}
            
            Customer: {{user.firstName}} {{user.lastName}}
            Email: {{user.email}}
            
            Credits Purchased: {{transaction.creditsAdded}}
            Amount: {{transaction.currency}} {{transaction.amount}}
            Payment Method: {{transaction.paymentMethod}}
            
            Thank you for your purchase!
            
            Support: {{company.supportEmail}}
            Website: {{company.website}}
            ''',
            'is_active': True,
            'version': 1,
            'created_by': 'system',
            'created_at': datetime.now().isoformat(),
            'last_modified': datetime.now().isoformat()
        }
    ]
    
    for template in default_templates:
        try:
            templates_table.put_item(Item=template)
            print(f"Seeded template: {template['template_name']}")
        except Exception as e:
            print(f"Error seeding template {template['template_name']}: {e}")
    
    # Seed template variables
    variables_table = dynamodb.Table('aivedha-template-variables')
    
    default_variables = [
        # User variables
        {'variable_id': 'user.firstName', 'variable_name': 'user.firstName', 'variable_type': 'user', 'description': 'Customer first name', 'default_value': '', 'is_global': True},
        {'variable_id': 'user.lastName', 'variable_name': 'user.lastName', 'variable_type': 'user', 'description': 'Customer last name', 'default_value': '', 'is_global': True},
        {'variable_id': 'user.email', 'variable_name': 'user.email', 'variable_type': 'user', 'description': 'Customer email address', 'default_value': '', 'is_global': True},
        {'variable_id': 'user.location', 'variable_name': 'user.location', 'variable_type': 'user', 'description': 'Customer location', 'default_value': '', 'is_global': True},
        {'variable_id': 'user.creditsBalance', 'variable_name': 'user.creditsBalance', 'variable_type': 'user', 'description': 'Current credit balance', 'default_value': '0', 'is_global': True},
        
        # Transaction variables
        {'variable_id': 'transaction.receiptNumber', 'variable_name': 'transaction.receiptNumber', 'variable_type': 'transaction', 'description': 'Unique receipt ID', 'default_value': '', 'is_global': True},
        {'variable_id': 'transaction.date', 'variable_name': 'transaction.date', 'variable_type': 'transaction', 'description': 'Transaction timestamp', 'default_value': '', 'is_global': True},
        {'variable_id': 'transaction.amount', 'variable_name': 'transaction.amount', 'variable_type': 'transaction', 'description': 'Payment amount', 'default_value': '0', 'is_global': True},
        {'variable_id': 'transaction.currency', 'variable_name': 'transaction.currency', 'variable_type': 'transaction', 'description': 'Transaction currency', 'default_value': 'USD', 'is_global': True},
        {'variable_id': 'transaction.paymentMethod', 'variable_name': 'transaction.paymentMethod', 'variable_type': 'transaction', 'description': 'Payment method used', 'default_value': '', 'is_global': True},
        {'variable_id': 'transaction.creditsAdded', 'variable_name': 'transaction.creditsAdded', 'variable_type': 'transaction', 'description': 'Credits purchased', 'default_value': '0', 'is_global': True},
        
        # System variables
        {'variable_id': 'company.name', 'variable_name': 'company.name', 'variable_type': 'system', 'description': 'Company name', 'default_value': 'Aivedha Guardian', 'is_global': True},
        {'variable_id': 'company.supportEmail', 'variable_name': 'company.supportEmail', 'variable_type': 'system', 'description': 'Support email', 'default_value': 'support@aivedha.com', 'is_global': True},
        {'variable_id': 'company.website', 'variable_name': 'company.website', 'variable_type': 'system', 'description': 'Company website', 'default_value': 'www.aivedha.tech', 'is_global': True}
    ]
    
    for variable in default_variables:
        try:
            variables_table.put_item(Item=variable)
            print(f"Seeded variable: {variable['variable_name']}")
        except Exception as e:
            print(f"Error seeding variable {variable['variable_name']}: {e}")

if __name__ == "__main__":
    create_email_receipt_tables()
    seed_default_templates()