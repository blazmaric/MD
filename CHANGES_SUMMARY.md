# MikroTik Dashboard - Spremembe / Changes

## ✅ Implementirano / Implemented

### 1. **Logs - Pagination (10 per page)**
- `frontend/src/components/LogViewer.tsx` - spremenjen `LOGS_PER_PAGE` iz 50 na 10

### 2. **Interface List - All Ethernet Interfaces**
- `frontend/src/components/InterfaceList.tsx` - spremenjeno filtriranje iz `ether[1-5]` na vse `ether*`
- Zdaj prikazuje VSE ethernet interfejse z dejanskimi imeni

### 3. **SMS - Delete + Pagination (4 per page)**
- `backend/src/mikrotik.js` - dodana `deleteSms()` funkcija
- `backend/src/routes/sms.js` - dodan DELETE endpoint `/sms/:id`
- `frontend/src/api.ts` - dodana `api.sms.delete()`
- `frontend/src/components/SmsManager.tsx` - dodana pagination (4 SMS per page) in delete button

### 4. **Traffic Charts/Graphs**
- `frontend/src/components/TrafficChart.tsx` - dodan SVG graf za prikaz traffic zgodovine
- Graf prikazuje RX (modra) in TX (zelena) linijo

### 5. **Backend API-ji**
- `/api/wifi/registration-table` - Wlan5 connected clients
- `/api/wifi/client/:id` (DELETE) - disconnect Wlan5 client
- `/api/interfaces` - seznam vseh interfejsov
- `/api/sms/:id` (DELETE) - delete SMS

### 6. **Nove komponente**
- `frontend/src/components/InterfaceList.tsx` - prikaz ethernet interfejsov (UP/DOWN status)
- `frontend/src/components/Wlan5Clients.tsx` - aktivni WiFi klienti na wlan5 z disconnect opcijo

## ⚠️ Za testiranje / To Test

### Reboot
- Endpoint: `POST /api/system/reboot`
- Backend: `backend/src/routes/system.js`
- Frontend: Reboot button v Dashboardu

### Ping
- Endpoint: `POST /api/ping`
- Podpora za source interface selection (LTE, wlan2.4, default)
- Preveri imena interfejsov v MikroTik konfiguraciji

### SMS
- Endpoint: `POST /api/sms/send`
- Uporablja parametre: `port`, `phone-number`, `message`
- Preveri če je LTE interface aktiviran

## 📋 Še manjka / Still Missing

### 1. WiFi Scanner v System Status kartico
- WiFi scanner gumb mora biti v WiFi kartici pri System Status
- Trenutno je ločena sekcija

### 2. Slovensko prevod
- Dodaj jezikovno izbiro (SLO/ENG)
- Prevedi vse texte v slovenščino
- SLO naj bo privzeto

## 🔧 Deploy Navodila

```bash
cd /root/MD

# Backend rebuild
docker compose build backend --no-cache
docker compose up -d backend

# Frontend rebuild
docker compose build frontend --no-cache
docker compose up -d frontend

# Check logs
docker compose logs -f backend
docker compose logs -f frontend
```

## 🐛 Debug če ne dela / Debug if not working

### Ping issue
Preveri interface imena v MikroTiku - morda niso `lte1` in `wlan2.4` ampak drugače poimenovani.

### SMS issue
Preveri če uporablja pravilne parametre v cURL:
```bash
curl -u api:'password' -X POST 'http://IP/rest/tool/sms/send' \
  -H 'content-type: application/json' \
  -d '{"port":"lte1","phone-number":"+386...","message":"Test"}'
```

### Reboot issue
Preveri če uporablja pravilni REST API:
```bash
curl -u api:'password' -X POST 'http://IP/rest/system/reboot' \
  -H 'content-type: application/json' -d '{}'
```
