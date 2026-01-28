#!/usr/bin/env python3
"""
Update Tinybird datasources and pipes via REST API
This script reads local .datasource and .pipe files and uploads them to Tinybird
"""

import requests
import re
import os

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

print("🚀 Updating Tinybird datasources and pipes via API")
print("=" * 80)

# Datasources to update
datasources = ["clicks", "sales", "leads"]

for ds_name in datasources:
    print(f"\n📊 Updating datasource: {ds_name}")
    print("-" * 80)

    # Read local .datasource file
    file_path = f"datasources/{ds_name}.datasource"
    if not os.path.exists(file_path):
        print(f"   ❌ File not found: {file_path}")
        continue

    with open(file_path, 'r') as f:
        content = f.read()

    # Upload datasource definition
    response = requests.post(
        f"{TINYBIRD_HOST}/v0/datasources",
        headers=headers,
        params={"mode": "replace", "name": ds_name},  # Replace existing datasource
        data=content
    )

    if response.status_code in [200, 201, 204]:
        print(f"   ✅ Datasource {ds_name} updated successfully")
    else:
        print(f"   ❌ Error updating {ds_name}: {response.status_code}")
        print(f"   Response: {response.text}")

# Update pipes
print("\n" + "=" * 80)
print("Updating pipes...")
print("=" * 80)

pipes = ["seller_kpis", "sellers"]

for pipe_name in pipes:
    print(f"\n🔧 Updating pipe: {pipe_name}")
    print("-" * 80)

    # Read local .pipe file
    file_path = f"pipes/{pipe_name}.pipe"
    if not os.path.exists(file_path):
        print(f"   ❌ File not found: {file_path}")
        continue

    with open(file_path, 'r') as f:
        content = f.read()

    # Upload pipe definition
    response = requests.post(
        f"{TINYBIRD_HOST}/v0/pipes",
        headers=headers,
        params={"mode": "replace", "name": pipe_name},  # Replace existing pipe
        data=content
    )

    if response.status_code in [200, 201, 204]:
        print(f"   ✅ Pipe {pipe_name} updated successfully")
    else:
        print(f"   ❌ Error updating {pipe_name}: {response.status_code}")
        print(f"   Response: {response.text}")

print("\n" + "=" * 80)
print("✅ Tinybird update complete!")
print("\n💡 Next steps:")
print("  1. Verify datasources have seller_id column")
print("  2. Test pipes with seller_id parameter")
print("  3. Check analytics dashboards")
print()
