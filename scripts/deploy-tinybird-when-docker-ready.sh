#!/bin/bash

# Script pour déployer Tinybird une fois Docker démarré
# Usage: ./scripts/deploy-tinybird-when-docker-ready.sh

set -e

echo "🚀 Tinybird Deployment Script"
echo "=" * 80
echo ""

# Check if Docker is running
echo "1️⃣  Checking Docker status..."
if docker info > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
else
    echo "   ❌ Docker is NOT running"
    echo ""
    echo "   Please start Docker Desktop:"
    echo "   1. Open Docker Desktop app"
    echo "   2. Wait for Docker to start (you'll see the whale icon in menu bar)"
    echo "   3. Run this script again"
    echo ""
    echo "   Alternatively, start Docker from command line:"
    echo "   open -a Docker"
    echo ""
    exit 1
fi

# Navigate to project directory
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction

echo ""
echo "2️⃣  Deploying to Tinybird..."
echo ""

# Disable version warning
export TB_VERSION_WARNING=0

# Deploy with auto-approve
tb deploy --wait --auto -v

if [ $? -eq 0 ]; then
    echo ""
    echo "=" * 80
    echo "✅ Tinybird deployment successful!"
    echo ""
    echo "Verifying deployment..."
    python3 scripts/check-tinybird-schema.py

    echo ""
    echo "Next steps:"
    echo "  1. Test analytics dashboards"
    echo "  2. Verify seller_kpis and sellers pipes are working"
    echo "  3. Remove double-write in code (affiliate_id can be removed)"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo "Check errors above and try again"
    exit 1
fi
