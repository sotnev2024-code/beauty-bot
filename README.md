# Beauty.dev

AI-ассистент для бьюти-мастеров: Telegram Mini App + бот через Telegram Business API.
Мастер подключает бота к своему личному Telegram через Business — бот отвечает клиенткам от его лица, ведёт по воронке, записывает на услуги, напоминает о визитах.

## Стек

- **Backend:** Python 3.11, FastAPI, aiogram 3, SQLAlchemy 2 async, PostgreSQL 15, Redis 7, Alembic, APScheduler
- **Frontend:** React 18, TypeScript (strict), Vite, Tailwind CSS (HYB-токены), Zustand, React Query, React Hook Form + Zod
- **LLM:** DeepSeek (`deepseek-v4-flash`)
- **Билинг:** YooKassa
- **Инфра:** Docker, Nginx, GitHub Actions, Timeweb Cloud
- **Дизайн-система:** HYB · Коралл + сетка (см. `docs/design/`)

## Локальный запуск

```bash
# 1. Скопировать пример .env (или взять заполненный у тимлида)
cp .env.example .env
# отредактировать .env: POSTGRES_PASSWORD, TELEGRAM_BOT_TOKEN, DEEPSEEK_API_KEY и т.д.

# 2. Поднять весь стек одной командой
docker compose up --build

# 3. Открыть:
#    http://localhost:8001/docs    — Swagger UI (FastAPI)
#    http://localhost:8001/health  — { "status": "ok" }
#    http://localhost:5173         — Mini App (React)
```

> Хост-порты сдвинуты, чтобы не конфликтовать с локально запущенными PostgreSQL/Redis/Python:
> Postgres `5433`, Redis `6380`, backend `8001`, frontend `5173`.
> Внутри docker-сети сервисы общаются по стандартным портам (`db:5432`, `redis:6379`, `backend:8000`).

## Локальная разработка без Docker

### Backend

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
poetry run pytest
poetry run alembic upgrade head
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
pnpm type-check
pnpm lint
pnpm build
```

## Миграции

```bash
cd backend
poetry run alembic revision --autogenerate -m "add masters table"
poetry run alembic upgrade head
poetry run alembic downgrade -1
```

## Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## Структура

```
backend/                 FastAPI + aiogram + Alembic
  app/
    main.py             FastAPI app + /health
    core/               config, db, redis
    api/                эндпоинты (Stage 7)
    bot/                Telegram Business handlers (Stage 2)
    llm/                DeepSeek provider (Stage 3)
    models/             SQLAlchemy (Stage 1)
    services/           booking, funnel, crm, analytics, billing, portfolio, reminders
    workers/scheduler.py APScheduler jobs
  alembic/              миграции
  tests/

frontend/               React + Vite + Tailwind
  src/
    pages/              экраны (Stage 8+)
    components/         shared UI
    lib/tokens.ts       HYB design tokens (зеркало tailwind.config.ts)
    lib/tg.ts           Telegram WebApp helpers
    api/                axios client

docs/
  design/               JSX-исходники дизайна (см. HYB)
  DEPLOY.md             деплой на Timeweb Cloud (Stage 12)
  BOT_SETUP.md          настройка @BotFather

docker-compose.yml      dev: db + redis + backend + frontend
docker-compose.prod.yml prod overrides (Stage 12)
.github/workflows/ci.yml CI: lint + tests + build
```

## Этапы разработки

Полное ТЗ по этапам — в `../DEV_PROMPT.md` (вне репо). Текущий статус: **Этап 0 завершён** (скелет).
