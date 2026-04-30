# BotFather setup — @beauty_dev_bot

## 1. Create the bot

In Telegram, message [@BotFather](https://t.me/BotFather):

```
/newbot
Beauty.dev
beauty_dev_bot
```

Save the token into your `.env` as `TELEGRAM_BOT_TOKEN`.

## 2. Enable Business Mode

This is **mandatory** — without it the bot can't be added to a master's
Telegram Business account.

```
/mybots → @beauty_dev_bot → Bot Settings → Business Mode → Enable
```

## 3. Domain (for inline mini-app links)

```
/mybots → @beauty_dev_bot → Bot Settings → Domain
crm.plus-shop.ru
```

## 4. Configure Mini App

```
/mybots → @beauty_dev_bot → Configure Mini App
Edit Mini App URL → https://crm.plus-shop.ru
```

Optionally:

- **Edit Mini App Photo** — upload a 512×512 PNG (HYB coral on `#fbf6f4`)
- **Edit Mini App Short Name** — `beauty`
- **Edit Mini App Description** — `AI-ассистент для бьюти-мастеров`

## 5. Bot description / commands

```
/setdescription   →  AI-ассистент. Отвечает клиенткам, ведёт по воронке, записывает.
/setabouttext     →  Beauty.dev
```

The `/setcommands` step is automated — `app.main.lifespan` calls
`bot.set_my_commands` on backend startup.

## 6. Webhook

Registered automatically by the backend on startup (see `app/main.py`
lifespan and `docs/DEPLOY.md` step 4).

To verify:

```bash
curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | jq
```

Look for `"url": "https://crm.plus-shop.ru/api/telegram/webhook"` and
`"last_error_message"` empty.

## 7. Reset / rotate

If the token leaks:

```
/mybots → @beauty_dev_bot → Bot Settings → Revoke current token
```

Update `TELEGRAM_BOT_TOKEN` in `.env`, restart the backend, and re-call
`setWebhook` (or just restart — lifespan handles it).
