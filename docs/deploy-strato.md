# Deployen naar Strato VPS

Deze handleiding zet Casa Serra Larga live op een Strato Linux VPS. De app draait dan volledig op die ene VPS: Node.js, Nginx, Let's Encrypt, Prisma en de SQLite database.

## Aanbevolen Strato-keuze

Kies geen standaard webhostingpakket, maar een Linux VPS met root/SSH-toegang.

Aanbevolen minimum voor productie:

- 1 vCPU of meer.
- 2 GB RAM.
- 20 GB SSD/NVMe of meer.
- Ubuntu 24.04 LTS of Debian.
- IPv4-adres.
- VPS-backups of snapshots aanzetten als optie.

Sla deze extra's over:

- Betaald SSL-certificaat. We gebruiken gratis Let's Encrypt.
- Plesk, cPanel of DirectAdmin. De app draait rechtstreeks op Node.js + Nginx.
- Extra mailproducten, tenzij je later mail vanaf het domein wilt beheren.

Een VPS met 1 GB RAM en 10 GB schijf kan technisch werken, maar is krap voor updates, backups en `npm install`. Gebruik die alleen als test of zeer goedkope start.

## Wat je vooraf nodig hebt

- Een Strato VPS met Ubuntu of Debian.
- Een domein of subdomein, bijvoorbeeld `reserveren.jouwdomein.nl`.
- Een Git-repository waar deze code in staat.
- SSH-toegang tot de VPS.
- Een Stripe live secret key als betalingen direct live moeten.

Gebruik in de voorbeelden:

```text
VPS gebruiker: root
App gebruiker: deploy
App map: /opt/casa-serra-larga
Domein: reserveren.jouwdomein.nl
Poort: 3000
```

Vervang deze waarden door jouw echte domein en repo.

## 1. VPS bestellen

Bestel bij Strato een Linux VPS met Ubuntu 24.04 LTS of Debian.

Kies bij SSL-certificaten:

```text
Geen extra SSL-certificaat
```

Na bestelling krijg je een IPv4-adres en root-login of een manier om een SSH-sleutel toe te voegen.

## 2. DNS instellen

Zet bij je domeinprovider een A-record naar het IPv4-adres van de VPS.

Voorbeeld:

```text
reserveren  A  <ipv4-van-strato-vps>
```

Controleer vanaf je eigen computer:

```bash
nslookup reserveren.jouwdomein.nl
```

Wacht met Let's Encrypt tot dit domein naar de VPS wijst.

## 3. Inloggen op de VPS

Log in via SSH:

```bash
ssh root@<ipv4-van-strato-vps>
```

Werk de server bij:

```bash
apt-get update
apt-get upgrade -y
```

## 4. Basissoftware installeren

Installeer Node.js 22, Git, Nginx, SQLite en Certbot:

```bash
apt-get install -y ca-certificates curl git nginx sqlite3
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2
apt-get install -y certbot python3-certbot-nginx
```

Controleer de versies:

```bash
node --version
npm --version
nginx -v
sqlite3 --version
```

## 5. Deploy-gebruiker maken

Maak een aparte gebruiker voor de app:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
```

Maak de app-map:

```bash
install -d -o deploy -g deploy /opt/casa-serra-larga
```

## 6. Code clonen

Clone de repository als `deploy`:

```bash
sudo -u deploy git clone --branch main https://github.com/jouw-account/jouw-repo.git /opt/casa-serra-larga
```

Als de repository prive is, gebruik dan een deploy key of een repository-URL waarmee de server mag lezen.

## 7. Productie-env maken

Maak het `.env` bestand:

```bash
cat > /opt/casa-serra-larga/.env <<'EOF'
PORT=3000
NODE_ENV=production
APP_ORIGIN=https://reserveren.jouwdomein.nl
TRUST_PROXY=loopback
SESSION_TTL_DAYS=7
HOLD_TTL_MINUTES=10
DATABASE_URL=file:./data/reservations.sqlite
STRIPE_SECRET_KEY=sk_live_...
EOF

chown deploy:deploy /opt/casa-serra-larga/.env
chmod 0600 /opt/casa-serra-larga/.env
```

Belangrijk: `APP_ORIGIN` moet exact overeenkomen met je publieke HTTPS-url.

Als Stripe nog niet live hoeft, laat `STRIPE_SECRET_KEY=` leeg.

## 8. App installeren en database klaarzetten

Voer uit:

```bash
sudo -u deploy bash -lc "cd /opt/casa-serra-larga && npm install --include=dev && npx prisma generate && npx prisma db push && npm prune --omit=dev"
```

De SQLite database komt in:

```text
/opt/casa-serra-larga/data/reservations.sqlite
```

## 9. Systemd-service maken

Maak een servicebestand:

```bash
cat > /etc/systemd/system/casa-serra-larga.service <<'EOF'
[Unit]
Description=Casa Serra Larga reservation system
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/casa-serra-larga
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Start de app:

```bash
systemctl daemon-reload
systemctl enable casa-serra-larga.service
systemctl restart casa-serra-larga.service
systemctl status casa-serra-larga.service
```

Test lokaal op de VPS:

```bash
curl -f http://127.0.0.1:3000/api/health
```

## 10. Nginx reverse proxy instellen

Maak de Nginx-site:

```bash
cat > /etc/nginx/sites-available/casa-serra-larga <<'EOF'
server {
    listen 80;
    server_name reserveren.jouwdomein.nl;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
    }
}
EOF
```

Activeer de site:

```bash
ln -sfn /etc/nginx/sites-available/casa-serra-larga /etc/nginx/sites-enabled/casa-serra-larga
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Test via HTTP:

```bash
curl -f http://reserveren.jouwdomein.nl/api/health
```

## 11. Gratis SSL activeren

Zodra DNS goed staat, activeer je Let's Encrypt:

```bash
certbot --nginx --non-interactive --agree-tos --email jij@jouwdomein.nl -d reserveren.jouwdomein.nl --redirect
systemctl restart nginx
```

Test daarna:

```bash
curl -f https://reserveren.jouwdomein.nl/api/health
```

## 12. Productie-admin instellen

Maak of reset de admin-login:

```bash
cd /opt/casa-serra-larga
sudo -u deploy node src/scripts/set-admin-login.js --username=admin --email="jij@jouwdomein.nl" --password="een-lang-uniek-wachtwoord"
```

Gebruik een uniek sterk wachtwoord.

## 13. SQLite-backups instellen

Maak een backupscript:

```bash
cat > /usr/local/bin/backup-casa-serra-larga-db.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/casa-serra-larga"
APP_USER="deploy"
DB_PATH="$APP_DIR/data/reservations.sqlite"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/reservations-$TIMESTAMP.sqlite"

if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH; skipping backup."
    exit 0
fi

install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$TARGET'"
chown "$APP_USER:$APP_USER" "$TARGET"
chmod 0640 "$TARGET"
find "$BACKUP_DIR" -type f -name 'reservations-*.sqlite' -mtime +14 -delete
EOF

chmod 0755 /usr/local/bin/backup-casa-serra-larga-db.sh
```

Maak systemd timer en service:

```bash
cat > /etc/systemd/system/casa-serra-larga-backup.service <<'EOF'
[Unit]
Description=Backup Casa Serra Larga SQLite database

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-casa-serra-larga-db.sh
EOF

cat > /etc/systemd/system/casa-serra-larga-backup.timer <<'EOF'
[Unit]
Description=Run Casa Serra Larga database backup daily

[Timer]
OnCalendar=*-*-* 03:15:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now casa-serra-larga-backup.timer
systemctl start casa-serra-larga-backup.service
ls -lh /opt/casa-serra-larga/backups
```

Zet daarnaast Strato VPS-backups of snapshots aan als extra vangnet.

## 14. Firewall controleren

Zorg dat alleen deze poorten publiek open staan:

```text
22/tcp   SSH
80/tcp   HTTP
443/tcp  HTTPS
```

Poort `3000` hoeft niet publiek open. Nginx praat lokaal met Node.js.

## 15. Nieuwe versie deployen

Gebruik voor updates:

```bash
ssh root@<ipv4-van-strato-vps>
cd /opt/casa-serra-larga
sudo -u deploy git pull origin main
sudo -u deploy npm install --include=dev
sudo -u deploy npx prisma generate
sudo -u deploy npx prisma db push
sudo -u deploy npm prune --omit=dev
systemctl restart casa-serra-larga
curl -f https://reserveren.jouwdomein.nl/api/health
```

## 16. Snelle probleemchecks

App logs:

```bash
journalctl -u casa-serra-larga -n 100 --no-pager
```

Nginx config:

```bash
nginx -t
```

SSL vernieuwen testen:

```bash
certbot renew --dry-run
```

Backups bekijken:

```bash
systemctl status casa-serra-larga-backup.timer
ls -lh /opt/casa-serra-larga/backups
```

Databasebestand controleren:

```bash
ls -lh /opt/casa-serra-larga/data/reservations.sqlite
```

## Samenvatting

Voor Strato kies je bij voorkeur een Linux VPS met 2 GB RAM. Koop geen extra SSL-certificaat en geen control panel. De database draait als SQLite-bestand op dezelfde VPS en wordt dagelijks lokaal geback-upt. Voor extra veiligheid zet je ook Strato VPS-backups of snapshots aan.