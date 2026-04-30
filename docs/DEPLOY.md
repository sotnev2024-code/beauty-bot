# Deploy — Beauty.dev

Production stack on Timeweb Cloud (Linux VPS, 4 vCPU / 8 GB RAM / 80 GB SSD).
Domain: `crm.plus-shop.ru` (A-record points to the VPS).

Two supported deployment shapes — pick **A** when the host already runs
nginx + certbot for other projects (this is the case for the current prod
VPS, which serves `pay/shop/pic/picpulse`). Pick **B** for a fresh /
dedicated VPS.

---

## A. Host-nginx scenario (this VPS)

The host nginx terminates TLS and reverse-proxies to a dockerized backend.
We don't run our own nginx container, so existing vhosts are untouched.

```bash
# 1. Clone (on the server)
git clone https://github.com/sotnev2024-code/beauty-bot.git /opt/beauty-bot
cd /opt/beauty-bot

# 2. .env — scp from the dev machine, or paste via $EDITOR
cp .env.example .env
$EDITOR .env

# 3. Prepare host directories that bind-mounts use
sudo mkdir -p /var/www/crm.plus-shop.ru /var/www/portfolio
sudo chown -R "$USER":"$USER" /var/www/crm.plus-shop.ru /var/www/portfolio

# 4. Build the Mini App bundle into /var/www/crm.plus-shop.ru
docker compose -f docker-compose.host-nginx.yml --profile build run --rm frontend-build

# 5. Bring up db + redis + backend (loopback-only ports)
docker compose -f docker-compose.host-nginx.yml up -d --build
docker compose -f docker-compose.host-nginx.yml exec backend alembic upgrade head

# 6. Install the system-nginx vhost
sudo cp nginx/crm.plus-shop.ru.conf /etc/nginx/sites-available/crm.plus-shop.ru
sudo ln -sf /etc/nginx/sites-available/crm.plus-shop.ru /etc/nginx/sites-enabled/crm.plus-shop.ru
sudo nginx -t && sudo systemctl reload nginx

# 7. Issue the Let's Encrypt cert via the existing certbot
sudo certbot --nginx -d crm.plus-shop.ru --non-interactive --agree-tos \
  -m "$(grep ^LETSENCRYPT_EMAIL .env | cut -d= -f2)"
sudo systemctl reload nginx

# 8. Sanity
curl https://crm.plus-shop.ru/api/health   # → {"status":"ok",...}
curl -I https://crm.plus-shop.ru/          # → 200, serves index.html
```

**Re-deploy after a code change** (what GitHub Actions runs):

```bash
cd /opt/beauty-bot
git pull
docker compose -f docker-compose.host-nginx.yml --profile build run --rm frontend-build
docker compose -f docker-compose.host-nginx.yml up -d --build
docker compose -f docker-compose.host-nginx.yml exec -T backend alembic upgrade head
```

**Rollback** — fully reverses without touching other vhosts:

```bash
sudo rm /etc/nginx/sites-enabled/crm.plus-shop.ru
sudo nginx -t && sudo systemctl reload nginx
docker compose -f docker-compose.host-nginx.yml down
```

---

## B. Standalone scenario (fresh VPS)

Use `docker-compose.prod.yml` (own nginx container terminating TLS on 80/443).
Only safe on a server that doesn't already serve other domains on those ports.

## 1. One-time server preparation

```bash
# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER  # if not running as root

# Clone the repo
mkdir -p /opt/beauty-bot
git clone https://github.com/sotnev2024-code/beauty-bot.git /opt/beauty-bot
cd /opt/beauty-bot

# Create .env from the template and fill in real values
cp .env.example .env
$EDITOR .env
# Required for first launch:
#   POSTGRES_PASSWORD, DATABASE_URL (with the same password)
#   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_SECRET
#   DEEPSEEK_API_KEY
#   SECRET_KEY (random 32+ bytes hex)
#   LETSENCRYPT_EMAIL
# YOOKASSA_SHOP_ID/SECRET_KEY can be filled later.
```

## 2. Initial certificate (Let's Encrypt)

The HTTP server block in `nginx/nginx.conf` serves the ACME challenge from
`/var/www/certbot`. We need to start the stack once **without** a real cert
to get the challenge served, then run certbot.

```bash
# Temporarily comment out the 443 server block in nginx/nginx.conf, OR start
# only the web service to serve the HTTP-01 challenge:
docker compose -f docker-compose.prod.yml up -d web

# In a second terminal — issue the cert:
sudo bash nginx/certbot.sh

# Re-enable HTTPS block (revert nginx/nginx.conf if you commented it) and
# bring everything up:
docker compose -f docker-compose.prod.yml up -d --build
```

Renewal: add to crontab (`crontab -e`):

```cron
0 3 * * 1  cd /opt/beauty-bot && bash nginx/certbot.sh >> /var/log/certbot.log 2>&1
```

## 3. Bring the stack up

```bash
cd /opt/beauty-bot
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend
```

Sanity:

```bash
curl https://crm.plus-shop.ru/api/health
# → {"status":"ok","env":"production"}
curl https://crm.plus-shop.ru/  # serves the Mini App index.html
```

## 4. Register the Telegram webhook

Once HTTPS works:

```bash
TOKEN=$(grep ^TELEGRAM_BOT_TOKEN /opt/beauty-bot/.env | cut -d= -f2)
SECRET=$(grep ^TELEGRAM_WEBHOOK_SECRET /opt/beauty-bot/.env | cut -d= -f2)

curl -s "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  --data-urlencode "url=https://crm.plus-shop.ru/api/telegram/webhook" \
  --data-urlencode "secret_token=${SECRET}" \
  --data-urlencode 'allowed_updates=["message","business_connection","business_message","edited_business_message","deleted_business_messages"]' \
  --data-urlencode "drop_pending_updates=true"

# Verify
curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | jq
```

The backend lifespan also runs `set_webhook` on every startup, so manual
registration is only needed the very first time when HTTPS comes online.

## 5. CI/CD via GitHub Actions

Set these repository secrets in **Settings → Secrets → Actions**:

- `SSH_HOST` — `31.130.150.174`
- `SSH_USER` — `root`
- `SSH_PASSWORD` — server password (or migrate to `SSH_PRIVATE_KEY`)
- `PROJECT_DIR` — `/opt/beauty-bot`

Push to `main` → `.github/workflows/deploy.yml` SSH-pulls, rebuilds, and
runs `alembic upgrade head`.

## 6. Portfolio storage

Photos live in the `portfolio` Docker volume, mounted read-write into the
backend (write) and read-only into nginx (`/portfolio/` location). To
seed/inspect:

```bash
docker run --rm -v beauty-bot_portfolio:/data alpine ls /data
```

## 7. Backups

Postgres data lives in the `pgdata` volume. Dump nightly:

```cron
30 3 * * * docker exec beauty-bot-db-1 pg_dump -U beauty beautybot | gzip > /var/backups/beautybot-$(date +\%F).sql.gz
```

## 8. Rollback

If a deploy is broken:

```bash
cd /opt/beauty-bot
git log --oneline -5
git reset --hard <previous-good-sha>
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

## 9. Common issues

- **`getWebhookInfo` shows `Connection timed out`** — DNS not propagated, or
  firewall blocking 443. Verify with `curl -I https://crm.plus-shop.ru` from
  outside.
- **Mini App says "Не получилось загрузить профиль"** — initData missing.
  Open the bot from a Telegram client (not a browser tab) so
  `window.Telegram.WebApp.initData` is set.
- **YooKassa webhook 503** — `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` not
  yet set; the checkout endpoint correctly returns 503 in that state.
