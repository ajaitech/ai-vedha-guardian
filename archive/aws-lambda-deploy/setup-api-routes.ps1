# AiVedha Guard - API Gateway Route Configuration
# PowerShell script to setup subscription API routes
# Run with: .\setup-api-routes.ps1

$ErrorActionPreference = "Stop"

# Configuration
$REGION = "us-east-1"
$API_ID = "btxmpjub05"
$LAMBDA_FUNCTION_NAME = "aivedha-subscription-manager"
$ACCOUNT_ID = "975050024946"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Gateway Route Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get Lambda ARN
$LAMBDA_ARN = "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}"
Write-Host "Lambda ARN: $LAMBDA_ARN" -ForegroundColor Gray

# Get existing resources
Write-Host "`nFetching existing API resources..." -ForegroundColor Yellow
$RESOURCES = aws apigateway get-resources --rest-api-id $API_ID --region $REGION | ConvertFrom-Json
$ROOT_ID = ($RESOURCES.items | Where-Object { $_.path -eq "/" }).id

Write-Host "Root Resource ID: $ROOT_ID" -ForegroundColor Gray

# Function to create resource if not exists
function Create-Resource {
    param($parentId, $pathPart)

    $existing = $RESOURCES.items | Where-Object { $_.pathPart -eq $pathPart }
    if ($existing) {
        Write-Host "    Resource /$pathPart already exists" -ForegroundColor DarkYellow
        return $existing.id
    }

    $result = aws apigateway create-resource `
        --rest-api-id $API_ID `
        --parent-id $parentId `
        --path-part $pathPart `
        --region $REGION | ConvertFrom-Json

    Write-Host "    Created resource /$pathPart" -ForegroundColor Green
    return $result.id
}

# Function to setup method with Lambda integration
function Setup-Method {
    param($resourceId, $httpMethod, $resourcePath)

    Write-Host "  Setting up $httpMethod $resourcePath..." -ForegroundColor Gray

    # Create method
    try {
        aws apigateway put-method `
            --rest-api-id $API_ID `
            --resource-id $resourceId `
            --http-method $httpMethod `
            --authorization-type NONE `
            --region $REGION 2>$null | Out-Null
    } catch {}

    if ($httpMethod -eq "OPTIONS") {
        # CORS preflight response
        aws apigateway put-method-response `
            --rest-api-id $API_ID `
            --resource-id $resourceId `
            --http-method OPTIONS `
            --status-code 200 `
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' `
            --region $REGION 2>$null | Out-Null

        aws apigateway put-integration `
            --rest-api-id $API_ID `
            --resource-id $resourceId `
            --http-method OPTIONS `
            --type MOCK `
            --request-templates '{"application/json":"{\"statusCode\":200}"}' `
            --region $REGION 2>$null | Out-Null

        aws apigateway put-integration-response `
            --rest-api-id $API_ID `
            --resource-id $resourceId `
            --http-method OPTIONS `
            --status-code 200 `
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' `
            --region $REGION 2>$null | Out-Null
    } else {
        # Lambda proxy integration
        $integrationUri = "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

        aws apigateway put-integration `
            --rest-api-id $API_ID `
            --resource-id $resourceId `
            --http-method $httpMethod `
            --type AWS_PROXY `
            --integration-http-method POST `
            --uri $integrationUri `
            --region $REGION 2>$null | Out-Null
    }

    Write-Host "    Configured $httpMethod $resourcePath" -ForegroundColor Green
}

# Create subscription resources and methods
Write-Host "`n[1/6] Setting up /subscription routes..." -ForegroundColor Yellow
$subscriptionId = Create-Resource $ROOT_ID "subscription"

# /subscription sub-resources
$currentId = Create-Resource $subscriptionId "current"
$checkoutId = Create-Resource $subscriptionId "checkout"
$confirmId = Create-Resource $subscriptionId "confirm"
$upgradeId = Create-Resource $subscriptionId "upgrade"
$cancelId = Create-Resource $subscriptionId "cancel"
$reactivateId = Create-Resource $subscriptionId "reactivate"
$updatePaymentId = Create-Resource $subscriptionId "update-payment"
$invoicesId = Create-Resource $subscriptionId "invoices"
$portalTokenId = Create-Resource $subscriptionId "portal-token"
$webhookId = Create-Resource $subscriptionId "webhook"

# Setup methods for subscription endpoints
Setup-Method $currentId "GET" "/subscription/current"
Setup-Method $currentId "OPTIONS" "/subscription/current"
Setup-Method $checkoutId "POST" "/subscription/checkout"
Setup-Method $checkoutId "OPTIONS" "/subscription/checkout"
Setup-Method $confirmId "POST" "/subscription/confirm"
Setup-Method $confirmId "OPTIONS" "/subscription/confirm"
Setup-Method $upgradeId "POST" "/subscription/upgrade"
Setup-Method $upgradeId "OPTIONS" "/subscription/upgrade"
Setup-Method $cancelId "POST" "/subscription/cancel"
Setup-Method $cancelId "OPTIONS" "/subscription/cancel"
Setup-Method $reactivateId "POST" "/subscription/reactivate"
Setup-Method $reactivateId "OPTIONS" "/subscription/reactivate"
Setup-Method $updatePaymentId "POST" "/subscription/update-payment"
Setup-Method $updatePaymentId "OPTIONS" "/subscription/update-payment"
Setup-Method $invoicesId "GET" "/subscription/invoices"
Setup-Method $invoicesId "OPTIONS" "/subscription/invoices"
Setup-Method $portalTokenId "POST" "/subscription/portal-token"
Setup-Method $portalTokenId "OPTIONS" "/subscription/portal-token"
Setup-Method $webhookId "POST" "/subscription/webhook"
Setup-Method $webhookId "OPTIONS" "/subscription/webhook"

# Create plans resource
Write-Host "`n[2/6] Setting up /plans routes..." -ForegroundColor Yellow
$plansId = Create-Resource $ROOT_ID "plans"
Setup-Method $plansId "GET" "/plans"
Setup-Method $plansId "OPTIONS" "/plans"

# Create addons resource
Write-Host "`n[3/6] Setting up /addons routes..." -ForegroundColor Yellow
$addonsId = Create-Resource $ROOT_ID "addons"
$addonsPurchaseId = Create-Resource $addonsId "purchase"
Setup-Method $addonsId "GET" "/addons"
Setup-Method $addonsId "OPTIONS" "/addons"
Setup-Method $addonsPurchaseId "POST" "/addons/purchase"
Setup-Method $addonsPurchaseId "OPTIONS" "/addons/purchase"

# Create coupons resource
Write-Host "`n[4/6] Setting up /coupons routes..." -ForegroundColor Yellow
$couponsId = Create-Resource $ROOT_ID "coupons"
$couponsValidateId = Create-Resource $couponsId "validate"
Setup-Method $couponsValidateId "POST" "/coupons/validate"
Setup-Method $couponsValidateId "OPTIONS" "/coupons/validate"

# Create credits resource
Write-Host "`n[5/6] Setting up /credits routes..." -ForegroundColor Yellow
$creditsId = Create-Resource $ROOT_ID "credits"
$creditsDeductId = Create-Resource $creditsId "deduct"
Setup-Method $creditsId "GET" "/credits"
Setup-Method $creditsId "OPTIONS" "/credits"
Setup-Method $creditsDeductId "POST" "/credits/deduct"
Setup-Method $creditsDeductId "OPTIONS" "/credits/deduct"

# Deploy API
Write-Host "`n[6/6] Deploying API changes..." -ForegroundColor Yellow
aws apigateway create-deployment `
    --rest-api-id $API_ID `
    --stage-name $STAGE `
    --description "Subscription API routes deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')" `
    --region $REGION | Out-Null

Write-Host "  API deployed to stage: api" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "API Routes Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Subscription Endpoints:" -ForegroundColor Yellow
Write-Host "  GET  /api/subscription/current      - Get current subscription"
Write-Host "  POST /api/subscription/checkout     - Create checkout session"
Write-Host "  POST /api/subscription/confirm      - Confirm after Zoho redirect"
Write-Host "  POST /api/subscription/upgrade      - Upgrade/downgrade plan"
Write-Host "  POST /api/subscription/cancel       - Cancel subscription"
Write-Host "  POST /api/subscription/reactivate   - Reactivate cancelled sub"
Write-Host "  POST /api/subscription/update-payment - Update payment method"
Write-Host "  GET  /api/subscription/invoices     - Get invoices"
Write-Host "  POST /api/subscription/portal-token - Get portal SSO token"
Write-Host "  POST /api/subscription/webhook      - Zoho webhook handler"
Write-Host ""
Write-Host "Other Endpoints:" -ForegroundColor Yellow
Write-Host "  GET  /api/plans                     - Get available plans"
Write-Host "  GET  /api/addons                    - Get available addons"
Write-Host "  POST /api/addons/purchase           - Purchase addon"
Write-Host "  POST /api/coupons/validate          - Validate coupon"
Write-Host "  GET  /api/credits                   - Get credit balance"
Write-Host "  POST /api/credits/deduct            - Deduct credit"
Write-Host ""
Write-Host "Base URL: https://api.aivedha.ai/api" -ForegroundColor Cyan
Write-Host ""
