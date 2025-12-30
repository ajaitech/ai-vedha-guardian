import json
import boto3
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError
import os

# Get table name from environment or use default
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')

# Max time for an audit to be in processing state (1 hour)
MAX_PROCESSING_TIME_HOURS = 1

def lambda_handler(event, context):
    """
    AWS Lambda function for credit management
    Handles credit operations, balance tracking, and usage analytics
    """

    # Initialize AWS services
    # CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
    # This allows India region Lambda to access US region data
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

    # Check if this is an API Gateway request
    if 'httpMethod' in event or 'requestContext' in event:
        return handle_api_gateway_request(event, dynamodb)

    # Direct Lambda invocation (legacy)
    action = event.get('action')

    if action == 'add_credits':
        return add_credits(event, dynamodb)
    elif action == 'deduct_credits':
        return deduct_credits(event, dynamodb)
    elif action == 'get_balance':
        return get_balance(event, dynamodb)
    elif action == 'get_transactions':
        return get_transactions(event, dynamodb)
    elif action == 'transfer_credits':
        return transfer_credits(event, dynamodb)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid action'})
        }

def handle_api_gateway_request(event, dynamodb):
    """Handle requests from API Gateway"""
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '')

    # CORS headers for all responses
    cors_headers = {
        'Access-Control-Allow-Origin': 'https://aivedha.ai',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    # GET /api/user/dashboard - Get user dashboard data
    if http_method == 'GET' and '/dashboard' in path:
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId') or query_params.get('user_id')

        if not user_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'userId parameter is required'})
            }

        try:
            users_table = dynamodb.Table(USERS_TABLE)
            reports_table = dynamodb.Table('aivedha-guardian-audit-reports')

            # Find user by email first (most common case) - using GSI for performance
            user = None
            if '@' in user_id:
                response = users_table.query(
                    IndexName='email-index',
                    KeyConditionExpression='email = :email',
                    ExpressionAttributeValues={':email': user_id}
                )
                if response.get('Items'):
                    user = response['Items'][0]

            # Try by user_id if not found by email
            if not user:
                response = users_table.get_item(Key={'user_id': user_id})
                if 'Item' in response:
                    user = response['Item']

            # If user not found in DB but email is valid, create a minimal record
            # This handles users who logged in but weren't saved to DB
            if not user and '@' in user_id:
                user = {
                    'user_id': f'auto-{user_id.split("@")[0]}',
                    'email': user_id,
                    'credits': 0,
                    'plan': 'Free'
                }
                # Don't save yet - just use for lookup

            if not user:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'User not found', 'audits': [], 'user': {'credits': 0, 'plan': 'Free'}})
                }

            # Get user's audit history using GSI queries (much faster than scan)
            audits = []
            try:
                user_email = user.get('email', user_id)
                actual_user_id = user.get('user_id', user_id)

                # Use GSI queries instead of table scan for better performance
                all_items = []
                seen_report_ids = set()

                # Query 1: Get audits by user_id using GSI
                try:
                    response = reports_table.query(
                        IndexName='user-reports-index',
                        KeyConditionExpression='user_id = :user_id',
                        ExpressionAttributeValues={':user_id': actual_user_id}
                    )
                    for item in response.get('Items', []):
                        if item.get('report_id') not in seen_report_ids:
                            all_items.append(item)
                            seen_report_ids.add(item.get('report_id'))
                except Exception:
                    pass

                # Query 2: Get audits where user_id = email (legacy records)
                if user_email and user_email != actual_user_id:
                    try:
                        response = reports_table.query(
                            IndexName='user-reports-index',
                            KeyConditionExpression='user_id = :email',
                            ExpressionAttributeValues={':email': user_email}
                        )
                        for item in response.get('Items', []):
                            if item.get('report_id') not in seen_report_ids:
                                all_items.append(item)
                                seen_report_ids.add(item.get('report_id'))
                    except Exception:
                        pass

                audit_response = {'Items': all_items}
                if audit_response.get('Items'):
                    # Sort by created_at desc and take last 20
                    items = sorted(audit_response['Items'], key=lambda x: x.get('created_at', ''), reverse=True)[:20]

                    # Auto-timeout stale processing audits (older than MAX_PROCESSING_TIME_HOURS)
                    now = datetime.now(timezone.utc)
                    timeout_threshold = now - timedelta(hours=MAX_PROCESSING_TIME_HOURS)

                    for item in items:
                        # Check if this is a stale processing audit
                        if item.get('status') in ('processing', 'pending', 'in_progress'):
                            created_at_str = item.get('created_at', '')
                            try:
                                # Parse created_at timestamp
                                if created_at_str:
                                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                                    if created_at.tzinfo is None:
                                        created_at = created_at.replace(tzinfo=timezone.utc)

                                    # If older than threshold, mark as timed_out in DB and update local item
                                    if created_at < timeout_threshold:
                                        try:
                                            reports_table.update_item(
                                                Key={'report_id': item['report_id']},
                                                UpdateExpression='SET #status = :status, timed_out_at = :now, stageDescription = :desc',
                                                ExpressionAttributeNames={'#status': 'status'},
                                                ExpressionAttributeValues={
                                                    ':status': 'timed_out',
                                                    ':now': now.isoformat(),
                                                    ':desc': 'Audit timed out - exceeded maximum processing time'
                                                }
                                            )
                                            # Update local item for response
                                            item['status'] = 'timed_out'
                                            item['stageDescription'] = 'Audit timed out - exceeded maximum processing time'
                                        except Exception as update_err:
                                            print(f"Failed to update stale audit {item['report_id']}: {update_err}")
                            except Exception as parse_err:
                                print(f"Failed to parse created_at for {item.get('report_id')}: {parse_err}")

                    for item in items:
                        # Get progress value - stored as 'progress' or 'progressPercent' in DynamoDB
                        progress_val = item.get('progress', item.get('progressPercent', 0))
                        if isinstance(progress_val, Decimal):
                            progress_val = float(progress_val)

                        # For completed audits, ensure progress is 100
                        if item.get('status') == 'completed':
                            progress_val = 100

                        # Helper function to convert Decimal to int/float
                        def to_int(val, default=0):
                            if val is None:
                                return default
                            if isinstance(val, Decimal):
                                return int(val)
                            return int(val) if val else default

                        # Get etaSeconds with proper Decimal handling
                        eta_val = item.get('etaSeconds')
                        if eta_val is None:
                            eta_val = max(60, int(900 - (progress_val * 9))) if item.get('status') == 'processing' else 0
                        elif isinstance(eta_val, Decimal):
                            eta_val = int(eta_val)

                        audits.append({
                            'report_id': item.get('report_id'),
                            'url': item.get('url'),
                            'created_at': item.get('created_at'),
                            'status': item.get('status'),
                            # Round score to 1 decimal place (fix display issues with many decimals)
                            'security_score': round(float(item.get('security_score', 0)) / 10, 1) if item.get('security_score') else None,
                            'vulnerabilities_count': to_int(item.get('vulnerabilities_count')),
                            'critical_count': to_int(item.get('critical_count')),
                            'high_count': to_int(item.get('high_count', item.get('high_issues', 0))),
                            'medium_count': to_int(item.get('medium_count')),
                            'low_count': to_int(item.get('low_count')),
                            'ssl_valid': item.get('ssl_valid'),
                            'headers_score': to_int(item.get('headers_score')),
                            'pdf_report_url': item.get('pdf_report_url') or item.get('pdf_url'),
                            'certificate_number': item.get('certificate_number'),
                            'grade': item.get('grade'),
                            # Progress tracking fields for live updates
                            'progressPercent': progress_val,
                            'currentStage': item.get('currentStage', 'completed' if item.get('status') == 'completed' else 'processing'),
                            'stageDescription': item.get('stageDescription', 'Audit completed' if item.get('status') == 'completed' else 'Processing...'),
                            'updatedAt': item.get('updatedAt', item.get('created_at', '')),
                            # ETA for in-progress audits
                            'etaSeconds': eta_val
                        })
            except Exception as e:
                print(f"Error fetching audits: {str(e)}")

            credits = user.get('credits', 0)
            if isinstance(credits, Decimal):
                credits = int(credits)

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'user': {
                        'credits': credits,
                        'plan': user.get('plan', 'Free'),
                        'email': user.get('email', ''),
                        'totalAudits': int(user.get('total_audits', 0)) if isinstance(user.get('total_audits'), Decimal) else user.get('total_audits', 0)
                    },
                    'audits': audits
                })
            }

        except Exception as e:
            print(f"Error getting dashboard data: {str(e)}")
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Failed to get dashboard data', 'message': str(e)})
            }

    # GET /api/user/credits - Get user credits
    if http_method == 'GET' and '/credits' in path:
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId') or query_params.get('user_id')

        if not user_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'userId parameter is required'})
            }

        # Get user credits from DynamoDB
        try:
            users_table = dynamodb.Table(USERS_TABLE)

            # Try to find user by email first - using GSI for performance
            response = users_table.query(
                IndexName='email-index',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': user_id}
            )

            if response['Items']:
                user = response['Items'][0]
                credits = user.get('credits', 0)
                if isinstance(credits, Decimal):
                    credits = int(credits)

                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'credits': credits,
                        'plan': user.get('plan', 'Free'),
                        'email': user.get('email', ''),
                        'total_audits': int(user.get('total_audits', 0)) if isinstance(user.get('total_audits'), Decimal) else user.get('total_audits', 0)
                    })
                }

            # Try by user_id
            response = users_table.get_item(Key={'user_id': user_id})
            if 'Item' in response:
                user = response['Item']
                credits = user.get('credits', 0)
                if isinstance(credits, Decimal):
                    credits = int(credits)

                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'credits': credits,
                        'plan': user.get('plan', 'Free'),
                        'email': user.get('email', ''),
                        'total_audits': int(user.get('total_audits', 0)) if isinstance(user.get('total_audits'), Decimal) else user.get('total_audits', 0)
                    })
                }

            # User not found
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'error': 'User not found', 'credits': 0, 'plan': 'Free'})
            }

        except Exception as e:
            print(f"Error getting credits: {str(e)}")
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Failed to get credits', 'message': str(e)})
            }

    # POST requests - parse body
    if http_method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
        except:
            body = {}

        action = body.get('action')

        if action == 'add_credits':
            result = add_credits(body, dynamodb)
        elif action == 'deduct_credits':
            result = deduct_credits(body, dynamodb)
        elif action == 'get_balance':
            result = get_balance(body, dynamodb)
        else:
            result = {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid action'})
            }

        # Add CORS headers to result
        if 'headers' not in result:
            result['headers'] = {}
        result['headers'].update(cors_headers)
        return result

    return {
        'statusCode': 400,
        'headers': cors_headers,
        'body': json.dumps({'error': 'Invalid request'})
    }

def add_credits(event, dynamodb):
    """Add credits to user account"""
    try:
        user_id = event.get('user_id')
        credits = event.get('credits')
        transaction_type = event.get('transaction_type', 'purchase')
        transaction_id = event.get('transaction_id')
        description = event.get('description', f'Credits added via {transaction_type}')

        if not all([user_id, credits]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id and credits are required'})
            }

        if credits <= 0:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Credits must be a positive number'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        try:
            user_response = users_table.get_item(Key={'user_id': user_id})
            if 'Item' not in user_response:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'User not found'})
                }

            current_credits = user_response['Item'].get('credits', 0)
            if isinstance(current_credits, Decimal):
                current_credits = int(current_credits)

        except ClientError as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Database error: {str(e)}'})
            }

        new_balance = current_credits + credits

        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = :new_balance, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':new_balance': new_balance,
                ':updated_at': datetime.utcnow().isoformat()
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Credits added successfully',
                'user_id': user_id,
                'credits_added': credits,
                'new_balance': new_balance
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to add credits',
                'message': str(e)
            })
        }

def deduct_credits(event, dynamodb):
    """Deduct credits from user account"""
    try:
        user_id = event.get('user_id')
        credits = event.get('credits')

        if not all([user_id, credits]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id and credits are required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        user_response = users_table.get_item(Key={'user_id': user_id})
        if 'Item' not in user_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'User not found'})
            }

        current_credits = user_response['Item'].get('credits', 0)
        if isinstance(current_credits, Decimal):
            current_credits = int(current_credits)

        if current_credits < credits:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Insufficient credits',
                    'current_balance': current_credits,
                    'required': credits
                })
            }

        new_balance = current_credits - credits

        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET credits = :new_balance, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':new_balance': new_balance,
                ':updated_at': datetime.utcnow().isoformat()
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Credits deducted successfully',
                'credits_deducted': credits,
                'new_balance': new_balance
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to deduct credits',
                'message': str(e)
            })
        }

def get_balance(event, dynamodb):
    """Get user credit balance"""
    try:
        user_id = event.get('user_id')

        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'user_id is required'})
            }

        users_table = dynamodb.Table(USERS_TABLE)

        response = users_table.get_item(Key={'user_id': user_id})

        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'User not found'})
            }

        user = response['Item']
        credits = user.get('credits', 0)
        if isinstance(credits, Decimal):
            credits = int(credits)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'user_id': user_id,
                'credits': credits,
                'email': user.get('email', ''),
                'plan': user.get('plan', 'Free')
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to get balance',
                'message': str(e)
            })
        }

def get_transactions(event, dynamodb):
    """Get user transaction history"""
    return {
        'statusCode': 200,
        'body': json.dumps({'transactions': [], 'count': 0})
    }

def transfer_credits(event, dynamodb):
    """Transfer credits between users"""
    return {
        'statusCode': 403,
        'body': json.dumps({'error': 'Not implemented'})
    }
