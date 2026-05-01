"""LLM provider abstraction.

The bot dialog engine talks to this Protocol; v1 backend is DeepSeek
(see deepseek.py). The provider returns an `LLMResult` containing the
client-facing reply plus a list of `actions` the server should dispatch
(create_booking, find_slots, lookup_kb, send_portfolio, send_location).

Legacy fields (`slot_intent`, `portfolio_request`, `next_step_id`) are
kept as a back-compat shim for older tests and any pre-refactor stubs.
The DeepSeekProvider keeps them populated from `actions` for symmetry.
They will be removed in Step 9 when funnel code is deleted.
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
    """Structured reply the dialog engine relies on."""

    reply: str
    actions: list[dict[str, Any]] = field(default_factory=list)
    # Suggested choice buttons rendered under the bubble. Empty for plain
    # text replies; populated for the «buttons» / «hybrid» formats when the
    # current turn is a multiple-choice prompt (services, times, yes/no).
    buttons: list[str] = field(default_factory=list)
    escalate: bool = False
    collected_data: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)
    # Legacy fields — back-compat shim. Removed in Step 9.
    next_step_id: int | None = None
    slot_intent: dict[str, Any] | None = None
    portfolio_request: bool = False


class LLMProvider(Protocol):
    async def generate(
        self,
        *,
        system_prompt: str,
        history: list[LLMMessage],
        user_message: str,
    ) -> LLMResult: ...
