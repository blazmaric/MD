# MikroTik Dashboard

Proizvodno pripravljena nadzorna plošča za upravljanje in spremljanje MikroTik usmerjevalnikov z admin/uporabniško kontrolo dostopa.

## Arhitektura

- **Traefik**: Reverse proxy z avtomatskimi Let's Encrypt SSL certifikati
- **Backend**: Node.js 20 + Fastify API strežnik
- **Frontend**: React + TypeScript + Tailwind CSS
- **Baza podatkov**: PostgreSQL 16 za trajno shranjevanje
- **Omrežje**: Interno Docker omrežje (backend ni izpostavljen internetu)

## Funkcionalnosti

### Glavne funkcije
- Spremljanje sistema v realnem času (LTE, WiFi, CPU, RAM, promet, GPS)
- Skener WiFi omrežij s podatki o moči signala in varnosti
- Upravljanje SMS sporočil (branje, pošiljanje, brisanje)
- Spremljanje vmesnikov s statistiko v realnem času
- Zbiranje zgodovinskih dnevnikov in filtriranje
- Sledenje prometa s trajnim shranjevanjem
- Orodje za ping testiranje
- Podpora več uporabnikom z admin/uporabniškimi vlogami

### Varnost
- JWT avtentikacija z HttpOnly piškotki
- Backend izoliran od javnega interneta
- Vsi MikroTik API klici preusmerjeni preko backenda
- Row-level security pripravljen (PostgreSQL)
- Validacija CA certifikatov za MikroTik HTTPS
- SSH podpora za GPS in SMS operacije

### Uporabniške vloge
- **Admin**: Poln dostop do vseh funkcij vključno z upravljanjem uporabnikov in ponovnim zagonom sistema
- **Uporabnik**: Dostop samo za branje do nadzorne plošče, dnevnikov in nadzornih funkcij

## Predpogoji

### Zahteve strežnika
- Nameščen Docker in Docker Compose
- Odprti in dostopni porti 80 in 443
- DNS A zapis usmerjen na IP vašega strežnika

### Nastavitev omrežja
- Docker host dostopen iz omrežja
- MikroTik usmerjevalnik dostopen preko HTTPS in SSH
- MikroTik REST API omogočen z HTTPS
- MikroTik SSH dostop omogočen
- MikroTik uporabnik z dostopom do API in SSH

### Potrebne datoteke
1. MikroTik CA certifikat izvožen iz vašega usmerjevalnika
2. Konfigurirane okoljske spremenljivke

## Namestitev

### 1. Kloniranje repozitorija

```bash
git clone <url-vašega-repo>
cd mikrotik-dashboard
```

### 2. Konfiguracija okolja

Kopirajte primer okoljske datoteke in jo uredite:

```bash
cp .env.example .env
nano .env  # ali uporabite vaš priljubljeni urejevalnik
```

Zamenjajte vse vrednosti `REPLACE_ME` z vašo dejansko konfiguracijo:

```bash
# Konfiguracija domene
DOMAIN=md.m-host.si
LE_EMAIL=vas-email@example.com

# MikroTik konfiguracija
MT_BASE_URL=https://172.20.50.6
MT_USER=api
MT_PASS=vase_mikrotik_geslo
MT_SSH_PORT=22

# Admin bootstrap (prva prijava)
ADMIN_USER=admin
ADMIN_PASS=vase_varno_admin_geslo

# Varnost (generirajte naključne nize)
JWT_SECRET=vas_dolg_nakljucen_niz_vsaj_32_znakov
DB_PASSWORD=vase_geslo_baze_podatkov
```

**Generirajte varne naključne nize:**
```bash
openssl rand -base64 32
```

### 3. Dodajte MikroTik CA certifikat

Izvozite CA certifikat vašega MikroTika:

**Na MikroTiku:**
```
/certificate export-certificate mikrotik-ca export-passphrase=""
```

**Prenesite `.crt` datoteko in jo postavite na vaš strežnik:**
```bash
# Kopirajte vsebino certifikata v backend/certs/mikrotik-ca.crt
# Certifikat mora izgledati takole:
# -----BEGIN CERTIFICATE-----
# MIIDXTCCAkWgAwIBAgIJAL...
# -----END CERTIFICATE-----
```

### 4. Zaženite setup skripto

**KRITIČNO:** Ta skripta nastavi pravilne dovoljenja datotek (potrebno za Traefik):

```bash
chmod +x setup.sh
./setup.sh
```

Setup skripta bo:
- Ustvarila potrebne imenike
- Nastavila `chmod 600` na `traefik/acme.json` (potrebno za Let's Encrypt)
- Nastavila `chmod 600` na `.env` (varnost)
- Ustvarila nadomestni CA certifikat, če manjka

### 5. Namestitev

```bash
docker compose up -d --build
```

### 6. Preverjanje namestitve

Preverite dnevnike:
```bash
docker compose logs -f
```

Dostopajte do nadzorne plošče:
```
https://vasa-domena.com
```

## Posodabljanje

Pri posodabljanju na novo različico:

```bash
# Povlecite najnovejše spremembe
git pull

# POMEMBNO: Zaženite setup skripto za popravilo dovoljenj
./setup.sh

# Ponovno zgradite in zaženite
docker compose down
docker compose up -d --build
```

**Opomba:** Setup skripta mora biti zagnana po vsakem `git pull`, da zagotovi pravilna dovoljenja datotek za Let's Encrypt.

## Prva prijava

1. Pojdite na vašo konfigurirano domeno
2. Prijavite se z vašimi admin poverilnicami iz `.env`:
   - Uporabniško ime: vrednost `ADMIN_USER`
   - Geslo: vrednost `ADMIN_PASS`
3. Pojdite na stran **Uporabniki** in ustvarite dodatne uporabnike
4. Po potrebi dodelite admin vlogo

## Upravljanje uporabnikov

### Ustvarjanje uporabnikov

1. Prijavite se kot admin
2. Pojdite na stran **Uporabniki**
3. Kliknite **Ustvari uporabnika**
4. Nastavite uporabniško ime, geslo (min 8 znakov)
5. Označite "Admin", če naj ima uporabnik poln dostop
6. Shranite

### Uporabniške vloge

**Admin:**
- Poln dostop do nadzorne plošče
- Upravljanje uporabnikov
- Ponovni zagon sistema
- Upravljanje SMS
- WiFi skeniranje
- Vse nadzorne funkcije

**Običajni uporabnik:**
- Dostop samo za branje do nadzorne plošče
- Ogled dnevnikov in nadzornih podatkov
- Uporaba ping testerja
- Brez upravljanja uporabnikov
- Brez ponovnega zagona sistema

## API končne točke

### Avtentikacija
- `POST /api/auth/login` - Prijava
- `POST /api/auth/logout` - Odjava
- `GET /api/auth/me` - Pridobi trenutnega uporabnika

### Podatkovne končne točke
- `GET /api/dashboard` - Stanje sistema
- `GET /api/logs` - Dnevniki s filtriranjem
- `GET /api/traffic` - Podatki o prometu
- `POST /api/ping` - Ping test
- `GET /api/interfaces` - Seznam vmesnikov
- `GET /api/gps` - GPS podatki

### SMS končne točke (samo Admin)
- `GET /api/sms` - Seznam sporočil
- `POST /api/sms/send` - Pošlji sporočilo
- `DELETE /api/sms/:id` - Izbriši sporočilo

### WiFi končne točke
- `GET /api/wifi/scan` - Začni WiFi skeniranje
- `GET /api/wifi/scan/results` - Pridobi rezultate skeniranja
- `GET /api/wifi/lte-check` - Preveri LTE stanje
- `GET /api/wifi/clients/wlan5` - Pridobi 5GHz WiFi odjemalce

### Admin končne točke
- `GET /api/users` - Seznam uporabnikov
- `POST /api/users` - Ustvari uporabnika
- `PATCH /api/users/:id` - Posodobi uporabnika
- `DELETE /api/users/:id` - Onemogoči uporabnika
- `POST /api/system/reboot` - Ponovno zaženi MikroTik

### Layout končne točke
- `GET /api/layout` - Pridobi uporabnikovo postavitev nadzorne plošče
- `POST /api/layout` - Shrani postavitev nadzorne plošče

## Konfiguracija

### Intervali spraševanja

Uredite v `.env`:

```bash
SUMMARY_POLL_SECONDS=3        # Spraševanje stanja sistema
SUMMARY_STALE_SECONDS=10      # Označi podatke kot zastarele po
REQUEST_TIMEOUT_MS=2000       # MikroTik API časovna omejitev
```

### MikroTik vmesniki

Uredite v `.env`:

```bash
LTE_IFACE=lte1               # Ime LTE vmesnika
WLAN_IFACE=wlan2.4           # Ime WiFi vmesnika
VXLAN_IFACE=Vxlan            # VXLAN vmesnik za sledenje prometu
```

### SSH konfiguracija

```bash
MT_SSH_PORT=22               # MikroTik SSH port (privzeto: 22)
```

## Vzdrževanje

### Ogled dnevnikov

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f traefik
docker compose logs -f postgres
```

### Ponovni zagon storitev

```bash
docker compose restart
```

### Posodobitev aplikacije

```bash
git pull
./setup.sh
docker compose down
docker compose up -d --build
```

### Varnostna kopija baze podatkov

```bash
docker compose exec postgres pg_dump -U mduser mikrotik_dashboard > backup.sql
```

### Obnovitev baze podatkov

```bash
docker compose exec -T postgres psql -U mduser mikrotik_dashboard < backup.sql
```

## Odpravljanje težav

### Traefik: "permissions 644 for /acme.json are too open, please use 600"

**Vzrok:** Dovoljenja datoteke `traefik/acme.json` so napačna.

**Rešitev:**
```bash
# Ustavite vsebnike
docker compose down

# Popravite dovoljenja (MORA biti 600 za Traefik)
chmod 600 traefik/acme.json

# Ponovno zaženite
docker compose up -d --build
```

**Preprečevanje:** Vedno zaženite `./setup.sh` pred prvo namestitvijo.

### Backend: "relation users does not exist"

**Vzrok:** Migracije baze podatkov niso pravilno tekle.

**Rešitev:**
```bash
# Preverite, ali ima volumen stare podatke
docker compose down -v  # OPOZORILO: To izbriše vse podatke!

# Ponovno zgradite
docker compose up -d --build
```

Backend samodejno izvede migracije ob zagonu. Če vidite to napako, ima volumen baze podatkov verjetno pokvarjene podatke.

### MikroTik: "self-signed certificate in certificate chain" ali "bad base64 decode"

**Vzrok:** MikroTik CA certifikat manjka, je neveljaven ali v napačni obliki (DER namesto PEM).

**Rešitev:**

1. Izvozite CA certifikat iz MikroTika:
```
/certificate export-certificate mikrotik-ca export-passphrase=""
```

2. Prenesite izvoženo `.crt` datoteko iz MikroTika (meni Files)

3. **POMEMBNO:** Po potrebi pretvorite iz DER v PEM format:
```bash
# Preverite, ali je v PEM formatu (mora vsebovati -----BEGIN CERTIFICATE-----)
cat mikrotik-ca.crt

# Če je binarno (DER format), pretvorite v PEM:
openssl x509 -inform DER -in mikrotik-ca.crt -out mikrotik-ca-pem.crt

# Kopirajte v backend imenik
cp mikrotik-ca-pem.crt backend/certs/mikrotik-ca.crt
```

4. Preverite certifikat:
```bash
openssl x509 -in backend/certs/mikrotik-ca.crt -text -noout
```

5. Ponovno zaženite backend:
```bash
docker compose restart backend
```

**Pogoste težave:**
- "bad base64 decode" napaka = certifikat je v DER formatu, potrebna je pretvorba v PEM
- Certifikat se mora začeti z `-----BEGIN CERTIFICATE-----`
- Nekatere verzije MikroTika privzeto izvozijo v DER formatu

### Let's Encrypt težave s certifikati

**Simptomi:**
- Ni ACME aktivnosti v Traefik dnevnikih
- Brskalnik prikazuje opozorilo o certifikatu
- HTTPS ne deluje

**Odpravljanje:**

1. Preverite Traefik dnevnike za napake:
```bash
docker compose logs traefik | grep -i acme
docker compose logs traefik | grep -i cert
```

2. Preverite predpogoje:
```bash
# Preverite dovoljenja acme.json (mora biti 600)
ls -la traefik/acme.json

# Preverite, ali so porti dostopni iz javnega interneta
curl -I http://vasa-domena.com
```

3. Preverite DNS razrešitev:
```bash
dig vasa-domena.com
```

**Pogoste težave:**

- **Port 80/443 ni dostopen** - Preverite požarni zid, NAT, posredovanje portov iz javnega IP-ja
- **DNS se ne razreši na pravilen IP** - Počakajte na propagacijo DNS-ja (do 48 ur)
- **Napačna dovoljenja acme.json** - Zaženite `./setup.sh` za popravilo
- **Neveljaven email v .env** - Preverite vrednost `LE_EMAIL`
- **Domena ni dostopna** - Traefik potrebuje javno dostopno domeno na portu 80 za ACME HTTP izziv

**Prisilna obnova certifikata:**
```bash
docker compose down
rm traefik/acme.json
./setup.sh
docker compose up -d
```

### Backend se ne more povezati z MikroTikom

Preverite:
- MikroTik REST API je omogočen
- MikroTik SSH je omogočen
- MikroTik je dostopen iz Docker hosta
- CA certifikat je pravilen
- Poverilnice so pravilne
- SSH port je pravilen (privzeto: 22)

Testirajte povezljivost:
```bash
docker compose exec backend ping <mikrotik-ip>
```

### Težave s povezavo do baze podatkov

Preverite dnevnike baze podatkov:
```bash
docker compose logs postgres
```

Preverite povezavo:
```bash
docker compose exec backend node -e "require('./src/db.js').testConnection()"
```

### Frontend se ne naloži

Preverite nginx dnevnike:
```bash
docker compose logs frontend
```

Ponovno zgradite frontend:
```bash
docker compose up -d --build frontend
```

## Varnostne najboljše prakse

1. **Takoj spremenite privzeta gesla**
2. **Uporabite močna, edinstvena gesla** (najmanj 16 znakov)
3. **Varujte JWT_SECRET** in ga nikoli ne commitajte v git
4. **Redno posodabljajte Docker slike**
5. **Spremljajte dnevnike za sumljivo aktivnost**
6. **Uporabite načelo najmanjših privilegijev** - uporabnike naredite admin samo, če je potrebno
7. **Vzdržujte posodobljen MikroTik firmware**
8. **Redno varnostno kopirajte bazo podatkov**
9. **Spremenite privzeti SSH port na MikroTiku, če je izpostavljen internetu**

## Razvoj

### Lokalni razvoj

Backend:
```bash
cd backend
npm install
cp .env.example .env
# Uredite .env z lokalnimi vrednostmi
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Struktura projekta

```
.
├── docker-compose.yml           # Docker orkestracija
├── .env.example                 # Predloga okolja
├── setup.sh                     # Setup skripta
├── traefik/                     # Traefik konfiguracija
│   └── acme.json               # SSL certifikati
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── index.js            # Vstopna točka
│   │   ├── config.js           # Konfiguracija
│   │   ├── db.js               # Odjemalec baze podatkov
│   │   ├── auth.js             # Avtentikacija
│   │   ├── mikrotik.js         # MikroTik API odjemalec
│   │   ├── poller.js           # Zbiranje podatkov
│   │   ├── jobManager.js       # Ozadnja opravila
│   │   ├── lteCache.js         # LTE status predpomnjenje
│   │   ├── migrate.js          # Migracije baze podatkov
│   │   └── routes/             # API končne točke
│   ├── certs/                  # CA certifikati
│   ├── package.json
│   └── Dockerfile
└── frontend/                    # React aplikacija
    ├── src/
    │   ├── main.tsx            # Vstopna točka
    │   ├── App.tsx             # Glavna aplikacija
    │   ├── api.ts              # API odjemalec
    │   ├── types.ts            # TypeScript tipi
    │   ├── i18n.ts             # Internacionalizacija
    │   ├── ThemeContext.tsx    # Podpora za temni način
    │   ├── LanguageContext.tsx # Preklop jezika
    │   └── components/         # React komponente
    ├── package.json
    ├── vite.config.ts
    └── Dockerfile
```

## Licenca

MIT

## Podpora

Za težave in vprašanja odprite GitHub issue.
