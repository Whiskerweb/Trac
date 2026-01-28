#!/usr/bin/env python3
"""Check Tinybird datasource schemas"""

import requests
import json

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

datasources = ["clicks", "sales", "leads"]

print("Checking Tinybird datasource schemas...")
print("=" * 60)

for ds_name in datasources:
    print(f"\n📊 Datasource: {ds_name}")
    print("-" * 60)

    response = requests.get(
        f"{TINYBIRD_HOST}/v0/datasources/{ds_name}",
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code} - {response.text}")
        continue

    data = response.json()
    columns = data.get("columns", [])

    # Check for affiliate_id and seller_id
    affiliate_col = next((c for c in columns if c["name"] == "affiliate_id"), None)
    seller_col = next((c for c in columns if c["name"] == "seller_id"), None)

    print(f"   affiliate_id: {'✅ EXISTS' if affiliate_col else '❌ NOT FOUND'}")
    if affiliate_col:
        print(f"      Type: {affiliate_col['type']}, Nullable: {affiliate_col['nullable']}")

    print(f"   seller_id:    {'✅ EXISTS' if seller_col else '❌ NOT FOUND'}")
    if seller_col:
        print(f"      Type: {seller_col['type']}, Nullable: {seller_col['nullable']}")

    if not seller_col:
        print(f"   ⚠️  seller_id column needs to be added to {ds_name}")

print("\n" + "=" * 60)
print("Schema check complete!")
