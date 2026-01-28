#!/bin/bash
set -e

# Tinybird Migration Script: affiliate_id → seller_id
# This script executes SQL commands via Tinybird API

TINYBIRD_HOST="https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN="p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJiMjRjYjljZi1kNDUxLTQ0MTgtYTAyMC1lNzQzOTQzNDA0MGQiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0._PjGLcjMzlt4Uy9eebE5qGhG-JZdwE-xMXKWVDxP_r8"

echo "🚀 Starting Tinybird Migration: affiliate_id → seller_id"
echo "=================================================="
echo ""

# Function to execute SQL query
execute_sql() {
    local query="$1"
    local description="$2"

    echo "📝 $description"
    echo "   Query: $query"

    response=$(curl -s -X POST "${TINYBIRD_HOST}/v0/sql" \
        -H "Authorization: Bearer ${TINYBIRD_TOKEN}" \
        --data-urlencode "q=$query")

    # Check if response contains error
    if echo "$response" | grep -q '"error"'; then
        echo "   ❌ Error: $response"
        # Don't exit on error for ADD COLUMN (column might already exist)
        if echo "$query" | grep -q "ADD COLUMN"; then
            echo "   ⚠️  Column might already exist, continuing..."
        else
            return 1
        fi
    else
        echo "   ✅ Success"
        # Show first few rows of result if it's a SELECT
        if echo "$query" | grep -iq "SELECT"; then
            echo "$response" | head -5
        fi
    fi
    echo ""

    return 0
}

# Step 1: Add seller_id columns to datasources
echo "Step 1: Adding seller_id columns"
echo "================================="
echo ""

execute_sql "ALTER TABLE clicks ADD COLUMN seller_id Nullable(String) AFTER link_id" \
    "Adding seller_id to clicks datasource"

execute_sql "ALTER TABLE sales ADD COLUMN seller_id Nullable(String) AFTER link_id" \
    "Adding seller_id to sales datasource"

execute_sql "ALTER TABLE leads ADD COLUMN seller_id Nullable(String) AFTER link_id" \
    "Adding seller_id to leads datasource"

# Step 2: Copy data from affiliate_id to seller_id
echo "Step 2: Copying data affiliate_id → seller_id"
echo "=============================================="
echo ""

execute_sql "ALTER TABLE clicks UPDATE seller_id = affiliate_id WHERE seller_id IS NULL OR seller_id = ''" \
    "Copying clicks data"

execute_sql "ALTER TABLE sales UPDATE seller_id = affiliate_id WHERE seller_id IS NULL OR seller_id = ''" \
    "Copying sales data"

execute_sql "ALTER TABLE leads UPDATE seller_id = affiliate_id WHERE seller_id IS NULL OR seller_id = ''" \
    "Copying leads data"

# Step 3: Verify migration
echo "Step 3: Verifying migration"
echo "============================"
echo ""

execute_sql "SELECT count() as total_rows, countIf(affiliate_id IS NOT NULL) as has_affiliate_id, countIf(seller_id IS NOT NULL) as has_seller_id, countIf(affiliate_id = seller_id) as matching_ids FROM clicks LIMIT 1" \
    "Verifying clicks table"

execute_sql "SELECT count() as total_rows, countIf(affiliate_id IS NOT NULL) as has_affiliate_id, countIf(seller_id IS NOT NULL) as has_seller_id, countIf(affiliate_id = seller_id) as matching_ids FROM sales LIMIT 1" \
    "Verifying sales table"

execute_sql "SELECT count() as total_rows, countIf(affiliate_id IS NOT NULL) as has_affiliate_id, countIf(seller_id IS NOT NULL) as has_seller_id, countIf(affiliate_id = seller_id) as matching_ids FROM leads LIMIT 1" \
    "Verifying leads table"

echo "=================================================="
echo "✅ Tinybird Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Update pipes to use seller_id instead of affiliate_id"
echo "2. Rename pipes: partner_kpis → seller_kpis"
echo "3. Test analytics dashboards"
echo ""
