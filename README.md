# Casa Serra Larga reserveringssysteem

Dit project is een compleet reserveringssysteem voor Casa Serra Larga. Het bestaat uit een publieke boekingswebsite, een beveiligde beheeromgeving, een Node.js backend, Prisma ORM en een SQLite database. De applicatie is gemaakt om lokaal eenvoudig te testen en goedkoop te hosten.

## Samenvatting: wat is er gemaakt

Er is in deze repository het volgende gebouwd:

* Een publieke website voor bezoekers met welkomspagina, boekingsflow, samenvatting en betaalpagina.
* Een meertalige frontend in 6 talen: Nederlands, Engels, Portugees, Spaans, Frans en Duits.
* Een room-based reserveringssysteem waarbij je een of meerdere kamers tegelijk kunt boeken.
* Een beschikbaarheidskalender per kamer.
* Tijdelijke holds van 10 minuten voordat een betaling wordt afgerond.
* Een beveiligde beheeromgeving voor boekingen, kamers, prijzen, planning en beveiliging.
* Betalingsintegratie met Stripe.
* Een Node.js + Express backend met Prisma ORM.
* Een SQLite databasebestand voor reserveringen, kamers, prijsregels, blokkades en admin-login.

## Stack

* Frontend: statische HTML, CSS en browser JavaScript
* Backend: Node.js + Express
* Database: SQLite
* ORM: Prisma
* Betalingen: Stripe Checkout
* Validatie en security: Zod, Helmet, rate limiting, HttpOnly cookies

## Waar vind je wat

Gebruik dit overzicht als startpunt in VS Code:

|Bestand / map|Waarvoor is het|
|-|-|
|`index.html`|Publieke boekingspagina|
|`home.html`|Welkomspagina / landingspagina|
|`payment.html`|Betaalpagina voor een actieve hold|
|`payment-success.html`|Pagina na geslaagde Stripe betaling|
|`styles.css`|Gedeelde styling voor de publieke site|
|`script.js`|Logica van de boekingsflow|
|`site.js`|Alle vertalingen en taalwissel-logica|
|`payment.js`|Start Stripe checkout vanuit de betaalpagina|
|`payment-success.js`|Controleert of de Stripe betaling echt is afgerond|
|`admin.html`|Beheeromgeving|
|`admin.js`|Frontendlogica van de beheeromgeving|
|`server.js`|Start de Node.js server|
|`src/app.js`|Alle Express routes en hoofdlogica van de backend|
|`src/db.js`|Database-acties via Prisma|
|`src/config.js`|Omgevingsconfiguratie|
|`src/security.js`|Wachtwoord hashing, sessions en beveiligingsfuncties|
|`src/services/pricing.js`|Prijsberekening per kamer en prijsregel|
|`src/services/payments.js`|Stripe integratie|
|`src/scripts/create-admin.js`|Script om een adminaccount aan te maken|
|`src/scripts/set-admin-login.js`|Script om admin login te wijzigen of opnieuw in te stellen|
|`prisma/schema.prisma`|Datamodel van Prisma|
|`data/reservations.sqlite`|Het SQLite databasebestand|
|`docs/production-plan.md`|Extra productienotities / productieplan|
|`test/pricing.test.js`|Tests voor prijslogica|
|`test/security.test.js`|Tests voor securitylogica|

## Hoe draai je dit lokaal op je pc

Dit is de snelste manier om alles lokaal te starten en te testen.

### Benodigd

* Node.js 20 of nieuwer
* npm
* VS Code
* Git

### Stap 1: dependencies installeren

```bash
npm install
```

### Stap 2: `.env` instellen

Maak een `.env` op basis van `.env.example`.

Voor lokaal testen is dit meestal genoeg:

```env
PORT=3000
NODE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ENV=development
APP\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ORIGIN=http://localhost:3000
SESSION\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TTL\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_DAYS=7
HOLD\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TTL\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_MINUTES=10
STRIPE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_SECRET\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_KEY=
DATABASE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL=file:./data/reservations.sqlite
```

### Stap 3: database klaarzetten

```bash
npx prisma db push
npx prisma generate
```

De app wijzigt het databaseschema niet automatisch tijdens runtime. Na elke wijziging in `prisma/schema.prisma` moet je deze stap opnieuw uitvoeren voordat je start of deployt.

### Stap 4: server starten

Voor normaal gebruik:

```bash
npm start
```

Voor ontwikkelen met auto-reload:

```bash
npm run dev
```

### Stap 5: open de site

* Publieke site: `http://localhost:3000/`
* Welkomspagina: `http://localhost:3000/home`
* Beheer: `http://localhost:3000/admin`
* Health check: `http://localhost:3000/api/health`

## Beheerlogin lokaal instellen

Leg geen vaste admin-inloggegevens vast in documentatie of versiebeheer.

Maak lokaal een adminaccount aan met een eigen sterk wachtwoord:

```bash
npm run setup:admin -- --email="jouw@email.com" --password="een-sterk-wachtwoord"
```

Of wijzig een bestaande admin-login opnieuw:

```bash
node src/scripts/set-admin-login.js --username=admin --password="een-sterk-wachtwoord" --email="jouw@email.com"
```

Beide scripts markeren het ingestelde wachtwoord als tijdelijk. Na de eerste login moet de gebruiker direct een eigen wachtwoord kiezen voordat andere beheerfuncties beschikbaar zijn.

Belangrijk:

* Gebruik per omgeving een uniek sterk wachtwoord.
* Houd adminwachtwoorden buiten README's, commits en gedeelde chatlogs.
* Wijzig het wachtwoord direct als je vermoedt dat het ooit is gedeeld.

## Hoe test je lokaal het snelst

Aanbevolen testvolgorde:

1. Start de server met `npm run dev`.
2. Open `http://localhost:3000/`.
3. Kies een periode en selecteer een of meer kamers.
4. Vul naam, e-mail, telefoon en adresgegevens in.
5. Ga naar de samenvatting en daarna naar betaling.
6. Open `http://localhost:3000/admin` in een tweede tabblad.
7. Log in en controleer of boekingen, kamers, prijsregels en planning goed laden.

Automatische tests draaien:

```bash
npm test
```

## Hoe beheer werkt

De beheeromgeving heeft 6 hoofdonderdelen.

### 1\. Dashboard

Hier zie je het snelle overzicht:

* aantal boekingen
* nieuwe aanvragen
* komende check-ins
* open betalingen
* actieve holds
* totale omzet

Dit is bedoeld als management-overzicht zonder eerst alle details te moeten openen.

### 2\. Boekingen

In `Boekingen` kun je:

* zoeken op naam, e-mail, referentie of kamer
* filteren op status
* filteren op betaling
* filteren op datum
* sorteren op aankomst of aanmaakdatum
* een boeking openen en aanpassen

Per boeking kun je onder andere beheren:

* gastgegevens
* adresgegevens
* opmerking
* check-in en check-out
* gekozen kamers
* verblijfsprijs
* extra kosten
* status
* mail verzonden of niet
* voorschot betaald of niet
* volledig betaald of niet
* ingecheckt of niet
* uitgecheckt of niet

### 3\. Kamers

In `Kamers` beheer je de basis van het systeem.

Per kamer kun je:

* een publieke naam geven
* een vaste prijs per nacht instellen
* de kamer actief of inactief maken

Belangrijk:

* Inactieve kamers blijven bestaan in het systeem.
* Inactieve kamers zijn niet boekbaar op de publieke site.
* De kamernaam wordt letterlijk getoond op de website, ongeacht taal.

### 4\. Prijzen

In `Prijzen` beheer je twee dingen:

* het vaste basistarief per kamer
* uitzonderingen per kamer en per periode

Voorbeeld:

* Kamer 1 heeft normaal EUR 95 per nacht.
* Voor een feestweek stel je van 2026-08-10 t/m 2026-08-18 EUR 125 per nacht in.

De logica is:

1. Als er een prijsregel is voor die kamer en periode, gebruikt het systeem die regel.
2. Anders gebruikt het systeem de vaste kamerprijs.

### 5\. Planning

In `Planning` kun je:

* periodes blokkeren
* per blokkade een of meerdere kamers selecteren
* een reden opslaan
* de bezettingskalender bekijken

De kalender laat per kamer zien of een dag:

* vrij is
* tijdelijk vastgezet is in een hold
* geboekt of geblokkeerd is

Dit onderdeel gebruik je voor:

* eigen gebruik
* onderhoud
* telefonische reserveringen
* externe reserveringen die niet via de website lopen

### 6\. Beveiliging

In `Beveiliging` kun je:

* het adminwachtwoord wijzigen
* de Stripe secret key opslaan of verwijderen

Hier hoef je dus niet handmatig in bestanden te werken voor de betaalinstellingen.

## Talen aanpassen of talen verwijderen

De talen zitten centraal in `site.js`.

Op dit moment zijn actief:

* `nl`
* `en`
* `pt`
* `es`
* `fr`
* `de`

### Minder talen gebruiken

Als je minder talen wilt tonen, pas dan minimaal deze onderdelen aan:

1. Verwijder de taalcode uit `supportedLanguages` in `site.js`.
2. Verwijder het vertaalblok van die taal uit `translations` in `site.js`.
3. Verwijder ook de override van die taal uit `bookingOverrides` in `site.js` als die bestaat.
4. Verwijder de taalbutton uit:

   * `index.html`
   * `home.html`
   * `payment.html`
   * `payment-success.html`

### Alleen tekst aanpassen

Als je alleen teksten wilt wijzigen en niet het aantal talen:

* pas dan de teksten aan in `site.js`
* zoek op de taalcode, bijvoorbeeld `nl:` of `en:`
* test daarna de 4 publieke pagina's opnieuw

Belangrijk:

* De beheeromgeving is nu Nederlandstalig.
* De publieke site is meertalig.
* Kamernamen zelf worden niet automatisch vertaald.

## Stripe: wat is het en hoe werkt het hier

Stripe is een online betaalprovider. Je kunt ermee online betalingen ontvangen via creditcard en andere betaalmethodes die Stripe ondersteunt.

In dit project doet Stripe het volgende:

1. Een bezoeker kiest kamers.
2. Het systeem maakt eerst een tijdelijke hold aan.
3. Daarna wordt een Stripe Checkout sessie gemaakt.
4. De bezoeker rekent af op Stripe.
5. Na terugkomst controleert de website of de betaling echt gelukt is.
6. Daarna wordt de boeking definitief bevestigd.

## Stripe account aanvragen

Ga naar `https://stripe.com/` en maak een account aan.

In grote lijnen:

1. Maak een Stripe account aan.
2. Verifieer je e-mailadres.
3. Vul je bedrijfs- of privegegevens in.
4. Activeer test mode voor testen.
5. Voeg later je live bedrijfs- en bankgegevens toe voor echte betalingen.

## Waar zet je de Stripe code neer

Je hebt voor deze app vooral de Stripe secret key nodig.

Die kun je op twee manieren instellen:

### Optie 1: via de beheeromgeving

Ga naar:

* `Beheer`
* `Beveiliging`
* `Betalingen`

Plak daar je key in het veld `Stripe secret key`.

Voor testen gebruik je meestal een key die begint met:

* `sk\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_test\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_...`

Voor live gebruik:

* `sk\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_live\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_...`



## Stripe testen

### Test mode gebruiken

Zet Stripe in test mode en gebruik een test key.

Daarna:

1. Start de app lokaal.
2. Maak een reservering.
3. Ga naar de betaalpagina.
4. Klik op `Betaal met Stripe`.
5. Rond de testbetaling af op Stripe.

### Bekende Stripe testkaart

Gebruik voor een simpele geslaagde testbetaling:

* Kaartnummer: `4242 4242 4242 4242`
* Vervaldatum: elke toekomstige datum
* CVC: elke 3 cijfers
* Postcode: willekeurig

### Wat moet je controleren

Na een geslaagde testbetaling moet het volgende gebeuren:

* je komt terug op `payment-success`
* de boeking wordt bevestigd
* de kamer is niet meer beschikbaar in die periode
* de boeking verschijnt in beheer onder `Boekingen`

## Van test naar live Stripe

Voor live gebruik:

1. Zet je Stripe account live.
2. Vervang `sk\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_test\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_...` door `sk\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_live\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_...`.
3. Controleer of `APP\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ORIGIN` op je echte domein staat.
4. Test daarna een echte kleine betaling.

## Hosting: wat is voor dit project het slimst

### Belangrijke technische keuze

Deze applicatie gebruikt nu SQLite. Dat betekent:

* de database is een lokaal bestand
* website en database draaien het makkelijkst op dezelfde server
* dit project is het goedkoopst en stabielst op een VPS of VM

Voor de huidige codebase is een enkele Linux VPS meestal de beste keuze.

Als je later wilt schalen naar meerdere app-instances of een volledig managed platform, dan is het verstandiger om later van SQLite naar PostgreSQL te migreren.

## Beste hostingopties voor nu

Prijzen hieronder zijn richtprijzen van april 2026 en kunnen wijzigen. Domeinnaam, e-mail en btw zijn meestal niet inbegrepen.

|Host|Indicatie per maand|Geschikt voor huidige app|Opmerking|
|-|-|-|-|
|Hetzner Cloud|vanaf EUR 3.99 tot EUR 5.99|Ja, zeer geschikt|Beste prijs/kwaliteit voor Node.js + SQLite op 1 VPS|
|DigitalOcean Droplet|vanaf USD 6, realistischer USD 12 voor extra ruimte|Ja|Makkelijk, duidelijk, duurder dan Hetzner|
|Railway Hobby|USD 5 minimum usage, daarna usage-based|Alleen redelijk als je volumes goed instelt|Handig platform, maar minder ideaal voor SQLite dan een VPS|
|Render Starter|USD 7 voor web service + SSD opslag vanaf USD 0.25 per GB|Kan, maar niet mijn eerste keuze voor SQLite|Beter als je later naar Postgres gaat|
|Azure Linux VM|vanaf ongeveer USD 7.59 plus disk, in praktijk vaak hoger|Ja|Goed als je Azure en Bicep wilt gebruiken, maar niet de goedkoopste|

## Advies voor goedkope hosting (ChatGPT)

### Beste keuze voor deze huidige code

Kies een kleine VPS en draai daar alles op:

* Node.js app
* SQLite databasebestand
* Nginx reverse proxy
* HTTPS met Let's Encrypt

Mijn voorkeursvolgorde voor deze codebase:

1. Hetzner Cloud
2. DigitalOcean
3. Azure Linux VM als Azure/Bicep belangrijk is

### Waarom dit beter is dan een losse database

Omdat deze app SQLite gebruikt, heb je geen aparte databasehost nodig. De database is gewoon een bestand op de server.

Dat betekent:

* website + database op 1 server
* minder kosten
* minder complexiteit
* eenvoudiger backuppen

## Eenvoudigste hostingaanpak

### Optie A: Hetzner Cloud met Terraform of OpenTofu

Voor deze repository is dit nu de voorkeursroute. In de map `infra/hetzner/` staat een complete deploymentconfig die automatisch het volgende doet:

* maakt een goedkope Hetzner VPS aan
* zet een firewall open voor SSH, HTTP en HTTPS
* injecteert je SSH key
* installeert Node.js 22, Nginx en PM2
* clonet deze repository op de server
* schrijft een productie `.env`
* draait `npm install`, `npx prisma generate` en `npx prisma db push`
* start de app als systemd service
* zet Nginx ervoor als reverse proxy
* vraagt optioneel een Let's Encrypt certificaat aan

De server start bewust niet door als `prisma db push` nog niet is uitgevoerd voor het huidige schema.

De gekozen standaard is `cpx11`, omdat dat een goedkope x86-machine is en daarmee veiliger is voor native Node-modules zoals Prisma en `better-sqlite3` dan de allergoedkoopste ARM-keuze.

### Wat je nodig hebt

Voordat je deployt:

1. Maak in Hetzner Cloud een API token aan.
2. Zorg dat je een SSH public key hebt, bijvoorbeeld `\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\~/.ssh/id\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ed25519.pub`.
3. Zet je code in een Git repository die de server mag clonen.
4. Maak alvast een domein of subdomein aan als je direct HTTPS wilt.
5. Installeer lokaal `terraform` of `tofu`.

Let op bij stap 3:

* een publieke repository werkt direct
* een private repository moet clonebaar zijn vanaf de server, bijvoorbeeld via een deploy key of een repository-URL met tijdelijke toegang

### Bestanden voor Hetzner infra

Deze bestanden zijn toegevoegd:

* `infra/hetzner/main.tf`
* `infra/hetzner/variables.tf`
* `infra/hetzner/outputs.tf`
* `infra/hetzner/cloud-init.yaml.tftpl`
* `infra/hetzner/terraform.tfvars.example`

### Deployen naar Hetzner Cloud

1. Ga naar `infra/hetzner/`.
2. Maak van `terraform.tfvars.example` een lokaal `terraform.tfvars`.
3. Vul minimaal deze waarden in:

   * `hcloud\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_token`
   * `ssh\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_public\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_key\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_path`
   * `app\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_repo\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_url`
   * `domain`
   * `letsencrypt\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_email` als je direct HTTPS wilt
4. Draai daarna:

```bash
cd infra/hetzner
terraform init
terraform plan
terraform apply
```

Of met OpenTofu:

```bash
cd infra/hetzner
tofu init
tofu plan
tofu apply
```

### Wat de server automatisch doet na deploy

Tijdens cloud-init wordt automatisch:

1. Ubuntu bijgewerkt.
2. Node.js 22 geinstalleerd.
3. Nginx en PM2 geinstalleerd.
4. De repository gekloond naar `/opt/casa-serra-larga`.
5. Een productie `.env` aangemaakt.
6. Prisma gegenereerd en naar SQLite gepusht.
7. De app gestart als `casa-serra-larga.service`.
8. Nginx actief gezet.

### Eerste checks na deployment

Gebruik na `apply` de outputs en controleer daarna op de server:

```bash
ssh deploy@<server-ip>
sudo journalctl -u cloud-init -b
sudo systemctl status casa-serra-larga
sudo nginx -t
```

Belangrijk:

* `domain` is voor deze deployment verplicht, omdat de app in productie een stabiele publieke origin nodig heeft.
* Voor Let's Encrypt moet DNS al naar de server wijzen.
* SQLite blijft lokaal op de VPS staan, dus maak backups van `/opt/casa-serra-larga/data/`.
* Bewaar `terraform.tfvars` lokaal en commit die nooit.

### Productie `.env` voorbeeld

```env
PORT=3000
NODE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ENV=production
APP\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ORIGIN=https://jouwdomein.nl
SESSION\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TTL\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_DAYS=7
HOLD\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TTL\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_MINUTES=10
DATABASE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL=file:./data/reservations.sqlite
STRIPE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_SECRET\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_KEY=sk\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_live\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_...
```

## Azure en Bicep alleen als alternatief

Als je later toch naar Azure wilt, dan blijft een Linux VM de juiste vorm voor deze app. Voor de goedkoopste en eenvoudigste productie-opzet is Hetzner Cloud nu de aanbevolen route, niet Azure.

* SQLite blijft ook daar een lokale schijfdatabase.
* Gebruik daar dan een Linux VM, niet direct een PaaS-opzet.
* Voor Azure past Bicep goed; voor Hetzner gebruik je Terraform of OpenTofu.

## VS Code + Git + GitHub Copilot: hoe beheer je dit project verder

Dit is de meest praktische werkwijze.

### Werken met Git in VS Code

Aanbevolen flow per wijziging:

1. Maak eerst een nieuwe branch.
2. Pas code aan in kleine, logische stappen.
3. Bekijk de diff in VS Code Source Control.
4. Test lokaal.
5. Commit pas als het werkt.
6. Push naar GitHub.

Voorbeeld:

```bash
git checkout -b feature/pricing-update
git add .
git commit -m "Update prijsregels per kamer"
git push -u origin feature/pricing-update
```

### Hoe GitHub Copilot hierbij helpt

Gebruik Copilot vooral voor:

* kleine code-aanpassingen
* refactors
* nieuwe adminvelden
* extra validatie
* tests
* Bicep templates
* documentatie

Beste manier van vragen:

* noem altijd het bestand of de map
* beschrijf exact wat moet veranderen
* vraag om een veilige en minimale wijziging

Voorbeeldprompts:

```text
Pas admin.js aan zodat bij Kamers ook het aantal uitzonderingsprijzen zichtbaar is.
```

```text
Maak een test voor pricing.js waarin een prijsregel voor een specifieke kamer voorrang krijgt op de basisprijs.
```

```text
Maak een Bicep bestand voor een kleine Ubuntu VM waarop deze Node.js app kan draaien.
```

### Aanbevolen werkwijze met Copilot

* laat Copilot niet blind grote stukken code veranderen
* bekijk altijd de diff
* draai daarna lokaal tests of klikflows
* commit pas na controle

## Aanbevolen GitHub workflow

Als je met GitHub werkt, is dit praktisch:

1. `main` alleen voor stabiele code
2. nieuwe features op een branch
3. pull request maken
4. diff nalopen
5. lokaal of via preview testen
6. daarna mergen

## Backup en beheer in productie

De belangrijkste data staat in:

* `data/reservations.sqlite`

Maak minimaal dagelijkse backups van:

* de hele map `data/`
* je `.env`
* eventueel je Nginx configuratie en deployment scripts

## Productie-checklist

Voordat je live gaat:

1. Verander het adminwachtwoord.
2. Zet `NODE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ENV=production`.
3. Zet `APP\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_ORIGIN` op je echte domein.
4. Gebruik HTTPS.
5. Gebruik een live Stripe key in plaats van een test key.
6. Maak automatische backups van `data/`.
7. Laat slechts 1 app-instance tegelijk draaien zolang je SQLite gebruikt.
8. Test een echte boeking en een echte betaling.

## Belangrijke beperking van de huidige architectuur

Deze versie is sterk en goedkoop voor een kleine tot middelgrote accommodatie, maar let op:

* SQLite is ideaal voor 1 server.
* SQLite is niet ideaal voor horizontaal schalen over meerdere app-servers.
* Als je later groter wilt opschalen, is migratie naar PostgreSQL de logische volgende stap.

## Korte conclusie

Als je dit project nu simpel en goedkoop wilt gebruiken:

* lokaal testen: `npm install`, `npx prisma db push`, `npx prisma generate`, `npm run dev`
* beheerlogin: maak of reset lokaal eerst een tijdelijke adminlogin via `npm run setup:admin` of `node src/scripts/set-admin-login.js`; de app dwingt daarna een directe wachtwoordwijziging af
* goedkoopste hosting voor de huidige code: kleine VPS, bij voorkeur Hetzner
* betalingen: Stripe test key eerst lokaal testen, daarna pas live key gebruiken
* talen aanpassen: in `site.js` en de taalbuttons in de publieke HTML-bestanden
* Azure/Bicep: prima voor infrastructuur, maar gebruik voor deze code dan een Linux VM en niet direct een PaaS-opzet

