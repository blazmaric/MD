# MikroTik Dashboard

Production-ready monitoring and management dashboard for MikroTik routers with admin/user access control.

## Architecture

- **Traefik**: Reverse proxy with automatic Let's Encrypt SSL certificates
- **Backend**: Node.js 20 + Fastify API server
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL 16 for persistent storage
- **Network**: Internal Docker network (backend not exposed to internet)

## Features

### Core Functionality
- Real-time system monitoring (LTE, WiFi, CPU, RAM, traffic, GPS)
- WiFi network scanner with signal strength and security info
- SMS message management (read, send, delete)
- Interface monitoring with real-time statistics
- Historical log collection and filtering
- Traffic usage tracking with persistence
- Ping testing tool
- Multi-user support with admin/user roles

### Security
- JWT authentication with HttpOnly cookies
- Backend isolated from public internet
- All MikroTik API calls proxied through backend
- Row-level security ready (PostgreSQL)
- CA certificate validation for MikroTik HTTPS
- SSH support for GPS and SMS operations

### User Roles
- **Admin**: Full access to all features including user management and system reboot
- **User**: Read-only access to dashboard, logs, and monitoring features

## Prerequisites

### Server Requirements
- Docker and Docker Compose installed
- Ports 80 and 443 open and available
- DNS A record pointing to your server IP

### Network Setup
- Docker host accessible from network
- MikroTik router accessible via HTTPS and SSH
- MikroTik REST API enabled with HTTPS
- MikroTik SSH access enabled
- MikroTik user with API and SSH access credentials

### Files You Need
1. MikroTik CA certificate exported from your router
2. Environment variables configured

## Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd mikrotik-dashboard
```

### 2. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Replace all `REPLACE_ME` values with your actual configuration:

```bash
# Domain Configuration
DOMAIN=md.m-host.si
LE_EMAIL=your-email@example.com

# MikroTik Configuration
MT_BASE_URL=https://172.20.50.6
MT_USER=api
MT_PASS=your_mikrotik_password
MT_SSH_PORT=22

# Admin Bootstrap (first-time login)
ADMIN_USER=admin
ADMIN_PASS=your_secure_admin_password

# Security (generate random strings)
JWT_SECRET=your_long_random_string_at_least_32_characters
DB_PASSWORD=your_database_password
```

**Generate secure random strings:**
```bash
openssl rand -base64 32
```

### 3. Add MikroTik CA Certificate

Export your MikroTik's CA certificate:

**On MikroTik:**
```
/certificate export-certificate mikrotik-ca export-passphrase=""
```

**Download the `.crt` file and place it on your server:**
```bash
# Copy the certificate content to backend/certs/mikrotik-ca.crt
# The certificate should look like:
# -----BEGIN CERTIFICATE-----
# MIIDXTCCAkWgAwIBAgIJAL...
# -----END CERTIFICATE-----
```

### 4. Run Setup Script

**CRITICAL:** This script sets correct file permissions (required for Traefik):

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Create required directories
- Set `chmod 600` on `traefik/acme.json` (required for Let's Encrypt)
- Set `chmod 600` on `.env` (security)
- Create placeholder CA certificate if missing

### 5. Deploy

```bash
docker compose up -d --build
```

### 6. Verify Deployment

Check logs:
```bash
docker compose logs -f
```

Access the dashboard:
```
https://your-domain.com
```

## Upgrading

When updating to a new version:

```bash
# Pull latest changes
git pull

# IMPORTANT: Run setup script to fix permissions
./setup.sh

# Rebuild and restart
docker compose down
docker compose up -d --build
```

**Note:** The setup script must run after every `git pull` to ensure correct file permissions for Let's Encrypt.

## First Login

1. Navigate to your configured domain
2. Login with your admin credentials from `.env`:
   - Username: value of `ADMIN_USER`
   - Password: value of `ADMIN_PASS`
3. Go to **Users** page and create additional users
4. Assign admin role if needed

## User Management

### Creating Users

1. Login as admin
2. Navigate to **Users** page
3. Click **Create User**
4. Set username, password (min 8 chars)
5. Check "Admin" if user should have full access
6. Save

### User Roles

**Admin:**
- Full dashboard access
- User management
- System reboot
- SMS management
- WiFi scanning
- All monitoring features

**Regular User:**
- Read-only dashboard access
- View logs and monitoring data
- Use ping tester
- No user management
- No system reboot

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Data Endpoints
- `GET /api/dashboard` - System status
- `GET /api/logs` - Logs with filtering
- `GET /api/traffic` - Traffic data
- `POST /api/ping` - Ping test
- `GET /api/interfaces` - Interface list
- `GET /api/gps` - GPS data

### SMS Endpoints (Admin only)
- `GET /api/sms` - List messages
- `POST /api/sms/send` - Send message
- `DELETE /api/sms/:id` - Delete message

### WiFi Endpoints
- `GET /api/wifi/scan` - Start WiFi scan
- `GET /api/wifi/scan/results` - Get scan results
- `GET /api/wifi/lte-check` - Check LTE status
- `GET /api/wifi/clients/wlan5` - Get 5GHz WiFi clients

### Admin Endpoints
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Disable user
- `POST /api/system/reboot` - Reboot MikroTik

### Layout Endpoints
- `GET /api/layout` - Get user's dashboard layout
- `POST /api/layout` - Save dashboard layout

## Configuration

### Polling Intervals

Edit in `.env`:

```bash
SUMMARY_POLL_SECONDS=3        # System status polling
SUMMARY_STALE_SECONDS=10      # Mark data as stale after
REQUEST_TIMEOUT_MS=2000       # MikroTik API timeout
```

### MikroTik Interfaces

Edit in `.env`:

```bash
LTE_IFACE=lte1               # LTE interface name
WLAN_IFACE=wlan2.4           # WiFi interface name
VXLAN_IFACE=Vxlan            # VXLAN interface for traffic tracking
```

### SSH Configuration

```bash
MT_SSH_PORT=22               # MikroTik SSH port (default: 22)
```

## Maintenance

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f traefik
docker compose logs -f postgres
```

### Restart Services

```bash
docker compose restart
```

### Update Application

```bash
git pull
./setup.sh
docker compose down
docker compose up -d --build
```

### Database Backup

```bash
docker compose exec postgres pg_dump -U mduser mikrotik_dashboard > backup.sql
```

### Database Restore

```bash
docker compose exec -T postgres psql -U mduser mikrotik_dashboard < backup.sql
```

## Troubleshooting

### Traefik: "permissions 644 for /acme.json are too open, please use 600"

**Cause:** File permissions on `traefik/acme.json` are incorrect.

**Solution:**
```bash
# Stop containers
docker compose down

# Fix permissions (MUST be 600 for Traefik to work)
chmod 600 traefik/acme.json

# Restart
docker compose up -d --build
```

**Prevention:** Always run `./setup.sh` before first deployment.

### Backend: "relation users does not exist"

**Cause:** Database migrations didn't run properly.

**Solution:**
```bash
# Check if volume has old data
docker compose down -v  # WARNING: This deletes all data!

# Rebuild
docker compose up -d --build
```

The backend automatically runs migrations on startup. If you see this error, the database volume likely has corrupted data.

### MikroTik: "self-signed certificate in certificate chain" or "bad base64 decode"

**Cause:** MikroTik CA certificate is missing, invalid, or in wrong format (DER instead of PEM).

**Solution:**

1. Export CA certificate from MikroTik:
```
/certificate export-certificate mikrotik-ca export-passphrase=""
```

2. Download the exported `.crt` file from MikroTik (Files menu)

3. **IMPORTANT:** Convert from DER to PEM format if needed:
```bash
# Check if it's in PEM format (should contain -----BEGIN CERTIFICATE-----)
cat mikrotik-ca.crt

# If it's binary (DER format), convert to PEM:
openssl x509 -inform DER -in mikrotik-ca.crt -out mikrotik-ca-pem.crt

# Copy to backend directory
cp mikrotik-ca-pem.crt backend/certs/mikrotik-ca.crt
```

4. Verify the certificate:
```bash
openssl x509 -in backend/certs/mikrotik-ca.crt -text -noout
```

5. Restart backend:
```bash
docker compose restart backend
```

**Common Issues:**
- "bad base64 decode" error = certificate is in DER format, needs conversion to PEM
- Certificate must start with `-----BEGIN CERTIFICATE-----`
- Some MikroTik versions export in DER format by default

### Let's Encrypt Certificate Issues

**Symptoms:**
- No ACME activity in Traefik logs
- Browser shows certificate warning
- HTTPS not working

**Debugging:**

1. Check Traefik logs for errors:
```bash
docker compose logs traefik | grep -i acme
docker compose logs traefik | grep -i cert
```

2. Verify prerequisites:
```bash
# Check acme.json permissions (must be 600)
ls -la traefik/acme.json

# Check if ports are accessible from public internet
curl -I http://your-domain.com
```

3. Check DNS resolution:
```bash
dig your-domain.com
```

**Common Issues:**

- **Port 80/443 not accessible** - Check firewall, NAT, port forwarding from public IP
- **DNS not resolving to correct IP** - Wait for DNS propagation (up to 48h)
- **Wrong acme.json permissions** - Run `./setup.sh` to fix
- **Invalid email in .env** - Check `LE_EMAIL` value
- **Domain not accessible** - Traefik requires domain to be publicly accessible on port 80 for ACME HTTP challenge

**Force certificate renewal:**
```bash
docker compose down
rm traefik/acme.json
./setup.sh
docker compose up -d
```

### Backend Cannot Connect to MikroTik

Check:
- MikroTik REST API is enabled
- MikroTik SSH is enabled
- MikroTik is accessible from Docker host
- CA certificate is correct
- Credentials are correct
- SSH port is correct (default: 22)

Test connectivity:
```bash
docker compose exec backend ping <mikrotik-ip>
```

### Database Connection Issues

Check database logs:
```bash
docker compose logs postgres
```

Verify connection:
```bash
docker compose exec backend node -e "require('./src/db.js').testConnection()"
```

### Frontend Not Loading

Check nginx logs:
```bash
docker compose logs frontend
```

Rebuild frontend:
```bash
docker compose up -d --build frontend
```

## Security Best Practices

1. **Change default passwords immediately**
2. **Use strong, unique passwords** (minimum 16 characters)
3. **Keep JWT_SECRET secure** and never commit to git
4. **Regularly update Docker images**
5. **Monitor logs for suspicious activity**
6. **Use principle of least privilege** - only make users admin if necessary
7. **Keep MikroTik firmware updated**
8. **Regularly backup database**
9. **Change default SSH port on MikroTik if exposed to internet**

## Development

### Local Development

Backend:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with local values
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Project Structure

```
.
├── docker-compose.yml           # Docker orchestration
├── .env.example                 # Environment template
├── setup.sh                     # Setup script
├── traefik/                     # Traefik config
│   └── acme.json               # SSL certificates
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── config.js           # Configuration
│   │   ├── db.js               # Database client
│   │   ├── auth.js             # Authentication
│   │   ├── mikrotik.js         # MikroTik API client
│   │   ├── poller.js           # Data collection
│   │   ├── jobManager.js       # Background jobs
│   │   ├── lteCache.js         # LTE status caching
│   │   ├── migrate.js          # Database migrations
│   │   └── routes/             # API endpoints
│   ├── certs/                  # CA certificates
│   ├── package.json
│   └── Dockerfile
└── frontend/                    # React app
    ├── src/
    │   ├── main.tsx            # Entry point
    │   ├── App.tsx             # Main app
    │   ├── api.ts              # API client
    │   ├── types.ts            # TypeScript types
    │   ├── i18n.ts             # Internationalization
    │   ├── ThemeContext.tsx    # Dark mode support
    │   ├── LanguageContext.tsx # Language switching
    │   └── components/         # React components
    ├── package.json
    ├── vite.config.ts
    └── Dockerfile
```

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
