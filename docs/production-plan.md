# Productieplan reserveringssysteem

## Doelarchitectuur

- Frontend: lichte statische pagina's met fetch naar een Node.js API.
- Backend: Express op Node.js met inputvalidatie, rate limiting, veilige sessiecookies en server-side prijslogica.
- Database: SQLite met WAL-modus. Dit is goedkoop, snel genoeg voor laag verkeer en betrouwbaarder dan JSON-bestanden.
- Hosting: 1 kleine VPS of goedkope Node-hosting met persistent volume voor de SQLite database en dagelijkse back-up.

## Waarom geen JSON-opslag

- JSON-bestanden hebben geen transacties bij gelijktijdige writes.
- Het risico op corrupte data of race conditions bij dubbele boekingen is te groot.
- Query's op beschikbaarheid, blokkades en boekingsbeheer worden snel onwerkbaar.

## Fases

### 1. Fundament

- Node.js API opzetten.
- SQLite schema maken voor boekingen, blokkades, prijzen, admins en sessies.
- Scheiding tussen publieke routes en adminroutes invoeren.

### 2. Security

- Alle input valideren op de server.
- Voor alle databaseacties prepared statements gebruiken.
- Admin login afschermen met gehashte wachtwoorden en HttpOnly sessiecookies.
- Rate limiting en security headers activeren.
- Origin-check toevoegen voor admin write-operaties.

### 3. Publieke flow

- Beschikbaarheid en prijs via backend laten berekenen.
- Boeking server-side opslaan.
- Dubbele boekingen blokkeren op basis van overlap en totale capaciteit.

### 4. Admin flow

- Login/logout toevoegen.
- Boekingen beheren, filteren en updaten.
- Blokkades beheren.
- Seizoensprijzen aanpassen.
- Planner tonen vanuit serverdata.

### 5. Productiehardening

- Logging en health endpoint.
- Dagelijkse databaseback-up.
- Omgevingsvariabelen documenteren.
- Deploymentdocumentatie en admin-onboarding toevoegen.

## Goedkope productiekeuze

- Database: SQLite.
- Hosting: kleine VPS of eenvoudige Node-host met schijfopslag.
- Mail later via Postmark, Resend of SMTP; pas nodig zodra bevestigingsmails live gaan.

## Gekozen productrichting voor v1

- Model: meerdere kamers in 1 accommodatie
- Flow: aanvraag + handmatige bevestiging
- E-mail: nog geen automatische e-mails in de eerste productieversie

## Volgende productiefase na v1

- gast- en adminmails toevoegen
- betaalprovider koppelen als online voorschotten nodig worden
- rapportage en exports toevoegen
