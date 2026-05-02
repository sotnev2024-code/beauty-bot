"""Virtual test chat — runs the bot prompt + LLM without writing to the DB.

Mini App posts message history + the new user line; we call the same LLM
provider with the master's bot_settings and current KB/services, and return
the structured reply. Nothing is persisted (no Conversation, Message, or
Booking writes).

This endpoint will be replaced by `/api/bot/test/*` (with Redis session and
fake-booking carding) in Step 8. For now it stays alive so the existing
TestChatPage in production keeps working during the rollout.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentMaster, SessionDep
from app.llm import get_llm
from app.llm.base import LLMMessage, LLMServiceError
from app.llm.prompts import build_bot_prompt
from app.models import (
    BotSettings,
    KnowledgeBaseItem,
    Service,
    ServiceCategory,
)
from app.services.dialog import (
    busy_slots_text_for_master,
    schedule_text_for_master,
)

router = APIRouter(prefix="/test", tags=["test"])


class TestMessage(BaseModel):
    role: str = Field(description="user | assistant")
    text: str


class TestDialogRequest(BaseModel):
    history: list[TestMessage] = Field(default_factory=list)
    user_message: str = Field(min_length=1, max_length=2000)
    funnel_id: int | None = None  # ignored, kept for backward compat
    step_position: int | None = Field(default=None, ge=0)  # ignored


class TestDialogResponse(BaseModel):
    reply: str
    actions: list[dict[str, Any]]
    buttons: list[str] = Field(default_factory=list)
    escalate: bool
    collected_data: dict[str, Any]


@router.post("/dialog", response_model=TestDialogResponse)
async def test_dialog(
    payload: TestDialogRequest,
    master: CurrentMaster,
    session: SessionDep,
) -> TestDialogResponse:
    bs = await session.get(BotSettings, master.id)
    voice_tone = bs.voice_tone if bs else "warm"
    message_format = bs.message_format if bs else "hybrid"

    services_text = await _services_block(session, master.id)
    kb_short_lines = await _kb_short_lines(session, master.id)
    schedule_text = await schedule_text_for_master(session, master.id)
    busy_slots_text = await busy_slots_text_for_master(
        session, master.id, master_tz_name=master.timezone or "Europe/Moscow"
    )

    system_prompt = build_bot_prompt(
        master_name=master.name,
        niche=master.niche,
        timezone=master.timezone or "Europe/Moscow",
        voice_tone=voice_tone,
        message_format=message_format,
        services_text=services_text,
        kb_short_lines=kb_short_lines,
        return_context=None,
        schedule_text=schedule_text,
        busy_slots_text=busy_slots_text,
    )

    history = [
        LLMMessage(role="user" if m.role == "user" else "assistant", content=m.text)
        for m in payload.history
        if m.text
    ]

    try:
        result = await get_llm().generate(
            system_prompt=system_prompt,
            history=history,
            user_message=payload.user_message,
        )
    except LLMServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        ) from e

    return TestDialogResponse(
        reply=result.reply,
        actions=result.actions,
        buttons=result.buttons,
        escalate=result.escalate,
        collected_data=result.collected_data,
    )


async def _services_block(session: SessionDep, master_id: int) -> str | None:
    rows = (
        (
            await session.execute(
                select(Service)
                .where(Service.master_id == master_id, Service.is_active.is_(True))
                .order_by(Service.id)
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        return None
    cats = {
        c.id: c
        for c in (
            (
                await session.execute(
                    select(ServiceCategory).where(ServiceCategory.master_id == master_id)
                )
            )
            .scalars()
            .all()
        )
    }
    lines = []
    for s in rows:
        cat_name = cats[s.category_id].name if (s.category_id and s.category_id in cats) else (
            s.group or None
        )
        cat_part = f" [{cat_name}]" if cat_name else ""
        desc_part = f" — {s.description}" if s.description else ""
        lines.append(
            f"- id={s.id}: {s.name}{cat_part}, {s.duration_minutes} мин, {s.price} ₽{desc_part}"
        )
    return "\n".join(lines)


_STANDARD_KB_TYPES: list[tuple[str, str]] = [
    ("address", "Адрес и как добраться"),
    ("payment", "Способы оплаты"),
    ("sterilization", "Стерилизация и санитария"),
    ("techniques", "Техники и материалы"),
    ("preparation", "Как подготовиться к визиту"),
    ("whats_with", "Что взять с собой"),
    ("guarantees", "Гарантии и переделки"),
    ("restrictions", "Ограничения (беременность, аллергии и т.п.)"),
]


async def _kb_short_lines(session: SessionDep, master_id: int) -> list[str]:
    """Same as dialog.py — inline filled KB items + label missing standard
    topics as «НЕ УКАЗАНО МАСТЕРОМ» so the model escalates instead of
    inventing facts (temperatures, brands etc).
    """
    rows = (
        (
            await session.execute(
                select(KnowledgeBaseItem)
                .where(KnowledgeBaseItem.master_id == master_id)
                .order_by(KnowledgeBaseItem.position, KnowledgeBaseItem.id)
            )
        )
        .scalars()
        .all()
    )
    out: list[str] = []
    filled_types: set[str] = set()
    for r in rows:
        filled_types.add(r.type)
        body = r.content.strip().replace("\n", " ")
        if len(body) > 600:
            body = body[:597] + "…"
        out.append(f"{r.title}: {body}")
        if r.geolocation_lat is not None and r.geolocation_lng is not None:
            out.append(
                f"Координаты {r.title.lower()}: "
                f"{r.geolocation_lat:.6f}, {r.geolocation_lng:.6f}"
            )
        if r.yandex_maps_url:
            out.append(f"Яндекс.Карты: {r.yandex_maps_url}")
    for kind, label in _STANDARD_KB_TYPES:
        if kind not in filled_types:
            out.append(
                f"{label}: НЕ УКАЗАНО МАСТЕРОМ — на вопросы по этой теме НИКОГДА "
                f"не отвечай конкретикой, ставь escalate=true и пиши «уточню у "
                f"мастера и вернусь»."
            )
    return out
