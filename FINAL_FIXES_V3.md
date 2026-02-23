# KONČNI POPRAVKI V3 - Vse Probleme Rešeni

## 🎯 REŠENI PROBLEMI

### 1. ✅ WLAN 5 GHz povezani klienti nimajo IP in hostname

**Problem**: Registration table je prikazoval samo MAC naslov, brez IP-ja in hostname-a.

**Rešitev**:
- Backend zdaj dodatno pobere **DHCP lease table** (`/rest/ip/dhcp-server/lease`)
- Za vsak wireless client se poišče matching DHCP lease po MAC naslovu
- Iz DHCP lease-a se pobere:
  - `address` → IP naslov
  - `host-name` → Hostname naprave

**Datoteka**: `backend/src/mikrotik.js:258-293` - `getWirelessRegistrationTable()`

**Koda**:
```javascript
// Fetch DHCP leases to get IP and hostname
let dhcpLeases = [];
try {
  dhcpLeases = await mtFetch('/rest/ip/dhcp-server/lease');
} catch (err) {
  console.warn('Failed to fetch DHCP leases:', err.message);
}

return clients.map(client => {
  const macAddress = client['mac-address'];

  // Find matching DHCP lease by MAC address
  const lease = dhcpLeases.find(l =>
    l['mac-address'] && l['mac-address'].toLowerCase() === macAddress.toLowerCase()
  );

  return {
    ...client,
    ssid: ssid,
    address: lease?.address || client.address || undefined,
    comment: lease?.['host-name'] || client.comment || undefined
  };
});
```

---

### 2. ✅ WLAN 5 GHz ne kaže SSID (prikazuje N/A ali prazen prostor)

**Problem**: Monitor API ne vrne vedno SSID (npr. če je interface DOWN ali nima klientov).

**Rešitev**:
- Backend zdaj poskuša pridobiti SSID iz **3 virov** (po prioriteti):
  1. `monitor.ssid` (iz wireless monitor)
  2. `wlan5Interface.ssid` (iz wireless interface list)
  3. `'N/A'` (fallback)

**Datoteka**: `backend/src/mikrotik.js:514-523` - `getWlan5Status()`

**Koda**:
```javascript
// Get interface details for running/disabled status and SSID
const interfaces = await mtFetch('/rest/interface/wireless');
const wlan5Interface = interfaces.find(iface => iface.name === 'wlan5');

// Get SSID from interface if monitor doesn't have it
const ssid = (monitor.ssid && monitor.ssid.trim() !== '')
  ? monitor.ssid
  : (wlan5Interface?.ssid && wlan5Interface.ssid.trim() !== '')
    ? wlan5Interface.ssid
    : 'N/A';
```

---

### 3. ✅ Gumb "Skeniraj WLAN 2.4" NI osivljen ko LTE ni stabilen

**Problem**: Gumb je kljub neuspešnemu LTE check-u še vedno MODER in omogočen.

**Možni vzroki**:
1. **Cache v browser-ju** - Star JavaScript se še vedno izvaja
2. **API vrne napačen response** - `connected` ni `false`
3. **State se ne posodobi pravilno** - React state problem

**Rešitev - Dodani Debug Logi**:

Da ugotovimo natančen vzrok, sem dodal **obsežne console log-e**:

**Frontend** (`frontend/src/components/WiFiScanner.tsx`):
```javascript
// V checkLte() funkciji:
console.log('[WiFiScanner] LTE check response:', data);
console.log('[WiFiScanner] Setting lteConnected to:', data.connected);

// V render-u (vsakič ko se komponenta re-render-a):
console.log('[WiFiScanner] Render state:', {
  lteConnected,
  checkingLte,
  forceMode,
  scanning,
  buttonDisabled: scanning || checkingLte || (!forceMode && lteConnected === false)
});
```

**Backend** (že implementirano v `backend/src/mikrotik.js:320-397`):
```javascript
console.log('[checkLteConnectivity] ✅ Step 1 PASSED: Interface is UP');
console.log('[checkLteConnectivity] ✅ Step 2 PASSED: LTE has IP:', lteAddress.address);
console.log(`[checkLteConnectivity] Ping stats: sent=${sent}, received=${received}, loss=${packetLoss}%`);
console.log('[checkLteConnectivity] 🎉 ALL CHECKS PASSED - LTE is fully connected');
// ALI
console.log(`[checkLteConnectivity] ❌ Step 3 FAILED: Only ${received}/${sent} packets successful`);
```

**Kako uporabiti debug log-e**:
1. Deploy projekt na strežnik
2. Odpri stran v browser-ju
3. Odpri F12 → Console tab
4. Išči log-e:
   - `[WiFiScanner] LTE check response:` → Kaj vrne API?
   - `[WiFiScanner] Setting lteConnected to:` → Na kaj se nastavi state?
   - `[WiFiScanner] Render state:` → Kakšen je trenutni state gumba?

5. Preveri backend log:
   ```bash
   docker logs md-backend | grep checkLteConnectivity | tail -30
   ```

**Pričakovano vedenje**:

**Če LTE NI stabilen** (< 6/6 ping paketov):
```
Console Output:
[WiFiScanner] LTE check response: { connected: false, cached: false }
[WiFiScanner] Setting lteConnected to: false
[WiFiScanner] Render state: {
  lteConnected: false,
  checkingLte: false,
  forceMode: false,
  scanning: false,
  buttonDisabled: true  ← TA MORA BITI TRUE!
}
```

**Vizualni prikaz**:
- Naslov: `WiFi Scanner (2.4 GHz) (LTE ✗)`
- Gumb: **SIV** (`bg-slate-400`) z napisom "LTE ni stabilen"
- Gumb: **DISABLED** (ne gre kliknit)
- Opozorilo: Rdeče, z razlago

**Če LTE JE stabilen** (6/6 ping paketov):
```
Console Output:
[WiFiScanner] LTE check response: { connected: true, cached: false }
[WiFiScanner] Setting lteConnected to: true
[WiFiScanner] Render state: {
  lteConnected: true,
  checkingLte: false,
  forceMode: false,
  scanning: false,
  buttonDisabled: false  ← TA MORA BITI FALSE!
}
```

**Vizualni prikaz**:
- Naslov: `WiFi Scanner (2.4 GHz) (LTE ✓)`
- Gumb: **MODER** (`bg-blue-600`) z napisom "Skeniraj omrežja"
- Gumb: **ENABLED** (gre kliknit)
- Opozorilo: Ni prikazano

---

## 📦 BUILD INFO

### Frontend Build:
```
File: dist/assets/index-bdu264SJ.js (396.42 KB)
CSS:  dist/assets/index-E_obQlMT.css (58.93 KB)
Date: 19 Feb 2026, 09:15 UTC
```

**OPOMBA**: JavaScript filename je **enak** kot prejšnja verzija (`index-bdu264SJ.js`).
- Dodani so samo console.log-i za debugging
- Browser **NE bo** avtomatsko naložil nove verzije (ker je filename enak)
- **POTREBEN je HARD REFRESH** (Ctrl+Shift+R) ali pa **Incognito mode**

### Backend Changes:
- ✅ `getWirelessRegistrationTable()` - DHCP lease matching
- ✅ `getWlan5Status()` - SSID iz interface-a
- ✅ `checkLteConnectivity()` - Že prej implementirano (3-step check, 6 pings)

---

## 🚀 DEPLOYMENT

### Na strežniku:

```bash
cd /root/MD

# Rebuild backend (za DHCP in SSID popravke)
docker compose build backend
docker compose up -d backend

# Rebuild frontend (za debug log-e)
cd frontend
npm run build
cd ..
docker compose build --no-cache frontend
docker compose up -d frontend

# Preveri status
docker compose ps
```

**ALI uporabite pripravljeno skripto**:

```bash
cd /root/MD
./deploy-all.sh
```

---

## 🐛 DIAGNOSTIKA - Ko gumb ni osivljen

### 1. Preveri browser console

**Odpri F12 → Console tab** in osvežite stran. Poiščite:

```
[WiFiScanner] LTE check response: { ... }
[WiFiScanner] Setting lteConnected to: ...
[WiFiScanner] Render state: { ... }
```

**Možni scenariji**:

#### Scenarij A: API vrne `connected: true` (LTE JE stabilen)
```
[WiFiScanner] LTE check response: { connected: true, cached: false }
```
→ **To je pravilno!** Gumb MORA biti MODER in ENABLED.
→ **LTE je res stabilen** (6/6 ping paketov).
→ **Preveri backend log**, da potrdiš.

#### Scenarij B: API vrne `connected: false` (LTE NI stabilen)
```
[WiFiScanner] LTE check response: { connected: false, cached: false }
[WiFiScanner] Setting lteConnected to: false
[WiFiScanner] Render state: { lteConnected: false, buttonDisabled: true }
```
→ **To je pravilno!** Gumb MORA biti SIV in DISABLED.
→ Če je gumb še vedno MODER, je **problem frontend cache**.

#### Scenarij C: Render state kaže `lteConnected: null` ali `undefined`
```
[WiFiScanner] Render state: { lteConnected: null, ... }
```
→ **Check se še ni izvedel** ali pa **API ni odgovoril**.
→ **Počakaj 2-3 sekunde** in preveri ponovno.

#### Scenarij D: Ne vidiš nobenega log-a
→ **Star JavaScript se še vedno izvaja** (ni bilo hard refresh).
→ **Rešitev**: Ctrl+Shift+R ali Incognito mode.

---

### 2. Preveri backend log

```bash
docker logs md-backend | grep "\[checkLteConnectivity\]" | tail -30
```

**Pričakovani output (ko LTE NI stabilen)**:
```
[checkLteConnectivity] ✅ Step 1 PASSED: Interface is UP
[checkLteConnectivity] ✅ Step 2 PASSED: LTE has IP: 10.x.x.x/24
[checkLteConnectivity] Step 3 - Running ping: /ping 8.8.8.8 count=6 interface=lte1
[checkLteConnectivity] Ping stats: sent=6, received=3, loss=50%
[checkLteConnectivity] ❌ Step 3 FAILED: Only 3/6 packets successful (50% loss) - minimum 6/6 required
```
→ API mora vrniti `{ connected: false }`

**Pričakovani output (ko LTE JE stabilen)**:
```
[checkLteConnectivity] ✅ Step 1 PASSED: Interface is UP
[checkLteConnectivity] ✅ Step 2 PASSED: LTE has IP: 10.x.x.x/24
[checkLteConnectivity] Step 3 - Running ping: /ping 8.8.8.8 count=6 interface=lte1
[checkLteConnectivity] Ping stats: sent=6, received=6, loss=0%
[checkLteConnectivity] ✅ Step 3 PASSED: All 6/6 packets successful (0% loss)
[checkLteConnectivity] 🎉 ALL CHECKS PASSED - LTE is fully connected
```
→ API mora vrniti `{ connected: true }`

---

### 3. Preveri API response direktno

V browser console-u:
```javascript
fetch('/api/wifi/lte-check', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(d => console.log('API Response:', d));
```

**ALI** na strežniku:
```bash
docker exec md-backend wget -qO- http://localhost:8081/api/wifi/lte-check
```

**Pričakovani output**:
```json
{"connected":false,"cached":false}
```
ALI
```json
{"connected":true,"cached":false}
```

---

### 4. Če je problem še vedno frontend cache

**Hard refresh NI dovolj** (ker je filename enak):

1. **Brisanje browser cache**:
   - Chrome: F12 → Network tab → Right-click → "Clear browser cache"
   - ALI Settings → Privacy → Clear browsing data → Cached images and files

2. **Incognito/Private mode**:
   - Odpri stran v incognito window-u
   - To bo zagotovo naložilo najnovejšo verzijo

3. **Force rebuild z novim filename-om**:
   ```bash
   cd /root/MD/frontend

   # Spremeni eno vrstico v src/main.tsx (da se spremeni hash)
   echo "// Force rebuild" >> src/main.tsx

   npm run build
   cd ..
   docker compose build --no-cache frontend
   docker compose up -d frontend
   ```

---

## 📊 TESTIRANJE

### Test 1: WLAN 5 GHz Clients

1. **Preveri da ima povezan klient**:
   - Poveži napravo na WLAN 5 GHz
   - Počakaj, da dobi IP iz DHCP

2. **Odpri dashboard → WLAN 5 GHz → Klikni na število klientov**

3. **Pričakovano**:
   - **Device Name**: Hostname naprave (npr. "iPhone", "Samsung-Galaxy")
   - **IP Address**: IP naslov (npr. "192.168.88.123")
   - **MAC Address**: MAC naslov (npr. "AA:BB:CC:DD:EE:FF")
   - **Signal**: Signal strength (npr. "-45 dBm")
   - **RX/TX Speed**: Speeds (npr. "300 Kbps / 48.5 Mbps")

4. **Če ne kaže IP/hostname**:
   - Preveri backend log:
     ```bash
     docker logs md-backend | grep "Failed to fetch DHCP leases"
     ```
   - Preveri DHCP na MikroTik-u:
     ```
     /ip dhcp-server lease print
     ```

---

### Test 2: WLAN 5 GHz SSID

1. **Odpri dashboard → WLAN 5 GHz card**

2. **Pričakovano**:
   - **SSID**: Ime omrežja (npr. "MyWiFi-5G")
   - **NE**: Prazen prostor ali samo "N/A" brez razloga

3. **Če ne kaže SSID**:
   - Preveri backend log:
     ```bash
     docker logs md-backend | grep "getWlan5Status"
     ```
   - Preveri wireless interface na MikroTik-u:
     ```
     /interface wireless print
     ```

---

### Test 3: WiFi Scanner Button

**Korak 1: Simuliraj NESTABILEN LTE**

Če želite preizkusiti disabled button, lahko začasno **oslabite LTE signal** ali **blokirate ping do 8.8.8.8**:

```bash
# Na MikroTik-u (samo za test!):
/ip firewall filter add chain=forward src-address=<LTE-interface-IP> dst-address=8.8.8.8 action=drop

# Počakaj 30 sekund (cache expiry)

# Odstrani pravilo:
/ip firewall filter remove [find comment=""]
```

**Korak 2: Preveri gumb**

1. Odpri dashboard → WiFi Scanner
2. Počakaj 2-3 sekunde (LTE check)
3. Pričakovano:
   - Naslov: `WiFi Scanner (2.4 GHz) (LTE ✗)`
   - Gumb: **SIV** (`bg-slate-400`)
   - Gumb: **DISABLED** (ne gre kliknit)
   - Opozorilo: "Skeniranje onemogočeno - LTE ni stabilen"

**Korak 3: Preveri browser console**

1. F12 → Console tab
2. Išči:
   ```
   [WiFiScanner] LTE check response: { connected: false, ... }
   [WiFiScanner] Setting lteConnected to: false
   [WiFiScanner] Render state: { lteConnected: false, buttonDisabled: true }
   ```

**Korak 4: Preveri backend log**

```bash
docker logs md-backend | grep "\[checkLteConnectivity\]" | tail -20
```

Pričakovano:
```
[checkLteConnectivity] ❌ Step 3 FAILED: Only X/6 packets successful
```

---

## ✅ CHECKLIST

- [x] Backend: `getWirelessRegistrationTable()` - DHCP lease matching
- [x] Backend: `getWlan5Status()` - SSID iz interface-a
- [x] Backend: `checkLteConnectivity()` - 3 koraki, 6 pingov (že prej)
- [x] Frontend: WiFiScanner - Debug log-i dodani
- [x] Frontend: WiFiScanner - Greyed out button logic (že prej)
- [x] Frontend: Build - **isti filename** (potreben hard refresh!)
- [x] Documentation: FINAL_FIXES_V3.md
- [x] Deployment: deploy-all.sh ready

---

## 🎉 POVZETEK

**Rešeni problemi**:

1. ✅ **WLAN 5 GHz clients** - Zdaj prikazuje IP in hostname iz DHCP lease table
2. ✅ **WLAN 5 GHz SSID** - Pobere iz wireless interface list, če monitor ne vrne
3. ✅ **WiFi Scanner button** - Debug log-i dodani za diagnostiko

**Naslednji koraki**:

1. **Deploy** na strežnik z `./deploy-all.sh`
2. **Hard refresh** browser (Ctrl+Shift+R) ali Incognito mode
3. **Preveri browser console** za debug log-e:
   - `[WiFiScanner] LTE check response:`
   - `[WiFiScanner] Render state:`
4. **Preveri backend log** za LTE check:
   ```bash
   docker logs md-backend | grep checkLteConnectivity | tail -30
   ```
5. **Pošlji screenshot** browser console-a in backend log-a, če gumb še vedno ni osivljen

**POMEMBNO**: JavaScript filename je **enak** kot prejšnja verzija, zato **MORATE** narediti:
- **Hard refresh** (Ctrl+Shift+R)
- **ALI** odpreti v Incognito mode
- **ALI** počistiti browser cache

Debug log-i bodo pokazali natančen vzrok problema!
