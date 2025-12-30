# AiVedha Guard - Subscription Backend Deployment Script
# PowerShell script for Windows deployment
# Run with: .\deploy-subscription-backend.ps1

$ErrorActionPreference = "Stop"

# Configuration
$REGION = "us-east-1"
$LAMBDA_FUNCTION_NAME = "aivedha-subscription-manager"
$LAMBDA_ROLE_ARN = "arn:aws:iam::975050024946:role/aivedha-lambda-role"
$API_ID = "btxmpjub05"
$STAGE = "api"

# Table Names
$USERS_TABLE = "aivedha-guardian-users"
$SUBSCRIPTIONS_TABLE = "aivedha-subscriptions"
$CREDITS_TABLE = "aivedha-credits"
$INVOICES_TABLE = "aivedha-invoices"
$WEBHOOK_LOGS_TABLE = "aivedha-webhook-logs"

# Zoho Configuration - READ FROM ENVIRONMENT VARIABLES
# Set these in your environment before running: $env:ZOHO_CLIENT_SECRET = "your-secret"
$ZOHO_ORG_ID = $env:ZOHO_ORG_ID
if (-not $ZOHO_ORG_ID) { $ZOHO_ORG_ID = "60034056350" }
$ZOHO_CLIENT_ID = $env:ZOHO_CLIENT_ID
if (-not $ZOHO_CLIENT_ID) { $ZOHO_CLIENT_ID = "1000.RMVUMFEUM97P0DYWR82TVC9G40GCHW" }
$ZOHO_CLIENT_SECRET = $env:ZOHO_CLIENT_SECRET
if (-not $ZOHO_CLIENT_SECRET) { throw "ZOHO_CLIENT_SECRET environment variable is required. Set it with: `$env:ZOHO_CLIENT_SECRET = 'your-secret'" }
$ZOHO_REFRESH_TOKEN = $env:ZOHO_REFRESH_TOKEN
if (-not $ZOHO_REFRESH_TOKEN) { throw "ZOHO_REFRESH_TOKEN environment variable is required. Set it with: `$env:ZOHO_REFRESH_TOKEN = 'your-token'" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AiVedha Guard - Backend Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Create DynamoDB Tables
Write-Host "`n[1/5] Creating DynamoDB Tables..." -ForegroundColor Yellow

# Subscriptions Table
Write-Host "  Creating $SUBSCRIPTIONS_TABLE..." -ForegroundColor Gray
try {
    aws dynamodb create-table `
        --table-name $SUBSCRIPTIONS_TABLE `
        --attribute-definitions `
            AttributeName=subscription_id,AttributeType=S `
            AttributeName=user_id,AttributeType=S `
            AttributeName=email,AttributeType=S `
            AttributeName=status,AttributeType=S `
            AttributeName=zoho_subscription_id,AttributeType=S `
            AttributeName=created_at,AttributeType=S `
        --key-schema AttributeName=subscription_id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes `
            "[{\"IndexName\":\"user-subscriptions-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"status-index\",\"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"zoho-subscription-index\",\"KeySchema\":[{\"AttributeName\":\"zoho_subscription_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
        --region $REGION 2>$null
    Write-Host "    Created $SUBSCRIPTIONS_TABLE" -ForegroundColor Green
} catch {
    Write-Host "    Table $SUBSCRIPTIONS_TABLE already exists or error: $_" -ForegroundColor DarkYellow
}

# Credits Table
Write-Host "  Creating $CREDITS_TABLE..." -ForegroundColor Gray
try {
    aws dynamodb create-table `
        --table-name $CREDITS_TABLE `
        --attribute-definitions `
            AttributeName=credit_id,AttributeType=S `
            AttributeName=user_id,AttributeType=S `
            AttributeName=created_at,AttributeType=S `
            AttributeName=transaction_type,AttributeType=S `
        --key-schema AttributeName=credit_id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes `
            "[{\"IndexName\":\"user-credits-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"transaction-type-index\",\"KeySchema\":[{\"AttributeName\":\"transaction_type\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
        --region $REGION 2>$null
    Write-Host "    Created $CREDITS_TABLE" -ForegroundColor Green
} catch {
    Write-Host "    Table $CREDITS_TABLE already exists or error: $_" -ForegroundColor DarkYellow
}

# Invoices Table
Write-Host "  Creating $INVOICES_TABLE..." -ForegroundColor Gray
try {
    aws dynamodb create-table `
        --table-name $INVOICES_TABLE `
        --attribute-definitions `
            AttributeName=invoice_id,AttributeType=S `
            AttributeName=user_id,AttributeType=S `
            AttributeName=subscription_id,AttributeType=S `
            AttributeName=zoho_invoice_id,AttributeType=S `
            AttributeName=created_at,AttributeType=S `
        --key-schema AttributeName=invoice_id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes `
            "[{\"IndexName\":\"user-invoices-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"subscription-invoices-index\",\"KeySchema\":[{\"AttributeName\":\"subscription_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"zoho-invoice-index\",\"KeySchema\":[{\"AttributeName\":\"zoho_invoice_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
        --region $REGION 2>$null
    Write-Host "    Created $INVOICES_TABLE" -ForegroundColor Green
} catch {
    Write-Host "    Table $INVOICES_TABLE already exists or error: $_" -ForegroundColor DarkYellow
}

# Webhook Logs Table
Write-Host "  Creating $WEBHOOK_LOGS_TABLE..." -ForegroundColor Gray
try {
    aws dynamodb create-table `
        --table-name $WEBHOOK_LOGS_TABLE `
        --attribute-definitions `
            AttributeName=log_id,AttributeType=S `
            AttributeName=event_type,AttributeType=S `
            AttributeName=created_at,AttributeType=S `
            AttributeName=status,AttributeType=S `
        --key-schema AttributeName=log_id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes `
            "[{\"IndexName\":\"event-type-index\",\"KeySchema\":[{\"AttributeName\":\"event_type\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"status-index\",\"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
        --region $REGION 2>$null
    Write-Host "    Created $WEBHOOK_LOGS_TABLE" -ForegroundColor Green

    # Enable TTL for webhook logs
    Start-Sleep -Seconds 5
    aws dynamodb update-time-to-live `
        --table-name $WEBHOOK_LOGS_TABLE `
        --time-to-live-specification "Enabled=true,AttributeName=ttl" `
        --region $REGION 2>$null
    Write-Host "    Enabled TTL on $WEBHOOK_LOGS_TABLE" -ForegroundColor Green
} catch {
    Write-Host "    Table $WEBHOOK_LOGS_TABLE already exists or error: $_" -ForegroundColor DarkYellow
}

Write-Host "  DynamoDB tables setup complete!" -ForegroundColor Green

# Step 2: Package Lambda Function
Write-Host "`n[2/5] Packaging Lambda Function..." -ForegroundColor Yellow

$LAMBDA_DIR = "zoho"
$PACKAGE_DIR = "zoho\package"

# Create package directory
if (Test-Path $PACKAGE_DIR) {
    Remove-Item -Recurse -Force $PACKAGE_DIR
}
New-Item -ItemType Directory -Path $PACKAGE_DIR -Force | Out-Null

# Install dependencies
Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
pip install requests boto3 -t $PACKAGE_DIR --quiet

# Copy lambda function
Copy-Item "$LAMBDA_DIR\subscription_manager_lambda.py" "$PACKAGE_DIR\lambda_function.py"

# Create zip file
Write-Host "  Creating deployment package..." -ForegroundColor Gray
$ZIP_FILE = "subscription-manager-lambda.zip"
if (Test-Path $ZIP_FILE) {
    Remove-Item $ZIP_FILE
}

Push-Location $PACKAGE_DIR
Compress-Archive -Path * -DestinationPath "..\$ZIP_FILE" -Force
Pop-Location

Write-Host "  Lambda package created: $ZIP_FILE" -ForegroundColor Green

# Step 3: Deploy/Update Lambda Function
Write-Host "`n[3/5] Deploying Lambda Function..." -ForegroundColor Yellow

# Check if function exists
$functionExists = $false
try {
    aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION 2>$null | Out-Null
    $functionExists = $true
} catch {
    $functionExists = $false
}

$ENV_VARS = @{
    Variables = @{
        USERS_TABLE = $USERS_TABLE
        SUBSCRIPTIONS_TABLE = $SUBSCRIPTIONS_TABLE
        CREDITS_TABLE = $CREDITS_TABLE
        INVOICES_TABLE = $INVOICES_TABLE
        WEBHOOK_LOGS_TABLE = $WEBHOOK_LOGS_TABLE
        ZOHO_ORG_ID = $ZOHO_ORG_ID
        ZOHO_CLIENT_ID = $ZOHO_CLIENT_ID
        ZOHO_CLIENT_SECRET = $ZOHO_CLIENT_SECRET
        ZOHO_REFRESH_TOKEN = $ZOHO_REFRESH_TOKEN
        ZOHO_ACCOUNTS_URL = "https://accounts.zoho.in"
        ZOHO_BILLING_API_URL = "https://www.zohoapis.in/billing/v1"
        APP_BASE_URL = "https://aivedha.ai"
        API_BASE_URL = "https://api.aivedha.ai"
        SENDER_EMAIL = "noreply@aivedha.ai"
    }
} | ConvertTo-Json -Compress

if ($functionExists) {
    Write-Host "  Updating existing Lambda function..." -ForegroundColor Gray
    aws lambda update-function-code `
        --function-name $LAMBDA_FUNCTION_NAME `
        --zip-file "fileb://$LAMBDA_DIR\$ZIP_FILE" `
        --region $REGION | Out-Null

    Start-Sleep -Seconds 3

    aws lambda update-function-configuration `
        --function-name $LAMBDA_FUNCTION_NAME `
        --environment $ENV_VARS `
        --timeout 30 `
        --memory-size 256 `
        --region $REGION | Out-Null
} else {
    Write-Host "  Creating new Lambda function..." -ForegroundColor Gray
    aws lambda create-function `
        --function-name $LAMBDA_FUNCTION_NAME `
        --runtime python3.11 `
        --role $LAMBDA_ROLE_ARN `
        --handler lambda_function.lambda_handler `
        --zip-file "fileb://$LAMBDA_DIR\$ZIP_FILE" `
        --timeout 30 `
        --memory-size 256 `
        --environment $ENV_VARS `
        --region $REGION | Out-Null
}

Write-Host "  Lambda function deployed: $LAMBDA_FUNCTION_NAME" -ForegroundColor Green

# Step 4: Setup API Gateway Routes
Write-Host "`n[4/5] Setting up API Gateway Routes..." -ForegroundColor Yellow

# Get Lambda ARN
$LAMBDA_ARN = aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text

# Get root resource
$ROOT_RESOURCE = aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/'].id" --output text

# Define subscription API routes
$ROUTES = @(
    @{ path = "subscription"; method = "GET" },      # GET /subscription/current
    @{ path = "subscription"; method = "POST" },     # POST /subscription/checkout, confirm, etc.
    @{ path = "subscription"; method = "OPTIONS" },
    @{ path = "plans"; method = "GET" },             # GET /plans
    @{ path = "plans"; method = "OPTIONS" },
    @{ path = "addons"; method = "GET" },            # GET /addons
    @{ path = "addons"; method = "POST" },           # POST /addons/purchase
    @{ path = "addons"; method = "OPTIONS" },
    @{ path = "coupons"; method = "POST" },          # POST /coupons/validate
    @{ path = "coupons"; method = "OPTIONS" },
    @{ path = "credits"; method = "GET" },           # GET /credits/balance
    @{ path = "credits"; method = "POST" },          # POST /credits/deduct
    @{ path = "credits"; method = "OPTIONS" }
)

Write-Host "  API routes will be configured for: subscription, plans, addons, coupons, credits" -ForegroundColor Gray
Write-Host "  Note: Run separate API Gateway setup script for full route configuration" -ForegroundColor DarkYellow

# Add Lambda permission for API Gateway
Write-Host "  Adding API Gateway permission to Lambda..." -ForegroundColor Gray
try {
    aws lambda add-permission `
        --function-name $LAMBDA_FUNCTION_NAME `
        --statement-id "apigateway-invoke-$(Get-Date -Format 'yyyyMMddHHmmss')" `
        --action lambda:InvokeFunction `
        --principal apigateway.amazonaws.com `
        --source-arn "arn:aws:execute-api:${REGION}:975050024946:${API_ID}/*/*/*" `
        --region $REGION 2>$null | Out-Null
    Write-Host "    Permission added" -ForegroundColor Green
} catch {
    Write-Host "    Permission may already exist" -ForegroundColor DarkYellow
}

# Step 5: Test Deployment
Write-Host "`n[5/5] Testing Deployment..." -ForegroundColor Yellow

# Test Lambda invocation
Write-Host "  Testing Lambda function..." -ForegroundColor Gray
$TEST_PAYLOAD = '{"httpMethod":"GET","path":"/subscription/current","headers":{}}'
$TEST_RESULT = aws lambda invoke `
    --function-name $LAMBDA_FUNCTION_NAME `
    --payload $TEST_PAYLOAD `
    --region $REGION `
    response.json 2>&1

if (Test-Path response.json) {
    $response = Get-Content response.json | ConvertFrom-Json
    Write-Host "    Lambda test response: StatusCode $($response.statusCode)" -ForegroundColor Green
    Remove-Item response.json
} else {
    Write-Host "    Lambda test completed" -ForegroundColor Green
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "DynamoDB Tables:" -ForegroundColor Yellow
Write-Host "  - $SUBSCRIPTIONS_TABLE"
Write-Host "  - $CREDITS_TABLE"
Write-Host "  - $INVOICES_TABLE"
Write-Host "  - $WEBHOOK_LOGS_TABLE"
Write-Host ""
Write-Host "Lambda Function:" -ForegroundColor Yellow
Write-Host "  - $LAMBDA_FUNCTION_NAME"
Write-Host ""
Write-Host "API Gateway:" -ForegroundColor Yellow
Write-Host "  - API ID: $API_ID"
Write-Host "  - Base URL: https://api.aivedha.ai/api"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure API Gateway routes manually if not already set"
Write-Host "  2. Test endpoints via Postman or curl"
Write-Host "  3. Configure Zoho webhooks to https://api.aivedha.ai/api/subscription/webhook"
Write-Host ""
