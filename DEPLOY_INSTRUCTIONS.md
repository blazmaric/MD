# Navodila za Deploy WiFi Scanner Popravkov

## Problem
Frontend še vedno uporablja **staro verzijo kode**, kjer je gumb še vedno klikabilen, tudi ko LTE ni stabilen.

## Rešitev
Novi frontend build je že pripravljen v `frontend/dist/`, vendar ga morate deployat v Docker container.

## Koraki za deploy (na strežniku)

### 1. Prenesite najnovejše spremembe
```bash
cd /root/MD  # ali kjer imate projekt
git pull    # če uporabljate git
# ALI
# Kopirajte posodobljene datoteke:
# - frontend/src/components/WiFiScanner.tsx
# - backend/src/mikrotik.js
```

### 2. Build frontend
```bash
cd frontend
npm install
npm run build
```

### 3. Rebuild in restart Docker containers
```bash
cd ..
docker compose down frontend
docker compose up --build -d frontend
```

ALI vse skupaj:
```bash
docker compose restart frontend
```

### 4. Preverjanje
Odprite browser in refreshajte stran (Ctrl+F5 za force refresh).

Gumb "Skeniraj WLAN 2.4" bi moral biti:
- **Siv (greyed out)** z tekstom "LTE ni stabilen"
- **Disabled** - ne gre klikniti
- Prikazano rdeče opozorilo: "Skeniranje onemogočeno - LTE ni stabilen"

## Pričakovano vedenje

### Ko je LTE nestabilen (kot zdaj - 1/6 paketov):
```
┌─────────────────────────────────────────┐
│ WiFi Scanner (2.4 GHz) (LTE ✗)          │
│ [Preveri LTE] [Force scan☐] [LTE ni stabilen] ← SIV, DISABLED
└─────────────────────────────────────────┘

⚠️ Skeniranje onemogočeno - LTE ni stabilen
WiFi skeniranje zahteva stabilno LTE povezavo (6/6 paketov brez timeoutov).
Sistem samodejno preverja LTE povezavo vsakih 30 sekund.
```

### Ko LTE postane stabilen (6/6 paketov):
```
┌─────────────────────────────────────────┐
│ WiFi Scanner (2.4 GHz) (LTE ✓)          │
│ [Force scan☐] [Skeniraj omrežja] ← MODER, ENABLED
└─────────────────────────────────────────┘
```

## Preverjanje v konzoli (Developer Tools)

Odprite browser Developer Tools (F12) in v Console vnesite:
```javascript
// Preveri, ali se LTE status pravilno osveži
console.log('LTE connected:', window.lteConnected);
```

## Če še vedno ne deluje

1. **Hard refresh browser cache:**
   - Chrome/Firefox: Ctrl+Shift+R ali Ctrl+F5
   - Preverite v Network tab, da se naloži novi `index-*.js` file

2. **Preverite, da se novi build pravilno kopira v container:**
   ```bash
   docker exec md-frontend ls -la /usr/share/nginx/html/assets/
   ```

3. **Preverite nginx logs:**
   ```bash
   docker logs md-frontend | tail -20
   ```

## Če želite testirati force mode

1. Odkljukajte **"Force scan"** checkbox
2. Gumb se bo spremenil v "Skeniraj omrežja" (moder)
3. Prikaže se opozorilo: "OPOZORILO: Force scan način"
4. Ko kliknete, bo vprašal za potrditev
5. Scan se bo izvršil tudi če LTE ni stabilen

## Build datoteke

Nove build datoteke so v:
- `frontend/dist/index.html`
- `frontend/dist/assets/index-CwEVPv4I.js` (396 KB)
- `frontend/dist/assets/index-E_obQlMT.css` (59 KB)

Datum build-a: **19. Februar 2026, 08:22 UTC**
