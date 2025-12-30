# PayPal Configuration - AiVedha Guard

**Configuration Date:** December 20, 2025
**Environment:** LIVE (Production)
**Currency:** USD
**API Base:** https://api-m.paypal.com

---

## Account Details

| Field | Value |
|-------|-------|
| Client ID | `AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk` |
| Business Name | Aivibe Software Services Pvt Ltd |
| Business Email | payments@aivibe.in |
| Webhook URL | https://api.aivedha.ai/api/paypal/webhook |

---

## Products Created in PayPal

| Product ID | Name | Type | Category |
|------------|------|------|----------|
| `aivedha-guard-subscription` | AiVedha Guard - subscription | SERVICE | SOFTWARE |
| `aivedha-guard-addons` | AiVedha Guard - Add-ons & Credits | SERVICE | SOFTWARE |

---

## Subscription Plans (Live in PayPal)

### Monthly Plans

| Plan Name | Plan ID | Price (USD) | Credits/Month | Status |
|-----------|---------|-------------|---------------|--------|
| Aarambh (Starter) - Monthly | `P-1JC933532V162793LNFDMXLY` | $10.00 | 3 | ACTIVE |
| Raksha (Protection) - Monthly | `P-9DE80034NW8103644NFDMXMI` | $25.00 | 10 | ACTIVE |
| Suraksha (Professional) - Monthly | `P-9B208585UV344253JNFDMXNA` | $50.00 | 30 | ACTIVE |
| Vajra (Business) - Monthly | `P-9FM13449DU368353XNFDMXNY` | $150.00 | 100 | ACTIVE |
| Chakra (Enterprise) - Monthly | `P-97P76054M44105114NFDMXOI` | $300.00 | Unlimited | ACTIVE |

### Yearly Plans (17% Discount - 2 Months Free)

| Plan Name | Plan ID | Price (USD) | Credits/Year | Status |
|-----------|---------|-------------|--------------|--------|
| Aarambh (Starter) - Yearly | `P-37E07153GU572264RNFDMXMA` | $100.00 | 36 | ACTIVE |
| Raksha (Protection) - Yearly | `P-91V72263GL6122913NFDMXMY` | $250.00 | 120 | ACTIVE |
| Suraksha (Professional) - Yearly | `P-3NA45044HW267203SNFDMXNI` | $500.00 | 360 | ACTIVE |
| Vajra (Business) - Yearly | `P-33C53817PE4737058NFDMXOA` | $1,500.00 | 1,200 | ACTIVE |
| Chakra (Enterprise) - Yearly | `P-99U671102N720504TNFDMXOQ` | $3,000.00 | Unlimited | ACTIVE |

### Feature Add-ons

| Add-on Name | Plan ID | Price (USD/Month) | Status |
|-------------|---------|-------------------|--------|
| Scheduled Audits Add-on | `P-32U60387JT1483533NFDMXPA` | $25.00 | ACTIVE |
| White-Label Reports Add-on | `P-7PJ67808RA6591613NFDMXPI` | $60.00 | ACTIVE |
| API Access Add-on | `P-10P90334X6470204UNFDMXPQ` | $40.00 | ACTIVE |

---

## Credit Packs (One-Time Purchases)

| Pack ID | Pack Name | Credits | Price (USD) | Savings |
|---------|-----------|---------|-------------|---------|
| `credits-5` | 5 Credits Pack | 5 | $5.00 | - |
| `credits-10` | 10 Credits Pack | 10 | $9.00 | 10% |
| `credits-25` | 25 Credits Pack | 25 | $20.00 | 20% |
| `credits-50` | 50 Credits Pack | 50 | $35.00 | 30% |
| `credits-100` | 100 Credits Pack | 100 | $60.00 | 40% |

### Credit Pack Purchase Flow

1. Call `POST /paypal/credits` with `pack` and optional `couponCode`
2. Redirect user to PayPal `approval_url`
3. User approves payment on PayPal
4. PayPal redirects to `return_url` with `token`
5. Call `POST /paypal/capture` with `orderId` to complete
6. Credits are automatically added to user account

---

## Webhook Configuration

| Field | Value |
|-------|-------|
| Webhook ID | `60D12445KA324183K` |
| URL | `https://api.aivedha.ai/api/paypal/webhook` |
| Total Events | 26 |

### Subscribed Webhook Events

#### Subscription Events
- `BILLING.SUBSCRIPTION.ACTIVATED` - Subscription activated
- `BILLING.SUBSCRIPTION.CANCELLED` - Subscription cancelled
- `BILLING.SUBSCRIPTION.CREATED` - Subscription created
- `BILLING.SUBSCRIPTION.EXPIRED` - Subscription expired
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED` - Payment failed
- `BILLING.SUBSCRIPTION.RE-ACTIVATED` - Subscription reactivated
- `BILLING.SUBSCRIPTION.RENEWED` - Subscription renewed
- `BILLING.SUBSCRIPTION.SUSPENDED` - Subscription suspended
- `BILLING.SUBSCRIPTION.UPDATED` - Subscription updated

#### Payment Events
- `PAYMENT.SALE.COMPLETED` - Sale completed
- `PAYMENT.SALE.REFUNDED` - Sale refunded
- `PAYMENT.SALE.REVERSED` - Sale reversed
- `PAYMENT.CAPTURE.COMPLETED` - Payment captured
- `PAYMENT.CAPTURE.DENIED` - Payment capture denied
- `PAYMENT.CAPTURE.REFUNDED` - Payment capture refunded
- `PAYMENT.CAPTURE.REVERSED` - Payment capture reversed

#### Checkout Events
- `CHECKOUT.ORDER.APPROVED` - Order approved
- `CHECKOUT.ORDER.COMPLETED` - Order completed
- `CHECKOUT.ORDER.PROCESSED` - Order processed

#### Plan Events
- `BILLING.PLAN.CREATED` - Plan created
- `BILLING.PLAN.UPDATED` - Plan updated
- `BILLING.PLAN.ACTIVATED` - Plan activated
- `BILLING.PLAN.DEACTIVATED` - Plan deactivated
- `BILLING.PLAN.PRICING-CHANGE.ACTIVATED` - Pricing change activated

#### Invoice Events
- `INVOICING.INVOICE.PAID` - Invoice paid
- `INVOICING.INVOICE.CANCELLED` - Invoice cancelled

---

## Billing Configuration

### Auto-Debit Settings
| Setting | Value |
|---------|-------|
| Auto Bill Outstanding | Enabled |
| Setup Fee | $0.00 |
| Setup Fee Failure Action | CONTINUE |
| Payment Failure Threshold | 3 retries |

### Trial Period
| Setting | Value |
|---------|-------|
| Trial Duration | 7 days |
| Trial Price | $0.00 |
| Trial Sequence | 1 (before regular billing) |

---

## Discount Coupons (Active)

| Code | Discount | Applies To | Description |
|------|----------|------------|-------------|
| `WELCOME20` | 20% | All purchases | 20% off first subscription (one-time per user) |
| `ANNUAL30` | 30% | Yearly only | 30% off annual subscriptions |
| `STARTUP50` | 50% | All purchases | 50% off for verified startups (one-time per user) |
| `FIRST3FREE` | 100% | Monthly only | First 3 months free on monthly plans (trial period) |
| `CREDITS20` | 20% | Credit packs | 20% off credit pack purchases |

### Coupon Validation Flow

1. User enters coupon code
2. Call `POST /paypal/validate-coupon` with `couponCode`, `userId`, `type`
3. If valid, include `couponCode` in purchase request
4. Discount is automatically applied to order

---

## API Endpoints

### AiVedha API Endpoints (Lambda)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/paypal/plans` | Get all subscription plans and credit packs |
| GET | `/paypal/credit-packs` | Get available credit packs |
| GET | `/paypal/coupons` | Get available coupon codes |
| POST | `/paypal/subscribe` | Create a subscription |
| POST | `/paypal/credits` | Purchase credit pack (with optional coupon) |
| POST | `/paypal/capture` | Capture approved order |
| POST | `/paypal/status` | Get subscription status |
| POST | `/paypal/cancel` | Cancel a subscription |
| POST | `/paypal/validate-coupon` | Validate coupon code |
| POST | `/paypal/webhook` | PayPal webhook receiver |

### Request Examples

**Create Credit Pack Order with Coupon:**
```json
POST /paypal/credits
{
  "userId": "user@example.com",
  "pack": "credits-25",
  "couponCode": "CREDITS20"
}
```

**Validate Coupon:**
```json
POST /paypal/validate-coupon
{
  "couponCode": "WELCOME20",
  "userId": "user@example.com",
  "type": "subscription"
}
```

**Create Subscription:**
```json
POST /paypal/subscribe
{
  "userId": "user@example.com",
  "plan": "raksha",
  "billingCycle": "monthly"
}
```

### PayPal Direct API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `https://api-m.paypal.com/v1/billing/subscriptions` | Create subscription |
| GET | `https://api-m.paypal.com/v1/billing/subscriptions/{id}` | Get subscription |
| POST | `https://api-m.paypal.com/v1/billing/subscriptions/{id}/cancel` | Cancel subscription |
| POST | `https://api-m.paypal.com/v2/checkout/orders` | Create order |
| POST | `https://api-m.paypal.com/v2/checkout/orders/{id}/capture` | Capture order |

---

## Lambda Handler

**Function:** `aivedha-guardian-paypal-handler`
**Region:** us-east-1
**Runtime:** Python 3.11

### Endpoints Handled
| Path | Method | Description |
|------|--------|-------------|
| `/paypal/webhook` | POST | Process PayPal webhook events |
| `/paypal/create-subscription` | POST | Create new subscription |
| `/paypal/subscription/{id}` | GET | Get subscription details |
| `/paypal/cancel-subscription` | POST | Cancel subscription |
| `/paypal/create-order` | POST | Create credit pack order |
| `/paypal/capture-order` | POST | Capture approved order |

---

## Environment Variables

Add these to your `.env` file:

```env
# PayPal Mode
PAYPAL_MODE=live

# PayPal API Credentials
PAYPAL_CLIENT_ID=AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk
PAYPAL_CLIENT_SECRET=EBWJ9a_u8J3k90PR7zoFNxxHpkJCDRN0d2f-6FRKYaUsAy1WTkinIdwceJsf5uV02550qAtIS97B2Mgs

# PayPal API Base URL
PAYPAL_API_BASE_URL=https://api-m.paypal.com

# Currency
PAYPAL_CURRENCY=USD

# Business Info
PAYPAL_PRIMARY_EMAIL=payments@aivibe.in
PAYPAL_BUSINESS_NAME=Aivibe Software Services Pvt Ltd

# Webhook
PAYPAL_WEBHOOK_ID=60D12445KA324183K
PAYPAL_WEBHOOK_URL=https://api.aivedha.ai/api/paypal/webhook

# Monthly Plan IDs
PAYPAL_PLAN_AARAMBH_MONTHLY=P-1JC933532V162793LNFDMXLY
PAYPAL_PLAN_RAKSHA_MONTHLY=P-9DE80034NW8103644NFDMXMI
PAYPAL_PLAN_SURAKSHA_MONTHLY=P-9B208585UV344253JNFDMXNA
PAYPAL_PLAN_VAJRA_MONTHLY=P-9FM13449DU368353XNFDMXNY
PAYPAL_PLAN_CHAKRA_MONTHLY=P-97P76054M44105114NFDMXOI

# Yearly Plan IDs
PAYPAL_PLAN_AARAMBH_YEARLY=P-37E07153GU572264RNFDMXMA
PAYPAL_PLAN_RAKSHA_YEARLY=P-91V72263GL6122913NFDMXMY
PAYPAL_PLAN_SURAKSHA_YEARLY=P-3NA45044HW267203SNFDMXNI
PAYPAL_PLAN_VAJRA_YEARLY=P-33C53817PE4737058NFDMXOA
PAYPAL_PLAN_CHAKRA_YEARLY=P-99U671102N720504TNFDMXOQ

# Add-on Plan IDs
PAYPAL_ADDON_SCHEDULER=P-32U60387JT1483533NFDMXPA
PAYPAL_ADDON_WHITELABEL=P-7PJ67808RA6591613NFDMXPI
PAYPAL_ADDON_API_ACCESS=P-10P90334X6470204UNFDMXPQ
```

---

## Verification

Run the verification script to confirm all configurations:

```bash
python scripts/verify_paypal.py
```

Expected output: `RESULT: PayPal is FULLY CONFIGURED`

---

## Global Support

PayPal is configured to accept payments from users in **195+ countries** with:

- Automatic currency conversion to USD
- Local payment method support (cards, bank transfers, PayPal balance)
- Buyer and seller protection
- PCI DSS compliance
- 3D Secure authentication
- Fraud protection and risk management

---

## Quick Reference

### For Frontend Integration

```javascript
// Plan IDs for subscription buttons
const PAYPAL_PLANS = {
  aarambh_monthly: 'P-1JC933532V162793LNFDMXLY',
  aarambh_yearly: 'P-37E07153GU572264RNFDMXMA',
  raksha_monthly: 'P-9DE80034NW8103644NFDMXMI',
  raksha_yearly: 'P-91V72263GL6122913NFDMXMY',
  suraksha_monthly: 'P-9B208585UV344253JNFDMXNA',
  suraksha_yearly: 'P-3NA45044HW267203SNFDMXNI',
  vajra_monthly: 'P-9FM13449DU368353XNFDMXNY',
  vajra_yearly: 'P-33C53817PE4737058NFDMXOA',
  chakra_monthly: 'P-97P76054M44105114NFDMXOI',
  chakra_yearly: 'P-99U671102N720504TNFDMXOQ',
};

const PAYPAL_ADDONS = {
  scheduler: 'P-32U60387JT1483533NFDMXPA',
  whitelabel: 'P-7PJ67808RA6591613NFDMXPI',
  api_access: 'P-10P90334X6470204UNFDMXPQ',
};
```

---

*Document generated: December 20, 2025*
