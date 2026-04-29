from redis.asyncio import Redis, from_url

from app.core.config import settings


def get_redis() -> Redis:
    return from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
