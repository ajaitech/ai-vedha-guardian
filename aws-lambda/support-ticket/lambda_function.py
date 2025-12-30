"""
AiVedha Guardian - Support Ticket Manager Lambda
Handles support ticket creation, tracking, and email notifications
"""

import json
import boto3
import uuid
from datetime import datetime, timezone
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses_client = boto3.client('ses', region_name='us-east-1')

# DynamoDB Tables
TICKETS_TABLE = 'aivedha-support-tickets'

# Email configuration
SENDER_EMAIL = 'support@aivedha.ai'
SUPPORT_TEAM_EMAIL = 'support@aivedha.ai'


def generate_ticket_id():
    """Generate a unique ticket ID"""
    timestamp = datetime.now().strftime('%Y%m%d')
    unique_part = str(uuid.uuid4())[:8].upper()
    return f"TKT-{timestamp}-{unique_part}"


def lambda_handler(event, context):
    """Main Lambda handler"""

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': 'https://aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }

    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    try:
        path = event.get('path', '')
        method = event.get('httpMethod', 'POST')

        # Parse body
        body = {}
        if event.get('body'):
            try:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            except:
                body = {}

        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}

        # Route handling
        if '/create-ticket' in path and method == 'POST':
            result = create_ticket(body)
        elif '/check-ticket' in path and method == 'GET':
            ticket_id = query_params.get('ticketId')
            email = query_params.get('email', '')
            if ticket_id:
                result = get_ticket_by_id(ticket_id)
            elif email:
                result = get_user_tickets(email)
            else:
                result = {'error': 'ticketId or email parameter required'}
        elif '/tickets' in path and method == 'GET':
            email = query_params.get('email', '')
            if not email:
                result = {'error': 'Email parameter required'}
            else:
                result = get_user_tickets(email)
        else:
            result = {'error': 'Unknown endpoint'}

        status_code = 200 if result.get('success', True) and 'error' not in result else 400

        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps(result, default=str)
        }

    except Exception as e:
        print(f"Lambda error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }


def create_ticket(data):
    """Create a new support ticket"""
    try:
        # Generate ticket ID if not provided
        ticket_id = data.get('ticketId') or generate_ticket_id()

        email = data.get('email')
        name = data.get('name', 'Customer')
        subject = data.get('subject', 'Support Request')
        priority = data.get('priority', 'medium')
        description = data.get('description') or data.get('message', '')
        user_id = data.get('userId', email)
        category = data.get('category', 'general')

        # Validate required fields
        if not email:
            return {
                'success': False,
                'message': 'Email is required'
            }

        if not description:
            return {
                'success': False,
                'message': 'Description/message is required'
            }

        # Check for existing active ticket
        existing = check_active_ticket(email)
        if existing.get('hasActiveTicket'):
            return {
                'success': False,
                'message': 'You already have an active support ticket. Please wait for it to be resolved.',
                'existingTicket': existing.get('ticket')
            }

        now = datetime.now(timezone.utc).isoformat()

        ticket_item = {
            'ticketId': str(ticket_id),  # Ensure string type
            'email': str(email),
            'name': str(name),
            'subject': str(subject),
            'priority': str(priority),
            'description': str(description),
            'category': str(category),
            'status': 'open',
            'userId': str(user_id) if user_id else str(email),
            'createdAt': now,
            'updatedAt': now
        }

        # Save to DynamoDB
        tickets_table = dynamodb.Table(TICKETS_TABLE)
        tickets_table.put_item(Item=ticket_item)

        # Send confirmation email to user (don't fail if email fails)
        email_sent = False
        try:
            email_sent = send_confirmation_email({**ticket_item, 'ticketId': ticket_id})
            print(f"User confirmation email sent: {email_sent}")
        except Exception as email_error:
            print(f"User email failed (non-critical): {str(email_error)}")

        # Send notification to support team
        try:
            internal_sent = send_internal_notification({**ticket_item, 'ticketId': ticket_id})
            print(f"Internal notification sent: {internal_sent}")
        except Exception as internal_error:
            print(f"Internal notification failed (non-critical): {str(internal_error)}")

        return {
            'success': True,
            'message': 'Support ticket created successfully',
            'ticketId': ticket_id,
            'emailSent': email_sent
        }

    except Exception as e:
        print(f"Create ticket error: {str(e)}")
        return {
            'success': False,
            'message': f'Failed to create ticket: {str(e)}'
        }


def check_active_ticket(email):
    """Check if user has an active (open/in_progress) ticket"""
    try:
        tickets_table = dynamodb.Table(TICKETS_TABLE)

        # Use GSI for email lookup (much faster than scan)
        response = tickets_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            FilterExpression='#status = :open OR #status = :in_progress',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':email': email,
                ':open': 'open',
                ':in_progress': 'in_progress'
            },
            ScanIndexForward=False  # Get newest first (by createdAt)
        )

        items = response.get('Items', [])

        if items:
            return {
                'hasActiveTicket': True,
                'ticket': items[0]
            }

        return {'hasActiveTicket': False}

    except Exception as e:
        print(f"Check ticket error: {str(e)}")
        return {'hasActiveTicket': False}


def get_ticket_by_id(ticket_id):
    """Get a specific ticket by ID"""
    try:
        tickets_table = dynamodb.Table(TICKETS_TABLE)
        response = tickets_table.get_item(Key={'ticketId': ticket_id})

        if 'Item' in response:
            return {
                'success': True,
                'ticket': response['Item']
            }

        return {
            'success': False,
            'message': 'Ticket not found'
        }
    except Exception as e:
        print(f"Get ticket error: {str(e)}")
        return {
            'success': False,
            'message': str(e)
        }


def get_user_tickets(email):
    """Get all tickets for a user"""
    try:
        tickets_table = dynamodb.Table(TICKETS_TABLE)

        # Use GSI for email lookup (much faster than scan)
        response = tickets_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={
                ':email': email
            },
            ScanIndexForward=False  # Get newest first (by createdAt)
        )

        items = response.get('Items', [])

        # Check for active ticket
        active_ticket = None
        for item in items:
            if item.get('status') in ['open', 'in_progress']:
                active_ticket = item
                break

        return {
            'success': True,
            'tickets': items,
            'hasActiveTicket': active_ticket is not None,
            'ticket': active_ticket
        }

    except Exception as e:
        print(f"Get tickets error: {str(e)}")
        return {
            'success': False,
            'tickets': [],
            'hasActiveTicket': False
        }


def send_confirmation_email(ticket_data):
    """Send confirmation email to user"""
    try:
        email = ticket_data.get('email')
        ticket_id = ticket_data.get('ticketId')
        name = ticket_data.get('name', 'Customer')
        subject = ticket_data.get('subject', 'Support Request')

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1e3a5f;">Support Ticket Received</h2>
            <p>Dear {name},</p>
            <p>Thank you for contacting AiVedha Guardian support. Your ticket has been created successfully.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Ticket ID:</strong> {ticket_id}</p>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Status:</strong> Open</p>
            </div>
            <p>Our team will review your request and respond as soon as possible.</p>
            <p>Best regards,<br>AiVedha Guardian Support Team</p>
        </body>
        </html>
        """

        ses_client.send_email(
            Source=f'AiVedha Guardian <{SENDER_EMAIL}>',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': f'Support Ticket Created - {ticket_id}'},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        return True
    except Exception as e:
        print(f"Email send error: {str(e)}")
        return False


def send_internal_notification(ticket_data):
    """Send notification to support team"""
    try:
        ticket_id = ticket_data.get('ticketId')
        name = ticket_data.get('name')
        email = ticket_data.get('email')
        subject = ticket_data.get('subject')
        priority = ticket_data.get('priority', 'medium')
        description = ticket_data.get('description')

        body = f"""
New Support Ticket

Ticket ID: {ticket_id}
From: {name} ({email})
Subject: {subject}
Priority: {priority.upper()}

Description:
{description}
        """

        ses_client.send_email(
            Source=f'AiVedha Guardian <{SENDER_EMAIL}>',
            Destination={'ToAddresses': [SUPPORT_TEAM_EMAIL]},
            Message={
                'Subject': {'Data': f'[{priority.upper()}] New Ticket: {ticket_id}'},
                'Body': {'Text': {'Data': body}}
            }
        )
        return True
    except Exception as e:
        print(f"Internal notification error: {str(e)}")
        return False
