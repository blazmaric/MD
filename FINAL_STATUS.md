# MikroTik Dashboard - Finalni status popravkov

## ✅ IMPLEMENTIRANO

### 1. **Slovenski prevod + Language Switcher**
- ✅ Ustvarjen `frontend/src/i18n.ts` z vsemi prevodi (SLO + ENG)
- ✅ Ustvarjen `frontend/src/LanguageContext.tsx` - language context provider
- ✅ Posodobljen `frontend/src/main.tsx` - dodana LanguageProvider
- ✅ Posodobljen `frontend/src/App.tsx` - dodan language switcher gumb (Globe icon + SLO/EN)
- ✅ Slovenščina je PRIVZETI jezik
- 🔧 Za prevod VSEH komponent: dodaj `const { t } = useLanguage()` in uporabi `t('key')`

### 2. **Logs Pagination - 10 na stran**
- ✅ `LOGS_PER_PAGE = 10` v `LogViewer.tsx`
- ✅ Pagination z Previous/Next gumbi
- ✅ Strani: 1, 2, 3, ... z ellipsis

### 3. **SMS - Delete + Pagination (4 na stran)**
- ✅ Backend: `deleteSms()` v `mikrotik.js`
- ✅ Backend: `DELETE /api/sms/:id` endpoint
- ✅ Frontend: Delete gumb (trash icon)
- ✅ Pagination: 4 SMS na stran

### 4. **Interface List - VSI ethernet interfejsi**
- ✅ Filter spremenjen iz `ether[1-5]` na `ether*`
- ✅ Prikazuje VSE ethernet porte z dejanskimi imeni

### 5. **Traffic Graf**
- ✅ SVG graf dodan v `TrafficChart.tsx`
- ✅ Modra (RX) in zelena (TX) linija
- ✅ Graf prikazuje traffic skozi čas

### 6. **Wlan5 Clients**
- ✅ Nova komponenta `Wlan5Clients.tsx`
- ✅ Prikazuje aktivne WiFi kliente
- ✅ Disconnect opcija (X gumb)

### 7. **API Endpoints**
- ✅ `/api/wifi/registration-table` - Wlan5 clients
- ✅ `/api/wifi/client/:id` (DELETE) - disconnect client
- ✅ `/api/interfaces` - seznam interfejsov
- ✅ `/api/sms/:id` (DELETE) - delete SMS

### 8. **Ping Tester**
- ✅ Popravljena imena interfejsov: `lte1`, `wlan2.4`, `wlan5`

### 9. **Logout Button**
- ✅ Dodan error handling v `App.tsx`

## ⚠️ ZA TESTIRANJE / DEBUGGING

### Če gumbi NE DELAJO:

#### 1. **Logout gumb**
Preveri browser console:
```javascript
// V browser console:
localStorage.clear();
// Potem refresh stran
```

#### 2. **Reboot gumb**
Test direktno z cURL:
```bash
curl -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/system/reboot' \
  -H 'content-type: application/json' -d '{}'
```

#### 3. **Ping gumb**
Preveri imena interfejsov v MikroTiku:
```bash
curl -u api:'dsg183kjd1!lk' 'http://172.20.50.6/rest/interface'
```
Če niso `lte1`, `wlan2.4` → popravi v `PingTester.tsx` line 59-61

#### 4. **SMS Send gumb**
Test direktno:
```bash
curl -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/tool/sms/send' \
  -H 'content-type: application/json' \
  -d '{"port":"lte1","phone-number":"+38670288250","message":"Test"}'
```

#### 5. **Delete User gumb**
Preveri v browser console ali je error. Mogoče problem s permissions.

## 📋 ŠE MANJKA

### 1. Prevod VSEH komponent v slovenščino
Vse komponente potrebujejo:
```typescript
import { useLanguage } from '../LanguageContext';
// ...
const { t } = useLanguage();
// Nato uporabi t('key') namesto hard-coded textov
```

**Prioritete za prevod:**
1. `Dashboard.tsx` - glavni naslov, gumbi
2. `InterfaceList.tsx` - vsi texti
3. `LogViewer.tsx` - filtri, gumbi
4. `PingTester.tsx` - labele, gumbi
5. `SmsManager.tsx` - labele, gumbi
6. `TrafficChart.tsx` - labele
7. `WiFiScanner.tsx` - labele
8. `Wlan5Clients.tsx` - labele
9. `UsersPage.tsx` - labele, gumbi

### 2. Port speed pri Interface Status
Ko je port UP, prikaži hitrost (1Gbps, 100Mbps, itd.)

Potrebuješ:
- Backend API mora vrniti `rate` ali `speed` field
- Frontend prikaže pod statusom

### 3. Traffic graf - hover tooltips
Dodaj `<title>` tag v SVG za tooltip na hover

### 4. WiFi Scanner v System Status kartico
Trenutno je ločen razdelek, moraš ga prestaviti v System Status → WiFi kartico

## 🚀 DEPLOY NAVODILA

```bash
cd /root/MD

# Kopiraj VSE datoteke iz /tmp/cc-agent/63017624/project/

# Backend rebuild
docker compose down
docker compose build backend --no-cache
docker compose up -d backend

# Frontend rebuild
docker compose build frontend --no-cache
docker compose up -d frontend

# Preveri logs
docker compose logs -f backend
docker compose logs -f frontend
```

## 💡 DODATNI PREDLOGI

1. **CPU Temperature Monitor** - prikaži temperaturo CPU
2. **Bandwidth Graph** - real-time graph bandwidth
3. **Alert System** - obvestila ko gre kaj narobe
4. **Auto-refresh Toggle** - možnost izklopa auto-refresh
5. **Dark Mode** - temna tema
6. **Export Traffic Data** - izvoz v CSV/Excel
7. **LTE Signal Strength Graph** - graf jakosti LTE signala
8. **Connection History** - zgodovina povezav
9. **Firewall Rules Viewer** - pregled firewall pravil
10. **DHCP Leases** - seznam DHCP lease-ov

## 🐛 POMEMBNO

**Če gumbi ne delajo:**
1. Odpri Browser Console (F12)
2. Klikni na gumb
3. Poglej error message
4. Copy error in mi pošlji za debug

**Če pagination ne dela:**
1. Preveri API response v Network tab (F12)
2. Poglej ali backend vrača `count` field
3. Check console za errors

**Če jezik switching ne dela:**
1. Clear localStorage: `localStorage.clear()`
2. Refresh stran
3. Preveri browser console
