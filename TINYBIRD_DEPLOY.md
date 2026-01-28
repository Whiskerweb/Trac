# Tinybird Deployment Guide

## Overview
The Tinybird datasource changes (sorting keys) need to be deployed to production.

## Current Status

✅ Branch `infra_refinement` created  
⚠️ CLI requires Docker Desktop (not running)  
📋 Datasource file updated locally with new sorting key

## Recommended: Tinybird UI Deployment

Since Docker is not available, use the Tinybird Dashboard:

1. **Login to Tinybird**: https://app.tinybird.co
2. **Navigate to Datasources** → `clicks`
3. **Delete** the clicks datasource (backup data first if needed - only 93 rows)
4. **Create New Datasource**:
   - Name: `clicks`
   - Schema: Copy from `datasources/clicks.datasource`
   - **Sorting Key**: `workspace_id, seller_id, timestamp`
   
5. **Important**: Update the pipes that use `clicks`:
   - kpis
   - trend  
   - attribution

## Alternative: Start Docker Desktop

```bash
# Open Docker Desktop application, then:
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction
tb deploy --yes
```

## Changes Made

| Datasource | Old Sorting Key | New Sorting Key |
|------------|----------------|-----------------|
| `clicks.datasource` | `(workspace_id, timestamp)` | `(workspace_id, seller_id, timestamp)` |

**Impact**: Seller analytics queries will be faster as seller data is now contiguous on disk.

## Verification

After deployment, verify the sorting key:

```bash
# Via UI: Datasources → clicks → Schema tab shows ORDER BY
# Or via API:
curl -s "https://api.europe-west2.gcp.tinybird.co/v0/datasources/clicks" \
  -H "Authorization: Bearer $TINYBIRD_ADMIN_TOKEN" | jq '.engine.sorting_key'
```

Expected output: `"workspace_id, seller_id, timestamp"`
