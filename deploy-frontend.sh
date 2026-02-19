#!/bin/bash

# Deploy Frontend WiFi Scanner Fixes
# Run this on your server where Docker is running

set -e

echo "=================================="
echo "Deploying WiFi Scanner Fixes"
echo "=================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "✓ Current directory: $(pwd)"
echo ""

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install --quiet
npm run build
cd ..
echo "✓ Frontend built successfully"
echo ""

# Rebuild and restart frontend container
echo "🐳 Rebuilding Docker container..."
docker compose build frontend
echo "✓ Container rebuilt"
echo ""

echo "🔄 Restarting frontend container..."
docker compose up -d frontend
echo "✓ Container restarted"
echo ""

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 3

# Check if container is running
if docker compose ps | grep -q "md-frontend.*running"; then
    echo "✓ Frontend container is running"
else
    echo "❌ Frontend container is NOT running!"
    docker compose ps
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Deployment completed!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Open your browser to: https://md.m-host.si"
echo "2. Hard refresh (Ctrl+Shift+R or Ctrl+F5)"
echo "3. Check WiFi Scanner - button should be greyed out"
echo ""
echo "Expected behavior:"
echo "- Gumb: Siv z napisom 'LTE ni stabilen'"
echo "- Opozorilo: 'Skeniranje onemogočeno - LTE ni stabilen'"
echo "- Status: '(LTE ✗)' v naslovu"
echo ""
