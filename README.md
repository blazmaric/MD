# MikroTik Dashboard

Production-ready monitoring and management dashboard for MikroTik routers with permission-based access control.

## Architecture

- **Traefik**: Reverse proxy with automatic Let's Encrypt SSL certificates
- **Backend**: Node.js 20 + Fastify API server
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL 16 for persistent storage
- **Network**: Internal Docker network (backend not exposed to internet)

## Features

### Core Functionality
- Real-time system monitoring (LTE, WiFi, CPU, RAM, traffic)
- Historical log collection and filtering
- Traffic usage tracking with persistence
- Ping testing tool
- Permission-based RBAC (no role-based, purely permission-based)
- Multi-user support with granular permissions

### Security
- JWT authentication with HttpOnly cookies
- Backend isolated from public internet
- All MikroTik API calls proxied through backend
- Row-level security ready (PostgreSQL)
- CA certificate validation for MikroTik HTTPS

### Permissions System
Users can have any combination of these permissions:
- `view_summary` - View system status dashboard
- `view_logs` - Access log viewer
- `view_traffic` - View traffic statistics
- `use_ping` - Use ping tester
- `manage_users` - Create/edit users and permissions
- `admin_all` - Superuser (all permissions)

## Prerequisites

### Server Requirements
- Docker and Docker Compose installed
- Ports 80 and 443 open and available
- DNS A record: `md.m-host.si` → your server IP

### Network Setup
- Docker host: `172.20.20.3`
- MikroTik router: `172.20.50.6`
- MikroTik REST API enabled with HTTPS
- MikroTik user with API access credentials

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
https://md.m-host.si
```

## First Login

1. Navigate to `https://md.m-host.si`
2. Login with your admin credentials from `.env`:
   - Username: value of `ADMIN_USER`
   - Password: value of `ADMIN_PASS`
3. Go to **Users** page and create additional users
4. Assign permissions based on user needs

## User Management

### Creating Users

1. Login as admin
2. Navigate to **Users** page
3. Click **Create User**
4. Set username, password (min 8 chars)
5. Select permissions
6. Save

### Permission Examples

**NOC Operator:**
- `view_summary`
- `view_logs`
- `view_traffic`
- `use_ping`

**Read-Only Viewer:**
- `view_summary`
- `view_traffic`

**Administrator:**
- `admin_all`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Data Endpoints
- `GET /api/summary` - System status (requires `view_summary`)
- `GET /api/logs` - Logs with filtering (requires `view_logs`)
- `GET /api/traffic` - Traffic data (requires `view_traffic`)
- `POST /api/ping` - Ping test (requires `use_ping`)

### Admin Endpoints
- `GET /api/users` - List users (requires `manage_users`)
- `POST /api/users` - Create user (requires `manage_users`)
- `PATCH /api/users/:id` - Update user (requires `manage_users`)
- `DELETE /api/users/:id` - Disable user (requires `manage_users`)

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

### MikroTik: "self-signed certificate in certificate chain"

**Cause:** MikroTik CA certificate is missing or invalid.

**Solution:**
1. Export CA certificate from MikroTik: `/certificate export-certificate mikrotik-ca export-passphrase=""`
2. Copy the `.crt` file content to `backend/certs/mikrotik-ca.crt`
3. Restart backend: `docker compose restart backend`

The certificate must be in PEM format and include the full certificate chain.

### Let's Encrypt Certificate Issues

Check Traefik logs:
```bash
docker compose logs traefik
```

Ensure:
- Port 80 and 443 are accessible from internet
- DNS record points to your server
- Email in `.env` is valid
- acme.json has correct permissions: `chmod 600 traefik/acme.json`

### Backend Cannot Connect to MikroTik

Check:
- MikroTik REST API is enabled
- MikroTik is accessible from Docker host
- CA certificate is correct
- Credentials are correct

Test connectivity:
```bash
docker compose exec backend ping 172.20.50.6
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
6. **Use principle of least privilege** for permissions
7. **Keep MikroTik firmware updated**
8. **Regularly backup database**

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
├── traefik/                     # Traefik config
│   └── acme.json               # SSL certificates
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── config.js           # Configuration
│   │   ├── db.js               # Database client
│   │   ├── auth.js             # Auth & permissions
│   │   ├── mikrotik.js         # MikroTik API client
│   │   ├── poller.js           # Data collection
│   │   └── routes/             # API endpoints
│   ├── migrations/             # Database schema
│   │   └── 001_init.sql
│   ├── certs/                  # CA certificates
│   ├── package.json
│   └── Dockerfile
└── frontend/                    # React app
    ├── src/
    │   ├── main.tsx            # Entry point
    │   ├── App.tsx             # Main app
    │   ├── api.ts              # API client
    │   ├── types.ts            # TypeScript types
    │   └── components/         # React components
    ├── package.json
    ├── vite.config.ts
    └── Dockerfile
```

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
