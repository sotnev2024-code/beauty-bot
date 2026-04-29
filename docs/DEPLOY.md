# Deploy

Заполняется на Этапе 12. План:

1. Установить Docker + docker compose plugin на Timeweb Cloud VPS.
2. Клонировать репо в `/opt/beauty-bot/`.
3. Скопировать `.env` (через `scp` с локальной машины) — НЕ хранить в git.
4. Получить SSL: `bash nginx/certbot.sh` (Let's Encrypt для `crm.plus-shop.ru`).
5. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
6. `docker compose exec backend alembic upgrade head`.
7. Установить Telegram webhook:
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$TELEGRAM_WEBHOOK_URL&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
8. CI/CD: GitHub Actions автоматически деплоит при push в main (см. `.github/workflows/`).
