from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Database
    DATABASE_URL: str = Field(default="postgresql+asyncpg://beauty:beauty@db:5432/beautybot")
    POSTGRES_USER: str = "beauty"
    POSTGRES_PASSWORD: str = "beauty"
    POSTGRES_DB: str = "beautybot"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "beauty_dev_bot"
    TELEGRAM_WEBHOOK_URL: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    TELEGRAM_BOT_SECRET: str = ""

    # Public URLs
    MINI_APP_URL: str = "https://crm.plus-shop.ru"
    PUBLIC_API_URL: str = "https://crm.plus-shop.ru/api"
    PUBLIC_PORTFOLIO_URL: str = "https://crm.plus-shop.ru/portfolio"
    DOMAIN: str = "crm.plus-shop.ru"

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"

    # YooKassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_RETURN_URL: str = ""
    YOOKASSA_WEBHOOK_URL: str = ""

    # Security / env
    SECRET_KEY: str = "change-me"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "https://crm.plus-shop.ru"
    DEFAULT_TIMEZONE: str = "Europe/Moscow"

    # Portfolio
    PORTFOLIO_STORAGE_PATH: str = "/var/www/portfolio"
    PORTFOLIO_MAX_FILE_SIZE_MB: int = 10

    # Billing
    TRIAL_DAYS: int = 14
    PRO_PRICE_MONTHLY: int = 900
    PRO_PLUS_PRICE_MONTHLY: int = 2400
    ANNUAL_DISCOUNT_PERCENT: int = 20

    # Bot business logic
    HUMAN_TAKEOVER_HOURS: int = 24
    SLOT_LOCK_MINUTES: int = 5
    MAX_SERVICES_PER_MASTER: int = 20
    LLM_HISTORY_MESSAGES: int = 20

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
