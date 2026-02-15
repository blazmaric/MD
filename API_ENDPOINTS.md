# API Endpoints Documentation

Base URL: `https://your-domain.com/api`

## Authentication

### POST /auth/login
Login with username and password.
```json
{
  "username": "admin",
  "password": "your_password"
}
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "permissions": ["admin_all"]
  }
}
```

### POST /auth/logout
Logout current user.
**Response:**
```json
{
  "success": true
}
```

### GET /auth/me
Get current user information.
**Requires:** Authentication
**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "permissions": ["admin_all"]
}
```

---

## Summary / Dashboard

### GET /summary
Get system summary including all status data.
**Requires:** `view_summary` permission
**Response:**
```json
{
  "online": true,
  "stale": false,
  "timestamp": "2024-01-15T10:30:00Z",
  "lte": { ... },
  "wlan": { ... },
  "wlan5": { ... },
  "gps": { ... },
  "system": { ... },
  "interfaces": { ... }
}
```

### GET /interfaces
Get all network interfaces status.
**Requires:** `view_summary` permission
**Response:**
```json
{
  "interfaces": [
    {
      "name": "ether1",
      "running": true,
      "disabled": false,
      "rx-byte": "1234567890",
      "tx-byte": "9876543210"
    }
  ]
}
```

---

## Traffic

### GET /traffic?period=day&interface=Vxlan
Get traffic history for specified period and interface.
**Requires:** `view_traffic` permission
**Query params:**
- `period`: `day`, `week`, or `month` (default: `day`)
- `interface`: Interface name (default: `Vxlan`)

**Response:**
```json
{
  "history": [
    {
      "time_bucket": "2024-01-15T10:00:00Z",
      "interface_name": "Vxlan",
      "rx_bytes_delta": 1234567,
      "tx_bytes_delta": 7654321
    }
  ],
  "totals": {
    "total_rx": 123456789,
    "total_tx": 987654321
  }
}
```

### DELETE /traffic/history
Reset/delete all traffic history.
**Requires:** `admin_all` permission
**Response:**
```json
{
  "success": true,
  "message": "Traffic history reset successfully"
}
```

---

## Logs

### GET /logs?category=system&severity=error&search=failed&limit=100&offset=0
Get system logs with optional filters.
**Requires:** `view_logs` permission
**Query params:**
- `category`: Filter by log category
- `severity`: Filter by severity (error, warning, info)
- `search`: Search in message or topics
- `limit`: Number of logs to return (default: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "log_time": "2024-01-15T10:30:00Z",
      "topics": "system,error",
      "message": "Connection failed",
      "category": "system",
      "severity": "error"
    }
  ],
  "count": 42
}
```

---

## GPS

### GET /gps
Get current GPS location and status.
**Requires:** `view_gps` permission
**Response:**
```json
{
  "valid": true,
  "latitude": 46.0569,
  "longitude": 14.5058,
  "altitude": 298.5,
  "speed": 0,
  "satellites": 8,
  "datetime_fix": "2024-01-15 10:30:00"
}
```

---

## Ping

### POST /ping
Execute ping test to target address.
**Requires:** `use_ping` permission
**Request:**
```json
{
  "address": "8.8.8.8",
  "count": 4,
  "interface": "lte1"
}
```
**Response:**
```json
{
  "success": true,
  "result": "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=15.2 ms\n..."
}
```

---

## SMS

### GET /sms/inbox
Get all SMS messages from inbox.
**Requires:** `view_sms` permission
**Response:**
```json
{
  "messages": [
    {
      ".id": "*1",
      "phone": "+386123456789",
      "message": "Test message",
      "timestamp": "2024-01-15 10:30:00",
      "type": "inbox"
    }
  ]
}
```

### POST /sms/send
Send SMS message.
**Requires:** `send_sms` permission
**Request:**
```json
{
  "phone": "+386123456789",
  "message": "Your message here",
  "port": "lte1"
}
```
**Response:**
```json
{
  "success": true,
  "result": { ... }
}
```

### DELETE /sms/:id
Delete SMS message by ID.
**Requires:** `send_sms` permission
**Response:**
```json
{
  "success": true
}
```

---

## WiFi

### POST /wifi/scan
Scan for available WiFi networks.
**Requires:** `manage_wifi` permission
**Response:**
```json
{
  "networks": [
    {
      ".id": "*1",
      "ssid": "MyNetwork",
      "signal-strength": "-65",
      "channel": "6",
      "frequency": "2437"
    }
  ]
}
```

### POST /wifi/connect
Connect to WiFi network.
**Requires:** `manage_wifi` permission
**Request:**
```json
{
  "ssid": "MyNetwork",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true
}
```

### GET /wifi/registration-table?interface=wlan5
Get connected wireless clients.
**Requires:** `view_summary` permission
**Query params:**
- `interface`: Interface name (default: `wlan5`)

**Response:**
```json
{
  "clients": [
    {
      ".id": "*1",
      "interface": "wlan5",
      "mac-address": "AA:BB:CC:DD:EE:FF",
      "address": "192.168.1.100",
      "comment": "My Device",
      "signal-strength": "-55",
      "signal-to-noise": "45",
      "tx-rate": "144Mbps",
      "rx-rate": "72Mbps",
      "uptime": "1h30m",
      "bytes": "1234567890"
    }
  ]
}
```

### DELETE /wifi/client/:id
Disconnect wireless client by ID.
**Requires:** `manage_wifi` permission
**Response:**
```json
{
  "success": true
}
```

---

## System

### POST /system/reboot
Reboot the MikroTik device.
**Requires:** `admin_all` permission
**Response:**
```json
{
  "success": true,
  "message": "System reboot initiated"
}
```

---

## Users Management

### GET /users
Get all users.
**Requires:** `manage_users` permission
**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "permissions": ["admin_all"],
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /users
Create new user.
**Requires:** `manage_users` permission
**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "permissions": ["view_summary", "view_logs"],
  "is_active": true
}
```
**Response:**
```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "permissions": ["view_summary", "view_logs"],
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### PATCH /users/:id
Update user (password, permissions, or active status).
**Requires:** `manage_users` permission
**Request:**
```json
{
  "password": "newpassword123",
  "permissions": ["view_summary"],
  "is_active": false
}
```
**Response:**
```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "permissions": ["view_summary"],
    "is_active": false,
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### DELETE /users/:id
Disable user account (currently only disables, doesn't delete).
**Requires:** `manage_users` permission
**Response:**
```json
{
  "success": true
}
```

---

## Current Permissions System

Available permissions:
- `admin_all` - Full admin access to everything
- `view_summary` - View dashboard summary and interface status
- `view_traffic` - View traffic history and statistics
- `view_logs` - View system logs
- `view_sms` - View SMS inbox
- `send_sms` - Send and delete SMS messages
- `view_gps` - View GPS location
- `use_ping` - Use ping testing tool
- `manage_wifi` - Scan, connect WiFi, and manage wireless clients
- `manage_users` - Create, update, and manage users

---

## Testing Examples

### Test login:
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  -c cookies.txt
```

### Test summary (with cookie):
```bash
curl https://your-domain.com/api/summary -b cookies.txt
```

### Test ping:
```bash
curl -X POST https://your-domain.com/api/ping \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"address":"8.8.8.8","count":4}'
```

### Test traffic:
```bash
curl "https://your-domain.com/api/traffic?period=day&interface=Vxlan" -b cookies.txt
```

### Test GPS:
```bash
curl https://your-domain.com/api/gps -b cookies.txt
```
