#!/bin/bash

set -e

echo "==================================="
echo "MikroTik Dashboard - Setup Script"
echo "==================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Run: cp .env.example .env"
    echo "   Then edit .env with your configuration"
    exit 1
fi

# Check if traefik directory exists
if [ ! -d traefik ]; then
    echo "Creating traefik directory..."
    mkdir -p traefik
fi

# Check if acme.json exists
if [ ! -f traefik/acme.json ]; then
    echo "Creating traefik/acme.json..."
    touch traefik/acme.json
fi

# Fix permissions
echo "Setting correct permissions..."
chmod 600 traefik/acme.json
chmod 600 .env

# Check if certs directory exists
if [ ! -d backend/certs ]; then
    echo "Creating backend/certs directory..."
    mkdir -p backend/certs
fi

# Check if CA cert exists
if [ ! -f backend/certs/mikrotik-ca.crt ]; then
    echo ""
    echo "⚠️  Warning: MikroTik CA certificate not found"
    echo "   Create placeholder: backend/certs/mikrotik-ca.crt"
    echo "   Backend will start but MikroTik connections will fail until you add the real certificate"
    echo ""

    cat > backend/certs/mikrotik-ca.crt <<'EOF'
-----BEGIN CERTIFICATE-----
REPLACE_WITH_YOUR_MIKROTIK_CA_CERTIFICATE
-----END CERTIFICATE-----
EOF
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure you've edited .env with your configuration"
echo "2. Export MikroTik CA certificate and place it in backend/certs/mikrotik-ca.crt"
echo "3. Run: docker compose up -d --build"
echo ""
