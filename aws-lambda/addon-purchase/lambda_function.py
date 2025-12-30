"""
AiVedha Guard - Addon Purchase Router Lambda
Routes addon requests to appropriate handlers based on addon_type.

Supported addon types:
- scheduler: Routes to addon_scheduler_lambda for scheduled audits
- credits: Routes to addon_credits_lambda for credit pack purchases
- whitelabel: Routes to addon_whitelabel_lambda for white-label reports

Environment Variables:
- SCHEDULER_LAMBDA_ARN: ARN of the scheduler Lambda
- CREDITS_LAMBDA_ARN: ARN of the credits Lambda
- WHITELABEL_LAMBDA_ARN: ARN of the whitelabel Lambda
"""

import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
SCHEDULER_LAMBDA = os.environ.get('SCHEDULER_LAMBDA_ARN', 'aivedha-addon-scheduler')
CREDITS_LAMBDA = os.environ.get('CREDITS_LAMBDA_ARN', 'aivedha-addon-credits')
WHITELABEL_LAMBDA = os.environ.get('WHITELABEL_LAMBDA_ARN', 'aivedha-addon-whitelabel')

# Initialize AWS clients
lambda_client = boto3.client('lambda', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)

# Tables
USERS_TABLE = os.environ.get('USERS_TABLE', 'aivedha-guardian-users')
SCHEDULES_TABLE = os.environ.get('SCHEDULES_TABLE', 'aivedha-guardian-schedules')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE', 'aivedha-guardian-subscriptions')

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://aivedha.ai',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def json_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def normalize_field_names(data):
    """
    Normalize field names from camelCase to snake_case for Lambda compatibility.
    Handles both directions for backward compatibility.
    """
    mapping = {
        'userId': 'user_id',
        'scheduleId': 'schedule_id',
        'startDate': 'start_date',
        'startTime': 'start_time',
        'endDate': 'end_date',
        'endTime': 'end_time',
        'hasEndDate': 'has_end_date',
        'addonType': 'addon_type',
        'billingCycle': 'billing_cycle',
        'packId': 'pack_id',
    }

    normalized = {}
    for key, value in data.items():
        # Convert camelCase to snake_case if in mapping
        new_key = mapping.get(key, key)
        normalized[new_key] = value

        # Also keep original key for backward compatibility
        if key != new_key:
            normalized[key] = value

    return normalized


def lambda_handler(event, context):
    """
    Main handler - routes requests based on addon_type.
    """
    print(f"Addon router received: {json.dumps(event)}")

    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return json_response(200, {})

    try:
        # Parse body
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body) if body else {}

        # Also check query parameters
        query_params = event.get('queryStringParameters') or {}
        body.update(query_params)

        # Normalize field names
        body = normalize_field_names(body)

        addon_type = body.get('addon_type', '').lower()
        action = body.get('action', '')

        print(f"Routing request: addon_type={addon_type}, action={action}")

        # Route based on addon_type
        if addon_type == 'scheduler':
            return handle_scheduler_request(body, action)

        elif addon_type == 'credits':
            return handle_credits_request(body, action)

        elif addon_type == 'whitelabel':
            return handle_whitelabel_request(body, action)

        # If no addon_type, check for direct schedule operations
        elif action in ['create', 'update', 'delete', 'toggle', 'list', 'validate_addon', 'run_now']:
            return handle_scheduler_request(body, action)

        else:
            return json_response(400, {
                'error': 'Invalid addon_type',
                'message': f'Unknown addon_type: {addon_type}',
                'supported_types': ['scheduler', 'credits', 'whitelabel']
            })

    except json.JSONDecodeError as e:
        return json_response(400, {'error': 'Invalid JSON', 'message': str(e)})
    except Exception as e:
        print(f"Router error: {str(e)}")
        import traceback
        traceback.print_exc()
        return json_response(500, {'error': 'Internal server error', 'message': str(e)})


def handle_scheduler_request(body, action):
    """
    Handle scheduler addon requests.
    Actions: create, update, delete, toggle, list, validate_addon, run_now
    """
    user_id = body.get('user_id')

    if not user_id and action not in ['validate_addon']:
        return json_response(400, {'error': 'user_id is required'})

    if action == 'create':
        return create_schedule(body)
    elif action == 'update':
        return update_schedule(body)
    elif action == 'delete':
        return delete_schedule(body)
    elif action == 'toggle':
        return toggle_schedule(body)
    elif action == 'list':
        return list_schedules(body)
    elif action == 'validate_addon':
        return validate_scheduler_addon(body)
    elif action == 'run_now':
        return run_schedule_now(body)
    else:
        return json_response(400, {'error': f'Unknown scheduler action: {action}'})


def create_schedule(body):
    """Create a new scheduled audit."""
    import uuid

    user_id = body.get('user_id')
    url = body.get('url')
    frequency = body.get('frequency', 'weekly')
    start_date = body.get('start_date')
    start_time = body.get('start_time', '09:00')
    end_date = body.get('end_date')
    end_time = body.get('end_time')
    schedule_name = body.get('name', body.get('schedule_name', ''))

    if not url:
        return json_response(400, {'error': 'url is required'})

    # Check if user has scheduler addon
    has_addon, expires_at = check_scheduler_addon(user_id)
    if not has_addon:
        return json_response(403, {
            'error': 'Scheduled Audits addon required',
            'message': 'Please purchase the Scheduled Audits addon to use this feature.',
            'addon_required': 'scheduler'
        })

    # Create schedule in DynamoDB
    schedules_table = dynamodb.Table(SCHEDULES_TABLE)
    schedule_id = f"sched-{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat()

    # Calculate first run time
    if start_date and start_time:
        next_run = f"{start_date}T{start_time}:00"
    else:
        next_run = now

    schedule_item = {
        'schedule_id': schedule_id,
        'user_id': user_id,
        'url': url,
        'name': schedule_name or f"Audit for {url}",
        'frequency': frequency,
        'start_date': start_date or now[:10],
        'start_time': start_time,
        'end_date': end_date,
        'end_time': end_time,
        'status': 'active',
        'next_run': next_run,
        'last_run': None,
        'credits_used': 0,
        'created_at': now,
        'updated_at': now
    }

    schedules_table.put_item(Item=schedule_item)

    return json_response(200, {
        'success': True,
        'message': 'Schedule created successfully',
        'schedule': schedule_item
    })


def update_schedule(body):
    """Update an existing schedule."""
    schedule_id = body.get('schedule_id')
    user_id = body.get('user_id')

    if not schedule_id:
        return json_response(400, {'error': 'schedule_id is required'})

    schedules_table = dynamodb.Table(SCHEDULES_TABLE)

    # Verify ownership
    existing = schedules_table.get_item(Key={'schedule_id': schedule_id})
    if 'Item' not in existing:
        return json_response(404, {'error': 'Schedule not found'})

    if existing['Item'].get('user_id') != user_id:
        return json_response(403, {'error': 'Unauthorized'})

    # Build update expression
    update_fields = ['url', 'frequency', 'start_date', 'start_time', 'end_date', 'end_time', 'name']
    update_expr_parts = ['updated_at = :now']
    expr_values = {':now': datetime.utcnow().isoformat()}

    for field in update_fields:
        if field in body and body[field] is not None:
            update_expr_parts.append(f'{field} = :{field}')
            expr_values[f':{field}'] = body[field]

    schedules_table.update_item(
        Key={'schedule_id': schedule_id},
        UpdateExpression='SET ' + ', '.join(update_expr_parts),
        ExpressionAttributeValues=expr_values
    )

    return json_response(200, {
        'success': True,
        'message': 'Schedule updated successfully',
        'schedule_id': schedule_id
    })


def delete_schedule(body):
    """Delete a schedule."""
    schedule_id = body.get('schedule_id')
    user_id = body.get('user_id')

    if not schedule_id:
        return json_response(400, {'error': 'schedule_id is required'})

    schedules_table = dynamodb.Table(SCHEDULES_TABLE)

    # Verify ownership
    existing = schedules_table.get_item(Key={'schedule_id': schedule_id})
    if 'Item' not in existing:
        return json_response(404, {'error': 'Schedule not found'})

    if existing['Item'].get('user_id') != user_id:
        return json_response(403, {'error': 'Unauthorized'})

    schedules_table.delete_item(Key={'schedule_id': schedule_id})

    return json_response(200, {
        'success': True,
        'message': 'Schedule deleted successfully',
        'schedule_id': schedule_id
    })


def toggle_schedule(body):
    """Toggle schedule between active and paused."""
    schedule_id = body.get('schedule_id')
    user_id = body.get('user_id')

    if not schedule_id:
        return json_response(400, {'error': 'schedule_id is required'})

    schedules_table = dynamodb.Table(SCHEDULES_TABLE)

    # Get current schedule
    existing = schedules_table.get_item(Key={'schedule_id': schedule_id})
    if 'Item' not in existing:
        return json_response(404, {'error': 'Schedule not found'})

    schedule = existing['Item']
    if schedule.get('user_id') != user_id:
        return json_response(403, {'error': 'Unauthorized'})

    # Toggle status
    current_status = schedule.get('status', 'active')
    new_status = 'paused' if current_status == 'active' else 'active'

    schedules_table.update_item(
        Key={'schedule_id': schedule_id},
        UpdateExpression='SET #status = :status, updated_at = :now',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': new_status,
            ':now': datetime.utcnow().isoformat()
        }
    )

    return json_response(200, {
        'success': True,
        'message': f'Schedule {new_status}',
        'schedule_id': schedule_id,
        'status': new_status
    })


def list_schedules(body):
    """List all schedules for a user."""
    user_id = body.get('user_id')

    if not user_id:
        return json_response(400, {'error': 'user_id is required'})

    schedules_table = dynamodb.Table(SCHEDULES_TABLE)

    # Scan with filter (would be better with GSI on user_id)
    response = schedules_table.scan(
        FilterExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )

    schedules = response.get('Items', [])

    # Sort by created_at descending
    schedules.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return json_response(200, {
        'success': True,
        'schedules': schedules,
        'count': len(schedules)
    })


def validate_scheduler_addon(body):
    """Check if user has active scheduler addon."""
    user_id = body.get('user_id')

    if not user_id:
        return json_response(400, {'error': 'user_id is required'})

    has_addon, expires_at = check_scheduler_addon(user_id)

    # Also count user's schedules
    schedules_table = dynamodb.Table(SCHEDULES_TABLE)
    response = schedules_table.scan(
        FilterExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id},
        Select='COUNT'
    )
    schedule_count = response.get('Count', 0)

    return json_response(200, {
        'success': True,
        'has_addon': has_addon,
        'expires_at': expires_at,
        'schedule_count': schedule_count,
        'max_schedulers': 10 if has_addon else 0  # Max schedules per user
    })


def run_schedule_now(body):
    """Run a schedule immediately (bypassing the schedule)."""
    schedule_id = body.get('schedule_id')
    user_id = body.get('user_id')

    if not schedule_id:
        return json_response(400, {'error': 'schedule_id is required'})

    # Invoke the scheduler Lambda with execute action
    try:
        response = lambda_client.invoke(
            FunctionName=SCHEDULER_LAMBDA,
            InvocationType='Event',  # Async
            Payload=json.dumps({
                'action': 'execute',
                'schedule_id': schedule_id,
                'user_id': user_id,
                'manual_run': True
            })
        )

        return json_response(200, {
            'success': True,
            'message': 'Audit started',
            'schedule_id': schedule_id
        })
    except Exception as e:
        print(f"Error invoking scheduler Lambda: {e}")
        return json_response(500, {'error': 'Failed to start audit', 'message': str(e)})


def check_scheduler_addon(user_id):
    """Check if user has active scheduler addon."""
    try:
        subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)

        # Query subscriptions for this user
        response = subscriptions_table.query(
            IndexName='user_id-index',
            KeyConditionExpression='user_id = :uid',
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':uid': user_id,
                ':active': 'active'
            }
        )

        for sub in response.get('Items', []):
            addons = sub.get('addons', [])
            if isinstance(addons, list):
                if 'scheduler' in addons or 'scheduled_audits' in addons:
                    return True, sub.get('expires_at')

            # Also check addon_subscriptions field
            addon_subs = sub.get('addon_subscriptions', [])
            for addon in addon_subs:
                addon_id = addon.get('addon_id', '') if isinstance(addon, dict) else addon
                if addon_id in ['scheduler', 'scheduled_audits']:
                    return True, addon.get('expires_at') if isinstance(addon, dict) else sub.get('expires_at')

        return False, None

    except Exception as e:
        print(f"Error checking scheduler addon: {e}")
        return False, None


def handle_credits_request(body, action):
    """
    Handle credit pack purchase requests.
    Routes to credits Lambda.
    """
    try:
        response = lambda_client.invoke(
            FunctionName=CREDITS_LAMBDA,
            InvocationType='RequestResponse',
            Payload=json.dumps(body)
        )

        result = json.loads(response['Payload'].read())
        return result

    except Exception as e:
        print(f"Error invoking credits Lambda: {e}")
        return json_response(500, {'error': 'Failed to process credits request', 'message': str(e)})


def handle_whitelabel_request(body, action):
    """
    Handle white-label report requests.
    Routes to whitelabel Lambda.
    """
    try:
        response = lambda_client.invoke(
            FunctionName=WHITELABEL_LAMBDA,
            InvocationType='RequestResponse',
            Payload=json.dumps(body)
        )

        result = json.loads(response['Payload'].read())
        return result

    except Exception as e:
        print(f"Error invoking whitelabel Lambda: {e}")
        return json_response(500, {'error': 'Failed to process whitelabel request', 'message': str(e)})
