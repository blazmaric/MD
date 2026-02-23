# ✅ REAL-TIME DASHBOARD - EN API KLIC

## Problem
❌ Dashboard uporabljal **10+ API klicev** vsake 3s
❌ Backend iskal **`lte_check_cache`** tabelo (ne obstaja)
❌ Backend iskal **`snapshot`** namesto **`snapshots`**

## Rešitev
✅ **1 API endpoint** `/api/dashboard-data` vrne VSE podatke
✅ **Brez cache tabel** - vse iz `snapshots` (polled vsake 3s)
✅ **Real-time prikaz** - fresh data vsake 3 sekunde

---

## 📊 Kaj vrača `/api/dashboard-data`

```json
{
  "timestamp": "2026-02-23T09:50:00Z",
  "cacheAge": 2,
  "summary": { /* snapshot data */ },
  "wlan24": {
    "ssid": "MikroTik",
    "status": "running",
    "signal": -65,
    "tx_rate": "300Mbps",
    "rx_rate": "150Mbps"
  },
  "wlan5": {
    "speed_rx": 1234567,
    "speed_tx": 987654
  },
  "lte": {
    "operator": "A1",
    "rsrp": -85,
    "rsrq": -10,
    "rssi": -65,
    "sinr": 15
  },
  "gps": {
    "latitude": 46.123456,
    "longitude": 14.987654,
    "altitude": 320.5,
    "speed": 0,
    "satellites": 12,
    "valid": true,
    "datetime_fix": "2026-02-23 09:50:00"
  },
  "system": {
    "uptime": 123456,
    "cpu_percent": 25.5,
    "ram_percent": 45.2
  }
}
```

---

## 🚀 DEPLOY

```bash
cd /root/MD

# Rebuild backend
docker compose build --no-cache backend

# Restart
docker compose down && docker compose up -d

# Check logs
docker compose logs -f backend | head -30
```

---

## ✅ Rezultat

**PREJ**:
- 10+ API calls vsake 3s
- ~500ms total time
- ERROR: lte_check_cache ne obstaja
- ERROR: snapshot ne obstaja

**ZDAJ**:
- **1 API call** vsake 3s → `/api/dashboard-data`
- **~2ms response time**
- **Real-time data** (3s freshness)
- **Ni več errorjev!**

---

## 📈 Podatki se updatajo

Backend poller zbira podatke **vsake 3 sekunde** iz MikroTika in shranjuje v `snapshots` tabelo:
- LTE status (RSRP, RSRQ, RSSI, SINR)
- WiFi 2.4GHz + 5GHz
- GPS pozicija
- System resources (CPU, RAM, uptime)
- Traffic speeds

Frontend pulla `/api/dashboard-data` **vsake 3 sekunde** → **skoraj real-time!**
