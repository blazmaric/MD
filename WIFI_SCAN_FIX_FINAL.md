# WiFi Scan Fix - Greyed Out Button Implementation

## Problem
Uporabnik je lahko kliknil na gumb "Skeniraj WLAN 2.4", tudi ko LTE ni bil stabilen. Šele po kliku je dobil error sporočilo.

## Rešitev
Gumb se **samodejno onemogoči** (greyed out), dokler LTE ni stabilen.

---

## 📋 Kar je bilo spremenjeno

### 1. Backend (`backend/src/mikrotik.js`)
**Funkcija:** `checkLteConnectivity()`

**Spremembe:**
- ✅ Ping test: `count=1` → `count=6`
- ✅ Zahteva: **6/6 uspešnih paketov** (0% packet loss)
- ✅ Podrobnejši logging: `sent=6, received=X, loss=Y%`

**Koda:**
```javascript
const command = `/ping 8.8.8.8 count=6 interface=${lteInterface}`;
const sent = sentMatch ? parseInt(sentMatch[1], 10) : 0;
const received = receivedMatch ? parseInt(receivedMatch[1], 10) : 0;
const isConnected = sent >= 6 && received >= 6 && packetLoss === 0;

if (isConnected) {
  console.log(`✅ Step 3 PASSED: All ${received}/${sent} packets successful (${packetLoss}% loss)`);
} else {
  console.log(`❌ Step 3 FAILED: Only ${received}/${sent} packets successful (${packetLoss}% loss) - minimum 6/6 required`);
}
```

### 2. Frontend (`frontend/src/components/WiFiScanner.tsx`)

**A. Vizualni indikatorji statusa:**
```tsx
{checkingLte && <span>(preverjam LTE...)</span>}
{!checkingLte && lteConnected === true && <span>(LTE ✓)</span>}
{!checkingLte && lteConnected === false && <span>(LTE ✗)</span>}
```

**B. Gumb za ročno preverjanje:**
```tsx
{!forceMode && lteConnected === false && (
  <button onClick={() => checkLte()} disabled={checkingLte}>
    <RefreshCw className={checkingLte ? 'animate-spin' : ''} />
    {checkingLte ? 'Preverjam...' : 'Preveri LTE'}
  </button>
)}
```

**C. Greyed out scan gumb:**
```tsx
<button
  disabled={scanning || checkingLte || (!forceMode && lteConnected === false)}
  className={!forceMode && lteConnected === false
    ? 'bg-slate-400 cursor-not-allowed'  // SIV, DISABLED
    : 'bg-blue-600 hover:bg-blue-700'    // MODER, ENABLED
  }
>
  {!forceMode && lteConnected === false ? (
    <>
      <WifiOff />
      LTE ni stabilen
    </>
  ) : (
    <>
      <Search />
      {scanning ? 'Skeniram...' : 'Skeniraj omrežja'}
    </>
  )}
</button>
```

**D. Razširjeno opozorilo:**
```tsx
{!forceMode && lteConnected === false && (
  <div className="bg-red-50 border border-red-200">
    <div className="font-semibold">Skeniranje onemogočeno - LTE ni stabilen</div>
    <div>WiFi skeniranje zahteva stabilno LTE povezavo (6/6 paketov brez timeoutov).</div>
    <div className="text-xs">
      Sistem samodejno preverja LTE povezavo vsakih 30 sekund.
      Ko bo LTE stabilen, se bo gumb za skeniranje omogočil.
    </div>
  </div>
)}
```

**E. Avtomatično preverjanje (vsakih 30 sekund):**
```tsx
useEffect(() => {
  checkLte();
  const interval = setInterval(() => {
    checkLte();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 🚀 Deployment

### Na strežniku poženite:

```bash
cd /root/MD  # ali kjer je vaš projekt
./deploy-frontend.sh
```

ALI ročno:

```bash
cd frontend
npm install
npm run build
cd ..
docker compose build frontend
docker compose up -d frontend
```

### V browserju:
1. Odprite https://md.m-host.si
2. **Hard refresh**: Ctrl+Shift+R ali Ctrl+F5
3. Preverite WiFi Scanner

---

## 📊 Pričakovano vedenje

### Trenutno stanje (LTE nestabilen - 1/6 paketov):

```
┌────────────────────────────────────────────────────────────┐
│ 📡 WiFi Scanner (2.4 GHz) (LTE ✗)                         │
│                                                             │
│  [🔄 Preveri LTE]  [☐ Force scan]  [📵 LTE ni stabilen]  │
│                                      ↑                      │
│                                  SIV, DISABLED              │
└────────────────────────────────────────────────────────────┘

⚠️ Skeniranje onemogočeno - LTE ni stabilen

WiFi skeniranje zahteva stabilno LTE povezavo (6/6 paketov brez timeoutov).
Skeniranje začasno prekine WiFi, zato mora biti LTE na voljo za vzdrževanje
povezljivosti.

Sistem samodejno preverja LTE povezavo vsakih 30 sekund. Ko bo LTE stabilen,
se bo gumb za skeniranje omogočil. Če imate fizični dostop do naprave, lahko
omogočite "Force scan".
```

### Ko bo LTE stabilen (6/6 paketov):

```
┌────────────────────────────────────────────────────────────┐
│ 📡 WiFi Scanner (2.4 GHz) (LTE ✓)                         │
│                                                             │
│              [☐ Force scan]  [🔍 Skeniraj omrežja]        │
│                                    ↑                        │
│                                MODER, ENABLED               │
└────────────────────────────────────────────────────────────┘

(ni opozoril)
```

---

## 🔍 Kako deluje

### Timeline:

**T=0s**: Stran se naloži
- ✅ Frontend izvede `checkLte()`
- 🔍 Backend preveri ping: 1/6 uspešnih → `connected: false`
- 🔴 UI prikaže: `(LTE ✗)` in disabled gumb

**T=30s**: Avtomatsko preverjanje
- ✅ Frontend ponovno izvede `checkLte()`
- 🔍 Backend preveri ping: še vedno 1/6 → `connected: false`
- 🔴 UI ostane: disabled

**T=60s**: Avtomatsko preverjanje
- ✅ Frontend ponovno izvede `checkLte()`
- 🔍 Backend preveri ping: 6/6 uspešnih! → `connected: true`
- 🟢 UI se posodobi: `(LTE ✓)` in enabled gumb (moder)

**Uporabnik zdaj lahko klikne "Skeniraj omrežja"**

---

## 🛡️ Backup opcija: Force Scan

Če uporabnik potrebuje skenirati KLJUB nestabilnemu LTE:

1. ✅ Odkljuka checkbox **"Force scan"**
2. ⚠️ Prikaže se opozorilo: "OPOZORILO: Force scan način"
3. 🔵 Gumb postane enabled (moder)
4. ❓ Po kliku zahteva potrditev
5. ⚡ Scan se izvede (prekine povezavo!)

---

## 📝 Datoteke

### Spremenjene:
- ✅ `backend/src/mikrotik.js` - funkcija `checkLteConnectivity()`
- ✅ `frontend/src/components/WiFiScanner.tsx` - komponenta

### Nove:
- 📄 `WIFI_SCAN_FIX_FINAL.md` (ta datoteka)
- 📄 `DEPLOY_INSTRUCTIONS.md`
- 📄 `deploy-frontend.sh`
- 📄 `WIFI_SCAN_IMPROVEMENTS.md`

### Build:
- 📦 `frontend/dist/index.html`
- 📦 `frontend/dist/assets/index-CwEVPv4I.js` (396 KB)
- 📦 `frontend/dist/assets/index-E_obQlMT.css` (59 KB)

---

## ✅ Checklist za deploy

- [ ] Backend: `checkLteConnectivity()` uporablja `count=6`
- [ ] Frontend: WiFiScanner.tsx ima nove spremembe
- [ ] Frontend build: `npm run build` uspešen
- [ ] Docker: Frontend container rebuild in restart
- [ ] Browser: Hard refresh (Ctrl+Shift+R)
- [ ] Test: Gumb je greyed out, ko LTE ni stabilen
- [ ] Test: Status indicator prikazuje `(LTE ✗)`
- [ ] Test: Opozorilo je vidno
- [ ] Test: Gumb "Preveri LTE" deluje
- [ ] Test: Force scan checkbox še vedno omogoči skeniranje

---

**Datum:** 19. Februar 2026, 08:30 UTC
**Verzija:** 2.0 - Greyed Out Button Implementation
