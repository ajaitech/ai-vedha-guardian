#!/usr/bin/env python3
"""
PayPal Subscription Setup Script for AiVedha Guard
Creates products, plans, and configures webhooks
"""

import requests
import json
import sys
import os
from datetime import datetime

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# PayPal API Configuration
PAYPAL_CLIENT_ID = "AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk"
PAYPAL_CLIENT_SECRET = "EBWJ9a_u8J3k90PR7zoFNxxHpkJCDRN0d2f-6FRKYaUsAy1WTkinIdwceJsf5uV02550qAtIS97B2Mgs"
PAYPAL_API_BASE = "https://api-m.paypal.com"
WEBHOOK_URL = "https://api.aivedha.ai/api/paypal/webhook"

# Plan Prefix
PLAN_PREFIX = "aivedha-guard-"

# Subscription Plans Configuration (USD)
SUBSCRIPTION_PLANS = [
    {
        "name": "Aarambh",
        "description": "Starter plan - 3 security audit credits per month",
        "price": "10.00",
        "credits": 3,
        "features": ["3 Security Audits/month", "Basic Vulnerability Reports", "Email Support", "Certificate Generation"]
    },
    {
        "name": "Raksha",
        "description": "Basic plan - 10 security audit credits per month",
        "price": "25.00",
        "credits": 10,
        "features": ["10 Security Audits/month", "Detailed AI Analysis", "Priority Email Support", "Certificate Generation", "PDF Reports"]
    },
    {
        "name": "Suraksha",
        "description": "Professional plan - 30 security audit credits per month",
        "price": "50.00",
        "credits": 30,
        "features": ["30 Security Audits/month", "Advanced AI Analysis", "Priority Support", "Scheduled Audits", "API Access", "White-label Reports"]
    },
    {
        "name": "Vajra",
        "description": "Business plan - 100 security audit credits per month",
        "price": "150.00",
        "credits": 100,
        "features": ["100 Security Audits/month", "Enterprise AI Analysis", "24/7 Priority Support", "Unlimited Scheduled Audits", "Full API Access", "Custom Branding"]
    },
    {
        "name": "Chakra",
        "description": "Enterprise plan - Unlimited security audits",
        "price": "300.00",
        "credits": -1,  # Unlimited
        "features": ["Unlimited Security Audits", "Dedicated Account Manager", "Custom Integrations", "SLA Guarantee", "On-premise Option", "Custom Reporting"]
    }
]

# Credit Packs (One-time purchases)
CREDIT_PACKS = [
    {"name": "Starter Pack", "credits": 5, "price": "5.00"},
    {"name": "Basic Pack", "credits": 10, "price": "9.00"},
    {"name": "Pro Pack", "credits": 25, "price": "20.00"},
    {"name": "Business Pack", "credits": 50, "price": "35.00"},
    {"name": "Enterprise Pack", "credits": 100, "price": "60.00"},
]


class PayPalSetup:
    def __init__(self):
        self.access_token = None
        self.products = {}
        self.plans = {}

    def get_access_token(self):
        """Get OAuth access token from PayPal"""
        print("🔐 Getting PayPal access token...")
        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US"
            },
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"}
        )

        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            print("✅ Access token obtained successfully")
            return True
        else:
            print(f"❌ Failed to get access token: {response.text}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "PayPal-Request-Id": f"{PLAN_PREFIX}{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }

    def list_existing_products(self):
        """List all existing products"""
        print("\n📦 Checking existing products...")
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/catalogs/products?page_size=20",
            headers=self.get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            print(f"   Found {len(products)} existing products")
            for p in products:
                print(f"   - {p['id']}: {p['name']}")
            return products
        else:
            print(f"   No products found or error: {response.status_code}")
            return []

    def list_existing_plans(self):
        """List all existing subscription plans"""
        print("\n📋 Checking existing plans...")
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/billing/plans?page_size=20",
            headers=self.get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            plans = data.get("plans", [])
            print(f"   Found {len(plans)} existing plans")
            for p in plans:
                print(f"   - {p['id']}: {p['name']} ({p['status']})")
            return plans
        else:
            print(f"   No plans found or error: {response.status_code}")
            return []

    def create_product(self, name, description, product_type="SERVICE"):
        """Create a PayPal catalog product"""
        product_id = f"{PLAN_PREFIX}{name.lower().replace(' ', '-')}"

        print(f"\n📦 Creating product: {product_id}")

        payload = {
            "id": product_id,
            "name": f"AiVedha Guard - {name}",
            "description": description,
            "type": product_type,
            "category": "SOFTWARE",
            "image_url": "https://aivedha.ai/logo.png",
            "home_url": "https://aivedha.ai"
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/catalogs/products",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            product = response.json()
            print(f"✅ Product created: {product['id']}")
            self.products[name] = product['id']
            return product['id']
        elif response.status_code == 422:
            # Product might already exist
            print(f"⚠️  Product may already exist, using ID: {product_id}")
            self.products[name] = product_id
            return product_id
        else:
            print(f"❌ Failed to create product: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    def create_subscription_plan(self, product_id, plan_config):
        """Create a subscription plan for a product"""
        plan_name = plan_config["name"]
        plan_id_name = f"{PLAN_PREFIX}{plan_name.lower()}-monthly"

        print(f"\n📋 Creating plan: {plan_id_name}")

        payload = {
            "product_id": product_id,
            "name": f"AiVedha Guard - {plan_name} Monthly",
            "description": plan_config["description"],
            "status": "ACTIVE",
            "billing_cycles": [
                {
                    "frequency": {
                        "interval_unit": "MONTH",
                        "interval_count": 1
                    },
                    "tenure_type": "REGULAR",
                    "sequence": 1,
                    "total_cycles": 0,  # Infinite
                    "pricing_scheme": {
                        "fixed_price": {
                            "value": plan_config["price"],
                            "currency_code": "USD"
                        }
                    }
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {
                    "value": "0",
                    "currency_code": "USD"
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            },
            "taxes": {
                "percentage": "0",
                "inclusive": False
            },
            "quantity_supported": False
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/plans",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            plan = response.json()
            print(f"✅ Plan created: {plan['id']}")
            self.plans[plan_name] = {
                "id": plan["id"],
                "product_id": product_id,
                "price": plan_config["price"],
                "credits": plan_config["credits"]
            }
            return plan["id"]
        else:
            print(f"❌ Failed to create plan: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    def create_yearly_plan(self, product_id, plan_config):
        """Create a yearly subscription plan with discount"""
        plan_name = plan_config["name"]
        monthly_price = float(plan_config["price"])
        yearly_price = str(round(monthly_price * 10, 2))  # 2 months free

        plan_id_name = f"{PLAN_PREFIX}{plan_name.lower()}-yearly"

        print(f"\n📋 Creating yearly plan: {plan_id_name} (${yearly_price}/year)")

        payload = {
            "product_id": product_id,
            "name": f"AiVedha Guard - {plan_name} Yearly (Save 17%)",
            "description": f"{plan_config['description']} - Annual billing with 2 months free",
            "status": "ACTIVE",
            "billing_cycles": [
                {
                    "frequency": {
                        "interval_unit": "YEAR",
                        "interval_count": 1
                    },
                    "tenure_type": "REGULAR",
                    "sequence": 1,
                    "total_cycles": 0,
                    "pricing_scheme": {
                        "fixed_price": {
                            "value": yearly_price,
                            "currency_code": "USD"
                        }
                    }
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {
                    "value": "0",
                    "currency_code": "USD"
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            },
            "taxes": {
                "percentage": "0",
                "inclusive": False
            }
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/billing/plans",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            plan = response.json()
            print(f"✅ Yearly plan created: {plan['id']}")
            self.plans[f"{plan_name}_yearly"] = {
                "id": plan["id"],
                "product_id": product_id,
                "price": yearly_price,
                "credits": plan_config["credits"] * 12
            }
            return plan["id"]
        else:
            print(f"❌ Failed to create yearly plan: {response.status_code}")
            return None

    def setup_webhook(self):
        """Configure PayPal webhook for subscription events"""
        print("\n🔔 Setting up webhook...")

        # First, list existing webhooks
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/notifications/webhooks",
            headers=self.get_headers()
        )

        existing_webhooks = []
        if response.status_code == 200:
            existing_webhooks = response.json().get("webhooks", [])
            for wh in existing_webhooks:
                if WEBHOOK_URL in wh.get("url", ""):
                    print(f"⚠️  Webhook already exists: {wh['id']}")
                    return wh["id"]

        # Create new webhook
        payload = {
            "url": WEBHOOK_URL,
            "event_types": [
                {"name": "BILLING.SUBSCRIPTION.ACTIVATED"},
                {"name": "BILLING.SUBSCRIPTION.CANCELLED"},
                {"name": "BILLING.SUBSCRIPTION.EXPIRED"},
                {"name": "BILLING.SUBSCRIPTION.PAYMENT.FAILED"},
                {"name": "BILLING.SUBSCRIPTION.RENEWED"},
                {"name": "BILLING.SUBSCRIPTION.SUSPENDED"},
                {"name": "BILLING.SUBSCRIPTION.UPDATED"},
                {"name": "PAYMENT.SALE.COMPLETED"},
                {"name": "PAYMENT.SALE.REFUNDED"},
                {"name": "PAYMENT.CAPTURE.COMPLETED"},
                {"name": "PAYMENT.CAPTURE.REFUNDED"},
                {"name": "CHECKOUT.ORDER.APPROVED"},
                {"name": "CHECKOUT.ORDER.COMPLETED"}
            ]
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/notifications/webhooks",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            webhook = response.json()
            print(f"✅ Webhook created: {webhook['id']}")
            return webhook["id"]
        else:
            print(f"❌ Failed to create webhook: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    def export_config(self):
        """Export configuration for Lambda and frontend"""
        config = {
            "generated_at": datetime.now().isoformat(),
            "paypal_mode": "live",
            "currency": "USD",
            "products": self.products,
            "plans": self.plans,
            "webhook_url": WEBHOOK_URL
        }

        # Save to file
        with open("paypal_config.json", "w") as f:
            json.dump(config, f, indent=2)

        print("\n📄 Configuration exported to paypal_config.json")
        print(json.dumps(config, indent=2))
        return config

    def run_full_setup(self):
        """Run the complete PayPal setup"""
        print("=" * 60)
        print("🚀 AiVedha Guard - PayPal Subscription Setup")
        print("=" * 60)

        # Step 1: Get access token
        if not self.get_access_token():
            return False

        # Step 2: List existing products and plans
        self.list_existing_products()
        self.list_existing_plans()

        # Step 3: Create main subscription product
        main_product_id = self.create_product(
            "subscription",
            "AiVedha Guard Security Audit Subscription Service"
        )

        if not main_product_id:
            print("❌ Failed to create main product")
            return False

        # Step 4: Create subscription plans
        print("\n" + "=" * 60)
        print("📋 Creating Subscription Plans")
        print("=" * 60)

        for plan_config in SUBSCRIPTION_PLANS:
            # Create monthly plan
            self.create_subscription_plan(main_product_id, plan_config)

            # Create yearly plan
            self.create_yearly_plan(main_product_id, plan_config)

        # Step 5: Create credit pack product
        credit_product_id = self.create_product(
            "credits",
            "AiVedha Guard Security Audit Credits"
        )

        # Step 6: Setup webhook
        print("\n" + "=" * 60)
        print("🔔 Configuring Webhooks")
        print("=" * 60)
        self.setup_webhook()

        # Step 7: Export configuration
        print("\n" + "=" * 60)
        print("📄 Exporting Configuration")
        print("=" * 60)
        self.export_config()

        print("\n" + "=" * 60)
        print("✅ PayPal Setup Complete!")
        print("=" * 60)

        return True


if __name__ == "__main__":
    setup = PayPalSetup()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "token":
            setup.get_access_token()
            print(f"Token: {setup.access_token}")

        elif command == "list":
            setup.get_access_token()
            setup.list_existing_products()
            setup.list_existing_plans()

        elif command == "webhook":
            setup.get_access_token()
            setup.setup_webhook()

        elif command == "full":
            setup.run_full_setup()

        else:
            print(f"Unknown command: {command}")
            print("Usage: python paypal_setup.py [token|list|webhook|full]")
    else:
        # Default: run full setup
        setup.run_full_setup()
