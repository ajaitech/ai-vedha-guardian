# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AiVedha Guardian is a global AI-powered security audit platform that scans websites for vulnerabilities and generates audit certificates. Users subscribe for $10/month for unlimited audits.

**Production URL**: https://aivedha.ai
**API URL**: https://api.aivedha.ai/api

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Architecture

### Frontend (React + TypeScript)
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Routing**: React Router v6 in `src/App.tsx`
- **API Client**: `src/lib/api.ts` - `AivedhaAPI` class with all backend endpoints
- **Auth**: `src/lib/cognito.ts` - AWS Cognito for Google/Apple social login
- **UI Components**: shadcn/ui in `src/components/ui/`
- **State**: TanStack Query for server state, React Hook Form + Zod for forms
- **Hosting**: AWS S3 + CloudFront (Distribution ID: `EDCUM1WH3G69U`)

### Backend (AWS Lambda - Python) - Region: us-east-1
Located in `aws_Lambda/`:
- **Security Scanning**: `security-audit-crawler.py`, `vulnerability-scanner.py`
- **Reports**: `report-generator.py` (PDF generation with ReportLab)
- **Auth**: `user-auth.py`
- **Payments**: `subscription-manager.py`, `paypal-handler.py` (PayPal subscriptions)
- **Email**: `email-notification.py` (SES templated emails)
- **Intelligence**: `seo_analyzer.py`, `server_profiler.py`, `whois_enricher.py`

### Database (DynamoDB) - Region: us-east-1
Tables (prefix: `aivedha-guardian-`):
- `users` - User accounts (PK: user_id, GSI: email)
- `audit-reports` - Scan results (PK: report_id, GSI: certificate_number)
- `credits` - Credit transactions
- `subscriptions` - Subscription tracking
- `email-logs` - Email audit trail

### API Endpoints
Base URL: `https://api.aivedha.ai/api` (dev proxy at `/api`)

Key endpoints:
- `POST /audit/start` - Start security audit
- `GET /audit/status/{reportId}` - Check audit status
- `GET /certificate/{number}` - Retrieve certificate
- `POST /auth/login`, `POST /auth/register` - Authentication
- `POST /subscription/activate` - Subscription activation
- `POST /subscription/webhook` - Payment webhooks
- `POST /email` - Send templated emails
- `GET /health` - Health check

### Key Routes
- `/dashboard` - User audit history and credits
- `/audit` - Run new security audit
- `/purchase` - Subscribe via PayPal ($10/month)
- `/certificate/:certificateNumber` - View certificate
- `/admin/*` - Admin dashboard
- `/diagnostics` - API connectivity testing

## AWS Infrastructure (us-east-1)

### CloudFront
- Distribution ID: `EDCUM1WH3G69U`
- Domain: `d2zppelr72rlwx.cloudfront.net`
- SSL: ACM certificate for `*.aivedha.ai`

### API Gateway
- API ID: `btxmpjub05`
- Custom domain: `api.aivedha.ai`
- Regional endpoint: `d-fzey3263x8.execute-api.us-east-1.amazonaws.com`

### S3
- Website bucket: `aivedha-ai-website`
- Reports bucket: `aivedha-guardian-reports-us-east-1`

### SES Email Templates
- `AiVedhaWelcomeEmail` - New user welcome
- `AiVedhaLoginAlert` - Login notifications
- `AiVedhaPaymentSuccess` - Payment confirmation
- `AiVedhaSubscriptionReminder` - Renewal reminders

### Email Addresses
- `admin@aivedha.ai` - Primary sender
- `noreply@aivedha.ai` - Transactional emails
- `support@aivedha.ai` - Support inquiries

## Payment Integration

**Provider**: PayPal (Global)
- Aarambh Plan: Free on First Signin (3 credits for 3 Months Auto reset)
- Raksha Plan: $25.00 USD/month (10 credits)
- Suraksha Plan: $50.00 USD/month (30 credits)
- Vajra Plan: $150.00 USD/month (100 credits)
- Chakra Plan: $300.00 USD/month (500 credits)
- Coverage: 195+ countries (USD only)

## DNS (Cloudflare)
Zone ID: `29f899bb5c87c101afc7ec5158e92265`
- `aivedha.ai` → CloudFront
- `www.aivedha.ai` → CloudFront
- `api.aivedha.ai` → API Gateway

## Deployment Commands

```bash
# Build and deploy frontend
npm run build
aws s3 sync dist s3://aivedha-ai-website --delete
aws cloudfront create-invalidation --distribution-id EDCUM1WH3G69U --paths "/*"
```

## CRITICAL: API Endpoint Mapping (DO NOT CHANGE)

### Credit Pack Purchase
- **CORRECT**: `/paypal/credits` → `paypal-handler` Lambda → Creates PayPal order, returns `hostedPageUrl`
- **WRONG**: `/credits/purchase` → `subscription-manager` Lambda → Only returns redirect URL, NOT PayPal checkout

### Subscription Purchase
- **CORRECT**: `/subscription/checkout` → `subscription-manager` Lambda → Calls PayPal to create subscription

Bug History:
- 2025-12-23: Fixed credit purchase from `/credits/purchase` to `/paypal/credits`
