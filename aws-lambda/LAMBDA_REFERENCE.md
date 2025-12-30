# AiVedha Guardian - Lambda Functions Reference
## Version: 4.0.0 | Updated: 2025-12-17
## Copyright (c) 2025 AiVibe Software Services Pvt Ltd

---

## API Gateway Configuration
- **API ID**: `btxmpjub05`
- **Base URL**: `https://api.aivedha.ai/api`
- **Region**: `us-east-1`
- **Stage**: `prod`

---

## 1. SECURITY AUDIT LAMBDA (PRIMARY)

### File: `security-crawler/security-audit-crawler.py`
**Function Name**: `aivedha-security-audit-crawler`
**Runtime**: Python 3.11 | **Timeout**: 900s | **Memory**: 2048MB

### API Endpoints

#### POST /audit/start
Starts a comprehensive security audit.

**Request Body**:
```json
{
  "url": "string (required)",
  "userId": "string (required)",
  "userEmail": "string (optional)",
  "userName": "string (optional)",
  "scanDepth": "standard|deep|comprehensive (default: standard)",
  "augmentationMode": "parallel-augment|orchestrated-augment|legacy-only"
}
```

**Response (200)**:
```json
{
  "report_id": "string",
  "status": "completed|processing|failed",
  "security_score": "number (0-10)",
  "grade": "A+|A|B|C|D|E|F",
  "critical_issues": "number",
  "high_issues": "number",
  "medium_issues": "number",
  "low_issues": "number",
  "info_issues": "number",
  "ssl_status": "Valid|Invalid",
  "ssl_grade": "string",
  "headers_score": "number",
  "vulnerabilities": "array",
  "certificate_number": "string",
  "pdf_report_url": "string",
  "attackChains": "array",
  "ai_analysis": "object",
  "progressPercent": "number (0-100)"
}
```

**Response (402)**: Insufficient credits
**Response (400)**: Missing required parameters

### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::aivedha-guardian-reports-us-east-1/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:us-east-1:*:function:aivedha-*"
    }
  ]
}
```

### Progress Stages (14 stages, weights = 100%)
| Stage | Name | Weight |
|-------|------|--------|
| 1 | INITIALIZATION | 2 |
| 2 | DNS_ANALYSIS | 5 |
| 3 | SSL_TLS_ANALYSIS | 8 |
| 4 | CRAWLING | 15 |
| 5 | HEADERS_ANALYSIS | 8 |
| 6 | COOKIES_ANALYSIS | 5 |
| 7 | FORMS_ANALYSIS | 8 |
| 8 | JAVASCRIPT_ANALYSIS | 10 |
| 9 | SENSITIVE_FILES | 10 |
| 10 | API_DISCOVERY | 7 |
| 11 | CMS_WAF_DETECTION | 5 |
| 12 | VULNERABILITY_DETECTION | 7 |
| 13 | AI_ANALYSIS | 8 |
| 14 | COMPLETED | 2 |

### Score Calculation
```
score = 100 - (CRITICAL × 20) - (HIGH × 10) - (MEDIUM × 5) - (LOW × 2)
score = max(0, score)
```

---

## 2. AUDIT STATUS LAMBDA

### File: `audit-status/lambda_function.py`
**Function Name**: `aivedha-audit-status`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### GET /audit/status/{reportId}
Returns audit status and results.

**Path Parameters**:
- `reportId`: string (required)

**Response (200) - Processing**:
```json
{
  "report_id": "string",
  "status": "processing",
  "progressPercent": "number (0-100)",
  "currentStage": "string",
  "stageMessage": "string",
  "etaSeconds": "number"
}
```

**Response (200) - Completed**:
```json
{
  "report_id": "string",
  "status": "completed",
  "security_score": "number",
  "grade": "string",
  "vulnerabilities_count": "number",
  "critical_issues": "number",
  "high_issues": "number",
  "medium_issues": "number",
  "low_issues": "number",
  "ssl_status": "string",
  "ssl_grade": "string",
  "headers_score": "number",
  "pdf_report_url": "string",
  "certificate_number": "string",
  "vulnerabilities": "array"
}
```

**Response (404)**: Report not found

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem"],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-audit-reports"
}
```

---

## 3. USER AUTH LAMBDA

### File: `user-auth/lambda_function.py`
**Function Name**: `aivedha-user-auth`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### POST /auth/login
```json
Request: { "email": "string", "password": "string" }
Response: { "success": true, "token": "JWT", "user": { "email", "fullName", "plan", "credits" } }
```

#### POST /auth/register
```json
Request: { "email": "string", "password": "string", "fullName": "string" }
Response: { "success": true, "user": { "email", "fullName", "plan", "credits" } }
```

#### POST /auth/google
```json
Request: { "email": "string", "fullName": "string", "googleId": "string", "picture": "string" }
Response: { "success": true, "credits": number, "plan": "string", "isNewUser": boolean }
```

#### POST /auth/verify
```json
Request: { "token": "JWT" }
Response: { "valid": true, "user": { "email", "fullName" } }
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-user-sessions",
    "arn:aws:dynamodb:us-east-1:*:table/admin-system-settings"
  ]
}
```

---

## 4. CREDIT MANAGER LAMBDA

### File: `credit-manager/lambda_function.py`
**Function Name**: `aivedha-credit-manager`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### GET /user/dashboard?userId={userId}
```json
Response: {
  "user": { "credits": number, "plan": "string", "totalAudits": number },
  "audits": [{ "report_id", "url", "created_at", "status", "security_score", "vulnerabilities_count" }]
}
```

#### GET /user/credits?userId={userId}
```json
Response: { "credits": number, "plan": "string" }
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-audit-reports"
  ]
}
```

---

## 5. SUBSCRIPTION MANAGER LAMBDA

### File: `subscription-manager/lambda_function.py`
**Function Name**: `aivedha-subscription-manager`
**Runtime**: Python 3.11 | **Timeout**: 60s | **Memory**: 512MB

#### POST /subscription/activate
```json
Request: {
  "email": "string",
  "fullName": "string",
  "plan": "string",
  "credits": number,
  "amount": number,
  "currency": "USD",
  "paymentMethod": "paypal",
  "timestamp": "string"
}
Response: { "success": true, "user": { "email", "fullName", "plan", "credits", "subscriptionId" } }
```

#### GET /subscription/plans
```json
Response: {
  "success": true,
  "plans": [{ "planCode", "name", "description", "price", "interval", "intervalUnit", "status" }],
  "addons": [{ "addonCode", "name", "description", "price", "type", "unitName", "status" }]
}
```

#### POST /subscription/checkout
```json
Request: {
  "planCode": "string",
  "currency": "USD",
  "billingCycle": "monthly|yearly",
  "email": "string",
  "fullName": "string",
  "couponCode": "string (optional)"
}
Response: { "approval_url": "string", "subscription_id": "string" }
```

#### POST /subscription/cancel
```json
Request: { "subscriptionId": "string", "cancelAtEnd": boolean }
Response: { "success": true, "message": "string" }
```

#### GET /subscription/status?userId={userId}
```json
Response: {
  "success": true,
  "subscription": {
    "subscription_id", "plan", "status", "activated_at", "expires_at",
    "amount", "currency", "next_billing_date", "auto_renew"
  }
}
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-subscriptions"
  ]
}
```

---

## 6. REPORT GENERATOR LAMBDA

### File: `report-generator/lambda_function.py`
**Function Name**: `aivedha-report-generator`
**Runtime**: Python 3.11 | **Timeout**: 120s | **Memory**: 1024MB

#### GET /certificate/{certificateNumber}
```json
Response: {
  "report_id": "string",
  "url": "string",
  "user_name": "string",
  "security_score": number,
  "critical_issues": number,
  "medium_issues": number,
  "scan_date": "string",
  "document_number": "string",
  "pdf_location": "string"
}
```

#### GET /verify/{certificateNumber}
```json
Response: {
  "valid": boolean,
  "certificate_number": "string",
  "domain": "string",
  "security_score": number,
  "grade": "string",
  "scan_date": "string",
  "status": "active|expired|revoked"
}
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-audit-reports",
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::aivedha-guardian-reports-us-east-1/*"
}
```

---

## 7. BADGE GENERATOR LAMBDA

### File: `badge-generator/lambda_function.py`
**Function Name**: `aivedha-badge-generator`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 512MB

#### GET /badge/{certificateNumber}?variant={variant}&theme={theme}
**Query Parameters**:
- `variant`: full|compact|minimal (default: full)
- `theme`: dark|light (default: dark)
- `preview`: true (returns JSON instead of image)

**Response**: PNG image (302 redirect to S3)

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:Query"],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-audit-reports",
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::aivedha-guardian-reports-us-east-1/*"
}
```

---

## 8. GITHUB AUTH LAMBDA

### File: `github-auth/lambda_function.py`
**Function Name**: `aivedha-github-auth`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### POST /auth/github
```json
Request: { "code": "string", "redirect_uri": "string" }
Response: {
  "email": "string",
  "fullName": "string",
  "githubId": "string",
  "avatar": "string",
  "credits": number,
  "plan": "string",
  "isNewUser": boolean,
  "token": "JWT"
}
```

### IAM Permissions Required
```json
{
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:aivedha/github-oauth*",
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users"
}
```

---

## 9. ADMIN AUTH LAMBDA

### File: `admin-auth/lambda_function.py`
**Function Name**: `aivedha-admin-auth`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### POST /admin/login
```json
Request: { "email": "string", "password": "string" }
Response: { "success": true, "token": "JWT", "admin": { "email", "name", "role" } }
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/admin-users",
    "arn:aws:dynamodb:us-east-1:*:table/admin-system-settings"
  ]
}
```

---

## 10. ADMIN SETTINGS LAMBDA

### File: `admin-settings/lambda_function.py`
**Function Name**: `aivedha-admin-settings`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

**Endpoints**: GET/POST/PUT/DELETE /admin/settings
Manages system configuration including JWT secrets, payment gateway configs, email templates.

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Scan"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/admin-system-settings",
    "arn:aws:dynamodb:us-east-1:*:table/admin-users",
    "arn:aws:dynamodb:us-east-1:*:table/admin-audit-logs"
  ]
}
```

---

## 11. BLOG MANAGER LAMBDA

### File: `blog-manager/lambda_function.py`
**Function Name**: `aivedha-blog-manager`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### GET /blogs
```json
Response: { "blogs": [{ "blogId", "slug", "title", "category", "author", "publishedAt", "rating", "views" }], "total": number }
```

#### GET /blogs/{slug}
```json
Response: { "blog": { "blogId", "slug", "title", "content", "comments", "rating" }, "relatedBlogs": [] }
```

#### POST /blogs/comment
```json
Request: { "blog_id": "string", "name": "string", "content": "string" }
Response: { "success": true, "comment": { "id", "content", "timestamp" } }
```

#### POST /blogs/rate
```json
Request: { "blog_id": "string", "rating": number }
Response: { "success": true, "newRating": number, "newRatingCount": number }
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-blogs",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-blog-comments",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-blog-ratings"
  ]
}
```

---

## 12. SUPPORT TICKET LAMBDA

### File: `support-ticket/lambda_function.py`
**Function Name**: `aivedha-support-ticket`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### POST /support/create-ticket
```json
Request: {
  "ticketId": "string",
  "name": "string",
  "email": "string",
  "subject": "string",
  "priority": "low|medium|high|urgent",
  "description": "string"
}
Response: { "success": true, "ticketId": "string", "message": "string" }
```

#### GET /support/check-ticket?email={email}
```json
Response: {
  "hasActiveTicket": boolean,
  "tickets": [{ "ticketId", "subject", "status", "priority", "createdAt" }]
}
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan"],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/aivedha-support-tickets",
  "Action": ["ses:SendEmail"],
  "Resource": "*"
}
```

---

## 13. REFERRAL MANAGER LAMBDA

### File: `referral-manager/lambda_function.py`
**Function Name**: `aivedha-referral-manager`
**Runtime**: Python 3.11 | **Timeout**: 30s | **Memory**: 256MB

#### POST /referral/apply
```json
Request: { "referral_code": "string", "new_user_email": "string" }
Response: { "success": true, "credits_added": number, "message": "string" }
```

#### GET /referral/code?email={email}
```json
Response: { "referral_code": "string", "referrals_count": number, "total_bonus": number }
```

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-referrals",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users"
  ]
}
```

---

## 14. PAYPAL HANDLER LAMBDA

### File: `paypal-handler/lambda_function.py`
**Function Name**: `aivedha-guardian-paypal-handler`
**Runtime**: Python 3.11 | **Timeout**: 60s | **Memory**: 512MB

#### GET /subscription/plans
```json
Response: { "success": true, "plans": [{ "id", "plan_code", "name", "monthly_price", "yearly_price", "monthly_credits", "yearly_credits", "paypal_plan_id", "paypal_yearly_plan_id", "currency": "USD" }], "addons": [...], "credit_packs": [...] }
```

#### POST /subscription/checkout
```json
Request: { "planCode": "string", "billingCycle": "monthly|yearly", "email": "string", "fullName": "string", "addons": ["string"], "couponCode": "string (optional)" }
Response: { "approval_url": "string", "subscription_id": "string" }
```

#### POST /subscription/webhook
Handles PayPal webhooks for subscription updates (USD only).

### IAM Permissions Required
```json
{
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:UpdateItem"],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-users",
    "arn:aws:dynamodb:us-east-1:*:table/aivedha-guardian-subscriptions",
    "arn:aws:dynamodb:us-east-1:*:table/admin-system-settings"
  ]
}
```

---

### File: `api-tester/lambda_function.py`
**Function Name**: `aivedha-api-tester`
**Runtime**: Python 3.11 | **Timeout**: 120s | **Memory**: 256MB

**Trigger**: EventBridge (scheduled) - runs automated API tests

### IAM Permissions Required
```json
{
  "Action": ["ses:SendEmail"],
  "Resource": "*"
}
```

---

## DynamoDB Tables

| Table Name | Primary Key | GSI |
|------------|-------------|-----|
| aivedha-guardian-users | user_id | email-index |
| aivedha-guardian-audit-reports | report_id | certificate_number-index, user_id-index |
| aivedha-guardian-subscriptions | subscription_id | user_id-index |
| aivedha-guardian-credits | credit_id | user_id-index |
| aivedha-guardian-blogs | blogId | slug-index, category-index |
| aivedha-guardian-blog-comments | commentId | blogId-timestamp-index |
| aivedha-guardian-referrals | referral_id | owner-email-index, used-by-email-index |
| aivedha-support-tickets | ticket_id | email-index |
| admin-users | admin_id | email-index |
| admin-system-settings | setting_category + setting_key (composite) | - |

---

## CORS Configuration
All Lambdas return these CORS headers:
```
Access-Control-Allow-Origin: https://aivedha.ai
Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
```

---

## Environment Variables (Common)

| Variable | Description |
|----------|-------------|
| AWS_REGION | us-east-1 |
| USERS_TABLE | aivedha-guardian-users |
| REPORTS_TABLE | aivedha-guardian-audit-reports |
| SUBSCRIPTIONS_TABLE | aivedha-guardian-subscriptions |
| CREDITS_TABLE | aivedha-guardian-credits |
| PAYPAL_CLIENT_ID | PayPal API client ID |
| PAYPAL_CLIENT_SECRET | PayPal API client secret |
| PAYPAL_WEBHOOK_ID | PayPal webhook ID |
| PAYPAL_MODE | sandbox or live |
| JWT_SECRET | User JWT signing secret |
| ADMIN_JWT_SECRET | Admin JWT signing secret |
| GEMINI_API_KEY | Google Gemini API key |
| SENDER_EMAIL | noreply@aivedha.ai |

---

## Lambda Layers

| Layer Name | ARN | Contents |
|------------|-----|----------|
| python-security-deps-linux | arn:aws:lambda:us-east-1:783764610283:layer:python-security-deps-linux:* | requests, beautifulsoup4, lxml, reportlab, pillow, dnspython |
| admin-bcrypt-layer | arn:aws:lambda:us-east-1:783764610283:layer:admin-bcrypt-layer:* | bcrypt, PyJWT |
| jwt-layer | arn:aws:lambda:us-east-1:783764610283:layer:jwt-layer:* | PyJWT |

---

## Frontend Integration Checklist

### Audit Flow (SecurityAudit.tsx -> AuditResults.tsx)
1. User clicks "Start Audit" -> POST /audit/start
2. Lambda returns report_id -> UI shows progress
3. UI polls GET /audit/status/{reportId} every 2s
4. On status=completed -> navigate to /results/{reportId}
5. Results page displays all vulnerability data
6. Download PDF button uses pdf_report_url

### Dashboard Flow (Dashboard.tsx)
1. On mount -> GET /user/dashboard?userId={userId}
2. Display credits, plan, audit history
3. Click audit row -> navigate to /results/{reportId}

### Certificate Flow (Certificate.tsx)
1. Load GET /certificate/{certificateNumber}
2. Display certificate data
3. Share button generates embed code

---

*Document auto-generated for AiVedha Guardian Lambda deployment reference*
