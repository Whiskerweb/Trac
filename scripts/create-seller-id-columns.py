#!/usr/bin/env python3
"""
Create seller_id columns in Tinybird datasources by sending test events.
Tinybird uses schema-on-write, so sending data with seller_id will create the column automatically.
"""

import requests
import json
from datetime import datetime

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

print("🚀 Creating seller_id columns in Tinybird datasources")
print("=" * 80)
print("\nStrategy: Send test events with seller_id field")
print("Tinybird will automatically add the column to the schema")
print()

# Test event data
timestamp = datetime.utcnow().isoformat() + "Z"
test_workspace_id = "test-migration-workspace"
test_seller_id = "test-migration-seller-id"

# 1. Send test click event
print("1️⃣  Sending test click event...")
click_event = {
    "timestamp": timestamp,
    "workspace_id": test_workspace_id,
    "click_id": "test-click-migration",
    "link_id": "test-link-migration",
    "affiliate_id": test_seller_id,  # Keep for backward compat
    "seller_id": test_seller_id,  # NEW COLUMN
    "url": "https://test-migration.example.com",
    "user_agent": "Migration Script",
    "ip": "127.0.0.1",
    "country": "FR",
    "city": "Paris",
    "referrer": ""
}

response = requests.post(
    f"{TINYBIRD_HOST}/v0/events?name=clicks",
    headers=headers,
    data=json.dumps(click_event)
)

if response.status_code == 202:
    print("   ✅ Click event sent successfully")
    print(f"   Response: {response.text}")
else:
    print(f"   ❌ Error: {response.status_code} - {response.text}")

# 2. Send test sale event
print("\n2️⃣  Sending test sale event...")
sale_event = {
    "timestamp": timestamp,
    "event_id": "test-sale-migration",
    "invoice_id": "INV-MIGRATION-001",
    "workspace_id": test_workspace_id,
    "click_id": "test-click-migration",
    "link_id": "test-link-migration",
    "affiliate_id": test_seller_id,  # Keep for backward compat
    "seller_id": test_seller_id,  # NEW COLUMN
    "customer_external_id": "test-customer",
    "amount": 10000,
    "net_amount": 8500,
    "currency": "EUR",
    "metadata": "{}"
}

response = requests.post(
    f"{TINYBIRD_HOST}/v0/events?name=sales",
    headers=headers,
    data=json.dumps(sale_event)
)

if response.status_code == 202:
    print("   ✅ Sale event sent successfully")
    print(f"   Response: {response.text}")
else:
    print(f"   ❌ Error: {response.status_code} - {response.text}")

# 3. Send test lead event
print("\n3️⃣  Sending test lead event...")
lead_event = {
    "timestamp": timestamp,
    "event_id": "test-lead-migration",
    "workspace_id": test_workspace_id,
    "customer_id": "test-customer-id",
    "customer_external_id": "test-customer-external",
    "click_id": "test-click-migration",
    "link_id": "test-link-migration",
    "affiliate_id": test_seller_id,  # Keep for backward compat
    "seller_id": test_seller_id,  # NEW COLUMN
    "event_name": "signup",
    "event_value": "100",
    "source": "migration_test",
    "metadata": "{}"
}

response = requests.post(
    f"{TINYBIRD_HOST}/v0/events?name=leads",
    headers=headers,
    data=json.dumps(lead_event)
)

if response.status_code == 202:
    print("   ✅ Lead event sent successfully")
    print(f"   Response: {response.text}")
else:
    print(f"   ❌ Error: {response.status_code} - {response.text}")

print("\n" + "=" * 80)
print("✅ Test events sent!")
print()
print("⏳ Wait 30-60 seconds for Tinybird to process events and update schemas...")
print()
print("💡 Next steps:")
print("  1. Run check-tinybird-schema.py to verify seller_id columns were created")
print("  2. Update pipes to use seller_id (or COALESCE(seller_id, affiliate_id))")
print("  3. Test analytics dashboards")
print()
