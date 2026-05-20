# Deployen naar Hetzner Cloud

Deze app draait het simpelst en goedkoopst op een kleine Hetzner Cloud VPS met Node.js, Nginx, Let's Encrypt en SQLite op lokale schijf.

## Wat je nodig hebt

- Een Hetzner Cloud-account.
- Een domein of subdomein, bijvoorbeeld `reserveren.casaserralarga.pt`.
- Een Git-repository waar deze code in staat.
- Een SSH-sleutel op je computer.
- Terraform 1.6 of nieuwer op je computer.

## 1. DNS voorbereiden

Maak bij je domeinprovider alvast een A-record aan voor je subdomein zodra je het server-IP hebt. Bij de eerste Terraform-run krijg je het IPv4-adres als output.

Voorbeeld:

```text
reserveren  A  <ipv4-van-hetzner-server>
```

## 2. Hetzner API-token maken

Maak in Hetzner Cloud een API-token met read/write rechten voor het project waarin de server moet komen.

Bewaar dit token alleen lokaal in `infra/hetzner/terraform.tfvars`. Dit bestand wordt genegeerd door Git.

## 3. Terraform-variabelen invullen

Kopieer het voorbeeldbestand:

```bash
cp infra/hetzner/terraform.tfvars.example infra/hetzner/terraform.tfvars
```

Vul daarna minimaal deze waarden in:

```hcl
hcloud_token        = "<hetzner-api-token>"
ssh_public_key_path = "C:/Users/jij/.ssh/id_ed25519.pub"
ssh_allowed_cidr    = "jouw.ip.adres/32"

domain            = "reserveren.jouwdomein.nl"
letsencrypt_email = "jij@jouwdomein.nl"
app_repo_url      = "https://github.com/jouw-account/jouw-repo.git"
app_repo_branch   = "main"
stripe_secret_key = "sk_live_..."
```

Laat `enable_backups = true` aan staan. Daarnaast maakt de server dagelijks een lokale SQLite-backup in `/opt/casa-serra-larga/backups`.

## 4. Server aanmaken

Ga naar de Terraform-map en voer uit:

```bash
cd infra/hetzner
terraform init
terraform plan
terraform apply
```

Na `apply` toont Terraform het server-IP en een SSH-commando.

## 5. DNS naar de server wijzen

Zet het A-record van je domein naar het IPv4-adres uit Terraform. Wacht daarna tot DNS is bijgewerkt.

Controleer vanaf je eigen computer:

```bash
nslookup reserveren.jouwdomein.nl
```

Als het domein naar de nieuwe server wijst, draait de app via HTTPS zodra Let's Encrypt tijdens bootstrap gelukt is.

## 6. Eerste productiecontrole

Log in op de server:

```bash
ssh deploy@<ipv4-van-server>
```

Controleer de services:

```bash
sudo systemctl status casa-serra-larga
sudo systemctl status nginx
sudo systemctl status casa-serra-larga-backup.timer
curl -f https://reserveren.jouwdomein.nl/api/health
```

Als Let's Encrypt nog niet kon draaien omdat DNS te laat was, voer dan op de server opnieuw uit:

```bash
sudo certbot --nginx --non-interactive --agree-tos --email jij@jouwdomein.nl -d reserveren.jouwdomein.nl --redirect
sudo systemctl restart nginx
```

## 7. Admin-login instellen

Maak op de server een productie-admin aan of stel hem opnieuw in:

```bash
cd /opt/casa-serra-larga
node src/scripts/set-admin-login.js --username=admin --email="jij@jouwdomein.nl" --password="een-lang-uniek-wachtwoord"
```

Gebruik hiervoor een uniek wachtwoord dat nergens anders gebruikt wordt.

## 8. Nieuwe versie deployen

Voor een simpele update op dezelfde server:

```bash
ssh deploy@<ipv4-van-server>
cd /opt/casa-serra-larga
git pull origin main
npm install --omit=dev
npx prisma generate
npx prisma db push
sudo systemctl restart casa-serra-larga
```

Controleer daarna:

```bash
curl -f https://reserveren.jouwdomein.nl/api/health
```

## 9. Backups controleren

Hetzner server-backups staan aan via Terraform als `enable_backups = true`.

De lokale SQLite-backup draait dagelijks om 03:15 UTC. Handmatig testen kan met:

```bash
sudo systemctl start casa-serra-larga-backup.service
ls -lh /opt/casa-serra-larga/backups
```

Download af en toe een backup naar je eigen computer:

```bash
scp deploy@<ipv4-van-server>:/opt/casa-serra-larga/backups/reservations-*.sqlite ./
```

## Belangrijke productie-instellingen

De server schrijft deze `.env` automatisch:

```env
PORT=3000
NODE_ENV=production
APP_ORIGIN=https://reserveren.jouwdomein.nl
TRUST_PROXY=loopback
SESSION_TTL_DAYS=7
HOLD_TTL_MINUTES=10
DATABASE_URL=file:./data/reservations.sqlite
STRIPE_SECRET_KEY=sk_live_...
```

`APP_ORIGIN` moet exact overeenkomen met de publieke URL. Anders blokkeren de adminacties terecht op origin-controle.