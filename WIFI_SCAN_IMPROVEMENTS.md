# WiFi Scan Improvements - LTE Stability Check

## Kaj smo spremenili?

### 1. Backend - Strožje preverjanje LTE stabilnosti

**Datoteka:** `backend/src/mikrotik.js` - funkcija `checkLteConnectivity()`

**Spremembe:**
- Povečano število ping paketov z **1 → 6**
- Zahteva **6/6 uspešnih paketov** (0% packet loss)
- Podrobnejši logging statistike (sent/received/loss)

**Prej:**
```javascript
const command = `/ping 8.8.8.8 count=1 interface=${lteInterface}`;
const isConnected = packetLoss < 100;
```

**Zdaj:**
```javascript
const command = `/ping 8.8.8.8 count=6 interface=${lteInterface}`;
const sent = sentMatch ? parseInt(sentMatch[1], 10) : 0;
const received = receivedMatch ? parseInt(receivedMatch[1], 10) : 0;
const isConnected = sent >= 6 && received >= 6 && packetLoss === 0;
```

### 2. Frontend - Samodejno onemogočenje gumba

**Datoteka:** `frontend/src/components/WiFiScanner.tsx`

**Spremembe:**
1. **Vizualni indikatorji LTE statusa** v naslovu:
   - `(preverjam LTE...)` - med preverjanjem
   - `(LTE ✓)` - ko je LTE stabilen
   - `(LTE ✗)` - ko LTE ni stabilen

2. **Gumb "Preveri LTE"** - prikazan, ko LTE ni stabilen:
   - Omogoča ročno ponovno preverjanje
   - Animirana ikona med preverjanjem

3. **Disabled gumb za skeniranje**:
   - Siva barva (`bg-slate-400`) ko je disabled
   - Tooltip: "LTE povezava ni stabilna"
   - Tekst: "LTE ni stabilen"

4. **Izboljšano opozorilo**:
   - Jasno razlaga zahtevo: "6/6 paketov brez timeoutov"
   - Pove, da sistem samodejno preverja vsakih 30 sekund
   - Predlaga uporabo "Force scan" če ima fizični dostop

## Kako deluje?

### Avtomatično preverjanje (vsakih 30 sekund)
```typescript
useEffect(() => {
  checkLte();
  const interval = setInterval(() => {
    checkLte();
  }, 30000); // 30 sekund
  return () => clearInterval(interval);
}, []);
```

### Pogoji za omogočanje skeniranja
1. **Force mode** = OFF:
   - LTE mora biti stabilen (6/6 paketov)
   - Gumb je onemogočen, dokler LTE ni OK

2. **Force mode** = ON:
   - Gumb je vedno omogočen
   - Prikaže se opozorilo o prekinitvi povezave

## Uporabniška izkušnja

### Scenarij 1: LTE je nestabilen (kot v logih)
```
Ping stats: sent=6, received=1, loss=83%
❌ Step 3 FAILED: Only 1/6 packets successful (83% loss) - minimum 6/6 required
```

**UI:**
- Naslov: "WiFi Scanner (2.4 GHz) (LTE ✗)"
- Gumb: Siv, disabled, tekst "LTE ni stabilen"
- Opozorilo: "Skeniranje onemogočeno - LTE ni stabilen"
- Extra gumb: "Preveri LTE" (za ročno osvežitev)

### Scenarij 2: LTE postane stabilen
```
Ping stats: sent=6, received=6, loss=0%
✅ Step 3 PASSED: All 6/6 packets successful (0% loss)
```

**UI:**
- Naslov: "WiFi Scanner (2.4 GHz) (LTE ✓)"
- Gumb: Moder, enabled, tekst "Skeniraj omrežja"
- Opozorila ni

## Testiranje

1. **Backend restart** ni potreben - spremembe so že v datoteki
2. **Frontend rebuild** je potreben:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. **Docker rebuild**:
   ```bash
   docker-compose up --build -d frontend
   ```

## Prednosti

✅ **Uporabnik ne more slučajno pokvariti povezave** - gumb je disabled
✅ **Jasna komunikacija** - uporabnik vidi status LTE in razlago
✅ **Avtomatsko preverjanje** - uporabniku ni treba ročno preverjati
✅ **Ročna opcija** - gumb "Preveri LTE" če želi preveriti takoj
✅ **Force mode** - še vedno dostopen za emergencies

## Datum sprememb
19. Februar 2026, 08:20 UTC
