#!/usr/bin/env python3
"""Debug Tinybird API response"""

import requests
import json

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

# List all datasources
print("Listing all datasources...")
print("=" * 80)

response = requests.get(
    f"{TINYBIRD_HOST}/v0/datasources",
    headers=headers
)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    datasources = data.get("datasources", [])
    print(f"\nTotal datasources: {len(datasources)}\n")

    for ds in datasources:
        if ds["name"] in ["clicks", "sales", "leads", "sale_items"]:
            print(f"📊 {ds['name']}")
            print(f"   Type: {ds['type']}")
            print(f"   Columns: {len(ds.get('columns', []))}")
            if ds.get('columns'):
                print("   Column names:")
                for col in ds['columns'][:10]:  # Show first 10
                    print(f"      - {col['name']}")
                if len(ds['columns']) > 10:
                    print(f"      ... and {len(ds['columns']) - 10} more")
            print()
else:
    print(f"Error: {response.text}")
