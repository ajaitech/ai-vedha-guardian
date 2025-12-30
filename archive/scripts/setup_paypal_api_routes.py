#!/usr/bin/env python3
"""
Setup PayPal API Gateway routes
"""

import subprocess
import json
import sys

API_ID = "btxmpjub05"
REGION = "us-east-1"
LAMBDA_ARN = "arn:aws:lambda:us-east-1:783764610283:function:aivedha-guardian-paypal-handler"

# New resources with their IDs and HTTP methods
RESOURCES = [
    {"id": "c81mrx", "path": "credit-packs", "methods": ["GET", "OPTIONS"]},
    {"id": "uzwdkl", "path": "coupons", "methods": ["GET", "OPTIONS"]},
    {"id": "ny0sv2", "path": "validate-coupon", "methods": ["POST", "OPTIONS"]},
    {"id": "a425da", "path": "credits", "methods": ["POST", "OPTIONS"]},
    {"id": "1afxym", "path": "subscribe", "methods": ["POST", "OPTIONS"]},
    {"id": "pyglfn", "path": "capture", "methods": ["POST", "OPTIONS"]},
    {"id": "o8i3b9", "path": "status", "methods": ["POST", "OPTIONS"]},
    {"id": "bjb7zl", "path": "cancel", "methods": ["POST", "OPTIONS"]},
    {"id": "rhm9zx", "path": "plans", "methods": ["GET", "OPTIONS"]},
]

def run_cmd(cmd):
    """Run AWS CLI command"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def setup_method(resource_id, method):
    """Setup a method on a resource"""
    # Create method
    cmd = f'aws apigateway put-method --rest-api-id {API_ID} --resource-id {resource_id} --http-method {method} --authorization-type NONE --region {REGION}'
    success, out, err = run_cmd(cmd)
    if not success and "ConflictException" not in err:
        print(f"  WARN: put-method {method}: {err}")

    if method == "OPTIONS":
        # CORS mock integration for OPTIONS
        cmd = f'aws apigateway put-integration --rest-api-id {API_ID} --resource-id {resource_id} --http-method OPTIONS --type MOCK --request-templates \'{{"application/json": "{{\\\"statusCode\\\": 200}}"}}\' --region {REGION}'
        run_cmd(cmd)

        # CORS headers for OPTIONS response
        cmd = f'aws apigateway put-method-response --rest-api-id {API_ID} --resource-id {resource_id} --http-method OPTIONS --status-code 200 --response-parameters \'{{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}}\' --region {REGION}'
        run_cmd(cmd)

        cmd = f'aws apigateway put-integration-response --rest-api-id {API_ID} --resource-id {resource_id} --http-method OPTIONS --status-code 200 --response-parameters \'{{"method.response.header.Access-Control-Allow-Headers": "\'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token\'", "method.response.header.Access-Control-Allow-Methods": "\'GET,POST,PUT,DELETE,OPTIONS\'", "method.response.header.Access-Control-Allow-Origin": "\'*\'"}}\' --region {REGION}'
        run_cmd(cmd)
    else:
        # Lambda integration for GET/POST
        uri = f"arn:aws:apigateway:{REGION}:lambda:path/2015-03-31/functions/{LAMBDA_ARN}/invocations"
        cmd = f'aws apigateway put-integration --rest-api-id {API_ID} --resource-id {resource_id} --http-method {method} --type AWS_PROXY --integration-http-method POST --uri "{uri}" --region {REGION}'
        success, out, err = run_cmd(cmd)
        if not success:
            print(f"  WARN: put-integration {method}: {err}")

def add_lambda_permission(resource_path, method):
    """Add Lambda permission for API Gateway"""
    source_arn = f"arn:aws:execute-api:{REGION}:783764610283:{API_ID}/*/{method}/api/paypal/{resource_path}"
    statement_id = f"apigateway-paypal-{resource_path.replace('-', '')}-{method}".lower()

    cmd = f'aws lambda add-permission --function-name aivedha-guardian-paypal-handler --statement-id {statement_id} --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "{source_arn}" --region {REGION} 2>&1'
    success, out, err = run_cmd(cmd)
    if success or "ResourceConflictException" in (out + err):
        return True
    return False

def main():
    print("Setting up PayPal API Gateway routes...")

    for resource in RESOURCES:
        print(f"\nConfiguring: /api/paypal/{resource['path']}")

        for method in resource['methods']:
            print(f"  Adding {method} method...")
            setup_method(resource['id'], method)

            if method != "OPTIONS":
                add_lambda_permission(resource['path'], method)

    # Deploy API
    print("\nDeploying API...")
    cmd = f'aws apigateway create-deployment --rest-api-id {API_ID} --stage-name api --region {REGION}'
    success, out, err = run_cmd(cmd)
    if success:
        print("OK: API deployed")
    else:
        print(f"WARN: Deployment: {err}")

    print("\nDone!")

if __name__ == "__main__":
    main()
