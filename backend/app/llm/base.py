"""LLM provider abstraction.

The bot funnel engine talks to this Protocol; in v1 it's backed by DeepSeek
(see deepseek.py). Other providers (OpenAI, local) just need to implement
the same generate() signature.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol


class LLMServiceError(Exception):
    """Raised when the LLM call fails irrecoverably (network, auth, repeated bad JSON)."""


Role = Literal["system", "user", "assistant"]


@dataclass(slots=True)
class LLMMessage:
    role: Role
    content: str


@dataclass(slots=True)
class LLMResult:
    """Structured reply the funnel engine relies on."""

    reply: str
    next_step_id: int | None = None
    escalate: bool = False
    collected_data: dict[str, Any] = field(default_factory=dict)
    slot_intent: dict[str, Any] | None = None
    portfolio_request: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


class LLMProvider(Protocol):
    async def generate(
        self,
        *,
        system_prompt: str,
        history: list[LLMMessage],
        user_message: str,
    ) -> LLMResult: ...
