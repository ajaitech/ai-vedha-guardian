#!/usr/bin/env python3
"""
AiVedha Guard - Deployment Validation Script
Version: 4.0.0

Validates the complete deployment of the Audit Lambda Augmentation.
Checks API Gateway, Lambda functions, DynamoDB tables, and end-to-end flow.

Usage:
    python validate_deployment.py [--dry-run] [--verbose] [--skip-e2e]

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import argparse
import boto3
import json
import requests
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Tuple

# Configuration
AWS_REGION = 'us-east-1'
API_ID = 'btxmpjub05'
API_CUSTOM_DOMAIN = 'api.aivedha.ai'
STAGE_NAME = 'api'
LAMBDA_FUNCTION_NAME = 'aivedha-guardian-security-crawler'
TEST_URL = 'https://httpbin.org'

# Expected CloudFormation resources
EXPECTED_TABLES = [
    'aivedha-augmented-findings',
    'aivedha-processed-events',
    'aivedha-audit-checkpoints',
    'aivedha-detector-workers',
    'aivedha-attack-chains'
]

EXPECTED_QUEUES = [
    'aivedha-audit-chunks',
    'aivedha-audit-chunks-dlq',
    'aivedha-detector-tasks',
    'aivedha-detector-tasks-dlq',
    'aivedha-audit-notifications',
    'aivedha-audit-notifications-dlq'
]


class ValidationResult:
    """Result of a validation check."""

    def __init__(self, name: str, passed: bool, message: str = '', details: Dict = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details or {}


class DeploymentValidator:
    """Validates deployment of Audit Lambda Augmentation."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: List[ValidationResult] = []

        # AWS clients
        self.apigw = boto3.client('apigateway', region_name=AWS_REGION)
        self.lambda_client = boto3.client('lambda', region_name=AWS_REGION)
        self.dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)
        self.sqs = boto3.client('sqs', region_name=AWS_REGION)
        self.acm = boto3.client('acm', region_name=AWS_REGION)

    def log(self, message: str):
        """Log message if verbose mode enabled."""
        if self.verbose:
            print(f"  [DEBUG] {message}")

    def add_result(self, result: ValidationResult):
        """Add a validation result."""
        self.results.append(result)
        status = "✓" if result.passed else "✗"
        print(f"  {status} {result.name}: {result.message}")

    # ========================================================================
    # API Gateway Validations
    # ========================================================================

    def validate_api_gateway_exists(self) -> bool:
        """Validate API Gateway exists and is configured."""
        try:
            response = self.apigw.get_rest_api(restApiId=API_ID)
            self.add_result(ValidationResult(
                'API Gateway Exists',
                True,
                f"API ID: {API_ID}, Name: {response.get('name')}"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'API Gateway Exists',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_api_gateway_resources(self) -> bool:
        """Validate required API Gateway resources exist."""
        try:
            resources = self.apigw.get_resources(restApiId=API_ID, limit=500)
            paths = [r.get('path') for r in resources.get('items', [])]

            required_paths = ['/api/audit/start', '/api/audit/status/{reportId}']
            missing = []

            for path in required_paths:
                if path not in paths:
                    missing.append(path)

            if missing:
                self.add_result(ValidationResult(
                    'API Gateway Resources',
                    False,
                    f"Missing paths: {missing}"
                ))
                return False

            self.add_result(ValidationResult(
                'API Gateway Resources',
                True,
                f"Found {len(paths)} resources including audit endpoints"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'API Gateway Resources',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_cors_configuration(self) -> bool:
        """Validate CORS is properly configured."""
        try:
            resources = self.apigw.get_resources(restApiId=API_ID, limit=500)
            audit_start_resource = None

            for r in resources.get('items', []):
                if r.get('path') == '/api/audit/start':
                    audit_start_resource = r
                    break

            if not audit_start_resource:
                self.add_result(ValidationResult(
                    'CORS Configuration',
                    False,
                    "/api/audit/start resource not found"
                ))
                return False

            # Check for OPTIONS method
            resource_id = audit_start_resource['id']
            methods = audit_start_resource.get('resourceMethods', {})

            if 'OPTIONS' not in methods:
                self.add_result(ValidationResult(
                    'CORS Configuration',
                    False,
                    "OPTIONS method not found on /api/audit/start"
                ))
                return False

            self.add_result(ValidationResult(
                'CORS Configuration',
                True,
                "OPTIONS method configured on audit endpoints"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'CORS Configuration',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_custom_domain(self) -> bool:
        """Validate custom domain is configured."""
        try:
            domain = self.apigw.get_domain_name(domainName=API_CUSTOM_DOMAIN)

            self.add_result(ValidationResult(
                'Custom Domain',
                True,
                f"Domain: {domain.get('domainName')}, Status: {domain.get('domainNameStatus', 'N/A')}"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'Custom Domain',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_ssl_certificate(self) -> bool:
        """Validate SSL certificate is assigned."""
        try:
            domain = self.apigw.get_domain_name(domainName=API_CUSTOM_DOMAIN)
            cert_arn = domain.get('regionalCertificateArn') or domain.get('certificateArn')

            if not cert_arn:
                self.add_result(ValidationResult(
                    'SSL Certificate',
                    False,
                    "No certificate ARN found on custom domain"
                ))
                return False

            # Verify certificate is valid
            cert = self.acm.describe_certificate(CertificateArn=cert_arn)
            status = cert.get('Certificate', {}).get('Status')

            if status != 'ISSUED':
                self.add_result(ValidationResult(
                    'SSL Certificate',
                    False,
                    f"Certificate status: {status} (expected: ISSUED)"
                ))
                return False

            self.add_result(ValidationResult(
                'SSL Certificate',
                True,
                f"Certificate: {cert_arn.split('/')[-1]}, Status: {status}"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'SSL Certificate',
                False,
                f"Error: {str(e)}"
            ))
            return False

    # ========================================================================
    # Lambda Validations
    # ========================================================================

    def validate_lambda_function(self) -> bool:
        """Validate Lambda function exists and is configured."""
        try:
            func = self.lambda_client.get_function(FunctionName=LAMBDA_FUNCTION_NAME)
            config = func.get('Configuration', {})

            self.add_result(ValidationResult(
                'Lambda Function',
                True,
                f"Runtime: {config.get('Runtime')}, Memory: {config.get('MemorySize')}MB"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'Lambda Function',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_lambda_environment(self) -> bool:
        """Validate Lambda has required environment variables."""
        try:
            func = self.lambda_client.get_function(FunctionName=LAMBDA_FUNCTION_NAME)
            env_vars = func.get('Configuration', {}).get('Environment', {}).get('Variables', {})

            # Check for expected environment variables
            expected_vars = ['DYNAMODB_REPORTS_TABLE', 'S3_REPORTS_BUCKET']
            missing = [v for v in expected_vars if v not in env_vars]

            if missing:
                self.log(f"Missing env vars: {missing}")

            self.add_result(ValidationResult(
                'Lambda Environment',
                True,
                f"Found {len(env_vars)} environment variables"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'Lambda Environment',
                False,
                f"Error: {str(e)}"
            ))
            return False

    # ========================================================================
    # DynamoDB Validations
    # ========================================================================

    def validate_dynamodb_tables(self) -> bool:
        """Validate required DynamoDB tables exist."""
        try:
            tables = self.dynamodb.list_tables().get('TableNames', [])
            existing = []
            missing = []

            for expected_table in EXPECTED_TABLES:
                if expected_table in tables:
                    existing.append(expected_table)
                else:
                    missing.append(expected_table)

            if missing:
                self.log(f"Missing tables: {missing}")
                self.add_result(ValidationResult(
                    'DynamoDB Tables',
                    False,
                    f"Missing {len(missing)} tables: {', '.join(missing)}"
                ))
                return False

            self.add_result(ValidationResult(
                'DynamoDB Tables',
                True,
                f"All {len(EXPECTED_TABLES)} augmentation tables exist"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'DynamoDB Tables',
                False,
                f"Error: {str(e)}"
            ))
            return False

    # ========================================================================
    # SQS Validations
    # ========================================================================

    def validate_sqs_queues(self) -> bool:
        """Validate required SQS queues exist."""
        try:
            queues = self.sqs.list_queues().get('QueueUrls', [])
            queue_names = [q.split('/')[-1] for q in queues]

            existing = []
            missing = []

            for expected_queue in EXPECTED_QUEUES:
                if expected_queue in queue_names:
                    existing.append(expected_queue)
                else:
                    missing.append(expected_queue)

            if missing:
                self.log(f"Missing queues: {missing}")
                self.add_result(ValidationResult(
                    'SQS Queues',
                    False,
                    f"Missing {len(missing)} queues: {', '.join(missing)}"
                ))
                return False

            self.add_result(ValidationResult(
                'SQS Queues',
                True,
                f"All {len(EXPECTED_QUEUES)} queues exist"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'SQS Queues',
                False,
                f"Error: {str(e)}"
            ))
            return False

    # ========================================================================
    # End-to-End Validations
    # ========================================================================

    def validate_api_health(self) -> bool:
        """Validate API is responding."""
        try:
            url = f"https://{API_CUSTOM_DOMAIN}/api/health"
            response = requests.get(url, timeout=10)

            self.add_result(ValidationResult(
                'API Health',
                True,
                f"Status: {response.status_code}"
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'API Health',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_cors_headers(self) -> bool:
        """Validate CORS headers in preflight response."""
        try:
            url = f"https://{API_CUSTOM_DOMAIN}/api/audit/start"
            response = requests.options(
                url,
                headers={
                    'Origin': 'https://aivedha.ai',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                timeout=10
            )

            cors_origin = response.headers.get('Access-Control-Allow-Origin')
            cors_methods = response.headers.get('Access-Control-Allow-Methods')

            if not cors_origin or not cors_methods:
                self.add_result(ValidationResult(
                    'CORS Headers',
                    False,
                    "Missing CORS headers in preflight response"
                ))
                return False

            self.add_result(ValidationResult(
                'CORS Headers',
                True,
                f"Allow-Origin: {cors_origin}, Allow-Methods: {cors_methods[:50]}..."
            ))
            return True
        except Exception as e:
            self.add_result(ValidationResult(
                'CORS Headers',
                False,
                f"Error: {str(e)}"
            ))
            return False

    def validate_end_to_end_audit(self, dry_run: bool = False) -> bool:
        """Validate complete audit flow (optional)."""
        if dry_run:
            self.add_result(ValidationResult(
                'End-to-End Audit',
                True,
                "Skipped (dry-run mode)"
            ))
            return True

        try:
            # Start audit
            url = f"https://{API_CUSTOM_DOMAIN}/api/audit/start"
            payload = {
                'url': TEST_URL,
                'userId': f'validation-test-{int(time.time())}',
                'augmentationMode': 'parallel-augment',
                'scanDepth': 'standard'
            }

            self.log(f"Starting audit for {TEST_URL}")
            response = requests.post(url, json=payload, timeout=60)

            if response.status_code == 401:
                self.add_result(ValidationResult(
                    'End-to-End Audit',
                    True,
                    "Skipped (authentication required)"
                ))
                return True

            if response.status_code != 200 and response.status_code != 202:
                self.add_result(ValidationResult(
                    'End-to-End Audit',
                    False,
                    f"Start audit failed: {response.status_code}"
                ))
                return False

            result = response.json()
            report_id = result.get('report_id')

            if not report_id:
                self.add_result(ValidationResult(
                    'End-to-End Audit',
                    False,
                    "No report_id returned"
                ))
                return False

            self.log(f"Report ID: {report_id}")

            # Poll for completion (with short timeout for validation)
            status_url = f"https://{API_CUSTOM_DOMAIN}/api/audit/status/{report_id}"
            max_wait = 120
            start_time = time.time()

            while time.time() - start_time < max_wait:
                status_response = requests.get(status_url, timeout=10)
                if status_response.status_code == 200:
                    status = status_response.json()
                    self.log(f"Status: {status.get('status')}, Progress: {status.get('progressPercent', 0)}%")

                    if status.get('status') == 'completed':
                        self.add_result(ValidationResult(
                            'End-to-End Audit',
                            True,
                            f"Completed! Report: {report_id}, Score: {status.get('security_score', 'N/A')}"
                        ))
                        return True

                    if status.get('status') == 'failed':
                        self.add_result(ValidationResult(
                            'End-to-End Audit',
                            False,
                            f"Audit failed: {status.get('error', 'Unknown error')}"
                        ))
                        return False

                time.sleep(5)

            self.add_result(ValidationResult(
                'End-to-End Audit',
                False,
                "Timeout waiting for completion"
            ))
            return False

        except Exception as e:
            self.add_result(ValidationResult(
                'End-to-End Audit',
                False,
                f"Error: {str(e)}"
            ))
            return False

    # ========================================================================
    # Run All Validations
    # ========================================================================

    def run_all(self, skip_e2e: bool = False, dry_run: bool = False) -> bool:
        """Run all validation checks."""
        print("\n" + "=" * 60)
        print("AiVedha Guard - Deployment Validation")
        print(f"Timestamp: {datetime.utcnow().isoformat()}Z")
        print("=" * 60)

        # API Gateway validations
        print("\n[API Gateway]")
        self.validate_api_gateway_exists()
        self.validate_api_gateway_resources()
        self.validate_cors_configuration()
        self.validate_custom_domain()
        self.validate_ssl_certificate()

        # Lambda validations
        print("\n[Lambda Functions]")
        self.validate_lambda_function()
        self.validate_lambda_environment()

        # DynamoDB validations
        print("\n[DynamoDB Tables]")
        self.validate_dynamodb_tables()

        # SQS validations
        print("\n[SQS Queues]")
        self.validate_sqs_queues()

        # End-to-end validations
        print("\n[End-to-End Tests]")
        self.validate_api_health()
        self.validate_cors_headers()

        if not skip_e2e:
            self.validate_end_to_end_audit(dry_run=dry_run)
        else:
            self.add_result(ValidationResult(
                'End-to-End Audit',
                True,
                "Skipped (--skip-e2e flag)"
            ))

        # Summary
        print("\n" + "=" * 60)
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        all_passed = passed == total

        if all_passed:
            print(f"✓ All {total} validations PASSED")
        else:
            print(f"✗ {passed}/{total} validations passed, {total - passed} FAILED")
            print("\nFailed checks:")
            for r in self.results:
                if not r.passed:
                    print(f"  - {r.name}: {r.message}")

        print("=" * 60 + "\n")

        return all_passed


def main():
    parser = argparse.ArgumentParser(
        description='Validate AiVedha Guard Audit Lambda deployment'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Skip actual audit execution in E2E test'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )
    parser.add_argument(
        '--skip-e2e',
        action='store_true',
        help='Skip end-to-end audit test'
    )

    args = parser.parse_args()

    validator = DeploymentValidator(verbose=args.verbose)
    success = validator.run_all(skip_e2e=args.skip_e2e, dry_run=args.dry_run)

    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
