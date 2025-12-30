# AiVedha Guardian - API Integration Report

**Generated:** 2025-12-29
**Last Updated:** 2025-12-29 (Stage 4 Complete)
**Status:** All issues reviewed and fixed

---

## Summary

| Metric | Count |
|--------|-------|
| **Total UI Files with API Calls** | 27 |
| **Using AivedhaAPI (Proper)** | 24 |
| **Using Direct Fetch (Admin)** | 3 |
| **Total API Calls** | 82 |
| **Issues Fixed** | 1 |

---

# STAGE 1: Parameter Standardization

## API Key Configuration

All API calls through `AivedhaAPI` class include proper `x-api-key` headers via:
- `src/lib/api.ts` - Lines 294-299, 433-443
- `src/config/index.ts` - `API_KEY_CONFIG` for regional keys

---

## UI Files with API Calls

### Pages (src/pages/)

| File | API Calls | Methods Used | Status |
|------|-----------|--------------|--------|
| `Dashboard.tsx` | 9 | `sendLoginNotification`, `authenticateGitHub`, `getUserDashboardData`, `getAuditStatus`, `completeOnboarding`, `getUserAddons`, `downloadReport` | OK |
| `SecurityAudit.tsx` | 8 | `validateUrl`, `startAudit`, `pollAuditStatus`, `verifyRecaptcha`, `sendAuditCompletionEmail`, `downloadReport` | OK |
| `SchedulerPage.tsx` | 8 | `getCurrentSubscription`, `getUserCredits`, `validateSchedulerAddon`, `listSchedules`, `updateSchedule`, `createSchedule`, `toggleSchedule`, `deleteSchedule`, `startAudit` | OK |
| `Purchase.tsx` | 5 | `getUserProfile`, `purchaseCredits`, `createCheckoutSession`, `saveWhiteLabelConfig` | OK |
| `Profile.tsx` | 4 | `getUserProfile`, `updateUserProfile`, `setAutoRenew`, `cancelSubscription` | OK |
| `Pricing.tsx` | 2 | `getWhiteLabelConfig`, `configureWhiteLabel` | OK |
| `PaymentSuccess.tsx` | 2 | `getPublicPlans`, `activateSubscription` | OK |
| `AuditResults.tsx` | 2 | `downloadReport`, `getAuditStatus` | OK |
| `Certificate.tsx` | 2 | `getCertificate`, `downloadReport` | OK |
| `GitHubCallback.tsx` | 2 | `sendLoginNotification`, `authenticateGitHub` | OK |
| `Verify.tsx` | 2 | `verifyCertificate`, `getCertificate` | OK |
| `Support.tsx` | 2 | `checkExistingTicket`, `createSupportTicket` | OK |
| `Diagnostics.tsx` | 6 | `getBaseUrl`, `checkConnectivity`, `setBaseUrlOverride`, `clearBaseUrlOverride` | OK |
| `Signup.tsx` | 1 | `registerUser` | OK |
| `Startup.tsx` | 1 | `registerStartup` | OK |
| `SubscriptionConfirmPage.tsx` | 2 | `getPublicPlans`, `activateSubscription` | OK |
| `Blogs.tsx` | 1 | `subscribeNewsletter` | FIXED |

### Dashboard Pages (src/pages/dashboard/)

| File | API Calls | Methods Used | Status |
|------|-----------|--------------|--------|
| `SubscriptionManagement.tsx` | 5 | `listApiKeys`, `createApiKey`, `revokeApiKey`, `setAutoRenew`, `cancelSubscription` | OK |
| `TransactionHistory.tsx` | 2 | `getTransactionHistory`, `getCreditHistory` | OK |

### Admin Pages (src/pages/admin/)

| File | API Calls | Auth Method | Status |
|------|-----------|-------------|--------|
| `AdminLogin.tsx` | 1 | Bearer Token | OK (Admin) |
| `SystemSettings.tsx` | 7 | Bearer Token | OK (Admin) |
| `BillingManagement.tsx` | 11 | Bearer Token | OK (Admin) |
| `ReceiptManagement.tsx` | 1 | AivedhaAPI | OK |

### Components (src/components/)

| File | API Calls | Methods Used | Status |
|------|-----------|--------------|--------|
| `LoginPopup.tsx` | 4 | `sendLoginNotification`, `getUserCredits`, `registerGoogleUser`, `createCheckoutSession` | OK |
| `OnboardingPopup.tsx` | 1 | `getCustomerOnboardingPage` | OK |
| `AccountDeletionDialog.tsx` | 2 | `checkDeletionEligibility`, `deleteAccount` | OK |
| `AuditPopup.tsx` | 1 | `downloadReport` | OK |
| `profile/APIKeyCard.tsx` | 3 | `listApiKeys`, `createApiKey`, `revokeApiKey` | OK |
| `admin/AdminGuard.tsx` | 1 | Bearer Token (fetch) | OK (Admin) |
| `admin/AdminLayout.tsx` | 1 | Bearer Token (fetch) | OK (Admin) |

---

## Parameter Standardization (Stage 1 Completed)

All API parameters are now standardized to **camelCase**:

### Lambda Functions Updated
- `user-auth/lambda_function.py` - Removed snake_case aliases
- `paypal-handler/lambda_function.py` - Fixed query params
- `subscription-manager/lambda_function.py` - All addon handlers fixed

### UI Updated
- `src/lib/api.ts` - All body params now camelCase

---

# STAGE 2: Dual-Region Infrastructure

## API Gateway Configuration

| Region | API ID | Domain | Status |
|--------|--------|--------|--------|
| **us-east-1 (USA)** | `btxmpjub05` | `api.aivedha.ai` | Active |
| **ap-south-1 (India)** | `frxi92ysq0` | `api-india.aivedha.ai` | Active |

---

## IAM Role Policies

**Role:** `aivedha-guardian-lambda-role`
**ARN:** `arn:aws:iam::783764610283:role/aivedha-guardian-lambda-role`

| Policy | ARN | Purpose |
|--------|-----|---------|
| AmazonDynamoDBFullAccess | `arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess` | DynamoDB tables read/write |
| AmazonS3FullAccess | `arn:aws:iam::aws:policy/AmazonS3FullAccess` | S3 bucket access for reports |
| AmazonSESFullAccess | `arn:aws:iam::aws:policy/AmazonSESFullAccess` | Email sending |
| AmazonSNSFullAccess | `arn:aws:iam::aws:policy/AmazonSNSFullAccess` | Notifications |
| AmazonEventBridgeFullAccess | `arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess` | Scheduled events |
| AWSLambda_FullAccess | `arn:aws:iam::aws:policy/AWSLambda_FullAccess` | Lambda invocations |
| AWSLambdaVPCAccessExecutionRole | `arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole` | VPC access |
| AWSLambdaBasicExecutionRole | `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` | CloudWatch logs |

---

## India Region Lambda Functions

| Function | Role | Cross-Region Access |
|----------|------|---------------------|
| `aivedha-guardian-user-auth` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1`, `JWT_SECRET` |
| `aivedha-guardian-subscription-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-paypal-handler` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-email-notification` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-github-auth` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-credit-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-support-ticket-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-api-key-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-audit-status` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-scheduler` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-url-validator` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-blog-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-security-crawler` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-report-generator` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-referral-manager` | aivedha-guardian-lambda-role | `AWS_DYNAMODB_REGION=us-east-1` |
| `aivedha-guardian-recaptcha-verify` | aivedha-guardian-lambda-role | - |
| `aivedha-zoho-sync` | aivedha-guardian-lambda-role | - |
| `aivedha-zoho-billing` | aivedha-guardian-lambda-role | - |
| `aivedha-admin-settings` | aivedha-guardian-lambda-role | - |

---

## UI Region Routing

**File:** `src/lib/regionRouter.ts`

### Region Endpoints
```typescript
export const REGIONS: Record<ScanRegion, RegionInfo> = {
  'us-east-1': {
    region: 'us-east-1',
    regionName: 'USA',
    staticIP: '44.206.201.117',
    apiEndpoint: 'https://api.aivedha.ai/api',
  },
  'ap-south-1': {
    region: 'ap-south-1',
    regionName: 'India',
    staticIP: '13.203.153.119',
    apiEndpoint: 'https://api-india.aivedha.ai/api',
  },
};
```

### Smart Region Selection
- **Target URL TLD:** `.in`, `.pk`, `.bd`, `.lk`, `.np`, `.sg`, `.my`, `.th` → India region
- **User Timezone:** Asia/Kolkata, Asia/Singapore, Asia/Dubai, etc. → India region
- **Fallback:** Primary region fails → auto-fallback to alternate region

---

## API Key Configuration

```typescript
// src/config/index.ts
export const API_KEY_CONFIG = {
  US: import.meta.env.VITE_AIVEDHA_API_KEY_US,
  INDIA: import.meta.env.VITE_AIVEDHA_API_KEY_INDIA,
  getKey(region: 'us-east-1' | 'ap-south-1'): string {
    return region === 'ap-south-1' ? this.INDIA : this.US;
  }
};
```

```typescript
// src/lib/api.ts - makeRequest()
const apiKey = API_KEY_CONFIG.getKey(region);
headers: {
  'Content-Type': 'application/json',
  ...(apiKey && { 'x-api-key': apiKey }),
}
```

---

## Stage 2 Changes Applied

### IAM Policies Added
1. `AmazonSNSFullAccess` - For notification handling
2. `AmazonEventBridgeFullAccess` - For scheduled events

### Lambda Environment Variables Updated
1. `aivedha-guardian-user-auth` (India) - Added `JWT_SECRET` for authentication

### Custom Domain Configuration
| Domain | CloudFront Distribution | API Gateway |
|--------|-------------------------|-------------|
| `api.aivedha.ai` | `d-fzey3263x8.execute-api.us-east-1.amazonaws.com` | `btxmpjub05` |
| `api-india.aivedha.ai` | `d1ddpbcaz79vbk.cloudfront.net` | `frxi92ysq0` |

---

## DynamoDB Tables (us-east-1)

All tables are in us-east-1 region. India Lambdas access via `AWS_DYNAMODB_REGION=us-east-1` env var.

| Table | Purpose |
|-------|---------|
| `aivedha-guardian-users` | User accounts |
| `aivedha-guardian-credits` | Credit transactions |
| `aivedha-guardian-subscriptions` | Subscription tracking |
| `aivedha-guardian-audit-reports` | Scan results |
| `aivedha-guardian-api-keys` | API key management |
| `aivedha-guardian-email-logs` | Email audit trail |
| `aivedha-guardian-scheduled-audits` | Scheduled audit jobs |

---

## S3 Buckets

| Bucket | Region | Purpose |
|--------|--------|---------|
| `aivedha-ai-website` | us-east-1 | Frontend hosting |
| `aivedha-guardian-reports-us-east-1` | us-east-1 | PDF reports |

---

## Stage 1 Issues Fixed

### 1. Blogs.tsx - Direct Fetch Without API Key

**Before:**
```typescript
const response = await fetch("https://api.aivedha.ai/api/newsletter/subscribe", {...});
```

**After:**
```typescript
const response = await AivedhaAPI.subscribeNewsletter(email, "blogs_page");
```

---

## Admin Pages (Using Bearer Token Auth)

Admin pages use direct `fetch` with Bearer token authentication:
- `admin/AdminLogin.tsx` - Login authentication
- `admin/AdminGuard.tsx` - Session verification
- `admin/AdminLayout.tsx` - Logout handling
- `admin/SystemSettings.tsx` - Settings CRUD
- `admin/BillingManagement.tsx` - Billing CRUD

---

## Files Changed

### Stage 1
| File | Change |
|------|--------|
| `aws-lambda/user-auth/lambda_function.py` | Removed snake_case aliases |
| `aws-lambda/paypal-handler/lambda_function.py` | Fixed userId query param |
| `aws-lambda/subscription-manager/lambda_function.py` | All camelCase params |
| `src/lib/api.ts` | Added `subscribeNewsletter()`, all camelCase body params |
| `src/pages/Blogs.tsx` | Fixed to use AivedhaAPI |

### Stage 2
| Change | Details |
|--------|---------|
| IAM Policy: SNSFullAccess | Added to `aivedha-guardian-lambda-role` |
| IAM Policy: EventBridgeFullAccess | Added to `aivedha-guardian-lambda-role` |
| Lambda Env: India user-auth | Added `JWT_SECRET` for authentication |

---

## Recommendations

1. **Completed:** All UI files using AivedhaAPI with proper API key headers
2. **Completed:** Newsletter subscribe moved to AivedhaAPI
3. **Completed:** India region Lambda env vars configured
4. **Completed:** IAM policies for SNS/EventBridge
5. **Admin pages:** Correctly using Bearer token auth (no changes needed)
6. **Future:** Consider moving admin API calls to a separate AdminAPI class

---

**Stage 2 Complete**

---

# STAGE 3: Lambda Layer Dependencies (India Region)

## Issue Identified

India login API was returning "Internal server error" due to missing Lambda layers.

### Root Cause
India Lambdas were missing required Python dependency layers that were present in US region.

---

## Layers Created/Updated in India (ap-south-1)

| Layer | Version | Description |
|-------|---------|-------------|
| `python-jwt-deps` | 1 | JWT authentication dependencies (PyJWT, cryptography) |
| `python-security-deps` | 2 | Security scanning dependencies (requests, beautifulsoup4, etc.) |

---

## Lambdas Updated with Layers

| Lambda Function | Layer Added | Status |
|----------------|-------------|--------|
| `aivedha-guardian-user-auth` | `python-jwt-deps:1` | ✅ Fixed |
| `aivedha-guardian-scheduler` | `python-security-deps:2` | ✅ Fixed |
| `aivedha-guardian-paypal-handler` | `python-security-deps:2` | ✅ Fixed |
| `aivedha-guardian-report-generator` | `python-security-deps:2` | ✅ Fixed |
| `aivedha-guardian-email-notification` | `python-security-deps:2` | ✅ Fixed |
| `aivedha-paypal-handler` | `python-security-deps:2` | ✅ Fixed |
| `aivedha-guardian-security-crawler` | `python-security-deps:2` | ✅ Upgraded from v1 |

---

## Verification

```bash
# Login API now returns proper error (not internal server error)
curl -X POST "https://api-india.aivedha.ai/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <INDIA_API_KEY>" \
  -d '{"email":"test@test.com","password":"test123"}'

# Response: {"error": "Login failed. Please try again."}
# (This is correct - credentials don't exist, but Lambda is working)
```

---

## Layer Parity Check (US vs India)

| Lambda | US Layer | India Layer | Status |
|--------|----------|-------------|--------|
| `user-auth` | python-jwt-deps:2 | python-jwt-deps:1 | ✅ |
| `scheduler` | python-security-deps:9 | python-security-deps:2 | ✅ |
| `paypal-handler` | python-security-deps:9 | python-security-deps:2 | ✅ |
| `report-generator` | python-security-deps:4 | python-security-deps:2 | ✅ |
| `email-notification` | python-security-deps:4 | python-security-deps:2 | ✅ |
| `security-crawler` | python-security-deps:9 | python-security-deps:2 | ✅ |

---

**Stage 3 Complete**

---

# STAGE 4: Internal API URL Region Routing

## Issue Identified

Lambda functions in India region were making internal API calls using hardcoded US API URLs (`api.aivedha.ai`), which would cause cross-region latency and potential failures.

---

## Solution: Region-Aware URL Helper

Added `get_api_base_url()` helper function to all affected Lambda functions:

```python
def get_api_base_url():
    """Get the appropriate API URL based on the Lambda's region"""
    region = os.environ.get('AWS_REGION', 'us-east-1')
    if region == 'ap-south-1':
        return 'https://api-india.aivedha.ai/api'
    return 'https://api.aivedha.ai/api'
```

---

## Lambda Functions Updated

| Lambda | File Changed | URL Fixed |
|--------|--------------|-----------|
| `subscription-manager` | lambda_function.py | `PAYPAL_HANDLER_URL` - Internal PayPal handler calls |
| `github-auth` | lambda_function.py | `endpoints.auth`, `endpoints.status` - API response URLs |
| `report-generator` | lambda_function.py | `embed_url` - Badge embed URL in responses |
| `secure-badge` | lambda_function.py | `API_URL` - API base URL config |
| `api-tester` | lambda_function.py | `API_BASE_URL` - Test endpoint URL |
| `api-key-manager` | lambda_function.py | `usage.example` - Example curl command in response |

---

## How It Works

1. When Lambda runs in **us-east-1**: Uses `https://api.aivedha.ai/api`
2. When Lambda runs in **ap-south-1**: Uses `https://api-india.aivedha.ai/api`
3. AWS_REGION environment variable is automatically set by AWS Lambda runtime

---

## Files Changed

| File | Change |
|------|--------|
| `aws-lambda/subscription-manager/lambda_function.py` | Added `get_api_base_url()`, updated `PAYPAL_HANDLER_URL` |
| `aws-lambda/github-auth/lambda_function.py` | Added `get_api_base_url()`, updated endpoint URLs |
| `aws-lambda/report-generator/lambda_function.py` | Added `get_api_base_url()`, updated `embed_url` |
| `aws-lambda/secure-badge/lambda_function.py` | Added `get_api_base_url()`, updated `API_URL` |
| `aws-lambda/api-tester/lambda_function.py` | Added `get_api_base_url()`, updated `API_BASE_URL` |
| `aws-lambda/api-key-manager/lambda_function.py` | Added `get_api_base_url()`, updated example URL |

---

**Stage 4 Complete**
