#!/usr/bin/env python3
"""
PayPal Add-ons: Credit Packs and Discount Coupons Setup
Creates credit pack products and configures discount functionality
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# PayPal API Configuration
PAYPAL_CLIENT_ID = "AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk"
PAYPAL_CLIENT_SECRET = "EBWJ9a_u8J3k90PR7zoFNxxHpkJCDRN0d2f-6FRKYaUsAy1WTkinIdwceJsf5uV02550qAtIS97B2Mgs"
PAYPAL_API_BASE = "https://api-m.paypal.com"

# Credit Packs Configuration
CREDIT_PACKS = [
    {"id": "credits-5", "name": "5 Credits Pack", "credits": 5, "price": "5.00", "description": "Add 5 security audit credits"},
    {"id": "credits-10", "name": "10 Credits Pack", "credits": 10, "price": "9.00", "description": "Add 10 credits (10% savings)"},
    {"id": "credits-25", "name": "25 Credits Pack", "credits": 25, "price": "20.00", "description": "Add 25 credits (20% savings)"},
    {"id": "credits-50", "name": "50 Credits Pack", "credits": 50, "price": "35.00", "description": "Add 50 credits (30% savings)"},
    {"id": "credits-100", "name": "100 Credits Pack", "credits": 100, "price": "60.00", "description": "Add 100 credits (40% savings)"},
]

# Discount Coupons Configuration
DISCOUNT_COUPONS = [
    {
        "code": "WELCOME20",
        "name": "Welcome 20% Off",
        "discount_percent": 20,
        "max_uses": 1000,
        "valid_days": 90,
        "description": "20% off your first subscription",
        "applies_to": "all"
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
        "applies_to": "all",
        "description": "50% off for verified startups"
    },
    {
        "code": "FIRST3FREE",
        "name": "First 3 Months Free",
        "discount_percent": 100,
        "max_uses": 200,
        "valid_days": 60,
        "trial_months": 3,
        "applies_to": "monthly",
        "description": "First 3 months free on monthly plans"
    },
    {
        "code": "CREDITS20",
        "name": "20% Off Credits",
        "discount_percent": 20,
        "max_uses": 500,
        "valid_days": 30,
        "applies_to": "credits",
        "description": "20% off credit pack purchases"
    }
]


class PayPalAddonsSetup:
    def __init__(self):
        self.access_token = None
        self.created_resources = {
            "credit_packs": [],
            "coupons": []
        }

    def get_access_token(self):
        """Get OAuth access token from PayPal"""
        print("Authenticating with PayPal...")
        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            headers={"Accept": "application/json"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"}
        )
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            print("OK: Authentication successful\n")
            return True
        else:
            print(f"FAIL: {response.text}")
            return False

    def get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "PayPal-Request-Id": f"aivedha-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        }

    def create_credit_pack_product(self):
        """Create a product for credit packs"""
        print("=" * 60)
        print("Creating Credit Packs Product")
        print("=" * 60)

        product_id = "aivedha-guard-credit-packs"

        # Check if product exists
        response = requests.get(
            f"{PAYPAL_API_BASE}/v1/catalogs/products/{product_id}",
            headers=self.get_headers()
        )

        if response.status_code == 200:
            print(f"Product already exists: {product_id}")
            return product_id

        payload = {
            "id": product_id,
            "name": "AiVedha Guard - Credit Packs",
            "description": "One-time purchase credit packs for security audits",
            "type": "SERVICE",
            "category": "SOFTWARE",
            "image_url": "https://aivedha.ai/logo.png",
            "home_url": "https://aivedha.ai/pricing"
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/catalogs/products",
            headers=self.get_headers(),
            json=payload
        )

        if response.status_code in [200, 201]:
            print(f"OK: Created product: {product_id}")
            return product_id
        elif response.status_code == 422:
            print(f"Product exists: {product_id}")
            return product_id
        else:
            print(f"FAIL: {response.status_code} - {response.text}")
            return None

    def setup_credit_packs(self):
        """Configure credit packs for one-time purchases"""
        print("\n" + "=" * 60)
        print("Configuring Credit Packs")
        print("=" * 60)

        # Credit packs use PayPal Orders API (one-time payments)
        # We store the configuration for the Lambda to use

        for pack in CREDIT_PACKS:
            print(f"\nConfigured: {pack['name']}")
            print(f"   ID: {pack['id']}")
            print(f"   Credits: {pack['credits']}")
            print(f"   Price: ${pack['price']} USD")

            self.created_resources["credit_packs"].append({
                "id": pack["id"],
                "name": pack["name"],
                "credits": pack["credits"],
                "price": pack["price"],
                "description": pack["description"]
            })

        print(f"\nTotal credit packs configured: {len(CREDIT_PACKS)}")
        return True

    def setup_discount_coupons(self):
        """Configure discount coupons"""
        print("\n" + "=" * 60)
        print("Configuring Discount Coupons")
        print("=" * 60)

        # PayPal doesn't have a native coupon API
        # Coupons are handled by our Lambda - we calculate discounted price
        # and create subscription/order with that price

        for coupon in DISCOUNT_COUPONS:
            expiry = datetime.now() + timedelta(days=coupon["valid_days"])

            print(f"\nConfigured: {coupon['code']}")
            print(f"   Name: {coupon['name']}")
            print(f"   Discount: {coupon['discount_percent']}%")
            print(f"   Max Uses: {coupon['max_uses']}")
            print(f"   Expires: {expiry.strftime('%Y-%m-%d')}")
            print(f"   Applies To: {coupon['applies_to']}")

            self.created_resources["coupons"].append({
                "code": coupon["code"],
                "name": coupon["name"],
                "discount_percent": coupon["discount_percent"],
                "max_uses": coupon["max_uses"],
                "expires_at": expiry.isoformat(),
                "applies_to": coupon["applies_to"],
                "description": coupon["description"],
                "trial_months": coupon.get("trial_months", 0)
            })

        print(f"\nTotal coupons configured: {len(DISCOUNT_COUPONS)}")
        return True

    def export_configuration(self):
        """Export configuration for Lambda"""
        print("\n" + "=" * 60)
        print("Exporting Configuration")
        print("=" * 60)

        # Load existing config
        config_path = "paypal_config.json"
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
        except:
            config = {}

        # Update with new resources
        config["credit_packs"] = self.created_resources["credit_packs"]
        config["coupons"] = self.created_resources["coupons"]
        config["updated_at"] = datetime.now().isoformat()

        # Save updated config
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        print(f"OK: Updated {config_path}")
        print(f"   - {len(self.created_resources['credit_packs'])} credit packs")
        print(f"   - {len(self.created_resources['coupons'])} coupons")

        return config

    def run_setup(self):
        """Run full setup"""
        print("=" * 60)
        print("PayPal Add-ons & Coupons Setup")
        print("=" * 60 + "\n")

        if not self.get_access_token():
            return False

        # Create credit packs product
        self.create_credit_pack_product()

        # Configure credit packs
        self.setup_credit_packs()

        # Configure coupons
        self.setup_discount_coupons()

        # Export configuration
        config = self.export_configuration()

        print("\n" + "=" * 60)
        print("Setup Complete!")
        print("=" * 60)

        return config


if __name__ == "__main__":
    setup = PayPalAddonsSetup()
    setup.run_setup()
