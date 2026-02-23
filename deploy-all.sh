#!/bin/bash

# Deploy Backend + Frontend WiFi Scanner Fixes
# Run this on your server where Docker is running

set -e

echo "=========================================="
echo "Deploying Backend + Frontend Fixes"
echo "=========================================="
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

# Rebuild and restart backend container (for SSID and speed fixes)
echo "🐳 Rebuilding backend container..."
docker compose build backend
echo "✓ Backend rebuilt"
echo ""

echo "🔄 Restarting backend container..."
docker compose up -d backend
echo "✓ Backend restarted"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Check if backend is running
if docker compose ps | grep -q "md-backend.*running"; then
    echo "✓ Backend container is running"
else
    echo "❌ Backend container is NOT running!"
    docker compose ps
    exit 1
fi

# Rebuild and restart frontend container with --no-cache
echo ""
echo "🐳 Rebuilding frontend container (with --no-cache)..."
docker compose build --no-cache frontend
echo "✓ Frontend rebuilt"
echo ""

echo "🔄 Restarting frontend container..."
docker compose up -d frontend
echo "✓ Frontend restarted"
echo ""

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
sleep 5

# Check if frontend is running
if docker compose ps | grep -q "md-frontend.*running"; then
    echo "✓ Frontend container is running"
else
    echo "❌ Frontend container is NOT running!"
    docker compose ps
    exit 1
fi

# Show build info
echo ""
echo "📄 Build files in frontend container:"
docker exec md-frontend ls -lh /usr/share/nginx/html/assets/ | grep -E "index.*\.js|index.*\.css" || echo "Could not list files"

echo ""
echo "=========================================="
echo "✅ Deployment completed!"
echo "=========================================="
echo ""
echo "⚠️  JavaScript filename changed:"
echo "   OLD: index-CwEVPv4I.js"
echo "   NEW: index-bdu264SJ.js"
echo ""
echo "   Browser will automatically load the NEW version!"
echo "   (No hard refresh needed if filename changed)"
echo ""
echo "Next steps:"
echo "1. Open browser: https://md.m-host.si"
echo "2. Refresh page (F5 or normal refresh)"
echo "3. Check WiFi Scanner"
echo ""
echo "Expected behavior (when LTE is unstable):"
echo "- Title: 'WiFi Scanner (2.4 GHz) (LTE ✗)'"
echo "- Button: GREY with text 'LTE ni stabilen'"
echo "- Button: DISABLED (cannot click)"
echo "- Warning: 'Skeniranje onemogočeno - LTE ni stabilen'"
echo "- Extra button: 'Preveri LTE'"
echo ""
echo "Expected WLAN 5 GHz fixes:"
echo "- SSID: Shows name or 'N/A' (not blank)"
echo "- RX Speed: Format like '300 Kbps' or '48.5 Mbps'"
echo "- TX Speed: Format like '150 Kbps' or '72.2 Mbps'"
echo ""
echo "If you still see old version:"
echo "- Hard refresh: Ctrl+Shift+R or Ctrl+F5"
echo "- Or open in Incognito/Private mode"
echo ""
