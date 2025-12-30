# AiVedha Guardian - Multi-Region Infrastructure Implementation Plan

**Document Version**: 2.0
**Date**: 2025-12-28
**Status**: PENDING APPROVAL

---

## Executive Summary

This plan implements a dual-region (USA + India) infrastructure with smart IP routing, pre-audit validation, professional error handling, bug fixes, and unified deployment strategy.

---

## Table of Contents

1. [Phase 0: Critical Bug Fixes](#phase-0-critical-bug-fixes)
2. [Phase 1: GitHub CI/CD & Post-Deployment Audit](#phase-1-github-cicd--post-deployment-audit)
3. [Phase 2: API Gateway & SSL Configuration](#phase-2-api-gateway--ssl-configuration)
4. [Phase 3: Data Layer - Single Region Strategy](#phase-3-data-layer---single-region-strategy)
5. [Phase 4: Payment Unification](#phase-4-payment-unification)
6. [Phase 5: Smart IP Routing Logic](#phase-5-smart-ip-routing-logic)
7. [Phase 6: Pre-Audit Validation Popup](#phase-6-pre-audit-validation-popup)
8. [Phase 7: Scheduled Audit Validation](#phase-7-scheduled-audit-validation)
9. [Phase 8: Professional Error Handling](#phase-8-professional-error-handling)
10. [Phase 9: IP Masking for Free Users](#phase-9-ip-masking-for-free-users)
11. [Phase 10: Support Tickets (Paid Users Only)](#phase-10-support-tickets-paid-users-only)
12. [Phase 11: Admin Unified Dashboard](#phase-11-admin-unified-dashboard)
13. [Phase 12: Email Automation Cleanup](#phase-12-email-automation-cleanup)
14. [Phase 13: UI Integration for Dual Regions](#phase-13-ui-integration-for-dual-regions)
15. [Phase 14: Data Migration Plan](#phase-14-data-migration-plan)
16. [Phase 15: Admin Documentation Page](#phase-15-admin-documentation-page)
17. [Validation Checklists](#validation-checklists)
18. [IAM Policies & Permissions](#iam-policies--permissions)
19. [Complete File Impact Analysis](#complete-file-impact-analysis)

---

## Phase 0: Critical Bug Fixes

### Objective
Fix all existing bugs before implementing new features.

### Bug 0.1: Security Audit Page Not Loading

**Symptoms**: Security audit page fails to load or shows blank screen

**Investigation Steps**:
```bash
# Check browser console for errors
# Check network tab for failed API calls
# Verify lazy loading is working
```

**Files to Check**:
- `src/pages/SecurityAudit.tsx`
- `src/App.tsx` (lazy loading configuration)
- `src/lib/api.ts` (API endpoint calls)

**Potential Fixes**:
1. Check for undefined state variables
2. Verify API endpoints are responding
3. Check for JavaScript errors in component mount
4. Verify Suspense fallback is configured

**Implementation**:
```typescript
// src/pages/SecurityAudit.tsx - Add error boundary
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap component with error handling
export default function SecurityAudit() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize component with error handling
    try {
      initializeAuditPage();
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load security audit page');
      console.error(err);
    }
  }, []);

  if (error) return <ErrorDisplay message={error} />;
  if (isLoading) return <ZooZooLoader message="Loading Security Audit" />;

  // ... rest of component
}
```

---

### Bug 0.2: Purchase Page Loading Issue

**Symptoms**: Purchase page not loading properly

**Investigation Steps**:
```bash
# Check if Pricing.tsx and Purchase.tsx are loading
# Verify subscription context is initialized
# Check PayPal SDK loading
```

**Files to Check**:
- `src/pages/Purchase.tsx`
- `src/pages/Pricing.tsx`
- `src/contexts/SubscriptionContext.tsx`
- `src/lib/api.ts` (subscription endpoints)

**Potential Fixes**:
1. Add loading states for PayPal SDK
2. Handle subscription context initialization errors
3. Add fallback UI for slow network

**Implementation**:
```typescript
// src/pages/Purchase.tsx - Add proper loading states
export default function Purchase() {
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { subscription, isLoading: subLoading } = useSubscription();

  useEffect(() => {
    // Load PayPal SDK with timeout
    const loadPayPal = async () => {
      try {
        await loadPayPalScript({ timeout: 10000 });
        setIsPayPalReady(true);
      } catch (err) {
        setLoadError('Failed to load payment system. Please refresh.');
      }
    };
    loadPayPal();
  }, []);

  if (subLoading) return <ZooZooLoader message="Loading subscription..." />;
  if (loadError) return <ErrorDisplay message={loadError} onRetry={() => window.location.reload()} />;
  if (!isPayPalReady) return <ZooZooLoader message="Initializing payment..." />;

  // ... rest of component
}
```

---

### Bug 0.3: PayPal Proceed to Payment Issue

**Symptoms**: PayPal button not proceeding to payment

**Root Cause Analysis**:
1. Check API endpoint mapping (credits vs subscription)
2. Verify PayPal client ID is correct
3. Check for CORS issues

**Files to Check**:
- `src/pages/Purchase.tsx`
- `src/lib/api.ts` - `/paypal/credits` endpoint
- `aws-lambda/paypal-handler/paypal-handler.py`

**Correct Endpoint Mapping** (from CLAUDE.md):
```
Credit Pack Purchase: /paypal/credits → paypal-handler Lambda
Subscription Purchase: /subscription/checkout → subscription-manager Lambda
```

**Implementation Fix**:
```typescript
// src/lib/api.ts - Ensure correct endpoint
async purchaseCredits(planId: string): Promise<PayPalOrderResponse> {
  // CORRECT: Use /paypal/credits for credit packs
  const response = await this.post('/paypal/credits', {
    planId,
    quantity: 1
  });
  return response;
}

async startSubscription(planId: string): Promise<SubscriptionResponse> {
  // CORRECT: Use /subscription/checkout for subscriptions
  const response = await this.post('/subscription/checkout', {
    planId
  });
  return response;
}
```

---

### Bug 0.4: Currency Unification

**Requirement**: All payments must use same currency (USD only)

**Files to Modify**:
- `src/pages/Pricing.tsx`
- `src/pages/Purchase.tsx`
- `src/contexts/CurrencyContext.tsx`
- `aws-lambda/paypal-handler/paypal-handler.py`
- `aws-lambda/subscription-manager/subscription-manager.py`

**Implementation**:
```typescript
// src/contexts/CurrencyContext.tsx - Force USD
export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  // Remove currency switching - USD only
  const currency = 'USD';
  const symbol = '$';

  return (
    <CurrencyContext.Provider value={{ currency, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};
```

```python
# aws-lambda/paypal-handler/paypal-handler.py
CURRENCY = 'USD'  # Fixed - no dynamic currency

def create_order(amount, description):
    return {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": CURRENCY,  # Always USD
                "value": str(amount)
            },
            "description": description
        }]
    }
```

---

### Bug 0.5: Single Payment Gateway

**Requirement**: Use only PayPal gateway (no duplicate gateways)

**Current State**:
- PayPal is the only active gateway
- Zoho billing is for invoicing only, not payment processing

**Verification**:
```typescript
// src/lib/api.ts - Ensure single gateway
const PAYMENT_GATEWAY = 'paypal';

// All payment methods route through PayPal
async processPayment(type: 'credits' | 'subscription', planId: string) {
  if (type === 'credits') {
    return this.post('/paypal/credits', { planId });
  } else {
    return this.post('/subscription/checkout', { planId });
  }
}
```

---

## Phase 1: GitHub CI/CD & Post-Deployment Audit

### Objective
Automate Lambda deployment with post-deployment security audit verification using GitHub integration.

### Step 1.1: Fix Existing GitHub CI/CD Workflow

**File**: `.github/workflows/deploy-lambdas.yml`

```yaml
name: Deploy Lambda Functions & Verify

on:
  push:
    branches: [main]
    paths:
      - 'aws-lambda/**'
  workflow_dispatch:
    inputs:
      region:
        description: 'Deploy to specific region'
        required: false
        default: 'all'
        type: choice
        options:
          - all
          - us-east-1
          - ap-south-1

env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AIVEDHA_API_KEY: ${{ secrets.AIVEDHA_GITHUB_API_KEY }}
  AIVEDHA_USER_ID: 'aravind@aivibe.in'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      security-crawler: ${{ steps.changes.outputs.security-crawler }}
      report-generator: ${{ steps.changes.outputs.report-generator }}
      all-lambdas: ${{ steps.changes.outputs.all-lambdas }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            security-crawler:
              - 'aws-lambda/security-crawler/**'
            report-generator:
              - 'aws-lambda/report-generator/**'
            all-lambdas:
              - 'aws-lambda/**'

  deploy-us-east-1:
    needs: detect-changes
    if: github.event.inputs.region == 'all' || github.event.inputs.region == 'us-east-1'
    runs-on: ubuntu-latest
    outputs:
      deploy-status: ${{ steps.deploy.outputs.status }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy Security Crawler to US
        id: deploy
        if: needs.detect-changes.outputs.security-crawler == 'true'
        run: |
          cd aws-lambda/security-crawler
          zip -r package.zip . -x "*.pyc" -x "__pycache__/*"
          aws lambda update-function-code \
            --function-name aivedha-guardian-security-crawler \
            --zip-file fileb://package.zip \
            --region us-east-1
          echo "status=success" >> $GITHUB_OUTPUT

      - name: Wait for Lambda update
        run: |
          aws lambda wait function-updated \
            --function-name aivedha-guardian-security-crawler \
            --region us-east-1

  deploy-ap-south-1:
    needs: detect-changes
    if: github.event.inputs.region == 'all' || github.event.inputs.region == 'ap-south-1'
    runs-on: ubuntu-latest
    outputs:
      deploy-status: ${{ steps.deploy.outputs.status }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Deploy Security Crawler to India
        id: deploy
        if: needs.detect-changes.outputs.security-crawler == 'true'
        run: |
          cd aws-lambda/security-crawler
          zip -r package.zip . -x "*.pyc" -x "__pycache__/*"
          aws lambda update-function-code \
            --function-name aivedha-guardian-security-crawler \
            --zip-file fileb://package.zip \
            --region ap-south-1
          echo "status=success" >> $GITHUB_OUTPUT

      - name: Wait for Lambda update
        run: |
          aws lambda wait function-updated \
            --function-name aivedha-guardian-security-crawler \
            --region ap-south-1

  post-deployment-verification:
    needs: [deploy-us-east-1, deploy-ap-south-1]
    if: always() && (needs.deploy-us-east-1.outputs.deploy-status == 'success' || needs.deploy-ap-south-1.outputs.deploy-status == 'success')
    runs-on: ubuntu-latest
    steps:
      - name: Health Check - US Region
        id: health-us
        run: |
          response=$(curl -s -w "\n%{http_code}" https://api.aivedha.ai/api/health)
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          echo "US Health Check: $http_code"
          echo "$body" | jq .
          if [ "$http_code" != "200" ]; then
            echo "::warning::US region health check returned $http_code"
          fi

      - name: Health Check - India Region
        id: health-india
        run: |
          # Using direct API Gateway URL until custom domain configured
          response=$(curl -s -w "\n%{http_code}" https://frxi92ysq0.execute-api.ap-south-1.amazonaws.com/api/health)
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          echo "India Health Check: $http_code"
          echo "$body" | jq .
          if [ "$http_code" != "200" ]; then
            echo "::warning::India region health check returned $http_code"
          fi

      - name: Run Post-Deployment Security Audit
        id: audit
        run: |
          echo "Starting post-deployment security audit..."

          # Start audit using GitHub integration API key
          audit_response=$(curl -s -X POST https://api.aivedha.ai/api/audit/start \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${{ secrets.AIVEDHA_GITHUB_API_KEY }}" \
            -H "X-User-Id: ${{ env.AIVEDHA_USER_ID }}" \
            -d '{
              "url": "https://aivedha.ai",
              "source": "github-cicd",
              "webhook": "${{ secrets.GITHUB_WEBHOOK_URL }}"
            }')

          echo "Audit Response: $audit_response"

          report_id=$(echo "$audit_response" | jq -r '.reportId')
          if [ "$report_id" != "null" ] && [ -n "$report_id" ]; then
            echo "report_id=$report_id" >> $GITHUB_OUTPUT
            echo "Audit started: $report_id"
          else
            echo "::warning::Failed to start post-deployment audit"
          fi

      - name: Wait for Audit Completion
        if: steps.audit.outputs.report_id != ''
        run: |
          report_id="${{ steps.audit.outputs.report_id }}"
          max_attempts=30
          attempt=0

          while [ $attempt -lt $max_attempts ]; do
            status_response=$(curl -s https://api.aivedha.ai/api/audit/status/$report_id \
              -H "X-API-Key: ${{ secrets.AIVEDHA_GITHUB_API_KEY }}")

            status=$(echo "$status_response" | jq -r '.status')
            echo "Attempt $((attempt+1)): Status = $status"

            if [ "$status" = "completed" ]; then
              echo "Audit completed successfully!"
              echo "$status_response" | jq '.summary'
              break
            elif [ "$status" = "failed" ]; then
              echo "::error::Audit failed"
              exit 1
            fi

            sleep 10
            attempt=$((attempt+1))
          done

      - name: Create Audit Summary Comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const reportId = '${{ steps.audit.outputs.report_id }}';
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Post-Deployment Audit Results\n\nAudit Report: [View Report](https://aivedha.ai/audit-results/${reportId})\n\n✅ Deployment verification complete.`
            });
```

### Step 1.2: Create GitHub Integration API Key

**Lambda**: `aivedha-guardian-github-auth` already exists

**API Key Creation for CI/CD**:
```bash
# Create API key for GitHub CI/CD (user: aravind@aivibe.in)
aws dynamodb put-item \
  --table-name aivedha-guardian-api-keys \
  --item '{
    "api_key": {"S": "github-cicd-key-xxx"},
    "user_id": {"S": "aravind@aivibe.in"},
    "name": {"S": "GitHub CI/CD Integration"},
    "permissions": {"SS": ["audit:start", "audit:status", "health:check"]},
    "created_at": {"S": "2025-12-28T00:00:00Z"},
    "is_active": {"BOOL": true}
  }' \
  --region us-east-1
```

### Step 1.3: Frontend Deployment Workflow

**File**: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'vite.config.ts'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: https://api.aivedha.ai/api

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync dist s3://aivedha-ai-website --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id EDCUM1WH3G69U \
            --paths "/*"

      - name: Verify deployment
        run: |
          sleep 30  # Wait for CloudFront propagation
          response=$(curl -s -o /dev/null -w "%{http_code}" https://aivedha.ai)
          if [ "$response" != "200" ]; then
            echo "::error::Frontend deployment verification failed"
            exit 1
          fi
          echo "Frontend deployment verified: HTTP $response"
```

---

## Phase 2: API Gateway & SSL Configuration

### Objective
Configure single SSL certificate for both regions (reuse us-east-1 cert).

### SSL Certificate Strategy

**IMPORTANT**: CloudFront/edge-optimized API Gateway can use us-east-1 certificate globally.

**Current Certificate**:
- ARN: `arn:aws:acm:us-east-1:783764610283:certificate/0c0d9965-e4ee-4f2f-8ea0-6123fd78e8a0`
- Domain: `aivedha.ai` (wildcard: `*.aivedha.ai`)
- Region: us-east-1

### Step 2.1: India API Gateway - Use Edge-Optimized

For India API Gateway to use the us-east-1 certificate, convert to edge-optimized:

```bash
# Option A: Create edge-optimized API (uses us-east-1 cert via CloudFront)
aws apigateway create-rest-api \
  --name "AiVedha Guardian API India Edge" \
  --endpoint-configuration types=EDGE \
  --region ap-south-1

# Then create custom domain using us-east-1 certificate
aws apigateway create-domain-name \
  --domain-name api-india.aivedha.ai \
  --certificate-arn arn:aws:acm:us-east-1:783764610283:certificate/0c0d9965-e4ee-4f2f-8ea0-6123fd78e8a0 \
  --endpoint-configuration types=EDGE \
  --region ap-south-1
```

**Alternative (Regional)**: If regional endpoint needed, must create cert in ap-south-1.

### Step 2.2: DNS Configuration (Cloudflare)

```
# Primary API (USA)
api.aivedha.ai → CNAME → d-fzey3263x8.execute-api.us-east-1.amazonaws.com

# India API (Edge-optimized uses CloudFront)
api-india.aivedha.ai → CNAME → <cloudfront-domain-from-api-gateway>
```

### Step 2.3: API Gateway Endpoint Summary

| Endpoint | Region | Type | Domain | Certificate |
|----------|--------|------|--------|-------------|
| Primary | us-east-1 | Regional | api.aivedha.ai | us-east-1 cert |
| India | ap-south-1 | Edge | api-india.aivedha.ai | us-east-1 cert (via CF) |

---

## Phase 3: Data Layer - Single Region Strategy

### Objective
Maintain all data in us-east-1 for consistency. No replication needed.

### DynamoDB (us-east-1 only)

All 26 tables remain in us-east-1:
- Both Lambda regions access us-east-1 DynamoDB
- Cross-region latency (~100-150ms) is acceptable

**Lambda Configuration**:
```python
# Both regions use this configuration
DYNAMODB_REGION = 'us-east-1'
dynamodb = boto3.resource('dynamodb', region_name=DYNAMODB_REGION)
```

### S3 (us-east-1 only with CloudFront)

| Bucket | Purpose | CloudFront |
|--------|---------|------------|
| aivedha-ai-website | Frontend | EDCUM1WH3G69U |
| aivedha-guardian-reports-us-east-1 | PDFs, certificates | Add to existing CF |

### SES (us-east-1 only)

All email operations use us-east-1 SES:
```python
SES_REGION = 'us-east-1'  # Fixed, not configurable
ses_client = boto3.client('ses', region_name=SES_REGION)
```

---

## Phase 4: Payment Unification

### Objective
Unify all payments to single gateway (PayPal) with single currency (USD).

### Step 4.1: Currency Enforcement

**File**: `src/contexts/CurrencyContext.tsx`

```typescript
// Force USD only - remove currency switching
import { createContext, useContext, ReactNode } from 'react';

interface CurrencyContextType {
  currency: 'USD';
  symbol: '$';
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  symbol: '$',
  formatPrice: (amount) => `$${amount.toFixed(2)}`
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const value: CurrencyContextType = {
    currency: 'USD',
    symbol: '$',
    formatPrice: (amount: number) => `$${amount.toFixed(2)}`
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
```

### Step 4.2: Payment Gateway Enforcement

**File**: `src/lib/api.ts`

```typescript
// Single payment gateway - PayPal only
const PAYMENT_GATEWAY = 'paypal';
const PAYMENT_CURRENCY = 'USD';

export class AivedhaAPI {
  // Credit pack purchase
  async purchaseCredits(planId: string): Promise<PayPalResponse> {
    return this.post('/paypal/credits', {
      planId,
      currency: PAYMENT_CURRENCY,
      gateway: PAYMENT_GATEWAY
    });
  }

  // Subscription purchase
  async createSubscription(planId: string): Promise<SubscriptionResponse> {
    return this.post('/subscription/checkout', {
      planId,
      currency: PAYMENT_CURRENCY,
      gateway: PAYMENT_GATEWAY
    });
  }
}
```

---

## Phase 5: Smart IP Routing Logic

### Objective
Implement fallback chain: Primary Region → Alternate Region with proper routing.

### Routing Logic

```
User Location = India/South Asia:
  1. Try: India Static IP (13.203.153.119) via ap-south-1
  2. Fallback: USA Static IP (44.206.201.117) via us-east-1
  3. Fail: Show professional error

User Location = Other:
  1. Try: USA Static IP (44.206.201.117) via us-east-1
  2. Fallback: India Static IP (13.203.153.119) via ap-south-1
  3. Fail: Show professional error
```

### Step 5.1: Region Detection

**File**: `src/lib/regionDetection.ts` (NEW)

```typescript
export type Region = 'india' | 'usa';

const INDIA_COUNTRIES = ['IN', 'BD', 'NP', 'LK', 'PK', 'BT', 'MM', 'AF'];

export const API_ENDPOINTS = {
  usa: 'https://api.aivedha.ai/api',
  india: 'https://frxi92ysq0.execute-api.ap-south-1.amazonaws.com/api' // Until custom domain ready
};

export const STATIC_IPS = {
  usa: '44.206.201.117',
  india: '13.203.153.119'
};

export async function detectUserRegion(): Promise<Region> {
  try {
    // Try to get country from Cloudflare header via API
    const response = await fetch('/api/health', { method: 'HEAD' });
    const country = response.headers.get('CF-IPCountry') || '';

    if (INDIA_COUNTRIES.includes(country.toUpperCase())) {
      return 'india';
    }
  } catch {
    // Default to USA on error
  }
  return 'usa';
}

export function getEndpointForRegion(region: Region): string {
  return API_ENDPOINTS[region];
}

export function getFallbackRegion(region: Region): Region {
  return region === 'india' ? 'usa' : 'india';
}
```

### Step 5.2: API Client with Fallback

**File**: `src/lib/api.ts` (MODIFY)

```typescript
import { detectUserRegion, getEndpointForRegion, getFallbackRegion, STATIC_IPS, Region } from './regionDetection';

export class AivedhaAPI {
  private userRegion: Region | null = null;

  async initRegion(): Promise<Region> {
    if (!this.userRegion) {
      this.userRegion = await detectUserRegion();
    }
    return this.userRegion;
  }

  async startAuditWithFallback(url: string): Promise<AuditResponse> {
    const region = await this.initRegion();
    const primaryEndpoint = getEndpointForRegion(region);
    const fallbackRegion = getFallbackRegion(region);
    const fallbackEndpoint = getEndpointForRegion(fallbackRegion);

    try {
      // Try primary region
      const response = await this.callAuditEndpoint(primaryEndpoint, url);
      return { ...response, scanRegion: region, staticIP: STATIC_IPS[region] };
    } catch (primaryError) {
      console.log(`Primary region (${region}) failed, trying fallback...`);

      try {
        // Try fallback region
        const response = await this.callAuditEndpoint(fallbackEndpoint, url);
        return { ...response, scanRegion: fallbackRegion, staticIP: STATIC_IPS[fallbackRegion] };
      } catch (fallbackError) {
        // Both regions failed
        throw new AuditError(
          'Site is protected from all scanning regions',
          { primaryError, fallbackError, attemptedRegions: [region, fallbackRegion] }
        );
      }
    }
  }
}
```

---

## Phase 6: Pre-Audit Validation Popup

### Objective
Validate connectivity before starting full audit.

### Step 6.1: Validation API Endpoint

**Lambda**: Add to `security-audit-crawler.py`

```python
def validate_connectivity(event, context):
    """Quick connectivity check - no full scan"""
    url = event.get('url')

    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        return {
            'statusCode': 200,
            'body': json.dumps({
                'reachable': True,
                'statusCode': response.status_code,
                'responseTime': response.elapsed.total_seconds(),
                'region': os.environ.get('AWS_REGION'),
                'staticIP': get_static_ip()
            })
        }
    except requests.Timeout:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'reachable': False,
                'error': 'timeout',
                'region': os.environ.get('AWS_REGION')
            })
        }
    except Exception as e:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'reachable': False,
                'error': str(e),
                'region': os.environ.get('AWS_REGION')
            })
        }
```

### Step 6.2: Validation Popup Component

**File**: `src/components/ValidationPopup.tsx` (NEW)

```typescript
interface ValidationResult {
  region: Region;
  reachable: boolean;
  responseTime?: number;
  error?: string;
}

interface ValidationPopupProps {
  url: string;
  isOpen: boolean;
  onValidated: (results: ValidationResult[], recommendedRegion: Region) => void;
  onCancel: () => void;
}

export function ValidationPopup({ url, isOpen, onValidated, onCancel }: ValidationPopupProps) {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const validate = async () => {
      const validationResults: ValidationResult[] = [];

      // Validate both regions in parallel
      const [usResult, indiaResult] = await Promise.all([
        api.validateConnectivity(url, 'usa'),
        api.validateConnectivity(url, 'india')
      ]);

      validationResults.push(usResult, indiaResult);
      setResults(validationResults);
      setIsValidating(false);

      // Determine recommended region
      const reachableRegions = validationResults.filter(r => r.reachable);
      if (reachableRegions.length > 0) {
        // Prefer faster region
        const fastest = reachableRegions.sort((a, b) =>
          (a.responseTime || Infinity) - (b.responseTime || Infinity)
        )[0];
        onValidated(validationResults, fastest.region);
      }
    };

    validate();
  }, [url, isOpen]);

  // Render validation UI...
}
```

---

## Phase 7: Scheduled Audit Validation

### Objective
Validate connectivity during schedule creation and freeze the routing.

### Step 7.1: Update Scheduler Page

**File**: `src/pages/SchedulerPage.tsx` (MODIFY)

```typescript
const handleScheduleAudit = async (scheduleData: ScheduleData) => {
  // Step 1: Validate connectivity NOW
  const validation = await api.validateAllRegions(scheduleData.url);

  // Step 2: Determine best region
  const reachableRegions = validation.filter(v => v.reachable);

  if (reachableRegions.length === 0) {
    toast.error("Cannot schedule: Site is not accessible from any server");
    return;
  }

  // Step 3: Freeze the best region
  const bestRegion = reachableRegions.sort((a, b) =>
    (a.responseTime || Infinity) - (b.responseTime || Infinity)
  )[0].region;

  // Step 4: Create schedule with frozen region
  const schedule = await api.createScheduledAudit({
    ...scheduleData,
    frozenRegion: bestRegion,
    validatedAt: new Date().toISOString(),
    validationResults: validation
  });

  toast.success(`Audit scheduled using ${bestRegion.toUpperCase()} server`);
};
```

### Step 7.2: Update Schedule Schema

**DynamoDB**: `aivedha-guardian-schedules` table

New fields:
```json
{
  "frozenRegion": "india",
  "validatedAt": "2025-12-28T...",
  "validationResults": [...]
}
```

---

## Phase 8: Professional Error Handling

### Objective
Show clear, professional error messages with module breakdown.

### Step 8.1: Error Display Component

**File**: `src/components/AuditErrorDisplay.tsx` (NEW)

```typescript
interface AuditErrorDisplayProps {
  completedModules: AuditModule[];
  failedModules: AuditModule[];
  scanRegion: string;
  staticIP: string;
  isPaidUser: boolean;
  onViewReport: () => void;
  onRequestAccess: () => void;
  onRetry: () => void;
}

export function AuditErrorDisplay({
  completedModules,
  failedModules,
  scanRegion,
  staticIP,
  isPaidUser,
  onViewReport,
  onRequestAccess,
  onRetry
}: AuditErrorDisplayProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Limited Audit Results
        </CardTitle>
        <CardDescription>
          Some security modules couldn't complete due to site protection.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Completed Modules */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedModules.length} modules)
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {completedModules.slice(0, 6).map(m => (
              <span key={m.id}>• {m.name}</span>
            ))}
            {completedModules.length > 6 && (
              <span className="text-muted-foreground">
                ... and {completedModules.length - 6} more
              </span>
            )}
          </div>
        </div>

        {/* Failed Modules */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Could Not Complete ({failedModules.length} modules)
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {failedModules.map(m => (
              <span key={m.id}>• {m.name}</span>
            ))}
          </div>
        </div>

        {/* IP Whitelist Instructions - ONLY FOR PAID USERS */}
        {isPaidUser ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">
              To unlock full scanning:
            </h4>
            <p className="text-sm mt-2">
              Whitelist our IP address in your firewall:
            </p>
            <code className="block mt-2 bg-white dark:bg-gray-800 p-2 rounded text-sm font-mono">
              {staticIP} ({scanRegion.toUpperCase()} Server)
            </code>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              IP Information Hidden
            </h4>
            <p className="text-sm mt-2 text-muted-foreground">
              Subscribe to a paid plan to view server IP addresses for whitelisting.
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={onViewReport}>View Partial Report</Button>
        {isPaidUser && (
          <Button variant="outline" onClick={onRequestAccess}>
            Request Regional Access
          </Button>
        )}
        <Button variant="ghost" onClick={onRetry}>Try Again</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Phase 9: IP Masking for Free Users

### Objective
Hide server IPs from free users to encourage subscription.

### Step 9.1: IP Display Logic

**File**: `src/components/AuditPopup.tsx` (MODIFY)

```typescript
// Add IP masking for free users
const renderServerInfo = () => {
  const { subscription } = useSubscription();
  const isPaid = subscription?.status === 'active';

  if (isPaid) {
    return (
      <div className="text-sm">
        <span>Scanning from: </span>
        <span className="font-mono">{staticIP}</span>
        <span className="text-muted-foreground"> ({scanRegion})</span>
      </div>
    );
  }

  // Masked view for free users
  return (
    <div className="text-sm relative">
      <span>Scanning from: </span>
      <span className="font-mono relative">
        <span className="blur-sm select-none">XXX.XXX.XXX.XXX</span>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Upgrade to view
          </span>
        </span>
      </span>
    </div>
  );
};
```

### Step 9.2: API Response Filtering

**Lambda**: `security-audit-crawler.py` (MODIFY)

```python
def format_response(report, user_subscription_status):
    """Format response based on user subscription"""
    response = {
        'reportId': report['report_id'],
        'status': report['status'],
        'progress': report['progress'],
        'modules': report['modules']
    }

    # Only include IP info for paid users
    if user_subscription_status == 'active':
        response['scanRegion'] = report.get('scan_region')
        response['staticIP'] = report.get('static_ip')
    else:
        response['scanRegion'] = 'hidden'
        response['staticIP'] = 'Subscribe to view'

    return response
```

---

## Phase 10: Support Tickets (Paid Users Only)

### Objective
Allow ONLY paid users to request regional access.

### Step 10.1: Support Ticket Component

**File**: `src/components/RegionalAccessRequest.tsx` (NEW)

```typescript
export function RegionalAccessRequest({ domain, onClose }: Props) {
  const { subscription } = useSubscription();
  const isPaid = subscription?.status === 'active';

  // Block free users
  if (!isPaid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Star className="h-5 w-5" />
            Paid Feature Only
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Regional access requests are exclusively available for paid subscribers.
          </p>
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>
              Free plan users cannot request regional access. Please upgrade to continue.
            </AlertDescription>
          </Alert>
          <Button className="mt-4 w-full" asChild>
            <Link to="/pricing">Upgrade Now</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Paid user flow...
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Regional Access for {domain}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Domain verification options */}
      </CardContent>
    </Card>
  );
}
```

---

## Phase 11: Admin Unified Dashboard

### Objective
Single admin API with access to both regions and unified monitoring.

### Step 11.1: Admin API Configuration

**Single Admin API** (us-east-1): `ur1sme4qh3`

The admin API in us-east-1 accesses:
- DynamoDB (us-east-1) - all data
- Both Lambda regions for monitoring

### Step 11.2: Region Monitoring Endpoints

**Lambda**: `aivedha-admin-settings` (MODIFY)

```python
def get_region_stats(event, context):
    """Get statistics for specific region or all regions"""
    region = event.get('queryStringParameters', {}).get('region', 'all')

    if region == 'all':
        us_stats = get_lambda_stats('us-east-1')
        india_stats = get_lambda_stats('ap-south-1')
        return {
            'statusCode': 200,
            'body': json.dumps({
                'us-east-1': us_stats,
                'ap-south-1': india_stats,
                'combined': combine_stats(us_stats, india_stats)
            })
        }
    else:
        stats = get_lambda_stats(region)
        return {
            'statusCode': 200,
            'body': json.dumps(stats)
        }

def get_lambda_stats(region):
    """Get Lambda invocation stats for a region"""
    cloudwatch = boto3.client('cloudwatch', region_name=region)

    # Get invocation count
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/Lambda',
        MetricName='Invocations',
        Dimensions=[
            {'Name': 'FunctionName', 'Value': 'aivedha-guardian-security-crawler'}
        ],
        StartTime=datetime.utcnow() - timedelta(hours=24),
        EndTime=datetime.utcnow(),
        Period=3600,
        Statistics=['Sum']
    )

    return {
        'region': region,
        'invocations_24h': sum(dp['Sum'] for dp in response['Datapoints']),
        'last_updated': datetime.utcnow().isoformat()
    }
```

### Step 11.3: Admin Dashboard Updates

**File**: `src/pages/admin/AdminDashboard.tsx` (MODIFY)

```typescript
// Add region monitoring section
const RegionMonitoring = () => {
  const [regionStats, setRegionStats] = useState(null);

  useEffect(() => {
    fetchRegionStats();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regional Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h4 className="font-semibold flex items-center gap-2">
              🇺🇸 USA (us-east-1)
            </h4>
            <p className="text-2xl font-bold">{regionStats?.['us-east-1']?.invocations_24h || 0}</p>
            <p className="text-sm text-muted-foreground">Audits (24h)</p>
          </div>
          <div className="p-4 border rounded">
            <h4 className="font-semibold flex items-center gap-2">
              🇮🇳 India (ap-south-1)
            </h4>
            <p className="text-2xl font-bold">{regionStats?.['ap-south-1']?.invocations_24h || 0}</p>
            <p className="text-sm text-muted-foreground">Audits (24h)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Phase 12: Email Automation Cleanup

### Objective
Fix email automation - single daily email with region user counts.

### Step 12.1: Remove API Testing from Purchase Email

**Lambda**: `aivedha-guardian-email-notification.py` (MODIFY)

```python
def send_daily_summary_email():
    """Send daily summary - NO API testing, just user stats"""

    # Get region-specific user counts
    users_table = dynamodb.Table('aivedha-guardian-users')

    # Count users by registration region (if tracked) or default to total
    total_users = users_table.scan(Select='COUNT')['Count']

    # Get today's new users
    today = datetime.utcnow().date().isoformat()
    new_users_response = users_table.query(
        IndexName='created-date-index',
        KeyConditionExpression=Key('created_date').eq(today),
        Select='COUNT'
    )
    new_users_today = new_users_response['Count']

    # Get today's audits by region
    reports_table = dynamodb.Table('aivedha-guardian-audit-reports')
    today_audits = reports_table.query(
        IndexName='created-date-index',
        KeyConditionExpression=Key('created_date').eq(today)
    )

    us_audits = sum(1 for r in today_audits['Items'] if r.get('scan_region') == 'us-east-1')
    india_audits = sum(1 for r in today_audits['Items'] if r.get('scan_region') == 'ap-south-1')

    # Send summary email
    email_body = f"""
    Daily Summary - {today}

    Users:
    - Total Users: {total_users}
    - New Today: {new_users_today}

    Audits Today:
    - USA Region: {us_audits}
    - India Region: {india_audits}
    - Total: {us_audits + india_audits}
    """

    send_email(
        to='admin@aivedha.ai',
        subject=f'AiVedha Daily Summary - {today}',
        body=email_body
    )
```

### Step 12.2: Stop Duplicate API Validation Records

**Lambda**: `aivedha-guardian-api-tester.py` (MODIFY)

```python
# Add idempotency check
def run_api_validation(test_id):
    """Run API validation with idempotency"""
    idempotency_table = dynamodb.Table('aivedha-guardian-idempotency')

    # Check if already processed
    existing = idempotency_table.get_item(Key={'idempotency_key': f'api-test-{test_id}'})
    if 'Item' in existing:
        logger.info(f'Skipping duplicate API test: {test_id}')
        return existing['Item']['result']

    # Run validation
    result = execute_api_tests()

    # Store with idempotency key
    idempotency_table.put_item(Item={
        'idempotency_key': f'api-test-{test_id}',
        'result': result,
        'created_at': datetime.utcnow().isoformat(),
        'ttl': int((datetime.utcnow() + timedelta(days=1)).timestamp())
    })

    return result
```

---

## Phase 13: UI Integration for Dual Regions

### Objective
Update all UI components to handle dual-region responses.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/api.ts` | Add regional endpoints, fallback logic |
| `src/lib/regionDetection.ts` | NEW: Region detection |
| `src/pages/SecurityAudit.tsx` | Validation popup, region indicator |
| `src/pages/AuditResults.tsx` | Show scan region badge |
| `src/components/AuditPopup.tsx` | IP masking, region display |
| `src/pages/SchedulerPage.tsx` | Validate during scheduling |
| `src/pages/Dashboard.tsx` | Region column in history |

### Dashboard Region Column

**File**: `src/pages/Dashboard.tsx` (MODIFY)

```typescript
// Add region column to audit history table
const columns = [
  // ... existing columns
  {
    header: 'Region',
    accessorKey: 'scanRegion',
    cell: ({ row }) => {
      const region = row.original.scanRegion;
      return (
        <span className="flex items-center gap-1">
          {region === 'ap-south-1' ? '🇮🇳' : '🇺🇸'}
          <span className="text-xs">{region === 'ap-south-1' ? 'India' : 'USA'}</span>
        </span>
      );
    }
  }
];
```

---

## Phase 14: Data Migration Plan

### Objective
Plan for initial data setup and migration.

### Step 14.1: Initial Setup Checklist

| Item | Status | Notes |
|------|--------|-------|
| DynamoDB tables exist | ✅ | All 26 tables in us-east-1 |
| S3 buckets configured | ✅ | Website + Reports buckets |
| Lambda layers deployed | ✅ | Both regions |
| API Gateway configured | ✅ | Both regions |
| VPC + NAT configured | ✅ | Both regions |
| Elastic IPs allocated | ✅ | USA: 44.206.201.117, India: 13.203.153.119 |

### Step 14.2: Data Migration (If Needed)

For new deployments or data restructuring:

```python
# Migration script for adding scan_region to existing reports
def migrate_add_scan_region():
    """Add scan_region field to existing audit reports"""
    table = dynamodb.Table('aivedha-guardian-audit-reports')

    # Scan all items without scan_region
    response = table.scan(
        FilterExpression='attribute_not_exists(scan_region)'
    )

    for item in response['Items']:
        # Default old reports to us-east-1
        table.update_item(
            Key={'report_id': item['report_id']},
            UpdateExpression='SET scan_region = :r, static_ip = :ip',
            ExpressionAttributeValues={
                ':r': 'us-east-1',
                ':ip': '44.206.201.117'
            }
        )

    print(f'Migrated {len(response["Items"])} reports')
```

### Step 14.3: Rollback Plan

```bash
# If migration fails, rollback steps:
1. Revert Lambda to previous version
2. Restore DynamoDB from point-in-time backup
3. Redeploy frontend from previous S3 version
```

---

## Phase 15: Admin Documentation Page

### Objective
Create MDX documentation page accessible in admin panel.

### Step 15.1: Create Documentation File

**File**: `src/pages/admin/ImplementationDocs.mdx` (NEW)

```mdx
# AiVedha Guardian - Implementation Documentation

## Overview

AiVedha Guardian is a dual-region security audit platform with smart routing.

## Architecture

### Regions

| Region | Lambda | API Gateway | Static IP |
|--------|--------|-------------|-----------|
| us-east-1 (USA) | aivedha-guardian-security-crawler | btxmpjub05 | 44.206.201.117 |
| ap-south-1 (India) | aivedha-guardian-security-crawler | frxi92ysq0 | 13.203.153.119 |

### Data Layer

- **DynamoDB**: All tables in us-east-1 (centralized)
- **S3**: us-east-1 with CloudFront global distribution
- **SES**: us-east-1 only

## Key Configuration Points

### Environment Variables (Lambda)

| Variable | Value | Notes |
|----------|-------|-------|
| AWS_DYNAMODB_REGION | us-east-1 | Fixed for all Lambdas |
| SES_REGION | us-east-1 | Fixed for email |
| CRAWL_DELAY | 0.1 | Seconds between requests |
| REQUEST_TIMEOUT | 30 | Seconds |

### API Endpoints

```
Primary API: https://api.aivedha.ai/api
India API: https://frxi92ysq0.execute-api.ap-south-1.amazonaws.com/api
Admin API: https://api.aivedha.ai/admin (us-east-1 only)
```

### Payment Configuration

- **Gateway**: PayPal only
- **Currency**: USD only
- **Credit Endpoint**: /paypal/credits
- **Subscription Endpoint**: /subscription/checkout

## IP Routing Logic

```
India Users → India Lambda (13.203.153.119) → Fallback: USA
Other Users → USA Lambda (44.206.201.117) → Fallback: India
```

## Security Considerations

1. **IP Masking**: Free users cannot see server IPs
2. **Regional Access**: Paid users only can request whitelisting
3. **Domain Verification**: Email or DNS TXT record required

## Monitoring

Admin dashboard shows:
- Audit counts per region
- Success/failure rates
- User distribution

## Troubleshooting

### Common Issues

1. **Audit timeout**: Site may be blocking our IPs
2. **Page not loading**: Check browser console for errors
3. **Payment failed**: Verify PayPal credentials

### Health Checks

```bash
# US Region
curl https://api.aivedha.ai/api/health

# India Region
curl https://frxi92ysq0.execute-api.ap-south-1.amazonaws.com/api/health
```
```

### Step 15.2: Create Admin Documentation Page

**File**: `src/pages/admin/Documentation.tsx` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export default function Documentation() {
  const [content, setContent] = useState('');

  useEffect(() => {
    // Load MDX content
    import('./ImplementationDocs.mdx?raw').then(module => {
      setContent(module.default);
    });
  }, []);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Implementation Documentation</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 15.3: Add Route to Admin

**File**: `src/App.tsx` (MODIFY)

```typescript
// Add documentation route
const Documentation = lazy(() => import("./pages/admin/Documentation"));

// In admin routes:
<Route path="documentation" element={<Documentation />} />
```

---

## Validation Checklists

### Auto-Mirroring Checklist

| Check | US Lambda | India Lambda | Status |
|-------|-----------|--------------|--------|
| Python version | 3.11 | 3.11 | |
| Layer version | Latest | Latest | |
| Environment vars match | ✓ | ✓ | |
| VPC configured | ✓ | ✓ | |
| NAT Gateway active | ✓ | ✓ | |
| Security group rules | ✓ | ✓ | |
| DynamoDB region set | us-east-1 | us-east-1 | |
| SES region set | us-east-1 | us-east-1 | |
| Handler function | lambda_handler | lambda_handler | |
| Timeout | 300s | 300s | |
| Memory | 1024MB | 1024MB | |

### Handler Routing Checklist

| Endpoint | US Handler | India Handler | Match |
|----------|------------|---------------|-------|
| /audit/start | security-crawler.lambda_handler | security-crawler.lambda_handler | ✓ |
| /audit/status/{id} | audit-status.lambda_handler | audit-status.lambda_handler | ✓ |
| /audit/validate | security-crawler.validate_connectivity | security-crawler.validate_connectivity | ✓ |
| /health | security-crawler.health_check | security-crawler.health_check | ✓ |

### Parameter Matching Checklist

| Parameter | Lambda | API Gateway | Frontend | Match |
|-----------|--------|-------------|----------|-------|
| url | body.url | ✓ | AuditRequest.url | ✓ |
| userId | body.userId | ✓ | session.userId | ✓ |
| reportId | path.reportId | ✓ | params.reportId | ✓ |

### UI Parameter Checklist

| Component | Parameter | API Field | Match |
|-----------|-----------|-----------|-------|
| SecurityAudit | url | body.url | ✓ |
| AuditPopup | reportId | reportId | ✓ |
| AuditResults | reportId | path.reportId | ✓ |
| Dashboard | userId | query.userId | ✓ |

---

## IAM Policies & Permissions

### Lambda Execution Role

**Role**: `aivedha-guardian-lambda-role`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:783764610283:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:783764610283:table/aivedha-guardian-*",
        "arn:aws:dynamodb:us-east-1:783764610283:table/aivedha-guardian-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::aivedha-guardian-reports-us-east-1/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": [
            "admin@aivedha.ai",
            "noreply@aivedha.ai"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses"
      ],
      "Resource": "*"
    }
  ]
}
```

### GitHub CI/CD Role

**Role**: `aivedha-github-actions-role`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:us-east-1:783764610283:function:aivedha-guardian-*",
        "arn:aws:lambda:ap-south-1:783764610283:function:aivedha-guardian-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aivedha-ai-website",
        "arn:aws:s3:::aivedha-ai-website/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::783764610283:distribution/EDCUM1WH3G69U"
    }
  ]
}
```

---

## Complete File Impact Analysis

### New Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `.github/workflows/deploy-lambdas.yml` | Lambda CI/CD | High |
| `.github/workflows/deploy-frontend.yml` | Frontend CI/CD | High |
| `src/lib/regionDetection.ts` | User region detection | High |
| `src/components/ValidationPopup.tsx` | Pre-audit validation | High |
| `src/components/AuditErrorDisplay.tsx` | Error display | High |
| `src/components/RegionalAccessRequest.tsx` | Support ticket form | Medium |
| `src/pages/admin/Documentation.tsx` | Admin docs page | Medium |
| `src/pages/admin/ImplementationDocs.mdx` | Implementation docs | Medium |

### Existing Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/lib/api.ts` | Regional fallback, fix payment endpoints | High |
| `src/contexts/CurrencyContext.tsx` | Force USD only | High |
| `src/pages/SecurityAudit.tsx` | Fix loading, add validation | High |
| `src/pages/Purchase.tsx` | Fix loading issues | High |
| `src/pages/Pricing.tsx` | USD only display | High |
| `src/components/AuditPopup.tsx` | IP masking, region display | High |
| `src/pages/SchedulerPage.tsx` | Validate during scheduling | Medium |
| `src/pages/Dashboard.tsx` | Region column | Medium |
| `src/pages/admin/AdminDashboard.tsx` | Region monitoring | Medium |
| `src/App.tsx` | Add documentation route | Low |
| `aws-lambda/security-crawler/*.py` | Validation endpoint, region info | High |
| `aws-lambda/email-notification/*.py` | Remove API testing | Medium |

---

## Implementation Order

| Order | Phase | Description | Dependencies |
|-------|-------|-------------|--------------|
| 1 | Phase 0 | Bug Fixes | None |
| 2 | Phase 4 | Payment Unification | Phase 0 |
| 3 | Phase 1 | GitHub CI/CD | Phase 0 |
| 4 | Phase 2 | API Gateway SSL | None |
| 5 | Phase 3 | Data Layer Config | None |
| 6 | Phase 5 | Smart IP Routing | Phase 2 |
| 7 | Phase 6 | Pre-Audit Validation | Phase 5 |
| 8 | Phase 7 | Scheduled Validation | Phase 6 |
| 9 | Phase 8 | Error Handling | Phase 5 |
| 10 | Phase 9 | IP Masking | Phase 5 |
| 11 | Phase 10 | Support Tickets | Phase 9 |
| 12 | Phase 11 | Admin Dashboard | Phase 5 |
| 13 | Phase 12 | Email Cleanup | None |
| 14 | Phase 13 | UI Integration | Phase 5-11 |
| 15 | Phase 14 | Data Migration | Phase 3 |
| 16 | Phase 15 | Admin Docs | Phase 11 |

---

## Approval Checklist

| Phase | Description | Approved (Y/N) | Notes |
|-------|-------------|----------------|-------|
| 0 | Bug Fixes (5 items) | | |
| 1 | GitHub CI/CD + Post-Deploy Audit | | |
| 2 | API Gateway SSL (single cert) | | |
| 3 | Data Layer - Single Region | | |
| 4 | Payment Unification (USD/PayPal) | | |
| 5 | Smart IP Routing | | |
| 6 | Pre-Audit Validation | | |
| 7 | Scheduled Audit Validation | | |
| 8 | Professional Error Handling | | |
| 9 | IP Masking for Free Users | | |
| 10 | Support Tickets (Paid Only) | | |
| 11 | Admin Unified Dashboard | | |
| 12 | Email Automation Cleanup | | |
| 13 | UI Integration | | |
| 14 | Data Migration Plan | | |
| 15 | Admin Documentation Page | | |

---

**Document Status**: AWAITING APPROVAL

**Next Step**: After approval, implementation will proceed in the order specified above.
