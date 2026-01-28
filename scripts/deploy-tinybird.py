#!/usr/bin/env python3
"""
Deploy Tinybird datasources and pipes via API
This bypasses Docker by using the REST API directly
"""

import requests
import time
import sys

TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN = "p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

headers = {"Authorization": f"Bearer {TINYBIRD_TOKEN}"}

print("🚀 Deploying Tinybird Datasources and Pipes")
print("=" * 80)
print()

def deploy_datasource(name):
    """Deploy a datasource definition"""
    print(f"📊 Deploying datasource: {name}")
    print("-" * 80)

    with open(f"datasources/{name}.datasource", 'r') as f:
        content = f.read()

    response = requests.post(
        f"{TINYBIRD_HOST}/v0/datasources",
        headers=headers,
        params={"mode": "replace", "name": name},
        data=content
    )

    if response.status_code in [200, 201, 204]:
        print(f"   ✅ {name} deployed successfully")
        return True
    else:
        print(f"   ❌ Error: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def deploy_pipe(name):
    """Deploy a pipe definition"""
    print(f"🔧 Deploying pipe: {name}")
    print("-" * 80)

    with open(f"pipes/{name}.pipe", 'r') as f:
        content = f.read()

    response = requests.post(
        f"{TINYBIRD_HOST}/v0/pipes",
        headers=headers,
        params={"mode": "replace", "name": name},
        data=content
    )

    if response.status_code in [200, 201, 204]:
        print(f"   ✅ {name} deployed successfully")
        return True
    else:
        print(f"   ❌ Error: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

# Deploy datasources
print("STEP 1: Deploying Datasources")
print("=" * 80)
print()

datasources = ["clicks", "sales", "leads"]
success_count = 0

for ds_name in datasources:
    if deploy_datasource(ds_name):
        success_count += 1
    print()
    time.sleep(2)  # Rate limiting

print(f"Datasources deployed: {success_count}/{len(datasources)}")
print()

# Deploy pipes
print("STEP 2: Deploying Pipes")
print("=" * 80)
print()

pipes = ["seller_kpis", "sellers"]
pipe_success = 0

for pipe_name in pipes:
    if deploy_pipe(pipe_name):
        pipe_success += 1
    print()
    time.sleep(2)

print(f"Pipes deployed: {pipe_success}/{len(pipes)}")
print()

# Summary
print("=" * 80)
print("🎉 DEPLOYMENT COMPLETE")
print("=" * 80)
print()
print(f"✅ Datasources: {success_count}/{len(datasources)}")
print(f"✅ Pipes: {pipe_success}/{len(pipes)}")
print()

if success_count == len(datasources) and pipe_success == len(pipes):
    print("🎊 All components deployed successfully!")
    print()
    print("Next step: Verify with check-tinybird-schema.py")
    sys.exit(0)
else:
    print("⚠️  Some components failed to deploy")
    print("Check errors above for details")
    sys.exit(1)
