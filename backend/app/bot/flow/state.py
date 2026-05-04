"""FSM state for the button-only booking flow.

Stored as a JSONB blob on `Conversation.flow_state`. NULL when the
master uses an LLM-driven format (text/hybrid).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

# Steps in the booking funnel. `qa_*` steps belong to the «Задать вопрос»
# branch but share the same flow_state row so we can switch back to root
# from any sub-screen.
Step = Literal[
    "root",            # «Записаться» / «Задать вопрос»
    "category",        # service-category picker (skipped if ≤1 category)
    "service",         # service picker
    "addons",          # multi-select add-on picker
    "day",             # month-grid calendar
    "time",            # time-slot picker
    "contacts",        # waiting for «Имя +71234567890» as a single message
    "confirm",         # booking summary, confirm/back
    "qa_topics",       # KB topic list
    "qa_answer",       # showing one KB topic
]


@dataclass(slots=True)
class FlowState:
    step: Step = "root"
    category_id: int | None = None
    service_id: int | None = None
    addon_ids: list[int] = field(default_factory=list)
    day: str | None = None  # YYYY-MM-DD in master's tz
    starts_at: str | None = None  # ISO-8601 with offset
    cal_year: int | None = None
    cal_month: int | None = None  # for navigating the calendar
    qa_topic: str | None = None
    # Telegram message_id of the last interactive bot message in the
    # business chat. We strip the keyboard off it whenever we move on,
    # so old buttons don't stay tappable.
    menu_message_id: int | None = None
    # Hybrid-mode parking lot: when the LLM emits create_booking we
    # don't execute it right away — we stash the params here and show
    # the client a confirm card. On bk:confirm we run create_booking
    # using these. On bk:back / bk:cancel we drop them.
    pending_booking: dict[str, Any] | None = None
    # In hybrid mode we use addon checklists like buttons-mode but
    # remember which step we're parked on between turns.
    hybrid_addons_offered: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "category_id": self.category_id,
            "service_id": self.service_id,
            "addon_ids": list(self.addon_ids),
            "day": self.day,
            "starts_at": self.starts_at,
            "cal_year": self.cal_year,
            "cal_month": self.cal_month,
            "qa_topic": self.qa_topic,
            "menu_message_id": self.menu_message_id,
            "pending_booking": self.pending_booking,
            "hybrid_addons_offered": self.hybrid_addons_offered,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "FlowState":
        if not data:
            return cls()
        return cls(
            step=data.get("step", "root"),
            category_id=data.get("category_id"),
            service_id=data.get("service_id"),
            addon_ids=list(data.get("addon_ids") or []),
            day=data.get("day"),
            starts_at=data.get("starts_at"),
            cal_year=data.get("cal_year"),
            cal_month=data.get("cal_month"),
            qa_topic=data.get("qa_topic"),
            menu_message_id=data.get("menu_message_id"),
            pending_booking=data.get("pending_booking"),
            hybrid_addons_offered=bool(data.get("hybrid_addons_offered", False)),
        )

    def reset(self) -> None:
        self.step = "root"
        self.category_id = None
        self.service_id = None
        self.addon_ids = []
        self.day = None
        self.starts_at = None
        self.cal_year = None
        self.cal_month = None
        self.qa_topic = None
        self.pending_booking = None
        self.hybrid_addons_offered = False
        # Don't clear menu_message_id — handler refreshes it on the
        # next render anyway, and keeping it lets us still strip the
        # keyboard off the previous menu.
