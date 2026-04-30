"""DeepSeek LLM provider — OpenAI-compatible Chat Completions API.

We ask the model to return a JSON object with a fixed schema via
`response_format={"type": "json_object"}` plus a strong system instruction.
This works on every DeepSeek model (including reasoner, which doesn't
support forced function-calling). Bad JSON triggers one corrective retry;
HTTP errors back off and retry up to max_http_retries.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.llm.base import LLMMessage, LLMProvider, LLMResult, LLMServiceError

log = logging.getLogger(__name__)


SCHEMA_INSTRUCTION = """Ты ВСЕГДА отвечаешь ОДНИМ JSON-объектом, без markdown
и без пояснений. Структура:
{
  "reply": "<строка — твой ответ клиенту>",
  "next_step_id": <integer | null — id следующего шага воронки или null>,
  "escalate": <boolean — нужна ли ручная помощь мастера>,
  "collected_data": {<object — поля, собранные на этом шаге>},
  "slot_intent": <object | null — {starts_at: ISO-8601, service_id?: int} или null>,
  "portfolio_request": <boolean — попросил ли клиент примеры работ>
}
Поля reply, escalate, portfolio_request обязательны."""


@dataclass(slots=True)
class DeepSeekConfig:
    api_key: str
    api_base: str = "https://api.deepseek.com"
    model: str = "deepseek-v4-flash"
    request_timeout: float = 30.0
    max_http_retries: int = 3
    json_retry_attempts: int = 1


class DeepSeekProvider(LLMProvider):
    def __init__(
        self,
        config: DeepSeekConfig,
        *,
        client: httpx.AsyncClient | None = None,
        proxy: str | None = None,
    ) -> None:
        self._cfg = config
        if client is not None:
            self._client = client
        else:
            kwargs: dict = {"timeout": config.request_timeout}
            if proxy:
                kwargs["proxy"] = proxy
            self._client = httpx.AsyncClient(**kwargs)
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def generate(
        self,
        *,
        system_prompt: str,
        history: list[LLMMessage],
        user_message: str,
    ) -> LLMResult:
        messages = self._build_messages(system_prompt, history, user_message)
        last_err: Exception | None = None

        for attempt in range(self._cfg.json_retry_attempts + 1):
            response = await self._post_with_retries(messages)
            try:
                return self._parse_json_content(response)
            except LLMServiceError as e:
                last_err = e
                log.warning("LLM JSON parse failure (attempt %s): %s", attempt + 1, e)
                messages = [
                    *messages,
                    {
                        "role": "system",
                        "content": (
                            "Предыдущий ответ был некорректным. Верни ТОЛЬКО JSON-объект "
                            "со схемой {reply, next_step_id, escalate, collected_data, "
                            "slot_intent, portfolio_request}. Без markdown, без обёртки."
                        ),
                    },
                ]

        raise LLMServiceError(f"LLM returned unparseable JSON after retries: {last_err}")

    # ------------------------------------------------------------------ internals

    def _build_messages(
        self,
        system_prompt: str,
        history: list[LLMMessage],
        user_message: str,
    ) -> list[dict[str, Any]]:
        # Prepend the schema instruction to whatever the funnel system_prompt is.
        full_system = system_prompt.rstrip() + "\n\n" + SCHEMA_INSTRUCTION
        msgs: list[dict[str, Any]] = [{"role": "system", "content": full_system}]
        for m in history:
            msgs.append({"role": m.role, "content": m.content})
        msgs.append({"role": "user", "content": user_message})
        return msgs

    async def _post_with_retries(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        url = f"{self._cfg.api_base.rstrip('/')}/v1/chat/completions"
        payload = {
            "model": self._cfg.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {self._cfg.api_key}",
            "Content-Type": "application/json",
        }

        last_exc: Exception | None = None
        for attempt in range(self._cfg.max_http_retries):
            try:
                resp = await self._client.post(url, json=payload, headers=headers)
                if resp.status_code >= 500:
                    raise httpx.HTTPStatusError(
                        f"deepseek 5xx: {resp.status_code}", request=resp.request, response=resp
                    )
                if resp.status_code == 429:
                    raise httpx.HTTPStatusError(
                        "deepseek rate limited", request=resp.request, response=resp
                    )
                resp.raise_for_status()
                return resp.json()
            except (httpx.HTTPError, httpx.HTTPStatusError) as e:
                last_exc = e
                if attempt == self._cfg.max_http_retries - 1:
                    break
                backoff = min(2**attempt, 5)
                log.warning(
                    "LLM HTTP error (attempt %s, retry in %ss): %s", attempt + 1, backoff, e
                )
                await asyncio.sleep(backoff)

        raise LLMServiceError(f"deepseek unreachable: {last_exc}") from last_exc

    def _parse_json_content(self, response: dict[str, Any]) -> LLMResult:
        try:
            choice = response["choices"][0]
            content = choice["message"]["content"] or ""
        except (KeyError, IndexError) as e:
            raise LLMServiceError(f"malformed LLM response: {e}") from e

        # Models occasionally wrap JSON in markdown fences despite the prompt.
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].lstrip("\n")

        try:
            args = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise LLMServiceError(f"content is not valid JSON: {e}") from e

        if not isinstance(args, dict):
            raise LLMServiceError("LLM JSON is not an object")

        reply = args.get("reply")
        if not isinstance(reply, str) or not reply.strip():
            raise LLMServiceError("missing 'reply' in JSON")

        return LLMResult(
            reply=reply.strip(),
            next_step_id=args.get("next_step_id"),
            escalate=bool(args.get("escalate", False)),
            collected_data=dict(args.get("collected_data") or {}),
            slot_intent=args.get("slot_intent"),
            portfolio_request=bool(args.get("portfolio_request", False)),
            raw=response,
        )
