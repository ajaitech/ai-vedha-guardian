"""
AiVedha Guard - Blog Manager Lambda
Handles all blog operations: listing, viewing, commenting, rating, and newsletter
"""

import json
import boto3
import uuid
import os
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
blogs_table = dynamodb.Table('aivedha-guardian-blogs')
comments_table = dynamodb.Table('aivedha-guardian-blog-comments')
ratings_table = dynamodb.Table('aivedha-guardian-blog-ratings')

# SES for newsletter
ses = boto3.client('ses', region_name='us-east-1')

# CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://aivedha.ai',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super().default(obj)


def json_response(status_code, body):
    """Create JSON response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def lambda_handler(event, context):
    """Main Lambda handler - routes requests to appropriate function"""
    print(f"Event: {json.dumps(event)}")

    # Handle OPTIONS preflight
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', ''))
    if http_method == 'OPTIONS':
        return json_response(200, {'message': 'OK'})

    # Get path and method
    path = event.get('path', event.get('rawPath', ''))
    resource = event.get('resource', path)

    try:
        # Route based on path and method
        if '/blogs/comment/like' in path and http_method == 'POST':
            return like_comment(event)
        elif '/blogs/comment' in path and http_method == 'POST':
            return add_comment(event)
        elif '/blogs/rate' in path and http_method == 'POST':
            return rate_blog(event)
        elif '/blogs/view' in path and http_method == 'POST':
            return track_view(event)
        elif '/blogs/categories' in path and http_method == 'GET':
            return get_categories(event)
        elif '/blogs/' in path and http_method == 'GET' and '{slug}' in resource:
            return get_blog_by_slug(event)
        elif path.endswith('/blogs') and http_method == 'GET':
            return list_blogs(event)
        elif '/newsletter/subscribe' in path and http_method == 'POST':
            return newsletter_subscribe(event)
        else:
            return json_response(404, {'error': 'Not found', 'path': path, 'method': http_method})

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return json_response(500, {'error': str(e)})


def list_blogs(event):
    """GET /blogs - List all blogs with optional filters"""
    params = event.get('queryStringParameters') or {}
    category = params.get('category')
    search = params.get('search', '').lower()
    limit = int(params.get('limit', 50))
    offset = int(params.get('offset', 0))

    try:
        # Get blogs - use GSI query when category is specified
        # Note: For no-category case, scan is acceptable for blog tables (<1000 items)
        # For larger scale, consider adding a publishedAt GSI for date-sorted queries
        if category:
            response = blogs_table.query(
                IndexName='category-index',
                KeyConditionExpression=Key('category').eq(category)
            )
        else:
            # Limit scan to prevent unbounded reads (pagination handled in-memory)
            response = blogs_table.scan(Limit=500)

        blogs = response.get('Items', [])

        # Apply search filter if provided
        if search:
            blogs = [b for b in blogs if
                     search in b.get('title', '').lower() or
                     search in b.get('excerpt', '').lower() or
                     search in ' '.join(b.get('tags', [])).lower()]

        # Sort by publishedAt descending
        blogs.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)

        # Apply pagination
        total = len(blogs)
        blogs = blogs[offset:offset + limit]

        # Get comment counts for each blog
        for blog in blogs:
            blog['commentCount'] = get_comment_count(blog['blogId'])

        return json_response(200, {
            'blogs': blogs,
            'total': total
        })

    except Exception as e:
        print(f"Error listing blogs: {e}")
        return json_response(500, {'error': str(e)})


def get_blog_by_slug(event):
    """GET /blogs/{slug} - Get single blog by slug"""
    path_params = event.get('pathParameters') or {}
    slug = path_params.get('slug')

    if not slug:
        # Try to extract from path
        path = event.get('path', '')
        parts = path.split('/blogs/')
        if len(parts) > 1:
            slug = parts[1].strip('/')

    if not slug:
        return json_response(400, {'error': 'Slug is required'})

    try:
        # Query by slug index
        response = blogs_table.query(
            IndexName='slug-index',
            KeyConditionExpression=Key('slug').eq(slug)
        )

        items = response.get('Items', [])
        if not items:
            return json_response(404, {'error': 'Blog not found'})

        blog = items[0]

        # Get comments for this blog
        comments_response = comments_table.query(
            IndexName='blogId-timestamp-index',
            KeyConditionExpression=Key('blogId').eq(blog['blogId']),
            ScanIndexForward=False  # Newest first
        )
        blog['comments'] = comments_response.get('Items', [])

        # Get related blogs (same category, different blog)
        related_response = blogs_table.query(
            IndexName='category-index',
            KeyConditionExpression=Key('category').eq(blog.get('category', '')),
            Limit=5
        )
        related = [b for b in related_response.get('Items', []) if b['blogId'] != blog['blogId']][:4]

        return json_response(200, {
            'blog': blog,
            'relatedBlogs': related
        })

    except Exception as e:
        print(f"Error getting blog: {e}")
        return json_response(500, {'error': str(e)})


def add_comment(event):
    """POST /blogs/comment - Add a comment to a blog"""
    try:
        body = json.loads(event.get('body', '{}'))
    except:
        body = {}

    blog_id = body.get('blog_id') or body.get('blogId')
    name = body.get('name', 'Anonymous')
    email = body.get('email')
    content = body.get('content', '').strip()
    parent_id = body.get('parent_comment_id') or body.get('parentCommentId')

    if not blog_id or not content:
        return json_response(400, {'error': 'blog_id and content are required'})

    try:
        comment_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        comment = {
            'commentId': comment_id,
            'blogId': blog_id,
            'author': {
                'name': name,
                'role': 'Reader',
                'avatar': f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random",
                'country': 'Unknown',
                'countryFlag': ''
            },
            'content': content,
            'timestamp': timestamp,
            'likes': 0,
            'parentCommentId': parent_id
        }

        comments_table.put_item(Item=comment)

        # Update comment count in blog
        blogs_table.update_item(
            Key={'blogId': blog_id},
            UpdateExpression='SET commentCount = if_not_exists(commentCount, :zero) + :one',
            ExpressionAttributeValues={':zero': 0, ':one': 1}
        )

        return json_response(200, {
            'success': True,
            'comment': {
                'id': comment_id,
                'content': content,
                'timestamp': timestamp
            }
        })

    except Exception as e:
        print(f"Error adding comment: {e}")
        return json_response(500, {'error': str(e)})


def rate_blog(event):
    """POST /blogs/rate - Rate a blog"""
    try:
        body = json.loads(event.get('body', '{}'))
    except:
        body = {}

    blog_id = body.get('blog_id') or body.get('blogId')
    rating = body.get('rating')
    user_id = body.get('user_id') or body.get('userId') or 'anonymous'

    if not blog_id or rating is None:
        return json_response(400, {'error': 'blog_id and rating are required'})

    rating = int(rating)
    if rating < 1 or rating > 5:
        return json_response(400, {'error': 'Rating must be between 1 and 5'})

    try:
        rating_id = f"{blog_id}_{user_id}"

        # Check if user already rated
        existing = ratings_table.get_item(Key={'ratingId': rating_id})
        is_update = 'Item' in existing
        old_rating = existing.get('Item', {}).get('rating', 0) if is_update else 0

        # Save/update rating
        ratings_table.put_item(Item={
            'ratingId': rating_id,
            'blogId': blog_id,
            'userId': user_id,
            'rating': rating,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

        # Update blog's average rating
        if is_update:
            # Update existing rating - adjust the total
            blogs_table.update_item(
                Key={'blogId': blog_id},
                UpdateExpression='SET ratingTotal = ratingTotal - :old + :new',
                ExpressionAttributeValues={':old': old_rating, ':new': rating}
            )
        else:
            # New rating
            blogs_table.update_item(
                Key={'blogId': blog_id},
                UpdateExpression='SET ratingTotal = if_not_exists(ratingTotal, :zero) + :rating, ratingCount = if_not_exists(ratingCount, :zero) + :one',
                ExpressionAttributeValues={':zero': 0, ':rating': rating, ':one': 1}
            )

        # Get updated blog to calculate new average
        blog = blogs_table.get_item(Key={'blogId': blog_id}).get('Item', {})
        total = blog.get('ratingTotal', rating)
        count = blog.get('ratingCount', 1)
        new_rating = round(total / count, 1) if count > 0 else rating

        # Update the rating field
        blogs_table.update_item(
            Key={'blogId': blog_id},
            UpdateExpression='SET rating = :rating',
            ExpressionAttributeValues={':rating': Decimal(str(new_rating))}
        )

        return json_response(200, {
            'success': True,
            'newRating': new_rating,
            'newRatingCount': count
        })

    except Exception as e:
        print(f"Error rating blog: {e}")
        return json_response(500, {'error': str(e)})


def track_view(event):
    """POST /blogs/view - Track blog view"""
    try:
        body = json.loads(event.get('body', '{}'))
    except:
        body = {}

    blog_id = body.get('blog_id') or body.get('blogId')

    if not blog_id:
        return json_response(400, {'error': 'blog_id is required'})

    try:
        # Increment view count
        response = blogs_table.update_item(
            Key={'blogId': blog_id},
            UpdateExpression='SET #views = if_not_exists(#views, :zero) + :one',
            ExpressionAttributeNames={'#views': 'views'},
            ExpressionAttributeValues={':zero': 0, ':one': 1},
            ReturnValues='UPDATED_NEW'
        )

        new_view_count = response.get('Attributes', {}).get('views', 1)

        return json_response(200, {
            'success': True,
            'newViewCount': new_view_count
        })

    except Exception as e:
        print(f"Error tracking view: {e}")
        return json_response(500, {'error': str(e)})


def like_comment(event):
    """POST /blogs/comment/like - Like a comment"""
    try:
        body = json.loads(event.get('body', '{}'))
    except:
        body = {}

    comment_id = body.get('comment_id') or body.get('commentId')
    blog_id = body.get('blog_id') or body.get('blogId')

    if not comment_id:
        return json_response(400, {'error': 'comment_id is required'})

    try:
        # Increment like count
        response = comments_table.update_item(
            Key={'commentId': comment_id},
            UpdateExpression='SET likes = if_not_exists(likes, :zero) + :one',
            ExpressionAttributeValues={':zero': 0, ':one': 1},
            ReturnValues='UPDATED_NEW'
        )

        new_like_count = response.get('Attributes', {}).get('likes', 1)

        return json_response(200, {
            'success': True,
            'newLikeCount': new_like_count
        })

    except Exception as e:
        print(f"Error liking comment: {e}")
        return json_response(500, {'error': str(e)})


def get_categories(event):
    """GET /blogs/categories - Get all blog categories with counts"""
    try:
        # Scan all blogs to get categories
        # Note: This is an aggregation query. For better performance at scale:
        # 1. Maintain a separate categories summary table updated on blog changes
        # 2. Use DAX caching for this endpoint
        # 3. Cache result in Lambda memory with TTL
        response = blogs_table.scan(
            ProjectionExpression='category',
            Limit=1000  # Cap to prevent runaway scans
        )

        # Count categories
        category_counts = {}
        for item in response.get('Items', []):
            cat = item.get('category', 'Uncategorized')
            category_counts[cat] = category_counts.get(cat, 0) + 1

        categories = [
            {'id': cat.lower().replace(' ', '-'), 'name': cat, 'count': count}
            for cat, count in sorted(category_counts.items())
        ]

        return json_response(200, {'categories': categories})

    except Exception as e:
        print(f"Error getting categories: {e}")
        return json_response(500, {'error': str(e)})


def newsletter_subscribe(event):
    """POST /newsletter/subscribe - Subscribe to newsletter"""
    try:
        body = json.loads(event.get('body', '{}'))
    except:
        body = {}

    email = body.get('email', '').strip().lower()

    if not email or '@' not in email:
        return json_response(400, {'error': 'Valid email is required'})

    try:
        # Store in a simple newsletter table or just send confirmation
        # For now, send a welcome email
        try:
            ses.send_email(
                Source='noreply@aivedha.ai',
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': 'Welcome to AiVedha Guard Newsletter!'},
                    'Body': {
                        'Html': {'Data': f'''
                            <html>
                            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h1 style="color: #3b82f6;">Welcome to AiVedha Guard!</h1>
                                <p>Thank you for subscribing to our cybersecurity newsletter.</p>
                                <p>You'll receive:</p>
                                <ul>
                                    <li>Latest security insights and trends</li>
                                    <li>Expert tips on protecting your websites</li>
                                    <li>Product updates and new features</li>
                                </ul>
                                <p>Stay secure!</p>
                                <p>The AiVedha Guard Team</p>
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                                <p style="font-size: 12px; color: #6b7280;">
                                    <a href="https://aivedha.ai">aivedha.ai</a> |
                                    <a href="https://aivedha.ai/privacy">Privacy Policy</a>
                                </p>
                            </body>
                            </html>
                        '''}
                    }
                }
            )
        except Exception as email_error:
            print(f"Email send error (non-fatal): {email_error}")

        return json_response(200, {
            'success': True,
            'message': 'Successfully subscribed to newsletter'
        })

    except Exception as e:
        print(f"Error subscribing: {e}")
        return json_response(500, {'error': str(e)})


def get_comment_count(blog_id):
    """Helper to get comment count for a blog"""
    try:
        response = comments_table.query(
            IndexName='blogId-timestamp-index',
            KeyConditionExpression=Key('blogId').eq(blog_id),
            Select='COUNT'
        )
        return response.get('Count', 0)
    except:
        return 0
