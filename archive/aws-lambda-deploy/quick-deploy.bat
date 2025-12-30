@echo off
REM AiVedha Guard - Quick Backend Deployment
REM Run from aws-lambda directory

echo ========================================
echo AiVedha Guard - Quick Deploy
echo ========================================

REM Configuration
set REGION=us-east-1
set LAMBDA_NAME=aivedha-subscription-manager
set API_ID=btxmpjub05

REM Step 1: Create DynamoDB Tables
echo.
echo [1/4] Creating DynamoDB tables...
aws dynamodb create-table --table-name aivedha-subscriptions --attribute-definitions AttributeName=subscription_id,AttributeType=S AttributeName=user_id,AttributeType=S AttributeName=email,AttributeType=S --key-schema AttributeName=subscription_id,KeyType=HASH --billing-mode PAY_PER_REQUEST --global-secondary-indexes "[{\"IndexName\":\"user-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" --region %REGION% 2>nul
aws dynamodb create-table --table-name aivedha-credits --attribute-definitions AttributeName=credit_id,AttributeType=S AttributeName=user_id,AttributeType=S --key-schema AttributeName=credit_id,KeyType=HASH --billing-mode PAY_PER_REQUEST --global-secondary-indexes "[{\"IndexName\":\"user-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" --region %REGION% 2>nul
aws dynamodb create-table --table-name aivedha-invoices --attribute-definitions AttributeName=invoice_id,AttributeType=S AttributeName=user_id,AttributeType=S --key-schema AttributeName=invoice_id,KeyType=HASH --billing-mode PAY_PER_REQUEST --global-secondary-indexes "[{\"IndexName\":\"user-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" --region %REGION% 2>nul
echo Tables created (or already exist)

REM Step 2: Package Lambda
echo.
echo [2/4] Packaging Lambda function...
if exist zoho\package rmdir /s /q zoho\package
mkdir zoho\package
pip install requests boto3 -t zoho\package -q
copy zoho\subscription_manager_lambda.py zoho\package\lambda_function.py
cd zoho\package
powershell -Command "Compress-Archive -Path * -DestinationPath ..\subscription-lambda.zip -Force"
cd ..\..
echo Package created: zoho\subscription-lambda.zip

REM Step 3: Deploy Lambda
echo.
echo [3/4] Deploying Lambda function...
aws lambda get-function --function-name %LAMBDA_NAME% --region %REGION% >nul 2>&1
if %errorlevel% equ 0 (
    echo Updating existing function...
    aws lambda update-function-code --function-name %LAMBDA_NAME% --zip-file fileb://zoho/subscription-lambda.zip --region %REGION% >nul
) else (
    echo Creating new function...
    aws lambda create-function --function-name %LAMBDA_NAME% --runtime python3.11 --role arn:aws:iam::975050024946:role/aivedha-lambda-role --handler lambda_function.lambda_handler --zip-file fileb://zoho/subscription-lambda.zip --timeout 30 --memory-size 256 --region %REGION% >nul
)
echo Lambda deployed: %LAMBDA_NAME%

REM Step 4: Update Environment Variables
echo.
echo [4/4] Configuring environment variables...
aws lambda update-function-configuration --function-name %LAMBDA_NAME% --environment "Variables={USERS_TABLE=aivedha-guardian-users,SUBSCRIPTIONS_TABLE=aivedha-subscriptions,CREDITS_TABLE=aivedha-credits,INVOICES_TABLE=aivedha-invoices,ZOHO_ORG_ID=60034056350,APP_BASE_URL=https://aivedha.ai,API_BASE_URL=https://api.aivedha.ai,SENDER_EMAIL=noreply@aivedha.ai}" --region %REGION% >nul
echo Environment configured

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Lambda: %LAMBDA_NAME%
echo Region: %REGION%
echo API: https://api.aivedha.ai/api
echo.
echo Next: Run setup-api-routes.ps1 to configure API Gateway
echo.
pause
