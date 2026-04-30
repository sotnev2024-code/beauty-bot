"""DeepSeek LLM provider — OpenAI-compatible Chat Completions API with function calling.

We force a single tool call (`reply_to_client`) so the model returns a structured
JSON we control. JSON-shape failures trigger one retry with a strong reminder;
HTTP errors get short exponential backoff (see _post_with_retries).
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

REPLY_TOOL_NAME = "reply_to_client"

REPLY_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": REPLY_TOOL_NAME,
        "description": (
            "Always call this function with the assistant's response and funnel "
            "metadata. Never reply outside of this function call."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "reply": {
                    "type": "string",
                    "description": "Текст, который бот отправит клиенту от лица мастера.",
                },
                "next_step_id": {
                    "type": ["integer", "null"],
                    "description": (
                        "ID следующего шага воронки, если переход случился; "
                        "null — оставаться на текущем."
                    ),
                },
                "escalate": {
                    "type": "boolean",
                    "description": (
                        "true, если нужна ручная помощь мастера "
                        "(жалоба, неоднозначная ситуация)."
                    ),
                },
                "collected_data": {
                    "type": "object",
                    "additionalProperties": True,
                    "description": "Поля, собранные на этом шаге (имя, телефон, услуга, ...).",
                },
                "slot_intent": {
                    "type": ["object", "null"],
                    "additionalProperties": True,
                    "description": (
                        "Если клиент подтвердил конкретное время — объект "
                        "{starts_at: ISO-8601, service_id?: int}; иначе null."
                    ),
                },
                "portfolio_request": {
                    "type": "boolean",
                    "description": "true, если клиент попросил показать примеры работ.",
                },
            },
            "required": ["reply", "escalate", "portfolio_request"],
        },
    },
}


@dataclass(slots=True)
class DeepSeekConfig:
    api_key: str
    api_base: str = "https://api.deepseek.com"
    model: str = "deepseek-v4-flash"
    request_timeout: float = 30.0
    max_http_retries: int = 3
    json_retry_attempts: int = 1


class DeepSeekProvider(LLMProvider):
    def __init__(self, config: DeepSeekConfig, *, client: httpx.AsyncClient | None = None) -> None:
        self._cfg = config
        self._client = client or httpx.AsyncClient(timeout=config.request_timeout)
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
                return self._parse_tool_call(response)
            except LLMServiceError as e:
                last_err = e
                log.warning("LLM JSON parse failure (attempt %s): %s", attempt + 1, e)
                # Reinforce the instruction and retry once
                messages = [
                    *messages,
                    {
                        "role": "system",
                        "content": (
                            "Предыдущий ответ был некорректным. ВЫЗОВИ функцию "
                            f"{REPLY_TOOL_NAME} с обязательными полями reply, escalate, "
                            "portfolio_request. Не пиши свободный текст."
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
        msgs: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for m in history:
            msgs.append({"role": m.role, "content": m.content})
        msgs.append({"role": "user", "content": user_message})
        return msgs

    async def _post_with_retries(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        url = f"{self._cfg.api_base.rstrip('/')}/v1/chat/completions"
        payload = {
            "model": self._cfg.model,
            "messages": messages,
            "tools": [REPLY_TOOL],
            "tool_choice": {"type": "function", "function": {"name": REPLY_TOOL_NAME}},
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

    def _parse_tool_call(self, response: dict[str, Any]) -> LLMResult:
        try:
            choice = response["choices"][0]
            message = choice["message"]
            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                raise LLMServiceError("model did not return a tool_call")

            call = tool_calls[0]
            fn = call.get("function") or {}
            if fn.get("name") != REPLY_TOOL_NAME:
                raise LLMServiceError(f"unexpected tool: {fn.get('name')!r}")

            arguments_raw = fn.get("arguments") or "{}"
            args = json.loads(arguments_raw) if isinstance(arguments_raw, str) else arguments_raw
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise LLMServiceError(f"malformed LLM response: {e}") from e

        reply = args.get("reply")
        if not isinstance(reply, str) or not reply.strip():
            raise LLMServiceError("missing 'reply' in tool arguments")

        return LLMResult(
            reply=reply.strip(),
            next_step_id=args.get("next_step_id"),
            escalate=bool(args.get("escalate", False)),
            collected_data=dict(args.get("collected_data") or {}),
            slot_intent=args.get("slot_intent"),
            portfolio_request=bool(args.get("portfolio_request", False)),
            raw=response,
        )
