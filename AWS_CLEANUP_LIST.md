# AWS Resource Cleanup List

**Document Version**: 1.0
**Date**: 2025-12-28
**Status**: PENDING APPROVAL

---

## Instructions

1. Review each item in the tables below
2. Update the "Approval" column with:
   - **YES** - Approve deletion
   - **NO** - Keep this resource
   - **HOLD** - Need more information
3. Return this document for cleanup execution

---

## Legend

| Symbol | Meaning |
|--------|---------|
| KEEP | Essential for AiVedha Guardian operations |
| REMOVE | Recommended for deletion |
| REVIEW | Needs evaluation |

---

## 1. ACM Certificates (us-east-1)

| Certificate ARN | Domain | Status | Recommendation | Reason | Approval |
|-----------------|--------|--------|----------------|--------|----------|
| arn:aws:acm:us-east-1:...10e3a56d... | aicippy.com | ISSUED | REVIEW | Not aivedha related | |
| arn:aws:acm:us-east-1:...8cb3ed27... | admin.aicippy.in | FAILED | REMOVE | Failed validation | |
| arn:aws:acm:us-east-1:...f1058a28... | admin.aicippy.info | FAILED | REMOVE | Failed validation | |
| arn:aws:acm:us-east-1:...9ed52ba5... | aicippy.com | ISSUED | REVIEW | Duplicate? Not aivedha | |
| arn:aws:acm:us-east-1:...0c0d9965... | aivedha.ai | ISSUED | **KEEP** | Primary AiVedha Guardian cert | |

---

## 2. ACM Certificates (ap-south-1)

| Certificate ARN | Domain | Status | Recommendation | Reason | Approval |
|-----------------|--------|--------|----------------|--------|----------|
| arn:aws:acm:ap-south-1:...3b1f6d02... | www.aivedha.xyz | ISSUED | REMOVE | Old domain, not in use | |
| arn:aws:acm:ap-south-1:...479e9e02... | api.vibebuddy.com | ISSUED | REVIEW | Not aivedha related | |
| arn:aws:acm:ap-south-1:...53e3ee09... | api.aivedha.com | ISSUED | REVIEW | Old aivedha.com domain | |
| arn:aws:acm:ap-south-1:...b8139c22... | *.aivedha.com | ISSUED | REVIEW | Old aivedha.com domain | |
| arn:aws:acm:ap-south-1:...85bfeb61... | app.aivedha.com | ISSUED | REVIEW | Old aivedha.com domain | |
| arn:aws:acm:ap-south-1:...2f7fbb3d... | api.aivibe.in | ISSUED | REVIEW | Old aivibe domain | |
| arn:aws:acm:ap-south-1:...1e9806a1... | *.aivedha.com | ISSUED | REMOVE | Duplicate wildcard | |
| arn:aws:acm:ap-south-1:...276e666f... | *.aivedha.com | ISSUED | REMOVE | Duplicate wildcard | |
| arn:aws:acm:ap-south-1:...9b86c63e... | vibemycar.com | ISSUED | REVIEW | Not aivedha related | |
| arn:aws:acm:ap-south-1:...a2a88128... | *.aicippy.com | ISSUED | REVIEW | Not aivedha related | |

**Note**: Need to request new `*.aivedha.ai` certificate in ap-south-1 for India API Gateway.

---

## 3. API Gateways (ap-south-1)

| API ID | Name | Created | Recommendation | Reason | Approval |
|--------|------|---------|----------------|--------|----------|
| 03gpljkh36 | AiVedhaBooksAPI | 2025-06-26 | REVIEW | Not Guardian related | |
| 3lnir445c9 | aivedha-prod-tenant-api | 2025-08-02 | REVIEW | Old tenant system | |
| 76vw9xir9f | VibeBuddyApi | 2025-05-06 | REVIEW | Not aivedha related | |
| 8blotdyzb6 | aivedha-api | 2025-05-31 | REVIEW | Old API - duplicate? | |
| dczko55lyl | pre-aivedha-api | 2025-09-22 | REMOVE | Pre-production/test | |
| dvd4icheq1 | AivedhaAPI | 2025-06-22 | REVIEW | Old API - duplicate? | |
| f2n649kl70 | VibeBuddyApi | 2025-05-07 | REMOVE | Duplicate VibeBuddy | |
| **frxi92ysq0** | **AiVedha Guardian API India** | **2025-12-28** | **KEEP** | **Active India endpoint** | |
| ildsmevs3i | aivedha-api-aivedha-main | 2025-06-27 | REVIEW | Old branch API | |
| qxn4g8f0h8 | aivedha-api | 2025-05-31 | REMOVE | Duplicate | |
| ul0sfo8531 | VibeMyCar-Production-API | 2025-09-30 | REVIEW | Not aivedha related | |
| vhrhfvhgz1 | aivedha-api | 2025-05-31 | REMOVE | Duplicate | |
| w7kj9z5tpi | AiVedha Multi-Tenant API | 2025-07-05 | REVIEW | Old multi-tenant | |
| xrbd7r1w80 | aivedha-api | 2025-05-31 | REMOVE | Duplicate | |
| ys5no1owzj | production-vibemycar-whatsapp-api | 2025-09-30 | REVIEW | Not aivedha related | |

---

## 4. API Gateways (us-east-1)

| API ID | Name | Created | Recommendation | Reason | Approval |
|--------|------|---------|----------------|--------|----------|
| 8dil6usj71 | vibe-buddy-api | 2025-05-04 | REVIEW | Not aivedha related | |
| **btxmpjub05** | **AiVedha-Guardian-API** | **2025-12-01** | **KEEP** | **Primary production API** | |
| ur1sme4qh3 | admin-api | 2025-12-14 | **KEEP** | Admin panel API | |

---

## 5. Lambda Functions (ap-south-1)

| Function Name | Runtime | Last Modified | Recommendation | Reason | Approval |
|---------------|---------|---------------|----------------|--------|----------|
| aivedha-ec2-deployer | nodejs18.x | 2025-06-27 | REVIEW | Old EC2 deployment | |
| aivedha-subscription-aivedha-main | nodejs18.x | 2025-06-27 | REMOVE | Old subscription handler | |
| aivedha-invoice | nodejs18.x | 2025-05-31 | REVIEW | Old invoice system | |
| aivedha-prod-tenant-automation | python3.9 | 2025-09-21 | REVIEW | Old tenant system | |
| **aivedha-guardian-security-crawler** | **python3.11** | **2025-12-28** | **KEEP** | **Active India scanner** | |
| aivedha-auth-aivedha-main | nodejs18.x | 2025-06-27 | REMOVE | Old auth system | |
| aivedha-auth | nodejs18.x | 2025-09-21 | REVIEW | Old auth system | |
| aivedha-organisation | nodejs18.x | 2025-05-31 | REVIEW | Old org system | |
| aivedha-organisation-aivedha-main | nodejs18.x | 2025-06-27 | REMOVE | Duplicate org | |
| aivedha-reports-aivedha-main | nodejs18.x | 2025-06-27 | REMOVE | Old reports | |

---

## 6. Lambda Functions (us-east-1) - KEEP ALL

All Lambda functions in us-east-1 with prefix `aivedha-guardian-*` are actively used.

| Function Name | Status | Notes |
|---------------|--------|-------|
| aivedha-guardian-blog-manager | **KEEP** | Blog management |
| aivedha-admin-settings | **KEEP** | Admin settings |
| aivedha-guardian-secure-badge | **KEEP** | Badge generation |
| aivedha-guardian-credit-manager | **KEEP** | Credit management |
| aivedha-guardian-user-auth | **KEEP** | User authentication |
| aivedha-guardian-subscription-scheduler | **KEEP** | Subscription tasks |
| aivedha-guardian-vulnerability-scanner | **KEEP** | Vulnerability scanning |
| aivedha-guardian-scheduler | **KEEP** | Audit scheduling |
| aivedha-zoho-billing | **KEEP** | Zoho integration |
| aivedha-guardian-paypal-handler | **KEEP** | PayPal payments |
| aivedha-guardian-report-generator | **KEEP** | PDF generation |
| aivedha-guardian-email-notification | **KEEP** | Email sending |
| aivedha-guardian-subscription-manager | **KEEP** | Subscription mgmt |
| aivedha-zoho-sync | **KEEP** | Zoho sync |
| aivedha-guardian-url-validator | **KEEP** | URL validation |
| aivedha-guardian-subscription-automation | **KEEP** | Auto subscription |
| aivedha-api-key-manager | **KEEP** | API key mgmt |
| aivedha-guardian-github-auth | **KEEP** | GitHub OAuth |
| aivedha-guardian-api-key-manager | **KEEP** | API key mgmt |
| aivedha-guardian-audit-status | **KEEP** | Audit status |
| aivedha-guardian-daily-analytics | **KEEP** | Analytics |
| aivedha-paypal-handler | **KEEP** | PayPal handler |
| aivedha-support-ticket-manager | **KEEP** | Support tickets |
| aivedha-guardian-security-crawler | **KEEP** | Main scanner |
| aivedha-guardian-api-tester | **KEEP** | API testing |
| aivedha-referral-manager | **KEEP** | Referral system |
| aivedha-guardian-recaptcha-verify | **KEEP** | reCAPTCHA |

---

## 7. VPCs (us-east-1)

| VPC ID | Name | CIDR | Recommendation | Reason | Approval |
|--------|------|------|----------------|--------|----------|
| **vpc-09ee5767b5d1ed79d** | **aivedha-lambda-vpc** | **10.200.0.0/16** | **KEEP** | **Active Lambda VPC with NAT** | |

---

## 8. VPCs (ap-south-1)

| VPC ID | Name | CIDR | Default | Recommendation | Reason | Approval |
|--------|------|------|---------|----------------|--------|----------|
| vpc-088787a265679854b | (unnamed) | 10.100.0.0/16 | No | REVIEW | Unknown purpose | |
| **vpc-0bcf3d46dcc9651ce** | **vibebuddy-vpc** | **172.31.0.0/16** | **Yes** | **KEEP** | **Default VPC, used by aivedha-lambda** | |
| vpc-0eec554fc5f114e7e | aicippy-prod-master-vpc | 10.50.0.0/16 | No | REVIEW | AiCippy production | |
| vpc-0a67c73d28c847934 | eksctl-aicippy-prod-cluster/VPC | 192.168.0.0/16 | No | REVIEW | EKS cluster VPC | |
| vpc-0ba95b47731c6ccbe | VibeMyCar-Production-VPC | 10.0.0.0/16 | No | REVIEW | VibeMyCar prod | |

**Note**: Cannot delete default VPC (vpc-0bcf3d46dcc9651ce) - it's being used.

---

## 9. NAT Gateways (us-east-1)

| NAT Gateway ID | State | VPC | Subnet | Recommendation | Reason | Approval |
|----------------|-------|-----|--------|----------------|--------|----------|
| **nat-009d67115a760c94f** | **available** | **vpc-09ee5767b5d1ed79d** | **subnet-05a938f18585d1b9e** | **KEEP** | **Active for Lambda** | |

---

## 10. NAT Gateways (ap-south-1)

| NAT Gateway ID | State | VPC | Recommendation | Reason | Approval |
|----------------|-------|-----|----------------|--------|----------|
| nat-07106002d0cb6c28e | available | vpc-0eec554fc5f114e7e | REVIEW | AiCippy VPC | |
| **nat-012556d8902356301** | **available** | **vpc-0bcf3d46dcc9651ce** | **KEEP** | **Used by aivedha Lambda** | |
| nat-086afeed40b0b823b | available | vpc-0a67c73d28c847934 | REVIEW | EKS cluster NAT | |

---

## 11. Elastic IPs (us-east-1)

| Allocation ID | Public IP | Association | Recommendation | Reason | Approval |
|---------------|-----------|-------------|----------------|--------|----------|
| **eipalloc-09db554b1bf0d418b** | **44.206.201.117** | **NAT Gateway** | **KEEP** | **USA static IP for audits** | |

---

## 12. Elastic IPs (ap-south-1)

| Allocation ID | Public IP | Association | Recommendation | Reason | Approval |
|---------------|-----------|-------------|----------------|--------|----------|
| **eipalloc-0e7803db7366dead7** | **13.203.153.119** | **NAT Gateway** | **KEEP** | **India static IP for audits** | |
| eipalloc-0b3cd0b1e8004bb23 | 13.203.168.53 | EC2 i-0d8d591aee9477386 | REVIEW | EC2 instance | |
| eipalloc-03e47a8c64070be33 | 3.110.35.119 | NAT Gateway | REVIEW | Other NAT | |
| eipalloc-0ddf1c6f76cc61936 | 35.154.177.114 | NAT Gateway | REVIEW | Other NAT | |
| eipalloc-04b7e3821576e08dd | 35.154.227.123 | EC2 i-0d57849892a20ea20 | REVIEW | EC2 instance | |

---

## 13. Security Groups (us-east-1)

| Group ID | Name | VPC | Recommendation | Reason | Approval |
|----------|------|-----|----------------|--------|----------|
| **sg-0dbaf9aa4d1a2b4b9** | **aivedha-lambda-sg** | **vpc-09ee5767b5d1ed79d** | **KEEP** | **Active Lambda SG** | |
| sg-0d4890f75385afb72 | default | vpc-09ee5767b5d1ed79d | **KEEP** | Default VPC SG | |

---

## 14. Security Groups (ap-south-1) - AiVedha Related Only

| Group ID | Name | VPC | Recommendation | Reason | Approval |
|----------|------|-----|----------------|--------|----------|
| sg-07a5ea7fca14e42e5 | aivedha-books-mysql-sg | vpc-0bcf3d46dcc9651ce | REVIEW | Old books DB | |
| sg-01d987437ced211ef | aivedha-prod-ecs-... | vpc-088787a265679854b | REVIEW | Old ECS | |
| sg-0672fc0ce4a5c9d77 | aivedha-prod-redis-... | vpc-088787a265679854b | REVIEW | Old Redis | |
| sg-0fa9c181a7056c117 | aivedha-prod-alb-... | vpc-088787a265679854b | REVIEW | Old ALB | |
| **sg-0dacaffe2ba5ab49c** | **aivedha-lambda-sg-india** | **vpc-0bcf3d46dcc9651ce** | **KEEP** | **Active Lambda SG** | |

---

## 15. S3 Buckets

| Bucket Name | Recommendation | Reason | Approval |
|-------------|----------------|--------|----------|
| **aivedha-ai-website** | **KEEP** | **Frontend hosting** | |
| **aivedha-guardian-reports-us-east-1** | **KEEP** | **PDF reports storage** | |
| aivedha-prod-alb-logs-838090a2 | REVIEW | Old ALB logs | |
| aivedha-prod-backups-866f3f3cc29cd105 | REVIEW | Old backups | |
| aivedha-prod-data | REVIEW | Old data bucket | |
| aivedha-prod-dms | REVIEW | Old DMS bucket | |
| aivedha-prod-files-866f3f3cc29cd105 | REVIEW | Old files bucket | |
| aivedha-prod-logs | REVIEW | Old logs bucket | |
| aivedha-prod-uploads | REVIEW | Old uploads bucket | |
| aivedha-terraform-state-bucket | REVIEW | Terraform state | |
| aivedha-terraform-state-bucket-866f3f3cc29cd105 | REMOVE | Duplicate terraform | |
| dbtool.aivedha.com | REVIEW | Old DB tool | |

**Note**: S3 buckets are global. Using us-east-1 as primary region.

---

## 16. DynamoDB Tables (us-east-1) - KEEP ALL

All tables with prefix `aivedha-guardian-*` are actively used by the application.

| Table Name | Status |
|------------|--------|
| aivedha-guardian-addons | **KEEP** |
| aivedha-guardian-api-keys | **KEEP** |
| aivedha-guardian-audit-logs | **KEEP** |
| aivedha-guardian-audit-reports | **KEEP** |
| aivedha-guardian-blog-comments | **KEEP** |
| aivedha-guardian-blog-ratings | **KEEP** |
| aivedha-guardian-blogs | **KEEP** |
| aivedha-guardian-coupons | **KEEP** |
| aivedha-guardian-credits | **KEEP** |
| aivedha-guardian-email-logs | **KEEP** |
| aivedha-guardian-email-queue | **KEEP** |
| aivedha-guardian-github-integrations | **KEEP** |
| aivedha-guardian-idempotency | **KEEP** |
| aivedha-guardian-payments | **KEEP** |
| aivedha-guardian-paypal-events | **KEEP** |
| aivedha-guardian-plans | **KEEP** |
| aivedha-guardian-referrals | **KEEP** |
| aivedha-guardian-schedules | **KEEP** |
| aivedha-guardian-subscriptions | **KEEP** |
| aivedha-guardian-sync-log | **KEEP** |
| aivedha-guardian-threat-found | **KEEP** |
| aivedha-guardian-transactions | **KEEP** |
| aivedha-guardian-user-addons | **KEEP** |
| aivedha-guardian-users | **KEEP** |
| aivedha-guardian-whitelabel | **KEEP** |
| aivedha-invoices | REVIEW |
| aivedha-support-tickets | **KEEP** |
| aivedha-webhook-logs | REVIEW |

---

## Summary

### Resources to KEEP (Essential)

| Category | Region | Resource | ID/Name |
|----------|--------|----------|---------|
| ACM Cert | us-east-1 | aivedha.ai | 0c0d9965-e4ee-4f2f-8ea0-6123fd78e8a0 |
| API Gateway | us-east-1 | AiVedha-Guardian-API | btxmpjub05 |
| API Gateway | us-east-1 | admin-api | ur1sme4qh3 |
| API Gateway | ap-south-1 | AiVedha Guardian API India | frxi92ysq0 |
| Lambda | us-east-1 | All aivedha-guardian-* | 27 functions |
| Lambda | ap-south-1 | aivedha-guardian-security-crawler | 1 function |
| VPC | us-east-1 | aivedha-lambda-vpc | vpc-09ee5767b5d1ed79d |
| VPC | ap-south-1 | vibebuddy-vpc (default) | vpc-0bcf3d46dcc9651ce |
| NAT Gateway | us-east-1 | - | nat-009d67115a760c94f |
| NAT Gateway | ap-south-1 | - | nat-012556d8902356301 |
| Elastic IP | us-east-1 | 44.206.201.117 | eipalloc-09db554b1bf0d418b |
| Elastic IP | ap-south-1 | 13.203.153.119 | eipalloc-0e7803db7366dead7 |
| Security Group | us-east-1 | aivedha-lambda-sg | sg-0dbaf9aa4d1a2b4b9 |
| Security Group | ap-south-1 | aivedha-lambda-sg-india | sg-0dacaffe2ba5ab49c |
| S3 | global | aivedha-ai-website | - |
| S3 | global | aivedha-guardian-reports-us-east-1 | - |
| DynamoDB | us-east-1 | All aivedha-guardian-* tables | 26 tables |

### Resources Recommended for REMOVAL

| Category | Region | Resource | Reason |
|----------|--------|----------|--------|
| ACM Cert | us-east-1 | admin.aicippy.in | Failed validation |
| ACM Cert | us-east-1 | admin.aicippy.info | Failed validation |
| ACM Cert | ap-south-1 | www.aivedha.xyz | Old unused domain |
| ACM Cert | ap-south-1 | *.aivedha.com (x2) | Duplicate wildcards |
| API Gateway | ap-south-1 | pre-aivedha-api | Pre-production test |
| API Gateway | ap-south-1 | VibeBuddyApi (f2n649kl70) | Duplicate |
| API Gateway | ap-south-1 | aivedha-api (qxn4g8f0h8) | Duplicate |
| API Gateway | ap-south-1 | aivedha-api (vhrhfvhgz1) | Duplicate |
| API Gateway | ap-south-1 | aivedha-api (xrbd7r1w80) | Duplicate |
| Lambda | ap-south-1 | aivedha-subscription-aivedha-main | Old system |
| Lambda | ap-south-1 | aivedha-auth-aivedha-main | Old system |
| Lambda | ap-south-1 | aivedha-organisation-aivedha-main | Duplicate |
| Lambda | ap-south-1 | aivedha-reports-aivedha-main | Old system |
| S3 | global | aivedha-terraform-state-bucket-866f3f3cc29cd105 | Duplicate |

### Resources Requiring REVIEW

These need your input on whether they're still in use:

1. **Non-aivedha APIs/Services** (aicippy, vibebuddy, vibemycar)
2. **Old aivedha infrastructure** (ECS, tenant system, old auth)
3. **Old S3 buckets** (prod-data, prod-uploads, etc.)
4. **Old DynamoDB tables** (aivedha-invoices, aivedha-webhook-logs)

---

## Action Required

1. Fill in the "Approval" column for each item
2. Return this document
3. Cleanup will proceed only after approval

**IMPORTANT**: Resources marked KEEP are critical for AiVedha Guardian operations. Do not approve their deletion.

---

**Document Status**: AWAITING APPROVAL
