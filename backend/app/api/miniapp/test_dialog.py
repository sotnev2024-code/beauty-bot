"""Virtual test chat — runs the funnel + LLM without writing to the DB.

The Mini App posts the running message history + the new user line; we call
the same LLM provider with the same step prompt (active funnel's first step
or a follow-up step the master picked) and return the structured reply.
Nothing is persisted — Conversation, Message, Booking, Reminder all stay
untouched.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentMaster, SessionDep
from app.llm import get_llm
from app.llm.base import LLMMessage, LLMServiceError
from app.llm.prompts import build_step_prompt
from app.models import Funnel, Service

router = APIRouter(prefix="/test", tags=["test"])


class TestMessage(BaseModel):
    role: str = Field(description="user | assistant")
    text: str


class TestDialogRequest(BaseModel):
    history: list[TestMessage] = Field(default_factory=list)
    user_message: str = Field(min_length=1, max_length=2000)
    funnel_id: int | None = None
    step_position: int | None = Field(default=None, ge=0)


class TestDialogResponse(BaseModel):
    reply: str
    next_step_id: int | None
    escalate: bool
    portfolio_request: bool
    slot_intent: dict[str, Any] | None
    collected_data: dict[str, Any]


@router.post("/dialog", response_model=TestDialogResponse)
async def test_dialog(
    payload: TestDialogRequest,
    master: CurrentMaster,
    session: SessionDep,
) -> TestDialogResponse:
    # Pick a funnel — explicit id, otherwise the active main one.
    funnel: Funnel | None = None
    if payload.funnel_id is not None:
        funnel = (
            await session.execute(
                select(Funnel)
                .where(Funnel.id == payload.funnel_id, Funnel.master_id == master.id)
                .options(selectinload(Funnel.steps))
            )
        ).scalar_one_or_none()
    else:
        funnel = (
            await session.execute(
                select(Funnel)
                .where(Funnel.master_id == master.id, Funnel.is_active.is_(True))
                .options(selectinload(Funnel.steps))
                .limit(1)
            )
        ).scalar_one_or_none()
    if funnel is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="no active funnel — pick one in Bot tab first",
        )

    sorted_steps = sorted(funnel.steps, key=lambda s: s.position)
    step = None
    if payload.step_position is not None:
        step = next((s for s in sorted_steps if s.position == payload.step_position), None)
    if step is None and sorted_steps:
        step = sorted_steps[0]

    services_text = await _services_block(session, master.id)
    system_prompt = build_step_prompt(
        master_name=master.name,
        niche=master.niche,
        timezone=master.timezone or "Europe/Moscow",
        address=master.address,
        step_goal=step.goal if step else None,
        step_system_prompt=step.system_prompt if step else None,
        services_text=services_text,
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
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e

    return TestDialogResponse(
        reply=result.reply,
        next_step_id=result.next_step_id,
        escalate=result.escalate,
        portfolio_request=result.portfolio_request,
        slot_intent=result.slot_intent,
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
    lines = [
        f"- id={s.id}: {s.name}, {s.duration_minutes} мин, {s.price} ₽"
        + (f" — {s.description}" if s.description else "")
        for s in rows
    ]
    return "\n".join(lines)
