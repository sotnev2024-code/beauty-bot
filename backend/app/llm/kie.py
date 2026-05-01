"""kie.ai LLM provider — GPT-5.2 endpoint.

OpenAI-compatible chat-completions shape, but no response_format support.
We rely on a strong "ONLY JSON, no prose" system instruction and an
extract-first-JSON-object fallback in case the model wraps the JSON.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.llm.base import LLMMessage, LLMProvider, LLMResult, LLMServiceError

log = logging.getLogger(__name__)


JSON_INSTRUCTION = (
    "\n\nКРИТИЧЕСКИ ВАЖНО: верни ОДИН JSON-объект и НИЧЕГО больше — "
    "ни markdown, ни текста до/после, ни обёртки ```json. Только сам объект."
)

# Forceful, model-agnostic preamble. We send it as a *separate* system message
# at the very start so the conversational/persona instructions that follow
# don't dilute the format requirement.
TECH_PREAMBLE = (
    "You are a JSON-only API. Your entire output is a SINGLE valid JSON object — "
    "no prose, no markdown, no code fences, no commentary before or after. "
    "The first character of your reply MUST be `{` and the last character MUST be `}`. "
    'Required schema: {"reply": <string>, "actions": <array>, "escalate": <boolean>, "collected": <object>}. '
    'If you would otherwise greet the user, encode it as {"reply":"<greeting>","actions":[],"escalate":false,"collected":{}}. '
    "Any other format is a hard failure."
)


@dataclass(slots=True)
class KieConfig:
    api_key: str
    api_base: str = "https://api.kie.ai"
    model_path: str = "gpt-5-2"  # path segment, not a `model` body field
    request_timeout: float = 60.0
    max_http_retries: int = 3
    json_retry_attempts: int = 1
    reasoning_effort: str = "low"  # high adds latency


class KieProvider(LLMProvider):
    def __init__(
        self,
        config: KieConfig,
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
                return self._parse(response)
            except LLMServiceError as e:
                last_err = e
                log.warning("kie JSON parse fail (attempt %s): %s", attempt + 1, e)
                messages = [
                    *messages,
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Предыдущий ответ был некорректен. Верни ТОЛЬКО "
                                    "JSON-объект {reply, actions, escalate, collected}, "
                                    "без markdown."
                                ),
                            }
                        ],
                    },
                ]
        raise LLMServiceError(f"kie returned unparseable JSON after retries: {last_err}")

    # ----------------------------------------------------------- internals

    def _build_messages(
        self,
        system_prompt: str,
        history: list[LLMMessage],
        user_message: str,
    ) -> list[dict[str, Any]]:
        sys_text = system_prompt.rstrip() + JSON_INSTRUCTION
        msgs: list[dict[str, Any]] = [
            # Preamble first so the JSON contract is the first thing the model
            # sees, regardless of how long the persona system prompt is.
            {"role": "system", "content": [{"type": "text", "text": TECH_PREAMBLE}]},
            {"role": "system", "content": [{"type": "text", "text": sys_text}]},
        ]
        for m in history:
            msgs.append(
                {"role": m.role, "content": [{"type": "text", "text": m.content}]}
            )
        # Wrap the user message with a final "JSON only" reminder so it sits
        # immediately before generation — many models obey the instruction
        # closest to the cursor.
        wrapped_user = (
            f"{user_message}\n\n"
            "[reply with the JSON object only — first char `{`, last char `}`]"
        )
        msgs.append(
            {"role": "user", "content": [{"type": "text", "text": wrapped_user}]}
        )
        return msgs

    async def _post_with_retries(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        url = f"{self._cfg.api_base.rstrip('/')}/{self._cfg.model_path}/v1/chat/completions"
        payload = {
            "messages": messages,
            "reasoning_effort": self._cfg.reasoning_effort,
            # Some kie.ai-fronted models honour the OpenAI-style response_format
            # hint even when it's not in the published docs. Harmless if ignored.
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self._cfg.api_key}",
            "Content-Type": "application/json",
        }

        last_exc: Exception | None = None
        for attempt in range(self._cfg.max_http_retries):
            try:
                resp = await self._client.post(url, json=payload, headers=headers)
                if resp.status_code >= 500 or resp.status_code == 429:
                    raise httpx.HTTPStatusError(
                        f"kie {resp.status_code}", request=resp.request, response=resp
                    )
                resp.raise_for_status()
                return resp.json()
            except (httpx.HTTPError, httpx.HTTPStatusError) as e:
                last_exc = e
                if attempt == self._cfg.max_http_retries - 1:
                    break
                backoff = min(2**attempt, 5)
                log.warning("kie HTTP error attempt=%s retry_in=%ss: %s", attempt + 1, backoff, e)
                await asyncio.sleep(backoff)
        raise LLMServiceError(f"kie unreachable: {last_exc}") from last_exc

    def _parse(self, response: dict[str, Any]) -> LLMResult:
        try:
            choice = response["choices"][0]
            content = choice["message"]["content"]
        except (KeyError, IndexError) as e:
            raise LLMServiceError(f"malformed kie response: {e}") from e

        text = _flatten_content(content)
        cleaned = _extract_json_object(text)
        if not cleaned:
            usage = response.get("usage") or {}
            stripped = text.strip()
            log.warning(
                "kie returned no JSON. finish=%s usage=%s raw[:300]=%r",
                choice.get("finish_reason"),
                usage,
                text[:300],
            )
            # Last-ditch graceful fallback: a non-empty, short, prose reply
            # from the model is wrapped into the expected schema so the user
            # at least sees a coherent message instead of a generic «Ошибка теста».
            # Bigger payloads almost certainly mean broken output, fall through.
            if stripped and len(stripped) <= 500:
                return LLMResult(
                    reply=stripped,
                    actions=[],
                    escalate=False,
                    collected_data={},
                    raw=response,
                )
            raise LLMServiceError("kie content has no JSON object")

        try:
            args = json.loads(cleaned)
        except json.JSONDecodeError as e:
            log.warning("kie JSON decode fail; raw[:500]=%r", text[:500])
            raise LLMServiceError(f"kie content is not valid JSON: {e}") from e

        if not isinstance(args, dict):
            raise LLMServiceError("kie JSON is not an object")

        reply = args.get("reply")
        if not isinstance(reply, str) or not reply.strip():
            raise LLMServiceError("missing 'reply' in kie JSON")

        actions_raw = args.get("actions") or []
        if not isinstance(actions_raw, list):
            actions_raw = []
        actions = [a for a in actions_raw if isinstance(a, dict) and a.get("type")]

        buttons_raw = args.get("buttons") or []
        buttons = (
            [str(b).strip() for b in buttons_raw if isinstance(b, str) and str(b).strip()]
            if isinstance(buttons_raw, list)
            else []
        )

        # Mirror to legacy fields for back-compat with existing dialog code paths.
        slot_intent: dict[str, Any] | None = None
        portfolio_request = False
        for a in actions:
            if not slot_intent and a.get("type") == "create_booking":
                slot_intent = {k: v for k, v in a.items() if k != "type"}
            if a.get("type") == "send_portfolio":
                portfolio_request = True

        return LLMResult(
            reply=reply.strip(),
            actions=actions,
            buttons=buttons,
            escalate=bool(args.get("escalate", False)),
            collected_data=dict(args.get("collected") or args.get("collected_data") or {}),
            raw=response,
            slot_intent=slot_intent,
            portfolio_request=portfolio_request,
        )


def _flatten_content(content: Any) -> str:
    """kie.ai returns content either as a string or as a [{type, text}] array."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                t = block.get("text")
                if isinstance(t, str):
                    parts.append(t)
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return ""


def _extract_json_object(text: str) -> str:
    """Return the first balanced {...} substring, or '' if none found.

    Tolerates models that wrap JSON in ```json ... ``` fences or add prose.
    """
    s = text.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:]
        s = s.strip()

    if s.startswith("{"):
        # Fast path: balanced-brace scan from index 0.
        depth = 0
        in_str = False
        esc = False
        for i, ch in enumerate(s):
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[: i + 1]
        return ""

    # Fallback: search for the first '{' and rescan from there.
    m = re.search(r"\{", s)
    if not m:
        return ""
    return _extract_json_object(s[m.start():])
