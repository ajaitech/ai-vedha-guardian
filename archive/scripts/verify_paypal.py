#!/usr/bin/env python3
"""
PayPal Configuration Verification Script
Verifies all plans, products, and webhooks are properly configured
"""

import requests
import json
import sys
import os

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# PayPal API Configuration
PAYPAL_CLIENT_ID = "AThX0aAXavnlPV5K_77dM2PnFdLSM4Ci1RKb2lKjiBbnka-fjn6Nj4XgUTQuU14ulT5YNIQBL-liVKXk"
PAYPAL_CLIENT_SECRET = "EBWJ9a_u8J3k90PR7zoFNxxHpkJCDRN0d2f-6FRKYaUsAy1WTkinIdwceJsf5uV02550qAtIS97B2Mgs"
PAYPAL_API_BASE = "https://api-m.paypal.com"

# Expected Plan IDs
EXPECTED_PLANS = {
    "aarambh_monthly": "P-1JC933532V162793LNFDMXLY",
    "aarambh_yearly": "P-37E07153GU572264RNFDMXMA",
    "raksha_monthly": "P-9DE80034NW8103644NFDMXMI",
    "raksha_yearly": "P-91V72263GL6122913NFDMXMY",
    "suraksha_monthly": "P-9B208585UV344253JNFDMXNA",
    "suraksha_yearly": "P-3NA45044HW267203SNFDMXNI",
    "vajra_monthly": "P-9FM13449DU368353XNFDMXNY",
    "vajra_yearly": "P-33C53817PE4737058NFDMXOA",
    "chakra_monthly": "P-97P76054M44105114NFDMXOI",
    "chakra_yearly": "P-99U671102N720504TNFDMXOQ",
    "scheduler_addon": "P-32U60387JT1483533NFDMXPA",
    "whitelabel_addon": "P-7PJ67808RA6591613NFDMXPI",
    "api_access_addon": "P-10P90334X6470204UNFDMXPQ",
}

EXPECTED_WEBHOOK_ID = "60D12445KA324183K"

def get_access_token():
    """Get OAuth access token from PayPal"""
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        headers={"Accept": "application/json"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"ERROR: Failed to get access token: {response.text}")
        return None

def get_headers(token):
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

def verify_plan(token, plan_name, plan_id):
    """Verify a single plan exists and is active"""
    response = requests.get(
        f"{PAYPAL_API_BASE}/v1/billing/plans/{plan_id}",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        plan = response.json()
        status = plan.get("status", "UNKNOWN")
        name = plan.get("name", "Unknown")
        return {"exists": True, "status": status, "name": name}
    else:
        return {"exists": False, "status": "NOT_FOUND", "name": None}

def verify_webhook(token, webhook_id):
    """Verify webhook exists and has correct events"""
    response = requests.get(
        f"{PAYPAL_API_BASE}/v1/notifications/webhooks/{webhook_id}",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        webhook = response.json()
        events = [e["name"] for e in webhook.get("event_types", [])]
        return {"exists": True, "url": webhook.get("url"), "events": events}
    else:
        return {"exists": False, "url": None, "events": []}

def verify_products(token):
    """List all products"""
    response = requests.get(
        f"{PAYPAL_API_BASE}/v1/catalogs/products?page_size=20",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        return response.json().get("products", [])
    return []

def main():
    print("=" * 70)
    print("PayPal Configuration Verification")
    print("=" * 70)

    # Get access token
    print("\n[1] Authenticating with PayPal...")
    token = get_access_token()
    if not token:
        print("FAILED: Could not authenticate")
        return False
    print("OK: Authentication successful")

    # Verify Products
    print("\n[2] Verifying Products...")
    products = verify_products(token)
    aivedha_products = [p for p in products if "aivedha" in p.get("id", "").lower()]
    print(f"Found {len(aivedha_products)} AiVedha products:")
    for p in aivedha_products:
        print(f"   - {p['id']}: {p['name']}")

    # Verify Plans
    print("\n[3] Verifying Subscription Plans...")
    all_plans_ok = True
    results = []

    for plan_name, plan_id in EXPECTED_PLANS.items():
        result = verify_plan(token, plan_name, plan_id)
        status_icon = "OK" if result["exists"] and result["status"] == "ACTIVE" else "FAIL"
        if not (result["exists"] and result["status"] == "ACTIVE"):
            all_plans_ok = False
        results.append({
            "plan_name": plan_name,
            "plan_id": plan_id,
            "status": result["status"],
            "paypal_name": result["name"],
            "ok": result["exists"] and result["status"] == "ACTIVE"
        })
        print(f"   [{status_icon}] {plan_name}: {result['status']}")

    # Verify Webhook
    print("\n[4] Verifying Webhook...")
    webhook = verify_webhook(token, EXPECTED_WEBHOOK_ID)
    if webhook["exists"]:
        print(f"OK: Webhook exists")
        print(f"   URL: {webhook['url']}")
        print(f"   Events configured: {len(webhook['events'])}")
        if len(webhook['events']) >= 20:
            print("   Event coverage: COMPREHENSIVE")
        else:
            print("   Event coverage: PARTIAL")
    else:
        print("FAIL: Webhook not found")

    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    plans_ok = sum(1 for r in results if r["ok"])
    plans_total = len(results)

    print(f"\nProducts:      {len(aivedha_products)} found")
    print(f"Plans:         {plans_ok}/{plans_total} active")
    print(f"Webhook:       {'Configured' if webhook['exists'] else 'Missing'}")
    print(f"Webhook Events: {len(webhook['events'])} types")

    if all_plans_ok and webhook["exists"] and len(webhook['events']) >= 20:
        print("\n" + "=" * 70)
        print("RESULT: PayPal is FULLY CONFIGURED")
        print("=" * 70)
        return True
    else:
        print("\n" + "=" * 70)
        print("RESULT: Configuration INCOMPLETE - see details above")
        print("=" * 70)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
