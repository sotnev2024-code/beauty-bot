"""Telegram Mini App initData HMAC validation.

Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

Algorithm:
  secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
  data_check_string = "\n".join(
      f"{k}={v}" for k, v in sorted(initData.items()) if k != "hash"
  )
  expected_hash = HMAC_SHA256(key=secret_key, data=data_check_string).hex()
  valid = constant_time_eq(expected_hash, initData["hash"])
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl


class InitDataError(Exception):
    """initData failed validation (signature, freshness, or shape)."""


@dataclass(slots=True)
class TelegramUser:
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    is_premium: bool = False
    language_code: str | None = None


@dataclass(slots=True)
class InitData:
    user: TelegramUser
    auth_date: datetime
    raw: dict[str, str]


# initData older than this is rejected to prevent replay.
DEFAULT_MAX_AGE = timedelta(hours=24)


def _build_secret_key(bot_token: str) -> bytes:
    return hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()


def _data_check_string(parsed: dict[str, str]) -> str:
    return "\n".join(f"{k}={parsed[k]}" for k in sorted(parsed) if k != "hash")


def validate_init_data(
    init_data: str,
    bot_token: str,
    *,
    max_age: timedelta = DEFAULT_MAX_AGE,
    now: datetime | None = None,
) -> InitData:
    """Verify Telegram-issued initData query string and return parsed payload.

    Raises InitDataError on any failure: missing fields, bad signature, stale auth_date.
    """
    if not init_data:
        raise InitDataError("empty initData")
    if not bot_token:
        raise InitDataError("bot token is not configured")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=False))
    received_hash = parsed.get("hash")
    if not received_hash:
        raise InitDataError("hash missing")

    expected = hmac.new(
        _build_secret_key(bot_token),
        _data_check_string(parsed).encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise InitDataError("hash mismatch")

    auth_date_raw = parsed.get("auth_date")
    if not auth_date_raw or not auth_date_raw.isdigit():
        raise InitDataError("auth_date missing or invalid")
    auth_date = datetime.fromtimestamp(int(auth_date_raw), tz=UTC)
    current = now or datetime.now(UTC)
    if current - auth_date > max_age:
        raise InitDataError("initData expired")

    user_raw = parsed.get("user")
    if not user_raw:
        raise InitDataError("user payload missing")
    try:
        user_dict = json.loads(user_raw)
    except json.JSONDecodeError as e:
        raise InitDataError("user payload is not valid JSON") from e

    user_id = user_dict.get("id")
    if not isinstance(user_id, int):
        raise InitDataError("user.id missing")

    user = TelegramUser(
        id=user_id,
        first_name=user_dict.get("first_name"),
        last_name=user_dict.get("last_name"),
        username=user_dict.get("username"),
        is_premium=bool(user_dict.get("is_premium", False)),
        language_code=user_dict.get("language_code"),
    )
    return InitData(user=user, auth_date=auth_date, raw=parsed)


def build_test_init_data(
    bot_token: str,
    user: dict[str, object],
    *,
    auth_date: datetime | None = None,
) -> str:
    """Helper for tests: build a properly-signed initData query string."""
    auth_date = auth_date or datetime.now(UTC)
    parts = {
        "auth_date": str(int(auth_date.timestamp())),
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
    }
    expected = hmac.new(
        _build_secret_key(bot_token),
        _data_check_string(parts).encode(),
        hashlib.sha256,
    ).hexdigest()
    parts["hash"] = expected
    from urllib.parse import urlencode

    return urlencode(parts)
