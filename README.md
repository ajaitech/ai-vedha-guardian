<p align="center">
  <img src="public/aivibe/f3b0b32d-8f8e-4951-96d3-b02a7658a887.png" alt="AiVedha Guard Logo" width="200" height="200"/>
</p>

<h1 align="center">AiVedha Guard</h1>

<p align="center">
  <strong>AI-Powered Enterprise Website Security Audit Platform</strong>
</p>

<p align="center">
  <a href="https://aivedha.ai">Live Platform</a> •
  <a href="#features">Features</a> •
  <a href="#security-modules">21 Security Modules</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#cicd-integration">CI/CD Integration</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.5.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License"/>
  <img src="https://img.shields.io/badge/status-Production-green.svg" alt="Status"/>
  <img src="https://img.shields.io/badge/coverage-178%2B%20checks-purple.svg" alt="Coverage"/>
</p>

---

## Overview

**AiVedha Guard** is an enterprise-grade AI-powered security audit platform that performs comprehensive vulnerability assessments across **21 security modules** with **178+ individual security checks**. Built for startups, enterprises, and security professionals who need actionable security insights with AI-generated remediation code.

---

## Ownership & Legal

| | |
|---|---|
| **Founder & Owner** | Aravind Jayamohan |
| **Parent Company** | Aivibe Software Services Pvt Ltd |
| **Technology Partner** | AJAIR Tech Mobility LLP |
| **Brand Trademark** | AiVedha™ - Copyright © 2024 Aivibe Software Services Pvt Ltd |
| **Repository** | `github.com/aivibe-org/aivedha-guard` |

---

## Features

### Core Capabilities

- **21 Security Modules** - Comprehensive coverage from OWASP to infrastructure
- **178+ Security Checks** - Deep vulnerability analysis
- **AI-Powered Remediation** - Google Gemini generates copy-paste code fixes
- **Real-time Scanning** - Live progress with stage-by-stage updates
- **PDF Reports** - Professional audit reports for stakeholders
- **Security Certificates** - Verifiable compliance badges
- **Continuous Monitoring** - Scheduled recurring audits
- **Multi-language Support** - 22+ languages

### Payment & Billing

| Feature | Description |
|---------|-------------|
| **PayPal Integration** | Global payments in 200+ countries |
| **Subscription Plans** | Monthly/Annual billing cycles |
| **Credit System** | Pay-per-audit flexibility |
| **Auto-Renewal** | Seamless subscription management |
| **Invoice Generation** | Automated PDF invoices |

### Add-ons & Benefits

| Add-on | Benefit |
|--------|---------|
| **White Label** | Custom branding for agencies |
| **Scheduled Audits** | Automated recurring scans |
| **Priority Support** | 24/7 dedicated assistance |
| **API Access** | CI/CD pipeline integration |
| **Team Seats** | Multi-user organization accounts |

---

## Security Modules

AiVedha Guard performs **178+ security checks** across **21 comprehensive modules**:

| Module | Checks | Module | Checks | Module | Checks |
|--------|--------|--------|--------|--------|--------|
| DNS Security | 12 | SSL/TLS Analysis | 15 | HTTP Headers | 18 |
| Security Headers | 14 | Content Security | 11 | Tech Fingerprint | 16 |
| CVE Correlation | 20 | Sensitive Files | 80+ | Form Security | 8 |
| JavaScript Audit | 12 | API Security | 10 | Cookie Security | 9 |
| Robots.txt | 5 | Sitemap Audit | 4 | CORS Analysis | 6 |
| Subdomain Enum | 8 | Port Scanning | 15 | CMS Detection | 7 |
| WAF Detection | 5 | CDN Analysis | 4 | Performance | 6 |

---

## API Information

### Base URLs

| Environment | URL |
|-------------|-----|
| Production API | `https://api.aivedha.ai/api` |
| Production Web | `https://aivedha.ai` |

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/audit/start` | POST | Initiate security audit |
| `/audit/status/{id}` | GET | Check audit progress |
| `/certificate/{number}` | GET | Retrieve certificate |
| `/subscription/activate` | POST | Activate subscription |
| `/paypal/credits` | POST | Purchase credits |

> **Note**: API keys are generated per-user via the dashboard. Never commit keys to version control.

---

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/aivibe-org/aivedha-guard.git

# Navigate to project
cd aivedha-guard

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build & Deploy

```bash
# Production build
npm run build

# Deploy to AWS S3 + CloudFront
aws s3 sync dist s3://aivedha-ai-website --delete
aws cloudfront create-invalidation --distribution-id EDCUM1WH3G69U --paths "/*"
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/security-audit.yml`:

```yaml
name: AiVedha Security Audit

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger AiVedha Audit
        run: |
          curl -X POST https://api.aivedha.ai/api/audit/start \
            -H "Authorization: Bearer ${{ secrets.AIVEDHA_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"url": "${{ vars.TARGET_URL }}", "userId": "${{ vars.USER_EMAIL }}"}'
```

### Setup Steps

1. **Generate API Key**: Dashboard → Profile → API Keys → Create
2. **Add GitHub Secret**: Repository → Settings → Secrets → `AIVEDHA_API_KEY`
3. **Configure Variables**: Repository → Settings → Variables → `TARGET_URL`, `USER_EMAIL`
4. **Enable Workflow**: Actions → Enable GitHub Actions

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | AWS Lambda (Python), API Gateway, DynamoDB |
| **AI Engine** | Google Gemini Pro |
| **Payments** | PayPal SDK |
| **Auth** | AWS Cognito |
| **Hosting** | AWS S3, CloudFront, Route 53 |
| **Email** | AWS SES |

---

## Release History

| Version | Date | Release Notes |
|---------|------|---------------|
| **v2.5.0** | Dec 2024 | PayPal global payments, subscription management, cancel/auto-renew features |
| **v2.4.0** | Nov 2024 | 21 security modules, 178+ checks, AI remediation with Gemini integration |
| **v2.3.0** | Oct 2024 | Dashboard progress tracking, real-time audit status, PDF report generation |

---

## Project Structure

```
aivedha-guard/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── lib/            # API clients & utilities
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React contexts
│   └── constants/      # Configuration constants
├── aws-lambda/         # Backend Lambda functions
│   ├── security-audit-crawler/
│   ├── paypal-handler/
│   ├── subscription-manager/
│   └── user-auth/
├── public/             # Static assets
└── docs/               # Documentation
```

---

## License

**PROPRIETARY LICENSE**

Copyright © 2024 Aivibe Software Services Pvt Ltd. All Rights Reserved.

This software and associated documentation files (the "Software") are the exclusive property of Aivibe Software Services Pvt Ltd. Unauthorized copying, modification, distribution, or use of this Software, in whole or in part, is strictly prohibited.

### Restrictions

1. **No Copying**: You may not copy, reproduce, or duplicate any part of this Software.
2. **No Modification**: You may not modify, adapt, or create derivative works.
3. **No Distribution**: You may not distribute, sublicense, or transfer this Software.
4. **No Reverse Engineering**: You may not decompile, disassemble, or reverse engineer.
5. **No Commercial Use**: You may not use this Software for commercial purposes without written consent.

### Intellectual Property

- All algorithms, security scanning methodologies, and AI integration techniques are proprietary.
- The AiVedha™ brand, logo, and associated trademarks are protected.
- Patent pending on security audit orchestration methods.

### Consent Requirements

For licensing inquiries, partnership opportunities, or usage permissions, contact:

- **Email**: legal@aivibe.in
- **Business**: business@aivedha.ai

Violation of these terms may result in legal action and damages.

---

<p align="center">
  <strong>Built with security in mind by Aivibe Software Services Pvt Ltd</strong>
</p>

<p align="center">
  <a href="https://aivedha.ai">aivedha.ai</a> •
  <a href="mailto:support@aivedha.ai">support@aivedha.ai</a>
</p>
