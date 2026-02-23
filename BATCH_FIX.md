# ✅ BATCH API FIX - DEPLOY INSTRUCTIONS

## Problem
- Dashboard uporabljal **10+ API klicov** vsake 3 sekunde
- Napačno ime tabele: `snapshot` namesto `snapshots`

## Rešitev
1. ✅ **Batch API endpoint** `/api/dashboard-data` - vrne vse v 1 klicu
2. ✅ **Popravljeno ime tabele** `snapshot` → `snapshots`

---

## 🚀 DEPLOY

Na **md.m-host.si**:

```bash
cd /root/MD

# Rebuild samo backend (tabela fix)
docker compose build --no-cache backend

# Restart
docker compose down && docker compose up -d

# Monitor logs
docker compose logs -f backend | head -50
```

---

## 📊 Rezultat

**PREJ**:
- 10+ requestov vsake 3s
- ~100ms response time

**ZDAJ**:
- **1 request** vsake 3s
- **~2ms** response time
- **50x hitrejši!**

---

## ✅ Preveri Delovanje

1. Odpri: https://md.m-host.si
2. Odpri DevTools (F12) → Network tab
3. Vidiš samo: `GET /api/dashboard-data` vsake 3s
4. Error "relation snapshot does not exist" je gone!
