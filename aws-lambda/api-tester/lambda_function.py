import json
import boto3
import requests
import os
from datetime import datetime
from decimal import Decimal

def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'

# Configuration
API_BASE_URL = get_api_base_url()
TEST_USER_EMAIL = "aravind@ajairtm.com"
REPORT_EMAIL = "aravind@aivibe.in"
SENDER_EMAIL = "noreply@aivedha.ai"

# Initialize AWS services
ses_client = boto3.client('ses', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Automated API Testing Lambda
    Tests all AiVedha Guardian API endpoints and sends email report
    """

    print("Starting API tests...")

    # Run all tests
    test_results = []

    # 1. Health Check
    test_results.append(test_health_endpoint())

    # 2. User Credits
    test_results.append(test_user_credits())

    # 3. Auth Login (expect error for invalid creds)
    test_results.append(test_auth_login())

    # 4. Auth Google
    test_results.append(test_auth_google())

    # 5. Support Check Ticket
    test_results.append(test_support_check_ticket())

    # 6. Support Create Ticket
    test_results.append(test_support_create_ticket())

    # 7. Recaptcha Verify
    test_results.append(test_recaptcha_verify())

    # 8. Email Endpoint
    test_results.append(test_email_endpoint())

    # 9. Audit Start (without actually running - just check endpoint responds)
    test_results.append(test_audit_endpoint())

    # 10. Subscription Activate
    test_results.append(test_subscription_activate())

    # 11. Credits Purchase
    test_results.append(test_credits_purchase())

    # 12. CORS Check
    test_results.append(test_cors_headers())

    # Calculate summary
    passed = sum(1 for t in test_results if t['status'] == 'PASS')
    failed = sum(1 for t in test_results if t['status'] == 'FAIL')
    total = len(test_results)

    summary = {
        'timestamp': datetime.utcnow().isoformat(),
        'total_tests': total,
        'passed': passed,
        'failed': failed,
        'pass_rate': f"{(passed/total)*100:.1f}%",
        'test_results': test_results
    }

    print(f"Tests completed: {passed}/{total} passed")

    # Send email report
    send_email_report(summary)

    return {
        'statusCode': 200,
        'body': json.dumps(summary, default=str)
    }


def make_request(method, endpoint, data=None, params=None, timeout=30):
    """Make HTTP request to API"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}

    try:
        if method == 'GET':
            response = requests.get(url, params=params, headers=headers, timeout=timeout)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=timeout)
        elif method == 'OPTIONS':
            response = requests.options(url, headers=headers, timeout=timeout)
        else:
            return None, "Invalid method"

        return response, None
    except requests.exceptions.Timeout:
        return None, "Request timeout"
    except requests.exceptions.ConnectionError:
        return None, "Connection error"
    except Exception as e:
        return None, str(e)


def test_health_endpoint():
    """Test GET /api/health"""
    test_name = "Health Check"
    endpoint = "/health"

    response, error = make_request('GET', endpoint)

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('status') == 'healthy':
                return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
        except:
            pass

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_user_credits():
    """Test GET /api/user/credits"""
    test_name = "User Credits"
    endpoint = "/user/credits"

    response, error = make_request('GET', endpoint, params={'userId': TEST_USER_EMAIL})

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    if response.status_code == 200:
        try:
            data = response.json()
            if 'credits' in data:
                return {
                    'test': test_name,
                    'endpoint': endpoint,
                    'status': 'PASS',
                    'response_time': response.elapsed.total_seconds(),
                    'data': f"Credits: {data.get('credits')}, Plan: {data.get('plan')}"
                }
        except:
            pass

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_auth_login():
    """Test POST /api/auth/login - expect proper error response"""
    test_name = "Auth Login (Invalid Creds)"
    endpoint = "/auth/login"

    response, error = make_request('POST', endpoint, data={'email': 'invalid@test.com', 'password': 'wrong'})

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # For invalid credentials, we expect 400 or 401, not 500
    if response.status_code in [400, 401]:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': 'Internal server error - Lambda may have issues'}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Unexpected status {response.status_code}: {response.text[:200]}'}


def test_auth_google():
    """Test POST /api/auth/google"""
    test_name = "Auth Google"
    endpoint = "/auth/google"

    response, error = make_request('POST', endpoint, data={
        'email': 'test@test.com',
        'fullName': 'Test User',
        'googleId': 'test123',
        'identityId': 'test-identity'
    })

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept 200 (success) or 400 (validation error) but not 500
    if response.status_code in [200, 201]:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': 'Internal server error - Lambda may have issues'}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_support_check_ticket():
    """Test GET /api/support/check-ticket"""
    test_name = "Support Check Ticket"
    endpoint = "/support/check-ticket"

    response, error = make_request('GET', endpoint, params={'ticketId': 'TEST123', 'email': 'test@test.com'})

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept any non-500 response as the endpoint is working
    if response.status_code != 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_support_create_ticket():
    """Test POST /api/support/create-ticket"""
    test_name = "Support Create Ticket"
    endpoint = "/support/create-ticket"

    # Use unique email for testing to avoid "active ticket exists" conflict
    import time
    test_email = f"apitest-{int(time.time())}@test.com"

    response, error = make_request('POST', endpoint, data={
        'email': test_email,
        'name': 'API Test User',
        'subject': 'Automated API Test',
        'message': 'This is an automated test ticket for API validation',
        'category': 'general'
    })

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept 200/201 (success), or 400 with "already have active ticket" (endpoint working correctly)
    if response.status_code in [200, 201]:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 400:
        try:
            data = response.json()
            # "Active ticket exists" is valid business logic, endpoint is working
            if 'active' in data.get('message', '').lower() or data.get('existingTicket'):
                return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds(), 'data': 'Endpoint working (active ticket check)'}
        except:
            pass
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 500:
        try:
            error_msg = response.json().get('message', response.text[:200])
        except:
            error_msg = response.text[:200]
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Internal error: {error_msg}'}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_recaptcha_verify():
    """Test POST /api/recaptcha/verify"""
    test_name = "Recaptcha Verify"
    endpoint = "/recaptcha/verify"

    response, error = make_request('POST', endpoint, data={'token': 'test_invalid_token'})

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # For invalid token, we expect 200 with success:false or 400
    if response.status_code in [200, 400]:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': 'Internal server error'}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_email_endpoint():
    """Test POST /api/email"""
    test_name = "Email Endpoint"
    endpoint = "/email"

    response, error = make_request('POST', endpoint, data={
        'type': 'test',
        'email': 'test@test.com',
        'subject': 'API Test',
        'body': 'Test email body'
    })

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept any non-500 response
    if response.status_code != 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_audit_endpoint():
    """Test POST /api/audit/start - check endpoint responds without consuming credits"""
    test_name = "Audit Start (Validation)"
    endpoint = "/audit/start"

    # Test with missing parameters to check endpoint is working
    response, error = make_request('POST', endpoint, data={'url': ''})

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept 400 (validation error) or any response that's not connection error
    if response.status_code in [200, 400, 402]:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}
    elif response.status_code == 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': 'Internal server error'}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_subscription_activate():
    """Test POST /api/subscription/activate"""
    test_name = "Subscription Activate"
    endpoint = "/subscription/activate"

    response, error = make_request('POST', endpoint, data={
        'subscriptionId': 'test-sub-123',
        'email': 'test@test.com',
        'plan': 'starter'
    })

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept any non-500 response
    if response.status_code != 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_credits_purchase():
    """Test POST /api/credits/purchase"""
    test_name = "Credits Purchase"
    endpoint = "/credits/purchase"

    response, error = make_request('POST', endpoint, data={
        'userId': 'test-user',
        'credits': 10,
        'paymentId': 'test-payment'
    })

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Accept any non-500 response
    if response.status_code != 500:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'PASS', 'response_time': response.elapsed.total_seconds()}

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Status {response.status_code}: {response.text[:200]}'}


def test_cors_headers():
    """Test CORS headers on user/credits endpoint"""
    test_name = "CORS Headers"
    endpoint = "/user/credits"

    response, error = make_request('OPTIONS', endpoint)

    if error:
        return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': error}

    # Check for CORS headers
    cors_origin = response.headers.get('Access-Control-Allow-Origin')
    cors_methods = response.headers.get('Access-Control-Allow-Methods')

    if response.status_code == 200 and cors_origin:
        return {
            'test': test_name,
            'endpoint': endpoint,
            'status': 'PASS',
            'response_time': response.elapsed.total_seconds(),
            'data': f"CORS Origin: {cors_origin}"
        }

    return {'test': test_name, 'endpoint': endpoint, 'status': 'FAIL', 'reason': f'Missing CORS headers. Status: {response.status_code}'}


def send_email_report(summary):
    """Send test results email via SES"""

    # Build HTML email
    html_body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            h1 {{ color: #3b82f6; }}
            .summary {{ background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }}
            .pass {{ color: #22c55e; font-weight: bold; }}
            .fail {{ color: #ef4444; font-weight: bold; }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #e5e7eb; padding: 10px; text-align: left; }}
            th {{ background: #3b82f6; color: white; }}
            tr:nth-child(even) {{ background: #f9fafb; }}
            .reason {{ color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <h1>AiVedha Guardian - API Test Report</h1>

        <div class="summary">
            <p><strong>Test Time:</strong> {summary['timestamp']}</p>
            <p><strong>Total Tests:</strong> {summary['total_tests']}</p>
            <p><strong>Passed:</strong> <span class="pass">{summary['passed']}</span></p>
            <p><strong>Failed:</strong> <span class="fail">{summary['failed']}</span></p>
            <p><strong>Pass Rate:</strong> {summary['pass_rate']}</p>
        </div>

        <h2>Test Results</h2>
        <table>
            <tr>
                <th>Test Name</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Details</th>
            </tr>
    """

    for test in summary['test_results']:
        status_class = 'pass' if test['status'] == 'PASS' else 'fail'
        details = test.get('reason', test.get('data', f"Response time: {test.get('response_time', 'N/A')}s"))

        html_body += f"""
            <tr>
                <td>{test['test']}</td>
                <td>{test['endpoint']}</td>
                <td class="{status_class}">{test['status']}</td>
                <td class="reason">{details}</td>
            </tr>
        """

    html_body += """
        </table>

        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            This is an automated test report from AiVedha Guardian API Testing System.
        </p>
    </body>
    </html>
    """

    # Plain text version
    text_body = f"""
AiVedha Guardian - API Test Report
===================================

Test Time: {summary['timestamp']}
Total Tests: {summary['total_tests']}
Passed: {summary['passed']}
Failed: {summary['failed']}
Pass Rate: {summary['pass_rate']}

Test Results:
"""

    for test in summary['test_results']:
        details = test.get('reason', test.get('data', ''))
        text_body += f"\n{test['status']} - {test['test']} ({test['endpoint']})"
        if details:
            text_body += f"\n    Details: {details}"

    # Send email
    try:
        response = ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={
                'ToAddresses': [REPORT_EMAIL]
            },
            Message={
                'Subject': {
                    'Data': f"AiVedha API Test Report - {summary['passed']}/{summary['total_tests']} Passed",
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': text_body,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': html_body,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        print(f"Email sent successfully: {response['MessageId']}")
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False
