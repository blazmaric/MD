# POPRAVKI KONČANI - Vse Probleme Rešeni

## 🎯 PROBLEMI REŠENI

### 1. ✅ Gumb "Skeniraj WLAN 2.4" ni osivljen ko LTE ni stabilen

**Rešitev**:
- ✅ Backend: `checkLteConnectivity()` preverja **3 korake**:
  1. LTE interface je UP
  2. LTE ima IP naslov
  3. Ping test: **6/6 paketov** brez timeoutov (0% packet loss)

- ✅ Frontend: Gumb je **disabled** in **SIV** (ne moder), ko `lteConnected === false`
  - Tekst na gumbu: "LTE ni stabilen"
  - Vizualni indikator: `(LTE ✗)` v naslovu
  - Rdeče opozorilo z razlago
  - Gumb "Preveri LTE" za ročno preverjanje
  - Avtomatično preverjanje vsakih 30 sekund

**Datoteke**:
- `backend/src/mikrotik.js:320-397` - checkLteConnectivity()
- `frontend/src/components/WiFiScanner.tsx:216-237` - Greyed out button

---

### 2. ✅ WLAN 5 GHz SSID kaže "N/A" ko je prazen

**Rešitev**:
- Backend preverja: `monitor.ssid && monitor.ssid.trim() !== '' ? monitor.ssid : 'N/A'`
- Če MikroTik vrne prazen string `''`, se prikaže `'N/A'`

**Datoteke**:
- `backend/src/mikrotik.js:524` - SSID check za Wlan5
- `backend/src/mikrotik.js:564` - SSID check za Wlan24

---

### 3. ✅ WLAN 5 GHz nima RX/TX speed prikaza

**Rešitev**:
- Backend zdaj formatira speeds:
  - `< 1 Mbps` → prikaže v **Kbps** (npr. `300 Kbps`)
  - `>= 1 Mbps` → prikaže v **Mbps** (npr. `48.5 Mbps`)

- WLAN 5 GHz: Uporablja `traffic['rx-bits-per-second']` in `traffic['tx-bits-per-second']`
- WLAN 2.4 GHz: Uporablja `monitor['rx-rate']` in `monitor['tx-rate']` (že formatirano iz MikroTika)

**Datoteke**:
- `backend/src/mikrotik.js:508-519` - Speed formatting za Wlan5
- `backend/src/mikrotik.js:552-560` - Speed formatting za Wlan24
- `frontend/src/components/Wlan5Status.tsx:113,119` - Odstranjen formatSpeed() (zdaj backend formatira)

---

## 📦 BUILD INFO

### Frontend Build:
```
File: dist/assets/index-bdu264SJ.js (396.42 KB)
CSS:  dist/assets/index-E_obQlMT.css (58.93 KB)
Date: 19 Feb 2026, 08:40 UTC
```

**POMEMBNO**: JavaScript filename se je spremenil!
- PREJ: `index-CwEVPv4I.js`
- ZDAJ: `index-bdu264SJ.js`

To pomeni: **BROWSER BO SAMODEJNO NALOŽIL NOVO VERZIJO** (brez potrebe po hard refresh)!

---

## 🚀 DEPLOYMENT

Na strežniku poženite:

```bash
cd /root/MD

# Rebuild backend
docker compose build backend
docker compose up -d backend

# Rebuild frontend (copy nov build)
cd frontend
npm run build
cd ..
docker compose build --no-cache frontend
docker compose up -d frontend

# Preveri status
docker compose ps
```

ALI uporabite pripravljeno skripto:

```bash
cd /root/MD
./deploy-frontend.sh
```

### Po Deploy-u:

1. **Osvežite stran** v browser-ju (navaden Refresh ali F5 zadostuje)
   - Nov JavaScript filename bo samodejno naložen

2. **Preveri, da deluje**:
   - WiFi Scanner naslov: `WiFi Scanner (2.4 GHz) (LTE ✗)`
   - Gumb: **SIV** z napisom "LTE ni stabilen"
   - Gumb: **NE GRE KLIKNIT** (disabled)
   - Opozorilo: Rdeče, z razlago o 6/6 ping testu
   - Ekstra gumb: "Preveri LTE"

3. **Preveri WLAN 5 GHz**:
   - SSID: Prikaže ime ali "N/A" (ne več prazen prostor)
   - RX Speed: Format npr. `300 Kbps` ali `48.5 Mbps`
   - TX Speed: Format npr. `150 Kbps` ali `72 Mbps`

---

## 📊 PRIČAKOVANO VEDENJE

### Ko LTE ni stabilen (1/6 ali manj paketov):

```
┌─────────────────────────────────────────────────────────┐
│ WiFi Scanner (2.4 GHz) (LTE ✗)                         │
│                                                          │
│ [🔄 Preveri LTE] [☐ Force scan] [📵 LTE ni stabilen]  │
│                                    ↑                     │
│                          SIV, DISABLED                   │
└─────────────────────────────────────────────────────────┘

⚠️ Skeniranje onemogočeno - LTE ni stabilen

WiFi skeniranje zahteva stabilno LTE povezavo (6/6 paketov
brez timeoutov). Skeniranje začasno prekine WiFi, zato mora
biti LTE na voljo za vzdrževanje povezljivosti.

Sistem samodejno preverja LTE povezavo vsakih 30 sekund.
Ko bo LTE stabilen, se bo gumb za skeniranje omogočil.
```

**Ko uporabnik klikne na gumb**: **NIČ** - gumb je disabled!

### Ko LTE postane stabilen (6/6 paketov, 0% loss):

```
┌─────────────────────────────────────────────────────────┐
│ WiFi Scanner (2.4 GHz) (LTE ✓)                         │
│                                                          │
│               [☐ Force scan] [🔍 Skeniraj omrežja]     │
│                                ↑                         │
│                           MODER, ENABLED                 │
└─────────────────────────────────────────────────────────┘
```

**Ko uporabnik klikne na gumb**: **Scan se izvede!**

### WLAN 5 GHz - Prikaz speeds:

**Primer nizkih hitrosti** (< 1 Mbps):
```
RX Speed: 300 Kbps
TX Speed: 150 Kbps
```

**Primer visokih hitrosti** (>= 1 Mbps):
```
RX Speed: 48.50 Mbps
TX Speed: 72.20 Mbps
```

**Če ni prometa**:
```
RX Speed: N/A
TX Speed: N/A
```

---

## 🐛 TROUBLESHOOTING

### Če gumb še vedno NI osivljen:

1. **Preveri, da je frontend naložen**:
   - F12 → Network tab → Preveri: `index-bdu264SJ.js`
   - Če vidiš še vedno `index-CwEVPv4I.js` → Hard refresh (Ctrl+Shift+R)

2. **Preveri backend logs**:
   ```bash
   docker logs md-backend | grep checkLteConnectivity | tail -20
   ```
   - Poišči: `[checkLteConnectivity] Ping stats: sent=6, received=X`
   - Če je `received < 6`, je LTE res nestabilen

3. **Preveri API response**:
   - F12 → Network tab → Filtriraj: `/api/wifi/check-lte`
   - Response mora biti: `{"connected": false}`

4. **Force refresh**:
   - Ctrl+Shift+R ali Ctrl+F5
   - ALI odpri v Incognito/Private mode

### Če WLAN 5 SSID še vedno kaže prazen prostor:

```bash
# Preveri backend response
docker exec md-backend wget -qO- http://localhost:8081/api/wifi/wlan5/status
```

Če vrne `"ssid": ""`, backend pravilno pretvori v `"N/A"`.

### Če speeds niso formatirani:

```bash
# Preveri backend response
docker exec md-backend wget -qO- http://localhost:8081/api/wifi/wlan5/status

# Pričakovano:
# "rxRate": "300 Kbps"  ali "48.50 Mbps"
# "txRate": "150 Kbps"  ali "72.20 Mbps"
```

---

## 📅 VERSION INFO

**Backend**:
- ✅ `checkLteConnectivity()`: 3-step check, 6 pings
- ✅ `getWlan5Status()`: SSID check, speed formatting
- ✅ `getWlan24Status()`: SSID check, rate formatting

**Frontend**:
- ✅ `WiFiScanner.tsx`: Greyed out button logic
- ✅ `Wlan5Status.tsx`: Removed formatSpeed (backend does it)
- ✅ Build: `index-bdu264SJ.js` (NEW filename)

**Build Date**: 19 Feb 2026, 08:40 UTC

---

## ✅ CHECKLIST

- [x] Backend: checkLteConnectivity() - 3 koraki, 6 pingov
- [x] Backend: getWlan5Status() - SSID check, speed format
- [x] Backend: getWlan24Status() - SSID check, rate format
- [x] Frontend: WiFiScanner - Greyed out button
- [x] Frontend: WiFiScanner - LTE status indicators
- [x] Frontend: WiFiScanner - Auto check every 30s
- [x] Frontend: WiFiScanner - Manual "Preveri LTE" button
- [x] Frontend: Wlan5Status - Removed formatSpeed()
- [x] Frontend: Build - New filename (index-bdu264SJ.js)
- [x] Documentation: FIXES_COMPLETE.md
- [x] Deployment: deploy-frontend.sh updated

**STATUS**: ✅ VSE KONČANO - Pripravljen za deployment!

---

## 🎉 POVZETEK

Vsi 3 problemi so **REŠENI**:

1. ✅ **Gumb je osivljen** ko LTE ni stabilen (3-step check, 6 pings)
2. ✅ **SSID prikazuje "N/A"** ko je prazen (ne več prazen prostor)
3. ✅ **RX/TX speeds formatirani** (Kbps/Mbps glede na velikost)

**Nove features**:
- ✅ Vizualni indikatorji: `(LTE ✓)` ali `(LTE ✗)`
- ✅ Gumb "Preveri LTE" za ročno preverjanje
- ✅ Avtomatično preverjanje vsakih 30 sekund
- ✅ Jasno opozorilo z razlago
- ✅ JavaScript filename spremenjen → Auto reload v browser-ju

**Deploy**: Poženite `./deploy-frontend.sh` na strežniku in osvežite stran!
