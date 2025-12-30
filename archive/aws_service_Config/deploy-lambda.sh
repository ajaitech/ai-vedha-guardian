#!/bin/bash

# AiVedha Guardian Lambda Deployment Script
# Deploys all Lambda functions with proper configuration

echo "=== AiVedha Guardian Lambda Deployment ==="
echo "Deploying Lambda functions for security audit platform..."

# Load environment variables and AWS resources
if [ -f aws-resources.txt ]; then
    source aws-resources.txt
else
    echo "Error: aws-resources.txt not found. Please run setup-services.sh first."
    exit 1
fi

# Create deployment package for each Lambda function
LAMBDA_FUNCTIONS=(
    "security-audit-crawler"
    "vulnerability-scanner" 
    "report-generator"
    "payment-processor"
    "user-auth"
    "credit-manager"
    "coupon-validator"
    "admin-analytics"
)

# Function to create deployment package
create_deployment_package() {
    local function_name=$1
    local python_file="${function_name}.py"
    
    echo "Creating deployment package for $function_name..."
    
    # Create temporary directory
    mkdir -p "temp_$function_name"
    cd "temp_$function_name"
    
    # Copy Python file
    cp "../$python_file" .
    
    # Install dependencies based on function type
    case $function_name in
        "security-audit-crawler")
            pip install requests beautifulsoup4 urllib3 -t .
            ;;
        "vulnerability-scanner")
            pip install requests ssl-scanner python-nmap -t .
            ;;
        "report-generator")
            pip install reportlab boto3 -t .
            ;;
        "payment-processor")
            pip install pyjwt cryptography -t .
            ;;
        "user-auth")
            pip install pyjwt bcrypt -t .
            ;;
        "credit-manager")
            pip install boto3 -t .
            ;;
        "coupon-validator")
            pip install boto3 -t .
            ;;
        "admin-analytics")
            pip install boto3 pandas -t .
            ;;
    esac
    
    # Create ZIP package
    zip -r "../${function_name}-deployment.zip" .
    
    # Clean up
    cd ..
    rm -rf "temp_$function_name"
    
    echo "✓ Deployment package created: ${function_name}-deployment.zip"
}

# Function to deploy Lambda function
deploy_lambda_function() {
    local function_name=$1
    local description=$2
    local timeout=${3:-30}
    local memory=${4:-512}
    
    echo "Deploying Lambda function: aivedha-$function_name..."
    
    # Check if function exists
    if aws lambda get-function --function-name "aivedha-$function_name" --region $REGION &>/dev/null; then
        echo "Function exists, updating code..."
        aws lambda update-function-code \
            --function-name "aivedha-$function_name" \
            --zip-file "fileb://${function_name}-deployment.zip" \
            --region $REGION
    else
        echo "Creating new function..."
        aws lambda create-function \
            --function-name "aivedha-$function_name" \
            --runtime python3.9 \
            --role $LAMBDA_ROLE_ARN \
            --handler "${function_name}.lambda_handler" \
            --zip-file "fileb://${function_name}-deployment.zip" \
            --description "$description" \
            --timeout $timeout \
            --memory-size $memory \
            --environment Variables="{
                AWS_REGION=$REGION,
                BUCKET_NAME=$BUCKET_NAME,
                API_GATEWAY_ID=$API_GATEWAY_ID
            }" \
            --region $REGION
    fi
    
    # Add trigger permissions for API Gateway
    aws lambda add-permission \
        --function-name "aivedha-$function_name" \
        --statement-id "api-gateway-invoke" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_GATEWAY_ID/*/*" \
        --region $REGION 2>/dev/null || echo "Permission already exists"
    
    echo "✓ Lambda function deployed: aivedha-$function_name"
}

# Create deployment packages
echo "Creating deployment packages..."
for function in "${LAMBDA_FUNCTIONS[@]}"; do
    create_deployment_package $function
done

echo ""
echo "Deploying Lambda functions..."

# Deploy each function with specific configurations
deploy_lambda_function "security-audit-crawler" "URL crawling and security scanning" 300 1024
deploy_lambda_function "vulnerability-scanner" "OWASP-based vulnerability scanning" 300 1024  
deploy_lambda_function "report-generator" "PDF report generation with ReportLab" 300 1024
deploy_lambda_function "payment-processor" "PayU payment gateway integration" 30 512
deploy_lambda_function "user-auth" "User authentication and session management" 30 512
deploy_lambda_function "credit-manager" "Credit system management" 30 512
deploy_lambda_function "coupon-validator" "Coupon code validation and tracking" 30 512
deploy_lambda_function "admin-analytics" "Admin dashboard analytics" 60 512

# Configure API Gateway endpoints
echo ""
echo "Configuring API Gateway endpoints..."

# Get API Gateway root resource
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --query 'items[?path==`/`].id' \
    --output text \
    --region $REGION)

# Create API endpoints
create_api_endpoint() {
    local path=$1
    local lambda_function=$2
    local http_method=$3
    
    echo "Creating endpoint: $http_method /$path"
    
    # Create resource
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_GATEWAY_ID \
        --parent-id $ROOT_RESOURCE_ID \
        --path-part $path \
        --query 'id' \
        --output text \
        --region $REGION 2>/dev/null || \
        aws apigateway get-resources \
            --rest-api-id $API_GATEWAY_ID \
            --query "items[?pathPart=='$path'].id" \
            --output text \
            --region $REGION)
    
    # Create method
    aws apigateway put-method \
        --rest-api-id $API_GATEWAY_ID \
        --resource-id $RESOURCE_ID \
        --http-method $http_method \
        --authorization-type NONE \
        --region $REGION 2>/dev/null || echo "Method already exists"
    
    # Set integration
    aws apigateway put-integration \
        --rest-api-id $API_GATEWAY_ID \
        --resource-id $RESOURCE_ID \
        --http-method $http_method \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:aivedha-$lambda_function/invocations" \
        --region $REGION 2>/dev/null || echo "Integration already exists"
    
    # Enable CORS
    aws apigateway put-method \
        --rest-api-id $API_GATEWAY_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION 2>/dev/null || echo "OPTIONS method exists"
}

# Create API endpoints
create_api_endpoint "audit" "security-audit-crawler" "POST"
create_api_endpoint "report" "report-generator" "POST" 
create_api_endpoint "payment" "payment-processor" "POST"
create_api_endpoint "auth" "user-auth" "POST"
create_api_endpoint "credits" "credit-manager" "POST"
create_api_endpoint "coupons" "coupon-validator" "POST"
create_api_endpoint "admin" "admin-analytics" "POST"

# Deploy API Gateway
echo "Deploying API Gateway..."
aws apigateway create-deployment \
    --rest-api-id $API_GATEWAY_ID \
    --stage-name prod \
    --description "AiVedha Guardian Production API" \
    --region $REGION

# Create usage plan and API key
echo "Creating usage plan and API key..."
USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
    --name "aivedha-guardian-plan" \
    --description "AiVedha Guardian API Usage Plan" \
    --api-stages apiId=$API_GATEWAY_ID,stage=prod \
    --throttle burstLimit=1000,rateLimit=500 \
    --quota limit=10000,period=DAY \
    --query 'id' \
    --output text \
    --region $REGION 2>/dev/null || echo "Usage plan exists")

API_KEY=$(aws apigateway create-api-key \
    --name "aivedha-guardian-key" \
    --description "AiVedha Guardian API Key" \
    --enabled \
    --query 'value' \
    --output text \
    --region $REGION 2>/dev/null || echo "API key exists")

# Clean up deployment packages
echo ""
echo "Cleaning up deployment packages..."
rm -f *-deployment.zip

echo ""
echo "=== Deployment Complete ==="
echo "API Gateway URL: https://$API_GATEWAY_ID.execute-api.$REGION.amazonaws.com/prod"
echo "API Key: $API_KEY"
echo ""
echo "Available endpoints:"
echo "  POST /audit - Start security audit"
echo "  POST /report - Generate PDF report"
echo "  POST /payment - Process payments"
echo "  POST /auth - User authentication"
echo "  POST /credits - Credit management"
echo "  POST /coupons - Coupon validation"
echo "  POST /admin - Admin analytics"
echo ""
echo "Next steps:"
echo "1. Update frontend to use the API Gateway URL"
echo "2. Test all endpoints"
echo "3. Configure domain name (optional)"
echo "4. Set up monitoring and alerts"

# Save API configuration
cat > api-config.txt << EOF
API_GATEWAY_URL=https://$API_GATEWAY_ID.execute-api.$REGION.amazonaws.com/prod
API_KEY=$API_KEY
USAGE_PLAN_ID=$USAGE_PLAN_ID
REGION=$REGION
EOF

echo "API configuration saved to api-config.txt"