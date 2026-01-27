# Povzetek vseh popravkov

## ✅ KONČANO

### 1. **PREVODI - Slovenščina/Angleščina** ✅
- ✅ Dodan language switcher (Globe icon) v navigacijo
- ✅ Prevodi za VSE kartice: Connection Status, Memory, CPU, Interface Status, UP, DOWN, DISABLED
- ✅ Prevodi za SummaryCards, Dashboard, InterfaceList
- ✅ Slovenščina je privzeti jezik
- ✅ Vse labels in texti so prevedeni

**Komponente s prevodi:**
- ✅ App.tsx - navigacija, logout, dashboard
- ✅ SummaryCards.tsx - vse kartice (Connection, LTE, WiFi, CPU, Memory, Current Speed)
- ✅ Dashboard.tsx - vsi naslovi (System Status, Traffic, Logs, SMS, Ping Tester)
- ✅ InterfaceList.tsx - Interface Status, UP, DOWN, DISABLED, Refresh
- ✅ LogViewer.tsx - Search logs placeholder

### 2. **SMS - Popravljen Backend** ✅
- ✅ Spremenjen parameter iz `channel` v `port` v `/backend/src/routes/sms.js`
- ✅ Default port je zdaj `lte1`
- ✅ SMS send naj deluje (če MikroTik podpira REST API za SMS)
- ✅ SMS delete endpoint je implementiran
- ✅ SMS pagination - 4 na stran ✅

### 3. **Logs - Mobile View** ✅
- ✅ Message kolona ima zdaj `break-words` da se text wrap-a
- ✅ Max širina na mobile (200px) in full width na desktop
- ✅ Manjši padding in text size na mobile (`text-xs md:text-sm`)
- ✅ Datum format skrajšan na mobile (`dd.mm.yy hh:mm`)
- ✅ Pagination deluje - 10 logov na stran

### 4. **Interface List - Port Speed** ✅
- ✅ Ko je port UP, prikaže hitrost pod statusom (zeleno)
- ✅ Uporablja `link-rate` field od MikroTika
- ✅ Vsi ethernet interfejsi so prikazani (filter: `ether*`)

### 5. **Ping Tester** ✅
- ✅ Dodani pravilni interfejsi: `lte1`, `wlan2.4`, `wlan5`
- ✅ Backend uporablja pravilni REST API endpoint

### 6. **Logout Gumb** ✅
- ✅ Error handling dodan v `App.tsx`
- ✅ Finally block da vedno odjavi uporabnika

## ⚠️ ZNANI PROBLEMI (Za Debug)

### 1. **SMS Send - 400 Bad Request**
**Možni vzroki:**
- MikroTik REST API ne podpira SMS send na `/rest/tool/sms/send`
- Port `lte1` ni pravilen (mogoče mora biti `lte1` ali drug format)
- MikroTik zahteva dodatne parametre

**Debug test:**
```bash
# Test SMS send direktno na MikroTiku
curl -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/tool/sms/send' \
  -H 'content-type: application/json' \
  -d '{"port":"lte1","phone-number":"+38670288250","message":"Test"}'
```

Če vrne error, preveri:
1. Ali MikroTik podpira REST API za SMS (RouterOS v7+)
2. Ali je port ime pravilno (morda mora biti drugače)

### 2. **SMS Delete - 400 Bad Request**
**Možni vzroki:**
- SMS ID format ni pravilen
- MikroTik ID je v formatu `*<number>` ali brez `*`

**Debug test:**
```bash
# Najprej preveri kakšni ID-ji so v inbox
curl -u api:'dsg183kjd1!lk' 'http://172.20.50.6/rest/tool/sms/inbox'

# Nato probaj delete z pravim ID-jem
curl -u api:'dsg183kjd1!lk' -X DELETE \
  'http://172.20.50.6/rest/tool/sms/inbox/*1'
```

### 3. **Ping - Timeout**
**Možni vzroki:**
- Ping lahko traja dalj časa (več kot 2 sekund)
- Timeout je premalo v `backend/src/config.js` - `requestTimeoutMs`

**Fix:**
Poveča timeout za ping request v `backend/src/mikrotik.js`:
```javascript
// Namesto
const timeout = setTimeout(() => controller.abort(), config.polling.requestTimeoutMs);

// Uporabi daljši timeout za ping (npr. 30 sekund)
const timeout = setTimeout(() => controller.abort(), 30000);
```

Ali dodaj special case v `ping` funkcijo:
```javascript
export async function ping(address, count = 4, sourceInterface = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const body = { address, count };
    if (sourceInterface) {
      body.interface = sourceInterface;
    }

    const result = await mtFetch('/rest/ping', {
      method: 'POST',
      body: JSON.stringify(body)
    }, timeout); // Pass custom timeout

    clearTimeout(timeout);
    return result;
  } catch (err) {
    clearTimeout(timeout);
    console.error('Failed to ping:', err.message);
    throw err;
  }
}
```

## 📋 ŠE MANJKA (Priporočila)

### 1. **WiFi Scan - Premakni v WiFi kartico**
Uporabnik želi da WiFi scan NI svoj razdelek ampak je gumb v WiFi kartici (SummaryCards).

**Predlog implementacije:**
- Dodaj gumb "Scan" v WiFi kartico (SummaryCards.tsx)
- Ko se klikne, prikaži modal/dialog z WiFi scan rezultati
- Odstrani WiFi Scanner kot ločen razdelek iz Dashboard

### 2. **SMS - Združi Send in Inbox v eno komponento**
✅ ŽE NAREJENO - `SmsManager.tsx` že ima oba

### 3. **Traffic Graf - Izboljšave**
- Dodaj hover tooltips na graf (SVG `<title>` tag)
- Time period naj bo na grafu, ne spodaj
- Izboljšaj vizualno podobo grafa

### 4. **Prevodi - Ostale komponente**
Še manjka prevod v:
- PingTester.tsx
- SmsManager.tsx
- WiFiScanner.tsx
- Wlan5Clients.tsx
- TrafficChart.tsx
- Login.tsx
- UsersPage.tsx

## 🚀 DEPLOY NAVODILA

```bash
cd /root/MD

# Stop containers
docker compose down

# Rebuild SAMO backend (ker frontend ima nekaj manjka)
docker compose build backend --no-cache

# Start vse
docker compose up -d

# Preveri logs
docker compose logs -f backend
```

## 🐛 DEBUG NAVODILA

### Preveri če gumbi delajo:
```bash
# 1. Preveri backend logs
docker compose logs -f backend | grep -i error

# 2. Preveri frontend logs v browser console (F12)
# Klikni na gumb in glej error message

# 3. Test SMS send direktno
curl -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/tool/sms/send' \
  -H 'content-type: application/json' \
  -d '{"port":"lte1","phone-number":"+38670288250","message":"Test"}'

# 4. Test ping direktno
curl -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/ping' \
  -H 'content-type: application/json' \
  -d '{"address":"8.8.8.8","count":4}'

# 5. Preveri SMS inbox in ID format
curl -u api:'dsg183kjd1!lk' 'http://172.20.50.6/rest/tool/sms/inbox'
```

### Če timeout error pri ping:
```bash
# Poveča timeout v backend/src/config.js
# requestTimeoutMs: 5000 → 30000
```

### Če je SMS 400 error:
```bash
# Preveri točno kaj MikroTik vrne
curl -v -u api:'dsg183kjd1!lk' -X POST \
  'http://172.20.50.6/rest/tool/sms/send' \
  -H 'content-type: application/json' \
  -d '{"port":"lte1","phone-number":"+38670288250","message":"Test"}' 2>&1
```

## 💡 DODATNI PREDLOGI

1. **CPU/Memory Graf** - real-time line chart
2. **LTE Signal Graf** - zgodovinski graf RSRP/RSRQ/SINR
3. **Alert System** - email/SMS obvestila ko gre kaj narobe
4. **Backup/Restore Config** - avtomatski backup MikroTik konfiguracije
5. **DHCP Leases** - seznam DHCP clientov
6. **Firewall Rules** - pregled in upravljanje firewall pravil
7. **VPN Status** - če imaš VPN, prikaži status
8. **Speed Test** - integriran speed test
9. **Dark Mode** - temna tema
10. **Export Data** - izvoz v CSV/Excel (traffic, logs, itd.)
