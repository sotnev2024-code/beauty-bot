# E2E test — Bot hub patch (Steps 0–12)

Sceenario covering the full path: new master onboarding → bot configuration →
real client conversation → return campaign → return-with-discount booking.

This document is the manual checklist used to verify a clean install of the
14-commit patch (Steps 0–13). It complements the unit/integration suite in
`backend/tests/`.

## Pre-flight

- Production VPS: `crm.plus-shop.ru` running scenario A (system nginx +
  dockerized backend on `docker-compose.host-nginx.yml`)
- DB head: `alembic current` shows `0005_drop_funnels_legacy`
- Backend starts: `curl https://crm.plus-shop.ru/api/health` → 200
- `/api/funnels` → 404 (removed). `/api/bot/settings` → 401 (auth-gated).

## Smoke (no-auth HTTP)

```bash
for ep in /api/health /api/bot/settings /api/bot/return-settings \
          /api/categories /api/bot/knowledge /api/bot/return-campaigns \
          /api/services /api/funnels; do
  curl -s -o /dev/null -w "$ep %{http_code}\n" "https://crm.plus-shop.ru$ep"
done
```
Expected: 200 for `/api/health`; 401 for everything else; 404 for `/api/funnels`.

## End-to-end happy path (Telegram + Mini App)

1. **Onboard a new master** — open the bot in Telegram, click the Mini App
   button. Sequence:
   - Welcome → «Начать настройку»
   - Premium → checks Telegram Premium status, «Дальше»
   - Profile → введите имя и нишу
   - Address → введите адрес одной строкой
   - Schedule → выберите рабочие дни и часы
   - Services → добавьте «Маникюр», 60 мин, 1500 ₽
   - **Voice** (новый шаг) → выберите тон, например «Тёплый»
   - Connect → подключите Telegram Business
   - Done → checklist все галки, две кнопки: «Попробовать тестовый чат» (→
     `/app/bot/test`) и «Открыть Beauty.dev» (→ `/app`)

2. **Configure bot in `/app/bot`**:
   - **Knowledge** → откройте «Адрес», заполните адрес, координаты, ссылку на
     Яндекс.Карты, «Сохранить» → бейдж карточки в hub становится зелёным
   - Откройте «Оплата» → заполните и сохраните
   - Откройте «Стерилизация» → заполните и сохраните
   - **Услуги** → откройте «Маникюр» → включите «Напомнить через N дней»,
     поставьте 30 → сохранить → в карточке появится chip «напомнить через
     30 д.»
   - **Автоматизация** → секция «Напоминания о повторной записи» —
     попробуйте включить. Тумблер активируется, потому что есть услуга с
     reminder_after_days=30
   - **Автоматизация** → секция «Возврат клиенток» → переключите тумблер →
     раскроется форма (60 / 15 / 7) → «Сохранить и включить»

3. **Test bot inside Mini App** (`/app/bot/test`):
   - Введите «Здравствуйте, можно записаться?»
   - Бот отвечает в выбранном тоне с кнопками формата (если выбран hybrid)
   - Введите «маникюр в субботу в 14»
   - Бот предложит подтвердить и спросит имя/телефон
   - Введите «Анна, +79991112233»
   - Бот ответит «Записала вас, Анна. Жду в субботу...»; в bubble должны
     появиться pill-бейджи `create_booking`
   - Никаких записей в БД (это `/api/test/dialog`, который не пишет)

4. **Real client conversation via Telegram Business**:
   - С другого Telegram-аккаунта напишите мастеру через Business чат
   - Бот отвечает в реальном чате клиента (Business connection)
   - Запись создаётся в `bookings`, в чате `messages` появляются IN/OUT строки

5. **Return campaign** — на сервере вручную сдвигаем бронь на 70 дней назад:

   ```sql
   UPDATE bookings SET starts_at = NOW() - INTERVAL '70 days',
                       ends_at   = NOW() - INTERVAL '69 days 23 hours',
                       status    = 'done'
   WHERE master_id = 1 AND id = (SELECT max(id) FROM bookings WHERE master_id = 1);
   ```

   Затем триггерим джобу вручную (например через `docker compose exec backend
   python -c 'import asyncio; from app.workers.scheduler import return_invitations_tick;
   asyncio.run(return_invitations_tick())'`) или ждём 11:00 локального времени мастера.

   - Клиентке прилетает сообщение со скидкой
   - В `return_campaigns` появляется row со status='sent'
   - В `messages` строка с `is_proactive=true`, `llm_meta.proactive_kind='return'`
   - В Mini App в чате этого клиента — bubble с бейджем «возврат · бот написал
     первым» и плашка «Активна скидка 15% до DD.MM»

6. **Return-with-discount booking**:
   - Клиентка отвечает «запишите на четверг в 14»
   - Бот подтверждает, бронирует
   - Бронь создаётся с `discount_applied=true`, `discount_percent=15`,
     `return_campaign_id` ссылается на кампанию
   - Кампания меняет статус на `booked`, `responded_at` заполнен,
     `booking_id` указывает на новую бронь

7. **Service reminder skip-due-to-return**:
   - Если у клиентки активна return campaign, при срабатывании service
     reminder джобы создаётся `reminder_logs` row с
     `was_skipped_due_to_return=true` и сообщение НЕ отправляется

8. **Campaign expiry**:
   - Сдвиньте `discount_valid_until` в прошлое:
     ```sql
     UPDATE return_campaigns SET discount_valid_until = NOW() - INTERVAL '1 day'
     WHERE id = ... AND status = 'sent';
     ```
   - Дождитесь `expire_return_campaigns_tick` (раз в час, минута 15)
   - Status кампании → `expired`

9. **Analytics**:
   - В `/app/analytics` появится карточка «💌 Возврат клиенток» с counters
     (sent / booked / expired) и доп. выручкой

## What changed vs the funnel era

- `/api/funnels`, `/api/funnel-presets`, `/api/test/dialog` (funnel-aware) —
  заменены на `/api/bot/*`
- `Funnel` / `FunnelStep` модели и таблицы — удалены
- `masters.voice` / `greeting` / `rules` колонки — удалены
- Шаг онбординга «Готовые воронки» → «Голос бота»
- Раздел «Бот» в нижнем таб-баре теперь Hub из 8 настроек вместо списка
  воронок
- Tone/voice/format settings переехали из `Settings` в `/app/bot/*`

## Known follow-ups (out of scope for this patch)

- **Real `tool_choice` for DeepSeek** — currently using JSON-emit pattern with
  `actions[]` array. Real `tools=[...]` API call would let the LLM see slot
  search results before committing to `create_booking`. Requires verifying
  DeepSeek-V3 direct API support.
- **Redis-session test chat** — `/app/bot/test` is currently stateless
  (frontend re-sends history). Redis-backed session would enable multi-turn
  function-call flow.
- **Hub category drag-and-drop** — `Categories.reorder` API exists but the UI
  doesn't expose drag handles.
- **Code-splitting** — vite warns about >500 kB chunks; route-based dynamic
  imports would reduce initial download.
