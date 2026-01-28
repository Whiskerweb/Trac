#!/usr/bin/env python3
"""List all columns in Tinybird datasources"""

import requests
import json

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

datasources = ["clicks", "sales", "leads"]

for ds_name in datasources:
    print(f"\n📊 Datasource: {ds_name}")
    print("=" * 80)

    response = requests.get(
        f"{TINYBIRD_HOST}/v0/datasources/{ds_name}",
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code} - {response.text}")
        continue

    data = response.json()
    columns = data.get("columns", [])

    print(f"Total columns: {len(columns)}\n")

    for idx, col in enumerate(columns, 1):
        print(f"{idx:2d}. {col['name']:20s} {col['type']:30s} Nullable: {col.get('nullable', False)}")
