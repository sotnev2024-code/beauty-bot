# Beauty.dev — start the bot locally for testing
#
# What it does:
#   1. Brings up Postgres + Redis in docker (only those, no backend container)
#   2. Creates a venv in backend/.venv if missing and installs deps
#   3. Runs `alembic upgrade head` so the local DB has the latest schema
#   4. Starts uvicorn — the bot enters long-polling mode automatically
#      because TELEGRAM_WEBHOOK_URL in .env is empty
#
# Prereqs:
#   - Docker Desktop running
#   - Python 3.12 or 3.13 installed (we use C:\Program Files\Python313\python.exe)
#   - .env in repo root (copy from .env.local.example and fill secrets)
#
# Stop with Ctrl+C. The DB containers stay running; tear them down with
#   docker compose down  (in repo root)

$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repo

if (-not (Test-Path "$repo\.env")) {
    Write-Error ".env not found. Copy .env.local.example to .env and fill TELEGRAM_BOT_TOKEN + KIE_API_KEY."
}

# 1. db + redis
Write-Host "==> Starting Postgres + Redis..." -ForegroundColor Cyan
docker compose up -d db redis
docker compose ps

# 2. venv + deps
$python = "C:\Program Files\Python313\python.exe"
if (-not (Test-Path $python)) { $python = "python" }
$venv = "$repo\backend\.venv"
if (-not (Test-Path $venv)) {
    Write-Host "==> Creating venv at backend\.venv..." -ForegroundColor Cyan
    & $python -m venv $venv
}
$venvPython = "$venv\Scripts\python.exe"
& $venvPython -m pip install --upgrade pip --quiet
Write-Host "==> Installing backend deps..." -ForegroundColor Cyan
& $venvPython -m pip install --quiet `
    "fastapi>=0.115" "uvicorn[standard]>=0.32" `
    "sqlalchemy[asyncio]>=2.0.36" "asyncpg>=0.30" `
    "alembic>=1.14" "redis>=5.2" `
    "pydantic>=2.10" "pydantic-settings>=2.6" `
    "httpx>=0.27" "aiogram>=3.15" "aiohttp-socks>=0.10" `
    "apscheduler>=3.11" "python-multipart>=0.0.20" `
    "pillow>=11" "yookassa>=3.6"

# 3. alembic
Write-Host "==> Running alembic upgrade head..." -ForegroundColor Cyan
Set-Location "$repo\backend"
& $venvPython -m alembic upgrade head
Set-Location $repo

# 4. uvicorn
Write-Host "==> Starting backend on http://localhost:8001 (polling Telegram)..." -ForegroundColor Cyan
Write-Host "    Stop with Ctrl+C." -ForegroundColor Yellow
Set-Location "$repo\backend"
& $venvPython -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
