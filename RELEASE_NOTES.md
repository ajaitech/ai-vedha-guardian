# Release Notes

## v2.5.0 - Initial Production Release (December 25, 2025)

### Overview

AiVedha Guardian is an AI-powered website security audit platform that provides comprehensive vulnerability scanning, security analysis, and compliance certification for websites worldwide.

**Publisher:** Aivibe Software Services Pvt Ltd
**Contact:** admin@aivibe.in
**Website:** https://aivedha.ai

---

### Features

#### Security Scanning
- **Comprehensive Vulnerability Detection** - Scans for OWASP Top 10 vulnerabilities including XSS, SQL Injection, CSRF, and more
- **SSL/TLS Analysis** - Certificate validation, protocol version checks, cipher suite analysis
- **Security Headers Audit** - CSP, HSTS, X-Frame-Options, X-Content-Type-Options validation
- **Server Fingerprinting** - Technology stack identification and version detection
- **WHOIS Intelligence** - Domain registration and ownership verification

#### AI-Powered Analysis
- **Risk Scoring** - AI-driven vulnerability prioritization with confidence levels
- **Threat Classification** - Automated categorization using CWE/CVE taxonomies
- **Remediation Suggestions** - Context-aware fix recommendations
- **False Positive Reduction** - ML-based validation to minimize noise

#### Reporting & Certification
- **PDF Report Generation** - Detailed security audit reports with executive summary
- **Security Certificates** - Verifiable certificates with unique certificate numbers
- **Public Verification** - Certificate lookup at https://aivedha.ai/certificate/{number}
- **Badge Integration** - Embeddable security badges for websites

#### GitHub Integration
- **GitHub Actions Support** - Native CI/CD integration for automated security audits
- **Marketplace Installation** - One-click installation from GitHub Marketplace
- **Auto API Key Generation** - Seamless onboarding with automatic credential provisioning
- **Multi-Repository Support** - Single API key works across unlimited repositories
- **Webhook Integration** - Real-time notifications on scan completion

#### User Management
- **Social Authentication** - GitHub, Google, and Apple Sign-In support
- **Credit-Based System** - Flexible usage with credit packs
- **Subscription Plans** - Monthly plans from Aarambh (Free) to Chakra (Enterprise)
- **Team Management** - Multi-user support with role-based access

---

### Subscription Plans

| Plan | Price (USD) | Credits/Month | Features |
|------|-------------|---------------|----------|
| **Aarambh** | Free | 3 | Basic scanning, Email reports |
| **Raksha** | $25/month | 10 | Full scanning, PDF reports, API access |
| **Suraksha** | $50/month | 30 | Priority scanning, Certificates |
| **Vajra** | $150/month | 100 | Dedicated support, Custom branding |
| **Chakra** | $300/month | 500 | Enterprise features, SLA guarantee |

---

### Technical Specifications

#### Infrastructure
- **Cloud Provider:** Amazon Web Services (AWS)
- **Region:** us-east-1 (N. Virginia)
- **Architecture:** Serverless (AWS Lambda)
- **Database:** Amazon DynamoDB
- **CDN:** Amazon CloudFront
- **Email:** Amazon SES

#### Security
- **Encryption:** TLS 1.3 (transit), AES-256 (rest)
- **Authentication:** OAuth 2.0, JWT, API Keys
- **Compliance:** GDPR, CCPA, SOC 2, ISO 27001

#### API
- **Base URL:** https://api.aivedha.ai/api
- **Authentication:** Bearer token or X-API-Key header
- **Rate Limit:** 100 requests/minute
- **Response Format:** JSON

---

### GitHub Actions Integration

```yaml
name: Security Audit
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run AiVedha Security Audit
        uses: aivedha/security-audit-action@v1
        with:
          api-key: ${{ secrets.AIVEDHA_API_KEY }}
          target-url: 'https://your-website.com'
          fail-on-critical: true
```

---

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit/start` | POST | Start a new security audit |
| `/api/audit/status/{id}` | GET | Check audit status |
| `/api/audit/results/{id}` | GET | Get audit results |
| `/api/certificate/{number}` | GET | Retrieve certificate |
| `/api/api-keys/create` | POST | Generate API key |
| `/api/api-keys/list` | GET | List user's API keys |
| `/api/api-keys/revoke` | POST | Revoke an API key |
| `/api/health` | GET | Service health check |

---

### Known Limitations

- Maximum scan depth: 100 pages per audit
- Scan timeout: 5 minutes per website
- File size limit: 10MB for uploaded assets
- API rate limit: 100 requests per minute
- Concurrent scans: 3 per user (free), 10 per user (paid)

---

### Support

- **Documentation:** https://aivedha.ai/faq
- **Email Support:** support@aivedha.ai
- **Legal Inquiries:** admin@aivibe.in
- **GitHub Issues:** https://github.com/aivibe-org/aivedha-guard/issues

---

### License

This software is proprietary and owned by Aivibe Software Services Pvt Ltd.
All rights reserved. See [LICENSE](LICENSE) for details.

---

### Changelog

#### v2.5.0 (2025-12-25)
- Initial production release
- GitHub Marketplace integration
- Auto API key generation for marketplace installs
- 5 subscription tiers (Aarambh, Raksha, Suraksha, Vajra, Chakra)
- PayPal payment integration (195+ countries)
- PDF report generation with ReportLab
- Security certificate issuance
- GitHub Actions workflow support
- OAuth authentication (GitHub, Google, Apple)
- AWS serverless infrastructure
- GDPR and CCPA compliance
- EU AI Act compliance (Articles 6, 8-17)

---

*Copyright © 2025 Aivibe Software Services Pvt Ltd. All rights reserved.*
