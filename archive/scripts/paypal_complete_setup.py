#!/usr/bin/env python3
"""
AiVedha Guard - Complete PayPal Configuration Script
Cleans up existing resources and creates fresh setup with all features:
- Subscription plans (USD)
- Add-ons
- Coupons/Discounts
- Invoice/Billing management
- Auto-debit and reminders
- Global payment support
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta
import time

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# PayPal API Configuration
PAYPAL_CLIENT_ID = "AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk"
PAYPAL_CLIENT_SECRET = "EBWJ9a_u8J3k90PR7zoFNxxHpkJCDRN0d2f-6FRKYaUsAy1WTkinIdwceJsf5uV02550qAtIS97B2Mgs"
PAYPAL_API_BASE = "https://api-m.paypal.com"
WEBHOOK_URL = "https://api.aivedha.ai/api/paypal/webhook"

# Naming convention
PRODUCT_PREFIX = "aivedha-guard-"
PLAN_PREFIX = "aivedha-guard-"

# Business information
BUSINESS_NAME = "Aivibe Software Services Pvt Ltd"
BUSINESS_EMAIL = "payments@aivibe.in"

# Subscription Plans Configuration (USD - Global pricing)
SUBSCRIPTION_PLANS = [
    {
        "id": "aarambh",
        "name": "Aarambh (Starter)",
        "description": "Perfect for individuals and small websites. Get 3 security audit credits monthly with basic vulnerability reports.",
        "monthly_price": "10.00",
        "yearly_price": "100.00",  # 2 months free
        "credits_monthly": 3,
        "credits_yearly": 36,
        "features": [
            "3 Security Audits per month",
            "Basic Vulnerability Reports",
            "SSL Certificate Analysis",
            "Security Headers Check",
            "Email Support",
            "Audit Certificates"
        ]
    },
    {
        "id": "raksha",
        "name": "Raksha (Protection)",
        "description": "Ideal for growing businesses. 10 credits monthly with AI-powered analysis and priority support.",
        "monthly_price": "25.00",
        "yearly_price": "250.00",
        "credits_monthly": 10,
        "credits_yearly": 120,
        "features": [
            "10 Security Audits per month",
            "AI-Powered Vulnerability Analysis",
            "OWASP Top 10 Coverage",
            "PDF Security Reports",
            "Priority Email Support",
            "API Security Testing",
            "Cookie & Session Analysis"
        ]
    },
    {
        "id": "suraksha",
        "name": "Suraksha (Professional)",
        "description": "For professional teams. 30 credits with scheduled audits, API access, and advanced features.",
        "monthly_price": "50.00",
        "yearly_price": "500.00",
        "credits_monthly": 30,
        "credits_yearly": 360,
        "features": [
            "30 Security Audits per month",
            "Advanced AI Analysis with Fix Recommendations",
            "Scheduled Automated Audits",
            "API Access for Integration",
            "White-label Reports",
            "DNS & Email Security Analysis",
            "JavaScript Vulnerability Scanning",
            "24/7 Priority Support"
        ]
    },
    {
        "id": "vajra",
        "name": "Vajra (Business)",
        "description": "Enterprise-grade security. 100 credits with full API access, custom branding, and dedicated support.",
        "monthly_price": "150.00",
        "yearly_price": "1500.00",
        "credits_monthly": 100,
        "credits_yearly": 1200,
        "features": [
            "100 Security Audits per month",
            "Enterprise AI Analysis",
            "Unlimited Scheduled Audits",
            "Full API Access with Webhooks",
            "Custom Branding & White-label",
            "Compliance Reports (SOC2, GDPR)",
            "Dedicated Account Manager",
            "SLA Guarantee",
            "Phone Support"
        ]
    },
    {
        "id": "chakra",
        "name": "Chakra (Enterprise)",
        "description": "Unlimited everything. Perfect for enterprises, agencies, and security teams.",
        "monthly_price": "300.00",
        "yearly_price": "3000.00",
        "credits_monthly": -1,  # Unlimited
        "credits_yearly": -1,
        "features": [
            "Unlimited Security Audits",
            "Premium AI Analysis with Custom Models",
            "Unlimited Scheduled Audits",
            "Enterprise API with Rate Limits",
            "Custom Integration Support",
            "On-Premise Deployment Option",
            "Custom Reporting & Dashboards",
            "Dedicated Security Consultant",
            "99.9% Uptime SLA",
            "Training & Onboarding"
        ]
    }
]

# Credit Pack Add-ons (One-time purchases)
CREDIT_ADDONS = [
    {"id": "credits-5", "name": "5 Credits Pack", "credits": 5, "price": "5.00", "description": "Add 5 security audit credits to your account"},
    {"id": "credits-10", "name": "10 Credits Pack", "credits": 10, "price": "9.00", "description": "Add 10 security audit credits (10% savings)"},
    {"id": "credits-25", "name": "25 Credits Pack", "credits": 25, "price": "20.00", "description": "Add 25 security audit credits (20% savings)"},
    {"id": "credits-50", "name": "50 Credits Pack", "credits": 50, "price": "35.00", "description": "Add 50 security audit credits (30% savings)"},
    {"id": "credits-100", "name": "100 Credits Pack", "credits": 100, "price": "60.00", "description": "Add 100 security audit credits (40% savings)"},
]

# Feature Add-ons
FEATURE_ADDONS = [
    {
        "id": "scheduler",
        "name": "Scheduled Audits Add-on",
        "price": "25.00",
        "billing": "MONTH",
        "description": "Enable automated scheduled security audits for your websites"
    },
    {
        "id": "whitelabel",
        "name": "White-Label Reports Add-on",
        "price": "60.00",
        "billing": "MONTH",
        "description": "Remove AiVedha branding and add your own logo to security reports"
    },
    {
        "id": "api-access",
        "name": "API Access Add-on",
        "price": "40.00",
        "billing": "MONTH",
        "description": "Full API access for custom integrations and automation"
    }
]

# Discount Coupons
COUPONS = [
    {
        "code": "WELCOME20",
        "name": "Welcome 20% Off",
        "discount_percent": 20,
        "max_uses": 1000,
        "valid_days": 90,
        "description": "20% off your first subscription"
    },
    {
        "code": "ANNUAL30",
        "name": "Annual 30% Off",
        "discount_percent": 30,
        "max_uses": 500,
        "valid_days": 60,
        "applies_to": "yearly",
        "description": "30% off annual subscriptions"
    },
    {
        "code": "STARTUP50",
        "name": "Startup Special",
        "discount_percent": 50,
        "max_uses": 100,
        "valid_days": 30,
        "description": "50% off for verified startups"
    }
]


class PayPalCompleteSetup:
    def __init__(self):
        self.access_token = None
        self.created_products = {}
        self.created_plans = {}
        self.created_webhooks = []
        self.errors = []

    def get_access_token(self):
        """Get OAuth access token from PayPal"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATING WITH PAYPAL")
        print("="*60)

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US"
            },
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data["access_token"]
            scopes = data.get("scope", "").split()
            print(f"✅ Authentication successful")
            print(f"   Token expires in: {data.get('expires_in', 0)} seconds")
            print(f"   Available scopes: {len(scopes)}")

            # Check for billing/subscription scope
            has_billing = any("billing" in s.lower() or "subscription" in s.lower() for s in scopes)
            print(f"   Billing scope: {'✅ Available' if has_billing else '❌ Missing'}")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   {response.text}")
            return False

    def get_headers(self, request_id=None):
        """Get authorization headers"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id
        return headers

    def cleanup_existing_resources(self):
        """Clean up all existing AiVedha Guard resources from PayPal"""
        print("\n" + "="*60)
        print("🧹 CLEANING UP EXISTING RESOURCES")
        print("="*60)

        # Deactivate existing plans
        print("\n📋 Deactivating existing plans...")
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/billing/plans?page_size=50",
            headers=self.get_headers()
        )

        if response.status_code == 200:
            plans = response.json().get("plans", [])
            aivedha_plans = [p for p in plans if "aivedha" in p.get("name", "").lower() or "guard" in p.get("name", "").lower()]

            print(f"   Found {len(aivedha_plans)} AiVedha-related plans")

            for plan in aivedha_plans:
                if plan.get("status") == "ACTIVE":
                    print(f"   Deactivating: {plan['id']} - {plan['name']}")
                    deactivate_response = requests.post(
                        f"{PAYPAL_API_BASE}/v1/billing/plans/{plan['id']}/deactivate",
                        headers=self.get_headers()
                    )
                    if deactivate_response.status_code == 204:
                        print(f"   ✅ Deactivated")
                    else:
                        print(f"   ⚠️  Could not deactivate: {deactivate_response.status_code}")
                    time.sleep(0.5)  # Rate limiting

        # Remove existing webhooks
        print("\n🔔 Cleaning up webhooks...")
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/notifications/webhooks",
            headers=self.get_headers()
        )

        if response.status_code == 200:
            webhooks = response.json().get("webhooks", [])
            aivedha_webhooks = [w for w in webhooks if "aivedha" in w.get("url", "").lower()]

            print(f"   Found {len(aivedha_webhooks)} AiVedha webhooks")

            for webhook in aivedha_webhooks:
                print(f"   Deleting webhook: {webhook['id']}")
                delete_response = requests.delete(
                    f"{PAYPAL_API_BASE}/v1/notifications/webhooks/{webhook['id']}",
                    headers=self.get_headers()
                )
                if delete_response.status_code == 204:
                    print(f"   ✅ Deleted")
                else:
                    print(f"   ⚠️  Could not delete: {delete_response.status_code}")

        print("\n✅ Cleanup complete")

    def create_product(self, product_id, name, description, product_type="SERVICE"):
        """Create a PayPal catalog product"""
        full_product_id = f"{PRODUCT_PREFIX}{product_id}"

        print(f"\n📦 Creating product: {name}")

        payload = {
            "id": full_product_id,
            "name": f"AiVedha Guard - {name}",
            "description": description,
            "type": product_type,
            "category": "SOFTWARE",
            "image_url": "https://aivedha.ai/logo.png",
            "home_url": "https://aivedha.ai"
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/catalogs/products",
            headers=self.get_headers(f"create-product-{product_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            json=payload
        )

        if response.status_code in [200, 201]:
            product = response.json()
            print(f"   ✅ Created: {product['id']}")
            self.created_products[product_id] = product['id']
            return product['id']
        elif response.status_code == 422:
            # Product might already exist with this ID
            print(f"   ⚠️  Product exists, using: {full_product_id}")
            self.created_products[product_id] = full_product_id
            return full_product_id
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"      {response.text[:200]}")
            self.errors.append(f"Failed to create product {name}")
            return None

    def create_subscription_plan(self, product_id, plan_config, billing_cycle="MONTH"):
        """Create a subscription plan with full features"""
        plan_id_suffix = "monthly" if billing_cycle == "MONTH" else "yearly"
        plan_name = f"{plan_config['name']} - {'Monthly' if billing_cycle == 'MONTH' else 'Yearly'}"
        price = plan_config['monthly_price'] if billing_cycle == 'MONTH' else plan_config['yearly_price']

        print(f"\n📋 Creating plan: {plan_name} (${price}/{billing_cycle.lower()})")

        # Build billing cycles
        billing_cycles = [{
            "frequency": {
                "interval_unit": billing_cycle,
                "interval_count": 1
            },
            "tenure_type": "REGULAR",
            "sequence": 1,
            "total_cycles": 0,  # Infinite
            "pricing_scheme": {
                "fixed_price": {
                    "value": price,
                    "currency_code": "USD"
                }
            }
        }]

        # Add trial period for monthly plans (7-day free trial)
        if billing_cycle == "MONTH" and plan_config['id'] in ['aarambh', 'raksha']:
            billing_cycles.insert(0, {
                "frequency": {
                    "interval_unit": "DAY",
                    "interval_count": 7
                },
                "tenure_type": "TRIAL",
                "sequence": 1,
                "total_cycles": 1,
                "pricing_scheme": {
                    "fixed_price": {
                        "value": "0",
                        "currency_code": "USD"
                    }
                }
            })
            # Adjust regular cycle sequence
            billing_cycles[1]["sequence"] = 2

        payload = {
            "product_id": product_id,
            "name": f"AiVedha Guard - {plan_name}",
            "description": plan_config['description'],
            "status": "ACTIVE",
            "billing_cycles": billing_cycles,
            "payment_preferences": {
                "auto_bill_outstanding": True,  # Auto-debit for outstanding amounts
                "setup_fee": {
                    "value": "0",
                    "currency_code": "USD"
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3  # Retry 3 times before suspending
            },
            "taxes": {
                "percentage": "0",
                "inclusive": False
            },
            "quantity_supported": False
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/plans",
            headers=self.get_headers(f"create-plan-{plan_config['id']}-{plan_id_suffix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            json=payload
        )

        if response.status_code in [200, 201]:
            plan = response.json()
            plan_key = f"{plan_config['id']}_{plan_id_suffix}"
            self.created_plans[plan_key] = {
                "id": plan["id"],
                "name": plan_name,
                "price": price,
                "credits": plan_config['credits_monthly'] if billing_cycle == 'MONTH' else plan_config['credits_yearly'],
                "billing_cycle": billing_cycle
            }
            print(f"   ✅ Created: {plan['id']}")
            return plan["id"]
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"      {response.text[:200]}")
            self.errors.append(f"Failed to create plan {plan_name}")
            return None

    def create_addon_plan(self, product_id, addon_config):
        """Create an add-on subscription plan"""
        print(f"\n➕ Creating add-on: {addon_config['name']}")

        billing_cycle = addon_config.get('billing', 'MONTH')

        payload = {
            "product_id": product_id,
            "name": f"AiVedha Guard - {addon_config['name']}",
            "description": addon_config['description'],
            "status": "ACTIVE",
            "billing_cycles": [{
                "frequency": {
                    "interval_unit": billing_cycle,
                    "interval_count": 1
                },
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,
                "pricing_scheme": {
                    "fixed_price": {
                        "value": addon_config['price'],
                        "currency_code": "USD"
                    }
                }
            }],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {"value": "0", "currency_code": "USD"},
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            }
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/plans",
            headers=self.get_headers(f"create-addon-{addon_config['id']}-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            json=payload
        )

        if response.status_code in [200, 201]:
            plan = response.json()
            self.created_plans[f"addon_{addon_config['id']}"] = {
                "id": plan["id"],
                "name": addon_config['name'],
                "price": addon_config['price'],
                "type": "addon"
            }
            print(f"   ✅ Created: {plan['id']}")
            return plan["id"]
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return None

    def setup_webhook(self):
        """Configure comprehensive webhook for all subscription events"""
        print("\n" + "="*60)
        print("🔔 CONFIGURING WEBHOOKS")
        print("="*60)

        # Comprehensive list of events for full billing management
        webhook_events = [
            # Subscription lifecycle
            {"name": "BILLING.SUBSCRIPTION.CREATED"},
            {"name": "BILLING.SUBSCRIPTION.ACTIVATED"},
            {"name": "BILLING.SUBSCRIPTION.UPDATED"},
            {"name": "BILLING.SUBSCRIPTION.EXPIRED"},
            {"name": "BILLING.SUBSCRIPTION.CANCELLED"},
            {"name": "BILLING.SUBSCRIPTION.SUSPENDED"},
            {"name": "BILLING.SUBSCRIPTION.RE-ACTIVATED"},

            # Payment events
            {"name": "BILLING.SUBSCRIPTION.PAYMENT.FAILED"},
            {"name": "PAYMENT.SALE.COMPLETED"},
            {"name": "PAYMENT.SALE.REFUNDED"},
            {"name": "PAYMENT.SALE.REVERSED"},
            {"name": "PAYMENT.CAPTURE.COMPLETED"},
            {"name": "PAYMENT.CAPTURE.DENIED"},
            {"name": "PAYMENT.CAPTURE.REFUNDED"},

            # Checkout events
            {"name": "CHECKOUT.ORDER.APPROVED"},
            {"name": "CHECKOUT.ORDER.COMPLETED"},
            {"name": "CHECKOUT.ORDER.SAVED"},

            # Plan updates
            {"name": "BILLING.PLAN.CREATED"},
            {"name": "BILLING.PLAN.UPDATED"},
            {"name": "BILLING.PLAN.ACTIVATED"},
            {"name": "BILLING.PLAN.DEACTIVATED"},

            # Dispute events
            {"name": "CUSTOMER.DISPUTE.CREATED"},
            {"name": "CUSTOMER.DISPUTE.RESOLVED"},

            # Invoicing
            {"name": "INVOICING.INVOICE.CREATED"},
            {"name": "INVOICING.INVOICE.PAID"},
            {"name": "INVOICING.INVOICE.CANCELLED"}
        ]

        payload = {
            "url": WEBHOOK_URL,
            "event_types": webhook_events
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/notifications/webhooks",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            webhook = response.json()
            print(f"✅ Webhook created: {webhook['id']}")
            print(f"   URL: {WEBHOOK_URL}")
            print(f"   Events: {len(webhook_events)} event types")
            self.created_webhooks.append(webhook['id'])
            return webhook['id']
        else:
            print(f"❌ Failed to create webhook: {response.status_code}")
            print(f"   {response.text[:200]}")
            return None

    def export_configuration(self):
        """Export complete configuration for Lambda and frontend"""
        print("\n" + "="*60)
        print("📄 EXPORTING CONFIGURATION")
        print("="*60)

        config = {
            "generated_at": datetime.now().isoformat(),
            "paypal_mode": "live",
            "currency": "USD",
            "webhook_url": WEBHOOK_URL,
            "webhook_ids": self.created_webhooks,
            "products": self.created_products,
            "subscription_plans": {},
            "addon_plans": {},
            "credit_packs": CREDIT_ADDONS,
            "coupons": COUPONS,
            "business": {
                "name": BUSINESS_NAME,
                "email": BUSINESS_EMAIL
            }
        }

        # Separate subscription plans and addon plans
        for key, plan in self.created_plans.items():
            if key.startswith("addon_"):
                config["addon_plans"][key.replace("addon_", "")] = plan
            else:
                config["subscription_plans"][key] = plan

        # Save to file
        config_path = os.path.join(os.path.dirname(__file__), "..", "paypal_config.json")
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        print(f"✅ Configuration saved to paypal_config.json")
        print("\n" + json.dumps(config, indent=2))

        return config

    def run_complete_setup(self):
        """Run the complete PayPal setup from scratch"""
        print("\n" + "="*60)
        print("🚀 AIVEDHA GUARD - COMPLETE PAYPAL SETUP")
        print("="*60)
        print(f"   Mode: LIVE")
        print(f"   Currency: USD")
        print(f"   Business: {BUSINESS_NAME}")
        print("="*60)

        # Step 1: Authenticate
        if not self.get_access_token():
            print("\n❌ Setup aborted: Authentication failed")
            return False

        # Step 2: Clean up existing resources
        self.cleanup_existing_resources()

        # Step 3: Create main subscription product
        print("\n" + "="*60)
        print("📦 CREATING PRODUCTS")
        print("="*60)

        subscription_product_id = self.create_product(
            "subscription",
            "Security Audit Subscription",
            "AiVedha Guard AI-powered security audit subscription service for websites and applications"
        )

        if not subscription_product_id:
            print("\n❌ Setup aborted: Failed to create subscription product")
            return False

        # Create add-ons product
        addons_product_id = self.create_product(
            "addons",
            "Add-ons & Credits",
            "Additional features and credit packs for AiVedha Guard security audits"
        )

        # Step 4: Create subscription plans
        print("\n" + "="*60)
        print("📋 CREATING SUBSCRIPTION PLANS")
        print("="*60)

        for plan_config in SUBSCRIPTION_PLANS:
            # Create monthly plan
            self.create_subscription_plan(subscription_product_id, plan_config, "MONTH")
            time.sleep(0.5)  # Rate limiting

            # Create yearly plan
            self.create_subscription_plan(subscription_product_id, plan_config, "YEAR")
            time.sleep(0.5)

        # Step 5: Create feature add-ons
        print("\n" + "="*60)
        print("➕ CREATING FEATURE ADD-ONS")
        print("="*60)

        for addon in FEATURE_ADDONS:
            self.create_addon_plan(addons_product_id or subscription_product_id, addon)
            time.sleep(0.5)

        # Step 6: Setup webhooks
        self.setup_webhook()

        # Step 7: Export configuration
        config = self.export_configuration()

        # Summary
        print("\n" + "="*60)
        print("✅ PAYPAL SETUP COMPLETE")
        print("="*60)
        print(f"   Products created: {len(self.created_products)}")
        print(f"   Plans created: {len(self.created_plans)}")
        print(f"   Webhooks configured: {len(self.created_webhooks)}")

        if self.errors:
            print(f"\n⚠️  Errors encountered: {len(self.errors)}")
            for error in self.errors:
                print(f"   - {error}")

        print("\n" + "="*60)
        print("📝 NEXT STEPS")
        print("="*60)
        print("1. Update Lambda environment variables with new plan IDs")
        print("2. Deploy PayPal handler Lambda function")
        print("3. Configure API Gateway routes")
        print("4. Update frontend with PayPal SDK")
        print("5. Test subscription flow end-to-end")
        print("="*60)

        return True


if __name__ == "__main__":
    setup = PayPalCompleteSetup()

    if len(sys.argv) > 1 and sys.argv[1] == "--dry-run":
        print("DRY RUN MODE - No changes will be made")
        setup.get_access_token()
        print("\nWould create:")
        print(f"  - 1 subscription product")
        print(f"  - 1 add-ons product")
        print(f"  - {len(SUBSCRIPTION_PLANS) * 2} subscription plans")
        print(f"  - {len(FEATURE_ADDONS)} add-on plans")
        print(f"  - 1 webhook endpoint")
    else:
        setup.run_complete_setup()
