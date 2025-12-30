# AiVedha Guard - GitHub App Integration

This directory contains configuration and documentation for integrating AiVedha Guard with GitHub Marketplace.

## Overview

AiVedha Guard provides automated security audits for web applications through GitHub Actions. After deployment, it automatically scans your website for vulnerabilities.

## Installation

### For Users

1. Install from GitHub Marketplace: [AiVedha Guard](https://github.com/marketplace/aivedha-guard)
2. Generate an API key from your [AiVedha Dashboard](https://aivedha.ai/dashboard/subscription)
3. Add the API key as a GitHub secret: `AIVEDHA_API_KEY`
4. Copy the workflow file to your repository

### Quick Start

```yaml
# .github/workflows/aivedha-security-audit.yml
name: AiVedha Security Audit

on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]
    branches: [main]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: Run Security Audit
        uses: aivedha/security-audit-action@v1
        with:
          api-key: ${{ secrets.AIVEDHA_API_KEY }}
          target-url: https://your-site.com
```

## Features

- **Post-Deployment Scanning**: Automatically scans after successful deployments
- **URL Auto-Detection**: Detects deployment URLs from Vercel, Netlify, GitHub Pages
- **URL Validation**: Validates URLs before scanning to prevent wasted credits
- **Non-Blocking**: Doesn't fail your deployment on scan issues
- **Email Alerts**: Sends notifications for scan results and failures
- **Detailed Reports**: Security reports with vulnerability details

## API Key Management

API keys are managed through the AiVedha dashboard:

1. Go to [AiVedha Dashboard](https://aivedha.ai/dashboard/subscription)
2. Navigate to "API Keys" section
3. Click "Generate New API Key"
4. Set validity period (7, 12, 15, 30, 60, or 90 days)
5. Copy the key (shown only once)
6. Add as GitHub secret

### API Key Features

- **Free for Paid Plans**: API keys are free for all paid subscription plans
- **Configurable Validity**: Choose how long the key remains valid
- **Automatic Disable**: Keys are disabled when subscription is cancelled
- **1 Credit per Audit**: Each CI/CD audit uses 1 credit from your plan

## Pricing

API access is included with all paid AiVedha plans:

| Plan | Monthly Price | Credits | API Access |
|------|---------------|---------|------------|
| Aarambh | $10 | 3 | Included |
| Raksha | $25 | 10 | Included |
| Suraksha | $50 | 30 | Included |
| Vajra | $150 | 100 | Included |
| Chakra | $300 | Unlimited | Included |

## URL Validation

Before running an audit, the system validates the target URL:

- **Success (HTTP 200-299)**: Audit proceeds normally
- **Error Pages (4xx, 5xx)**: Audit is skipped, email notification sent
- **Connection Errors**: Audit is skipped, email notification sent

This prevents wasting credits on error pages or unavailable sites.

## Support

- Documentation: https://aivedha.ai/docs
- Support: support@aivedha.ai
- Issues: https://github.com/aivedha/security-audit-action/issues

## Copyright

Copyright 2024-2025 AiVibe Software Services Pvt Ltd
