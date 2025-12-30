#!/bin/bash

# ============================================================
# AiVedha Guardian - AWS Deployment Script
# ============================================================
#
# This script deploys the updated Lambda functions and
# configures API Gateway for Wix compatibility.
#
# Usage: ./deploy-updates.sh
#
# ============================================================

set -e

REGION="us-east-1"
API_ID="btxmpjub05"
STAGE="prod"

echo "============================================================"
echo "AiVedha Guardian - AWS Deployment"
echo "============================================================"
echo ""

# Step 1: Deploy Subscription Manager Lambda
echo "Step 1: Deploying Subscription Manager Lambda..."
echo ""

cd "$(dirname "$0")/../aws-lambda/subscription-manager"

# Create deployment package
echo "Creating deployment package..."
zip -r lambda_function.zip lambda_function.py

# Update Lambda function
echo "Uploading to AWS Lambda..."
aws lambda update-function-code \
    --function-name aivedha-guardian-subscription-manager \
    --zip-file fileb://lambda_function.zip \
    --region $REGION

echo "Lambda function updated!"
echo ""

# Step 2: Add subscription/sync-user endpoint if not exists
echo "Step 2: Configuring API Gateway endpoints..."
echo ""

# Check if sync-user resource exists
SYNC_USER_EXISTS=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/subscription/sync-user'].id" \
    --output text 2>/dev/null || echo "")

if [ -z "$SYNC_USER_EXISTS" ]; then
    echo "Creating /api/subscription/sync-user endpoint..."

    # Get subscription resource ID
    SUBSCRIPTION_RESOURCE=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $REGION \
        --query "items[?path=='/api/subscription'].id" \
        --output text 2>/dev/null || echo "")

    if [ -z "$SUBSCRIPTION_RESOURCE" ]; then
        echo "Creating /api/subscription resource first..."
        API_RESOURCE=$(aws apigateway get-resources \
            --rest-api-id $API_ID \
            --region $REGION \
            --query "items[?path=='/api'].id" \
            --output text)

        SUBSCRIPTION_RESOURCE=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $API_RESOURCE \
            --path-part "subscription" \
            --region $REGION \
            --query 'id' \
            --output text)
    fi

    # Create sync-user resource
    SYNC_USER_RESOURCE=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $SUBSCRIPTION_RESOURCE \
        --path-part "sync-user" \
        --region $REGION \
        --query 'id' \
        --output text)

    echo "Created sync-user resource: $SYNC_USER_RESOURCE"

    # Add POST method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $SYNC_USER_RESOURCE \
        --http-method POST \
        --authorization-type NONE \
        --region $REGION

    # Add OPTIONS method for CORS
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $SYNC_USER_RESOURCE \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION

    echo "Added POST and OPTIONS methods"

    # Configure Lambda integration
    LAMBDA_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:aivedha-guardian-subscription-manager"

    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $SYNC_USER_RESOURCE \
        --http-method POST \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
        --region $REGION

    echo "Configured Lambda integration"
else
    echo "sync-user endpoint already exists"
fi

# Step 3: Update CORS on all endpoints
echo ""
echo "Step 3: Updating CORS configuration..."

# Get all resources with methods
RESOURCES=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[?resourceMethods!=`null`].[id,path]' \
    --output text)

while IFS=$'\t' read -r RESOURCE_ID RESOURCE_PATH; do
    if [ -n "$RESOURCE_ID" ]; then
        echo "  Updating CORS for: $RESOURCE_PATH"

        # Update OPTIONS response headers
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{
                "method.response.header.Access-Control-Allow-Headers": false,
                "method.response.header.Access-Control-Allow-Methods": false,
                "method.response.header.Access-Control-Allow-Origin": false,
                "method.response.header.Access-Control-Allow-Credentials": false
            }' \
            --region $REGION 2>/dev/null || true

        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{
                "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Api-Key,X-Wix-Client-Id,X-Wix-Instance'"'"'",
                "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'",
                "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'",
                "method.response.header.Access-Control-Allow-Credentials": "'"'"'true'"'"'"
            }' \
            --region $REGION 2>/dev/null || true
    fi
done <<< "$RESOURCES"

echo "CORS updated!"

# Step 4: Deploy API
echo ""
echo "Step 4: Deploying API to $STAGE..."

aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --description "Wix compatibility update - $(date +%Y-%m-%d)" \
    --region $REGION

echo "Deployment complete!"

# Step 5: Grant Lambda permissions
echo ""
echo "Step 5: Updating Lambda permissions..."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws lambda add-permission \
    --function-name aivedha-guardian-subscription-manager \
    --statement-id "AllowAPIGateway-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/*" \
    --region $REGION 2>/dev/null || echo "Permission already exists or updated"

echo ""
echo "============================================================"
echo "Deployment Complete!"
echo "============================================================"
echo ""
echo "Summary:"
echo "  - Lambda function updated with Wix CORS support"
echo "  - API Gateway CORS configured for Wix domains"
echo "  - sync-user endpoint available"
echo ""
echo "API Endpoint: https://api.aivedha.ai/api"
echo ""
echo "Test the sync-user endpoint:"
echo "  curl -X POST https://api.aivedha.ai/api/subscription/sync-user \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\": \"test@example.com\"}'"
echo ""
echo "============================================================"
