Aegilock - Self-Hosted Edition
=======================================

Aegilock – Kundeninstallation (README)

Willkommen zur Aegilock-Sicherheitslösung! Diese Anleitung hilft Ihnen, Aegilock On-Premise auf Ihrem eigenen Server produktionsreif einzurichten.

Voraussetzungen

•	Ubuntu 22.04 LTS (empfohlen)
•	Root- oder Sudo-Rechte
•	Eigene Subdomain (z. B. aegilock.ihre-domain.de)
•	Vorinstalliert: Node.js v18+, Nginx, Git, unzip, certbot

sudo apt update && sudo apt install nginx git unzip nodejs npm certbot python3-certbot-nginx -y
________________________________________
1. Projekt entpacken und vorbereiten

mkdir -p /opt/aegilock
cd /opt/aegilock

unzip aegilock.zip

Projektstruktur prüfen:
/opt/aegilock/
├── backend/
│   ├── server.js
│   ├── .env (wird erstellt)
├── frontend/
│   ├── app.tsx (angepasst)
├── config/
├── logs/
├── blocklists/
└── README.md
________________________________________

2. .env-Datei im Backend anlegen
PORT=3000
ALLOWED_ORIGINS=https://aegilock.ihre-domain.de
LOG_LEVEL=info

BLOCKLIST_PATH=../blocklists/
In server.js ist dotenv aktiv:
require('dotenv').config();
const port = process.env.PORT || 3000;
________________________________________

3. Socket.IO im Frontend verbinden
In frontend/app.tsx:
const socket: Socket = io('https://aegilock.ihre-domain.de', {
  transports: ['websocket'],
  autoConnect: true
});
________________________________________

4. Nginx Reverse Proxy konfigurieren
Pfad: /etc/nginx/sites-available/aegilock
server {
    listen 80;
    server_name aegilock.ihre-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
Symlink erstellen:

ln -s /etc/nginx/sites-available/aegilock /etc/nginx/sites-enabled/aegilock

nginx -t && systemctl reload nginx

SSL aktivieren:
certbot --nginx -d aegilock.ihre-domain.de
________________________________________

5. Backend starten

cd /opt/aegilock/backend
npm install
node server.js

Für Dauerbetrieb:
npm install -g pm2
pm2 start server.js --name aegilock
pm2 save && pm2 startup
________________________________________

6. Test & Sicherheit
•	Aufrufen: https://aegilock.ihre-domain.de
•	Logs: /opt/aegilock/logs/
•	IP-Blocking, GeoIP und User-Agent-Filter sind aktiv

Zusätzliche Sicherheit:
sudo apt install ufw fail2ban
________________________________________

Support & Lizenz
Bitte wenden Sie sich für individuelle Anpassungen oder Lizenzsupport an:
kontakt@aegilock.de

Sicherheit:
Du bist selbst für die Absicherung deines Servers verantwortlich.

Lizenz:
MIT License – siehe LICENSE.txt
