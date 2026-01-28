#!/bin/bash

# Tinybird Deployment Script (Partner → Seller Migration)
# Pushes updated datasources and pipes to Tinybird via API

set -e

# Configuration
TINYBIRD_HOST="https://api.europe-west2.gcp.tinybird.co"
TINYBIRD_TOKEN="${TINYBIRD_ADMIN_TOKEN:-$(grep '"token":' .tinyb | cut -d'"' -f4)}"

if [ -z "$TINYBIRD_TOKEN" ]; then
    echo "❌ Error: TINYBIRD_ADMIN_TOKEN not set"
    echo "Set it with: export TINYBIRD_ADMIN_TOKEN=your_token"
    exit 1
fi

echo "🚀 Deploying Tinybird changes (Partner → Seller migration)"
echo "Host: $TINYBIRD_HOST"
echo ""

# Function to deploy a datasource
deploy_datasource() {
    local file=$1
    local name=$(basename "$file" .datasource)

    echo "📊 Deploying datasource: $name"

    # Read the datasource file content
    local content=$(cat "$file")

    # Deploy via API
    curl -s -X POST "${TINYBIRD_HOST}/v0/datasources" \
        -H "Authorization: Bearer ${TINYBIRD_TOKEN}" \
        -d "$content" \
        > /tmp/tb_deploy_${name}.json

    if grep -q "error" /tmp/tb_deploy_${name}.json; then
        echo "   ❌ Failed: $(cat /tmp/tb_deploy_${name}.json)"
    else
        echo "   ✅ Success"
    fi
}

# Function to deploy a pipe
deploy_pipe() {
    local file=$1
    local name=$(basename "$file" .pipe)

    echo "⚙️  Deploying pipe: $name"

    # Read the pipe file content
    local content=$(cat "$file")

    # Deploy via API
    curl -s -X POST "${TINYBIRD_HOST}/v0/pipes" \
        -H "Authorization: Bearer ${TINYBIRD_TOKEN}" \
        -d "$content" \
        > /tmp/tb_deploy_${name}.json

    if grep -q "error" /tmp/tb_deploy_${name}.json; then
        echo "   ❌ Failed: $(cat /tmp/tb_deploy_${name}.json)"
    else
        echo "   ✅ Success"
    fi
}

# Deploy datasources
echo "📦 Deploying datasources..."
for datasource in datasources/*.datasource; do
    deploy_datasource "$datasource"
done

echo ""

# Deploy pipes
echo "📦 Deploying pipes..."
for pipe in pipes/*.pipe; do
    deploy_pipe "$pipe"
done

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  Important: Historical data with 'affiliate_id' field will need migration"
echo "   Run this SQL in Tinybird console to add seller_id column:"
echo ""
echo "   ALTER TABLE clicks ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id"
echo "   ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id"
echo "   ALTER TABLE leads ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id"
echo ""
echo "   Then copy data:"
echo "   UPDATE clicks SET seller_id = affiliate_id WHERE seller_id IS NULL"
echo "   UPDATE sales SET seller_id = affiliate_id WHERE seller_id IS NULL"
echo "   UPDATE leads SET seller_id = affiliate_id WHERE seller_id IS NULL"
