"""Pure unit tests for initData HMAC validation. No DB needed."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.core.security import (
    InitDataError,
    build_test_init_data,
    validate_init_data,
)

BOT_TOKEN = "1234567890:test-token-deadbeefcafebabe"


def test_validate_happy_path() -> None:
    init = build_test_init_data(
        BOT_TOKEN,
        user={"id": 42, "first_name": "Аня", "username": "anya", "is_premium": True},
    )
    payload = validate_init_data(init, BOT_TOKEN)
    assert payload.user.id == 42
    assert payload.user.username == "anya"
    assert payload.user.is_premium is True
    assert payload.user.first_name == "Аня"


def test_validate_rejects_tampered_payload() -> None:
    init = build_test_init_data(BOT_TOKEN, user={"id": 1})
    # Flip a character in the user payload (which was signed)
    tampered = init.replace("%22id%22%3A1", "%22id%22%3A2")
    if tampered == init:
        pytest.skip("encoding shape changed; refresh the replace token")
    with pytest.raises(InitDataError, match="hash mismatch"):
        validate_init_data(tampered, BOT_TOKEN)


def test_validate_rejects_wrong_bot_token() -> None:
    init = build_test_init_data(BOT_TOKEN, user={"id": 1})
    with pytest.raises(InitDataError, match="hash mismatch"):
        validate_init_data(init, "different-token")


def test_validate_rejects_missing_hash() -> None:
    with pytest.raises(InitDataError, match="hash missing"):
        validate_init_data("user=%7B%22id%22%3A1%7D&auth_date=1700000000", BOT_TOKEN)


def test_validate_rejects_empty() -> None:
    with pytest.raises(InitDataError, match="empty"):
        validate_init_data("", BOT_TOKEN)


def test_validate_rejects_stale_auth_date() -> None:
    old = datetime.now(UTC) - timedelta(days=2)
    init = build_test_init_data(BOT_TOKEN, user={"id": 1}, auth_date=old)
    with pytest.raises(InitDataError, match="expired"):
        validate_init_data(init, BOT_TOKEN, max_age=timedelta(hours=24))


def test_validate_accepts_max_age_override() -> None:
    old = datetime.now(UTC) - timedelta(days=2)
    init = build_test_init_data(BOT_TOKEN, user={"id": 1}, auth_date=old)
    payload = validate_init_data(init, BOT_TOKEN, max_age=timedelta(days=7))
    assert payload.user.id == 1
