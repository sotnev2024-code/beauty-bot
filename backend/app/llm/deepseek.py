"""DeepSeek LLM provider — OpenAI-compatible Chat Completions API.

We ask the model to return a JSON object with a fixed schema via
`response_format={"type": "json_object"}` plus a strong system instruction.
This works on every DeepSeek model (including reasoner, which doesn't
support forced function-calling). Bad JSON triggers one corrective retry;
HTTP errors back off and retry up to max_http_retries.

The schema (reply, actions[], escalate, collected) is described inline
inside `build_bot_prompt`; this provider only emits a final correction
nudge if JSON parse fails.
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


CORRECTION_HINT = (
    "Предыдущий ответ был некорректным. Верни ТОЛЬКО JSON-объект со схемой "
    "{reply, actions, escalate, collected}. Без markdown, без обёртки."
)


@dataclass(slots=True)
class DeepSeekConfig:
    api_key: str
    api_base: str = "https://api.deepseek.com"
    model: str = "deepseek-chat"
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
                messages = [*messages, {"role": "system", "content": CORRECTION_HINT}]

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
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
            "max_tokens": 1024,
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

        if not cleaned:
            usage = response.get("usage") or {}
            finish = choice.get("finish_reason")
            log.warning(
                "LLM returned empty content (finish_reason=%s, usage=%s)", finish, usage
            )
            raise LLMServiceError(
                f"empty content (finish_reason={finish}, usage={usage})"
            )

        try:
            args = json.loads(cleaned)
        except json.JSONDecodeError as e:
            log.warning("LLM JSON parse failed; raw content (first 500 chars): %r", content[:500])
            raise LLMServiceError(f"content is not valid JSON: {e}") from e

        if not isinstance(args, dict):
            raise LLMServiceError("LLM JSON is not an object")

        reply = args.get("reply")
        if not isinstance(reply, str) or not reply.strip():
            raise LLMServiceError("missing 'reply' in JSON")

        actions_raw = args.get("actions") or []
        if not isinstance(actions_raw, list):
            actions_raw = []
        actions: list[dict[str, Any]] = [a for a in actions_raw if isinstance(a, dict) and a.get("type")]

        # Back-compat: synthesize actions from the legacy slot_intent /
        # portfolio_request fields (older models / tests that haven't been
        # migrated yet emit those instead of `actions`).
        legacy_slot_intent = args.get("slot_intent") if isinstance(args.get("slot_intent"), dict) else None
        legacy_portfolio = bool(args.get("portfolio_request", False))
        if not actions:
            if legacy_slot_intent:
                actions.append({"type": "create_booking", **legacy_slot_intent})
            if legacy_portfolio:
                actions.append({"type": "send_portfolio"})

        # Mirror back to legacy fields for any code path still reading them.
        slot_intent: dict[str, Any] | None = legacy_slot_intent
        portfolio_request = legacy_portfolio
        for a in actions:
            if not slot_intent and a.get("type") == "create_booking":
                slot_intent = {k: v for k, v in a.items() if k != "type"}
            if a.get("type") == "send_portfolio":
                portfolio_request = True

        return LLMResult(
            reply=reply.strip(),
            actions=actions,
            escalate=bool(args.get("escalate", False)),
            collected_data=dict(args.get("collected") or args.get("collected_data") or {}),
            raw=response,
            next_step_id=args.get("next_step_id"),
            slot_intent=slot_intent,
            portfolio_request=portfolio_request,
        )
