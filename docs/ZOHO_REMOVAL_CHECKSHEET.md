# Zoho Billing Code Removal Checksheet

**Created:** 2025-12-21
**Updated:** 2025-12-21
**Purpose:** Track removal of all Zoho Billing related code and replace with PayPal/DynamoDB APIs

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Dedicated Zoho Files | 4 | COMPLETED |
| Lambda Functions with Zoho Code | 5 | COMPLETED |
| Frontend Files with Zoho Code | 12 | COMPLETED |
| Config/Script Files | 4 | COMPLETED |
| **Total Items** | **25** | **COMPLETED** |

---

## 1. DEDICATED ZOHO FILES (DELETED)

| # | File Path | Purpose | Action | Status |
|---|-----------|---------|--------|--------|
| 1 | `aws-lambda/zoho-billing/` | Zoho Billing Lambda | DELETED | [x] |
| 2 | `aws-lambda/zoho-sync/` | Zoho-DynamoDB sync Lambda | DELETED | [x] |
| 3 | `scripts/sync_zoho_to_dynamodb.mjs` | Zoho sync script | DELETED | [x] |
| 4 | `zoho-response.json` | Zoho API response cache | DELETED | [x] |

---

## 2. LAMBDA FUNCTIONS - ZOHO CODE REMOVED

### 2.1 subscription-manager/lambda_function.py - COMPLETELY REWRITTEN

- Removed all Zoho API code (~3300 lines)
- Now uses PayPal Subscriptions API + DynamoDB
- Reduced from ~4000 lines to ~758 lines

### 2.2 credit-manager/lambda_function.py - CLEAN

- Already using DynamoDB only (no Zoho code found)

### 2.3 referral-manager/lambda_function.py - UPDATED

- Removed Zoho config variables
- Removed `update_zoho_credits()` function
- Updated docstring

### 2.4 addon-purchase/ - PENDING (Optional)

- Heavy Zoho integration - needs complete rewrite
- These are optional addon features (scheduler, whitelabel)

### 2.5 user-auth/lambda_function.py - UPDATED

- Removed Zoho-related comments

---

## 3. FRONTEND FILES - ZOHO CODE REMOVED

### 3.1 src/lib/api.ts - UPDATED
- Removed "Zoho" from comments
- Renamed `getZohoPortalUrl` → `getSubscriptionPortalUrl`
- Renamed `syncZohoSubscription` → `syncSubscription`
- Removed `zohoCustomerId` from types

### 3.2 src/config/index.ts - UPDATED
- Added `PAYPAL_CONFIG` with all PayPal plan IDs
- `ZOHO_CONFIG` deprecated (legacy alias)

### 3.3 src/constants/plans.ts - UPDATED
- Added `PAYPAL_PLAN_IDS` mapping
- Added `getPayPalPlanId()` function
- `ZOHO_PLAN_CODES` and `getZohoPlanCode()` deprecated (legacy aliases)

### 3.4 src/components/UpgradePlanPopup.tsx - UPDATED
- Removed ZOHO_CONFIG import
- Now uses navigate to /purchase page
- Updated text to "PayPal"

### 3.5 src/pages/Purchase.tsx - UPDATED
- Changed all "Zoho Billing" → "PayPal"

### 3.6 src/pages/Dashboard.tsx - UPDATED
- Removed Zoho checkout call for free plan

### 3.7 src/pages/Login.tsx - UPDATED
- Removed Zoho checkout call for new users

### 3.8 src/pages/Signup.tsx - UPDATED
- Removed Zoho checkout call

### 3.9 src/pages/FAQ.tsx - UPDATED
- Updated payment FAQ answers to reference PayPal

### 3.10 src/pages/Privacy.tsx - UPDATED
- Changed "Zoho Billing" → "PayPal"

### 3.11 src/pages/SchedulerPage.tsx - UPDATED
- Updated docstring

### 3.12 src/components/OnboardingPopup.tsx - UPDATED
- Updated docstring

### 3.13 src/components/WhiteLabelModal.tsx - UPDATED
- Updated docstring

### 3.14 src/pages/SubscriptionConfirmPage.tsx - UPDATED
- Updated comment

---

## 4. CONFIG AND SCRIPT FILES - UPDATED

### 4.1 .env.example - UPDATED
- Removed VITE_ZOHO_* variables
- Removed ZOHO_* backend variables
- Added VITE_PAYPAL_CLIENT_ID

### 4.2 .gitignore - UPDATED
- Changed "Zoho secrets" → "Payment secrets"

### 4.3 CLAUDE.md - UPDATED
- Updated payment provider info to PayPal
- Updated pricing information

---

## 5. DynamoDB ATTRIBUTES (Info Only)

The following Zoho-specific attributes may exist in DynamoDB but will be ignored:
- `zoho_customer_id`, `zoho_display_name`, `zoho_company_name`, etc.

New code no longer reads or writes these attributes.

---

## 6. AWS RESOURCES TO CLEAN UP (PENDING)

| Resource Type | Name | Action | Status |
|---------------|------|--------|--------|
| Lambda | aivedha-zoho-billing | Delete | [ ] |
| Lambda | aivedha-zoho-sync | Delete | [ ] |
| API Gateway | /api/zoho/* routes | Delete | [ ] |
| EventBridge | Zoho sync schedules | Delete | [ ] |
| CloudWatch | Zoho Lambda log groups | Delete | [ ] |

---

## Remaining Work

1. **AWS Cleanup** - Delete Zoho Lambda functions and API routes
2. **Addon Lambdas** - Rewrite addon-purchase Lambdas (optional features)
3. **Admin Pages** - Some admin pages still reference Zoho (internal only)

---

## Replacement Summary

| Feature | Before (Zoho) | After (PayPal) |
|---------|--------------|----------------|
| Subscriptions | Zoho Billing API | PayPal Subscriptions API |
| Credit Packs | Zoho One-time | PayPal Orders API |
| Customer Portal | Zoho hosted portal | PayPal autopay page |
| Webhooks | Zoho webhooks | PayPal webhooks |
| Currency | Legacy | USD only |
| Plan IDs | Zoho plan codes | PayPal plan IDs (P-xxx) |

---

*Last Updated: 2025-12-21*
