# Bot Setup (@BotFather)

Заполняется на Этапе 2 (бот) и Этапе 8 (Mini App). Краткий чек-лист:

1. `/newbot` → имя `@beauty_dev_bot`, токен → в `.env` как `TELEGRAM_BOT_TOKEN`.
2. `Bot Settings → Business Mode → Enable` (обязательно для приёма Business-сообщений).
3. `/setdomain` → `crm.plus-shop.ru`.
4. `Configure Mini App → Edit Mini App URL` → `https://crm.plus-shop.ru`.
5. Иконка 512×512 PNG, описание, краткое описание.
6. Webhook ставится из `docs/DEPLOY.md` шаг 7 после деплоя.
