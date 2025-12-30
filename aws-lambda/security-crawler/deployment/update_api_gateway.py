#!/usr/bin/env python3
"""
AiVedha Guard - API Gateway Configuration Update Script
Version: 4.0.0

This script updates the API Gateway configuration for the audit augmentation:
1. Ensures CORS is properly configured on all endpoints
2. Verifies SSL certificate assignment
3. Updates integration settings
4. Creates new routes if needed

Usage:
    python update_api_gateway.py [--dry-run]

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import boto3
import json
import argparse
import sys
from datetime import datetime

# Configuration
AWS_REGION = 'us-east-1'
API_ID = 'btxmpjub05'
STAGE_NAME = 'api'
CUSTOM_DOMAIN = 'api.aivedha.ai'

# CORS Configuration
CORS_HEADERS = {
    'Access-Control-Allow-Origin': "'*'",
    'Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With'",
    'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
    'Access-Control-Max-Age': "'86400'"
}

# Endpoints requiring CORS update
AUDIT_ENDPOINTS = [
    {'path': '/api/audit/start', 'methods': ['POST', 'OPTIONS']},
    {'path': '/api/audit/status/{reportId}', 'methods': ['GET', 'OPTIONS']},
]


def get_api_client():
    """Get API Gateway client."""
    return boto3.client('apigateway', region_name=AWS_REGION)


def get_resources(client):
    """Get all API Gateway resources."""
    resources = []
    paginator = client.get_paginator('get_resources')

    for page in paginator.paginate(restApiId=API_ID):
        resources.extend(page.get('items', []))

    return resources


def find_resource_by_path(resources, path):
    """Find resource by path."""
    for resource in resources:
        if resource.get('path') == path:
            return resource
    return None


def update_options_method(client, resource_id, dry_run=False):
    """
    Update OPTIONS method for CORS preflight handling.
    """
    print(f"  Updating OPTIONS method for resource {resource_id}")

    if dry_run:
        print("    [DRY RUN] Would update OPTIONS method")
        return True

    try:
        # Check if OPTIONS method exists
        try:
            client.get_method(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod='OPTIONS'
            )
            method_exists = True
        except client.exceptions.NotFoundException:
            method_exists = False

        if not method_exists:
            # Create OPTIONS method
            client.put_method(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod='OPTIONS',
                authorizationType='NONE'
            )
            print("    Created OPTIONS method")

        # Update method response
        try:
            client.delete_method_response(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod='OPTIONS',
                statusCode='200'
            )
        except:
            pass

        client.put_method_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': False,
                'method.response.header.Access-Control-Allow-Methods': False,
                'method.response.header.Access-Control-Allow-Origin': False,
                'method.response.header.Access-Control-Max-Age': False
            },
            responseModels={'application/json': 'Empty'}
        )

        # Update integration
        try:
            client.delete_integration(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod='OPTIONS'
            )
        except:
            pass

        client.put_integration(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            type='MOCK',
            requestTemplates={'application/json': '{"statusCode": 200}'}
        )

        # Update integration response
        try:
            client.delete_integration_response(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod='OPTIONS',
                statusCode='200'
            )
        except:
            pass

        client.put_integration_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
                'method.response.header.Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'],
                'method.response.header.Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
                'method.response.header.Access-Control-Max-Age': CORS_HEADERS['Access-Control-Max-Age']
            },
            responseTemplates={'application/json': ''}
        )

        print("    OPTIONS method updated successfully")
        return True

    except Exception as e:
        print(f"    ERROR: {str(e)}")
        return False


def update_method_cors(client, resource_id, http_method, dry_run=False):
    """
    Add CORS headers to method response.
    """
    print(f"  Updating {http_method} method CORS headers")

    if dry_run:
        print(f"    [DRY RUN] Would update {http_method} CORS headers")
        return True

    try:
        # Get existing method
        method = client.get_method(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod=http_method
        )

        # Update method response for 200
        response_params = {
            'method.response.header.Access-Control-Allow-Origin': False,
            'method.response.header.Access-Control-Allow-Headers': False,
            'method.response.header.Access-Control-Allow-Methods': False
        }

        # Delete and recreate method response
        try:
            client.delete_method_response(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod=http_method,
                statusCode='200'
            )
        except:
            pass

        client.put_method_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod=http_method,
            statusCode='200',
            responseParameters=response_params,
            responseModels={'application/json': 'Empty'}
        )

        # Update integration response
        integration_response_params = {
            'method.response.header.Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
            'method.response.header.Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
            'method.response.header.Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods']
        }

        try:
            client.delete_integration_response(
                restApiId=API_ID,
                resourceId=resource_id,
                httpMethod=http_method,
                statusCode='200'
            )
        except:
            pass

        client.put_integration_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod=http_method,
            statusCode='200',
            responseParameters=integration_response_params,
            responseTemplates={'application/json': ''}
        )

        print(f"    {http_method} CORS headers updated")
        return True

    except Exception as e:
        print(f"    ERROR: {str(e)}")
        return False


def verify_custom_domain(client):
    """Verify custom domain configuration."""
    print("\nVerifying custom domain configuration...")

    try:
        domain = client.get_domain_name(domainName=CUSTOM_DOMAIN)
        print(f"  Domain: {domain['domainName']}")
        print(f"  Regional Domain: {domain.get('regionalDomainName', 'N/A')}")
        print(f"  Certificate ARN: {domain.get('regionalCertificateArn', 'N/A')}")
        print(f"  Security Policy: {domain.get('securityPolicy', 'N/A')}")
        print(f"  Status: {domain.get('domainNameStatus', 'N/A')}")

        # Check base path mapping
        mappings = client.get_base_path_mappings(domainName=CUSTOM_DOMAIN)
        print(f"\n  Base Path Mappings:")
        for mapping in mappings.get('items', []):
            print(f"    - Path: {mapping.get('basePath', '(none)')} -> API: {mapping.get('restApiId')} / Stage: {mapping.get('stage')}")

        return True

    except Exception as e:
        print(f"  ERROR: {str(e)}")
        return False


def deploy_api(client, dry_run=False):
    """Deploy API changes to stage."""
    print(f"\nDeploying API to stage '{STAGE_NAME}'...")

    if dry_run:
        print("  [DRY RUN] Would create deployment")
        return True

    try:
        response = client.create_deployment(
            restApiId=API_ID,
            stageName=STAGE_NAME,
            description=f'Audit Augmentation v4.0.0 - {datetime.now().isoformat()}'
        )
        print(f"  Deployment created: {response['id']}")
        return True

    except Exception as e:
        print(f"  ERROR: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Update API Gateway configuration')
    parser.add_argument('--dry-run', action='store_true', help='Perform dry run without making changes')
    args = parser.parse_args()

    print("=" * 60)
    print("AiVedha Guard - API Gateway Configuration Update")
    print(f"API ID: {API_ID}")
    print(f"Region: {AWS_REGION}")
    print(f"Dry Run: {args.dry_run}")
    print("=" * 60)

    client = get_api_client()

    # Get all resources
    print("\nFetching API resources...")
    resources = get_resources(client)
    print(f"  Found {len(resources)} resources")

    # Update CORS for audit endpoints
    print("\nUpdating CORS configuration for audit endpoints...")

    for endpoint in AUDIT_ENDPOINTS:
        path = endpoint['path']
        print(f"\nProcessing: {path}")

        resource = find_resource_by_path(resources, path)
        if not resource:
            print(f"  WARNING: Resource not found for path {path}")
            continue

        resource_id = resource['id']
        print(f"  Resource ID: {resource_id}")

        # Update OPTIONS method
        if 'OPTIONS' in endpoint['methods']:
            update_options_method(client, resource_id, args.dry_run)

        # Update other methods
        for method in endpoint['methods']:
            if method != 'OPTIONS':
                update_method_cors(client, resource_id, method, args.dry_run)

    # Verify custom domain
    verify_custom_domain(client)

    # Deploy changes
    if not args.dry_run:
        deploy_api(client)

    print("\n" + "=" * 60)
    print("Configuration update complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
