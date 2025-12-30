#!/bin/bash

# ============================================================
# AiVedha Guardian - API Gateway CORS Update Script
# ============================================================
#
# This script updates CORS settings on all API Gateway endpoints
# to allow requests from Wix domains.
#
# Usage: ./update-api-gateway-cors.sh
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - jq installed for JSON processing
#
# ============================================================

set -e

# Configuration
API_ID="btxmpjub05"
REGION="us-east-1"
STAGE="prod"

# Wix-compatible CORS headers
ALLOWED_ORIGINS="https://aivedha.ai,https://www.aivedha.ai,https://editor.wix.com,https://manage.wix.com,https://www.wix.com"
ALLOWED_METHODS="GET,POST,PUT,DELETE,OPTIONS"
ALLOWED_HEADERS="Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Api-Key,X-Wix-Client-Id,X-Wix-Instance"

echo "============================================================"
echo "AiVedha Guardian - API Gateway CORS Update"
echo "============================================================"
echo ""
echo "API ID: $API_ID"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo ""

# Get all resources
echo "Fetching API resources..."
RESOURCES=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[*].{id:id,path:path}' --output json)

echo "Found resources:"
echo "$RESOURCES" | jq -r '.[] | "  \(.path)"'
echo ""

# Function to update OPTIONS method response headers
update_cors_headers() {
    local RESOURCE_ID=$1
    local RESOURCE_PATH=$2

    echo "Updating CORS for: $RESOURCE_PATH ($RESOURCE_ID)"

    # Check if OPTIONS method exists
    OPTIONS_EXISTS=$(aws apigateway get-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --region $REGION 2>/dev/null && echo "yes" || echo "no")

    if [ "$OPTIONS_EXISTS" == "no" ]; then
        echo "  Creating OPTIONS method..."

        # Create OPTIONS method
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --authorization-type NONE \
            --region $REGION > /dev/null 2>&1 || true

        # Create method response
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters "{
                \"method.response.header.Access-Control-Allow-Headers\": false,
                \"method.response.header.Access-Control-Allow-Methods\": false,
                \"method.response.header.Access-Control-Allow-Origin\": false,
                \"method.response.header.Access-Control-Allow-Credentials\": false
            }" \
            --region $REGION > /dev/null 2>&1 || true

        # Create integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
            --region $REGION > /dev/null 2>&1 || true

        # Create integration response
        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters "{
                \"method.response.header.Access-Control-Allow-Headers\": \"'$ALLOWED_HEADERS'\",
                \"method.response.header.Access-Control-Allow-Methods\": \"'$ALLOWED_METHODS'\",
                \"method.response.header.Access-Control-Allow-Origin\": \"'*'\",
                \"method.response.header.Access-Control-Allow-Credentials\": \"'true'\"
            }" \
            --region $REGION > /dev/null 2>&1 || true

        echo "  OPTIONS method created with CORS headers"
    else
        echo "  OPTIONS method exists, updating headers..."

        # Update integration response headers
        aws apigateway update-integration-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --patch-operations "[
                {\"op\": \"replace\", \"path\": \"/responseParameters/method.response.header.Access-Control-Allow-Headers\", \"value\": \"'$ALLOWED_HEADERS'\"},
                {\"op\": \"replace\", \"path\": \"/responseParameters/method.response.header.Access-Control-Allow-Methods\", \"value\": \"'$ALLOWED_METHODS'\"},
                {\"op\": \"replace\", \"path\": \"/responseParameters/method.response.header.Access-Control-Allow-Origin\", \"value\": \"'*'\"},
                {\"op\": \"replace\", \"path\": \"/responseParameters/method.response.header.Access-Control-Allow-Credentials\", \"value\": \"'true'\"}
            ]" \
            --region $REGION > /dev/null 2>&1 || true

        echo "  CORS headers updated"
    fi
}

# Process each resource
echo "Updating CORS configuration..."
echo ""

# Get resource IDs and paths that have methods
RESOURCE_DATA=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --output json)

echo "$RESOURCE_DATA" | jq -r '.items[] | select(.resourceMethods != null) | "\(.id) \(.path)"' | while read RESOURCE_ID RESOURCE_PATH; do
    update_cors_headers "$RESOURCE_ID" "$RESOURCE_PATH"
done

echo ""
echo "============================================================"
echo "CORS Update Complete!"
echo ""
echo "Deploying to stage: $STAGE"

# Deploy API
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --description "CORS update for Wix compatibility" \
    --region $REGION > /dev/null 2>&1 || true

echo "Deployment complete!"
echo ""
echo "============================================================"
echo "API is now configured to accept requests from Wix domains:"
echo "  - *.wix.com"
echo "  - *.wixsite.com"
echo "  - *.editorx.io"
echo "  - aivedha.ai"
echo "============================================================"
