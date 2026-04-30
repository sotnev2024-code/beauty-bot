"""DeepSeekProvider — exercised against a mocked HTTP transport."""

from __future__ import annotations

import json

import httpx
import pytest

from app.llm.base import LLMServiceError
from app.llm.deepseek import DeepSeekConfig, DeepSeekProvider

pytestmark = pytest.mark.asyncio


def _json_response(args: dict[str, object]) -> dict[str, object]:
    """Wrap structured args as the assistant's JSON content."""
    return {
        "id": "chatcmpl-1",
        "model": "deepseek-v4-flash",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": json.dumps(args, ensure_ascii=False),
                },
                "finish_reason": "stop",
            }
        ],
    }


def _provider(handler) -> DeepSeekProvider:
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport, base_url="https://api.deepseek.com")
    cfg = DeepSeekConfig(api_key="key", api_base="https://api.deepseek.com", max_http_retries=2)
    return DeepSeekProvider(cfg, client=client)


async def test_generate_happy_path() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=_json_response(
                {
                    "reply": "Привет! Какая услуга интересует?",
                    "next_step_id": 5,
                    "escalate": False,
                    "collected_data": {"name": "Аня"},
                    "slot_intent": None,
                    "portfolio_request": False,
                }
            ),
        )

    provider = _provider(handler)
    try:
        result = await provider.generate(
            system_prompt="ты ассистент",
            history=[],
            user_message="привет",
        )
    finally:
        await provider.aclose()

    assert result.reply.startswith("Привет")
    assert result.next_step_id == 5
    assert result.escalate is False
    assert result.collected_data == {"name": "Аня"}
    assert result.portfolio_request is False


async def test_portfolio_request_flag_propagates() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=_json_response(
                {
                    "reply": "Сейчас покажу пару работ.",
                    "escalate": False,
                    "portfolio_request": True,
                }
            ),
        )

    provider = _provider(handler)
    try:
        result = await provider.generate(
            system_prompt="x", history=[], user_message="покажи примеры"
        )
    finally:
        await provider.aclose()

    assert result.portfolio_request is True


async def test_unwraps_markdown_fenced_json() -> None:
    """Models sometimes wrap JSON in ```json ... ``` despite instructions."""

    def handler(_request: httpx.Request) -> httpx.Response:
        body = (
            "```json\n"
            + json.dumps({"reply": "ok", "escalate": False, "portfolio_request": False})
            + "\n```"
        )
        return httpx.Response(
            200,
            json={
                "id": "x",
                "model": "deepseek-v4-flash",
                "choices": [
                    {"message": {"role": "assistant", "content": body}, "finish_reason": "stop"}
                ],
            },
        )

    provider = _provider(handler)
    try:
        result = await provider.generate(system_prompt="x", history=[], user_message="hi")
    finally:
        await provider.aclose()
    assert result.reply == "ok"


async def test_retries_on_5xx_then_succeeds() -> None:
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, text="oops")
        return httpx.Response(
            200,
            json=_json_response({"reply": "ok", "escalate": False, "portfolio_request": False}),
        )

    cfg = DeepSeekConfig(api_key="key", max_http_retries=3)
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)

    provider = DeepSeekProvider(cfg, client=client)
    import app.llm.deepseek as ds_mod

    real_sleep = ds_mod.asyncio.sleep
    ds_mod.asyncio.sleep = lambda _s: real_sleep(0)  # type: ignore[assignment]
    try:
        result = await provider.generate(system_prompt="x", history=[], user_message="hi")
    finally:
        ds_mod.asyncio.sleep = real_sleep
        await provider.aclose()

    assert result.reply == "ok"
    assert calls["n"] == 2


async def test_raises_after_exhausting_http_retries() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    cfg = DeepSeekConfig(api_key="key", max_http_retries=2)
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)
    import app.llm.deepseek as ds_mod

    real_sleep = ds_mod.asyncio.sleep
    ds_mod.asyncio.sleep = lambda _s: real_sleep(0)  # type: ignore[assignment]

    provider = DeepSeekProvider(cfg, client=client)
    try:
        with pytest.raises(LLMServiceError):
            await provider.generate(system_prompt="x", history=[], user_message="hi")
    finally:
        ds_mod.asyncio.sleep = real_sleep
        await provider.aclose()


async def test_retries_on_bad_json_then_succeeds() -> None:
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            # Plain text, not JSON — should trigger the json_retry path
            return httpx.Response(
                200,
                json={"choices": [{"message": {"role": "assistant", "content": "freeform text"}}]},
            )
        return httpx.Response(
            200,
            json=_json_response({"reply": "fixed", "escalate": False, "portfolio_request": False}),
        )

    cfg = DeepSeekConfig(api_key="key", json_retry_attempts=1)
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)

    provider = DeepSeekProvider(cfg, client=client)
    try:
        result = await provider.generate(system_prompt="x", history=[], user_message="hi")
    finally:
        await provider.aclose()

    assert result.reply == "fixed"
    assert calls["n"] == 2


async def test_raises_when_reply_field_missing() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=_json_response({"escalate": False, "portfolio_request": False}),
        )

    provider = _provider(handler)
    try:
        with pytest.raises(LLMServiceError):
            await provider.generate(system_prompt="x", history=[], user_message="hi")
    finally:
        await provider.aclose()
