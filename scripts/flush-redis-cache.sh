#!/bin/bash

# Redis Cache Flush Script (Partner → Seller Migration)
# Flushes all cached data that contains old 'affiliateId' references

set -e

echo "🗑️  Flushing Redis cache for Partner → Seller migration..."
echo ""

# Check if Redis credentials are set
if [ -z "$UPSTASH_REDIS_REST_URL" ] || [ -z "$UPSTASH_REDIS_REST_TOKEN" ]; then
    echo "❌ Error: Redis credentials not set"
    echo "   UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"
    exit 1
fi

# Extract base URL and token from environment
REDIS_URL="$UPSTASH_REDIS_REST_URL"
REDIS_TOKEN="$UPSTASH_REDIS_REST_TOKEN"

echo "📍 Redis URL: ${REDIS_URL:0:50}..."

# Flush all shortlink cache (they contain affiliateId → sellerId)
echo "🔄 Scanning for shortlink keys..."
KEYS=$(curl -s "${REDIS_URL}/KEYS/shortlink:*" \
    -H "Authorization: Bearer ${REDIS_TOKEN}" | jq -r '.result[]' 2>/dev/null || echo "")

if [ -n "$KEYS" ]; then
    COUNT=$(echo "$KEYS" | wc -l | tr -d ' ')
    echo "   Found $COUNT shortlink keys"

    # Delete each key
    for key in $KEYS; do
        curl -s "${REDIS_URL}/DEL/${key}" \
            -H "Authorization: Bearer ${REDIS_TOKEN}" > /dev/null
    done

    echo "   ✅ Deleted $COUNT shortlink keys"
else
    echo "   ℹ️  No shortlink keys found"
fi

echo ""

# Flush click tracking cache
echo "🔄 Scanning for click tracking keys..."
CLICK_KEYS=$(curl -s "${REDIS_URL}/KEYS/click:*" \
    -H "Authorization: Bearer ${REDIS_TOKEN}" | jq -r '.result[]' 2>/dev/null || echo "")

if [ -n "$CLICK_KEYS" ]; then
    CLICK_COUNT=$(echo "$CLICK_KEYS" | wc -l | tr -d ' ')
    echo "   Found $CLICK_COUNT click keys"

    for key in $CLICK_KEYS; do
        curl -s "${REDIS_URL}/DEL/${key}" \
            -H "Authorization: Bearer ${REDIS_TOKEN}" > /dev/null
    done

    echo "   ✅ Deleted $CLICK_COUNT click keys"
else
    echo "   ℹ️  No click keys found"
fi

echo ""
echo "✅ Redis cache flushed successfully!"
echo ""
echo "ℹ️  Note: Cache will be rebuilt automatically on next requests"
echo "   New cache entries will use 'sellerId' instead of 'affiliateId'"
