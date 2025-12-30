#!/usr/bin/env python3
"""
AiVedha Guardian - Lambda Functions Testing Script
Tests all Lambda functions for the security audit platform
"""

import boto3
import json
import time
import uuid
from datetime import datetime

def test_security_audit_crawler():
    """Test the security audit crawler Lambda function"""
    print("Testing Security Audit Crawler...")
    
    lambda_client = boto3.client('lambda')
    
    test_event = {
        'url': 'https://example.com',
        'user_id': 'test_user_001',
        'report_id': str(uuid.uuid4())
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-security-audit-crawler',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Security Audit Crawler: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Security Audit Crawler failed: {str(e)}")
        return False

def test_report_generator():
    """Test the report generator Lambda function"""
    print("Testing Report Generator...")
    
    lambda_client = boto3.client('lambda')
    
    # First create a mock audit report
    dynamodb = boto3.resource('dynamodb')
    reports_table = dynamodb.Table('aivedha-audit-reports')
    
    test_report_id = str(uuid.uuid4())
    test_user_id = 'test_user_001'
    
    mock_scan_results = {
        'report_id': test_report_id,
        'url': 'https://example.com',
        'scan_timestamp': datetime.utcnow().isoformat(),
        'status': 'completed',
        'security_score': 7.5,
        'ssl_info': {
            'valid': True,
            'issuer': {'organizationName': 'Test CA'},
            'subject': {'commonName': 'example.com'}
        },
        'security_headers': {
            'headers': {
                'strict-transport-security': 'max-age=31536000',
                'x-frame-options': 'DENY'
            },
            'score': 60
        },
        'vulnerabilities': [
            {
                'type': 'MISSING_SECURITY_HEADERS',
                'severity': 'MEDIUM',
                'description': 'Missing 3 security headers',
                'recommendation': 'Implement CSP, X-Content-Type-Options, etc.'
            }
        ]
    }
    
    try:
        # Insert mock data
        reports_table.put_item(Item={
            'report_id': test_report_id,
            'user_id': test_user_id,
            'url': 'https://example.com',
            'scan_results': json.dumps(mock_scan_results),
            'security_score': 7.5,
            'created_at': datetime.utcnow().isoformat(),
            'status': 'completed'
        })
        
        # Test report generation
        test_event = {
            'report_id': test_report_id,
            'user_id': test_user_id
        }
        
        response = lambda_client.invoke(
            FunctionName='aivedha-report-generator',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Report Generator: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Report Generator failed: {str(e)}")
        return False

def test_payment_processor():
    """Test the payment processor Lambda function"""
    print("Testing Payment Processor...")
    
    lambda_client = boto3.client('lambda')
    
    test_event = {
        'user_id': 'test_user_001',
        'email': 'test@example.com',
        'amount': 49.99,
        'currency': 'USD',
        'credits': 5,
        'payment_method': 'paypal'
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-payment-processor',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Payment Processor: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Payment Processor failed: {str(e)}")
        return False

def test_user_authentication():
    """Test the user authentication Lambda function"""
    print("Testing User Authentication...")
    
    lambda_client = boto3.client('lambda')
    
    # Test registration
    register_event = {
        'action': 'register',
        'email': 'test@example.com',
        'password': 'testpassword123',
        'full_name': 'Test User'
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-user-auth',
            InvocationType='RequestResponse',
            Payload=json.dumps(register_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ User Authentication (Register): {result}")
        
        # Test login
        login_event = {
            'action': 'login',
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        
        response = lambda_client.invoke(
            FunctionName='aivedha-user-auth',
            InvocationType='RequestResponse',
            Payload=json.dumps(login_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ User Authentication (Login): {result}")
        return True
        
    except Exception as e:
        print(f"✗ User Authentication failed: {str(e)}")
        return False

def test_credit_manager():
    """Test the credit manager Lambda function"""
    print("Testing Credit Manager...")
    
    lambda_client = boto3.client('lambda')
    
    test_event = {
        'action': 'add_credits',
        'user_id': 'test_user_001',
        'credits': 5,
        'transaction_type': 'purchase',
        'transaction_id': str(uuid.uuid4())
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-credit-manager',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Credit Manager: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Credit Manager failed: {str(e)}")
        return False

def test_coupon_validator():
    """Test the coupon validator Lambda function"""
    print("Testing Coupon Validator...")
    
    lambda_client = boto3.client('lambda')
    
    test_event = {
        'coupon_code': 'AIVEDHA10',
        'email': 'test@example.com',
        'amount': 49.99
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-coupon-validator',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Coupon Validator: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Coupon Validator failed: {str(e)}")
        return False

def test_admin_analytics():
    """Test the admin analytics Lambda function"""
    print("Testing Admin Analytics...")
    
    lambda_client = boto3.client('lambda')
    
    test_event = {
        'action': 'get_dashboard_stats',
        'admin_id': 'admin_001',
        'date_range': '30d'
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='aivedha-admin-analytics',
            InvocationType='RequestResponse',
            Payload=json.dumps(test_event)
        )
        
        result = json.loads(response['Payload'].read())
        print(f"✓ Admin Analytics: {result}")
        return True
        
    except Exception as e:
        print(f"✗ Admin Analytics failed: {str(e)}")
        return False

def test_api_gateway_endpoints():
    """Test API Gateway endpoints"""
    print("Testing API Gateway Endpoints...")
    
    import requests
    
    # This would need to be updated with actual API Gateway URL
    api_base_url = "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod"
    
    endpoints_to_test = [
        {
            'name': 'Health Check',
            'url': f"{api_base_url}/health",
            'method': 'GET'
        },
        {
            'name': 'Start Audit',
            'url': f"{api_base_url}/audit/start",
            'method': 'POST',
            'data': {
                'url': 'https://example.com',
                'user_id': 'test_user_001'
            }
        }
    ]
    
    results = []
    
    for endpoint in endpoints_to_test:
        try:
            if endpoint['method'] == 'GET':
                response = requests.get(endpoint['url'], timeout=10)
            else:
                response = requests.post(
                    endpoint['url'], 
                    json=endpoint.get('data', {}),
                    timeout=10
                )
            
            if response.status_code < 400:
                print(f"✓ {endpoint['name']}: {response.status_code}")
                results.append(True)
            else:
                print(f"✗ {endpoint['name']}: {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"✗ {endpoint['name']}: {str(e)}")
            results.append(False)
    
    return all(results)

def run_all_tests():
    """Run all Lambda function tests"""
    print("=== AiVedha Guardian Lambda Functions Testing ===\n")
    
    tests = [
        test_security_audit_crawler,
        test_report_generator,
        test_payment_processor,
        test_user_authentication,
        test_credit_manager,
        test_coupon_validator,
        test_admin_analytics,
        test_api_gateway_endpoints
    ]
    
    passed_tests = 0
    total_tests = len(tests)
    
    for test_func in tests:
        try:
            if test_func():
                passed_tests += 1
            print()  # Add spacing between tests
        except Exception as e:
            print(f"✗ Test {test_func.__name__} crashed: {str(e)}\n")
    
    print("=== Test Summary ===")
    print(f"Passed: {passed_tests}/{total_tests}")
    print(f"Failed: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed. Check the logs above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)