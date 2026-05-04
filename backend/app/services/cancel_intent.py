"""Tiny LLM-driven classifier: does this client message ask to cancel
or reschedule an existing booking?

Runs only when the bot is in `buttons` mode and the client typed free
text (not while a button-flow step is in progress and not while we're
waiting for «Имя +телефон»). Hybrid/text modes do this inline as part
of the main system prompt to avoid a second round-trip.

Output: True / False. Soft-fails to False on any LLM error so a flaky
provider can't strand a customer who simply said «привет».

Implementation note: rather than asking the LLM for a custom JSON
shape (which would fail the provider's standard {reply, actions, ...}
parser), we ride on top of the standard schema and tell the model to
put a single literal token («yes»/«no») into the `reply` field.
"""

from __future__ import annotations

import logging

from app.llm import LLMServiceError, get_llm

log = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "Ты классификатор намерений клиента в чате с мастером красоты. "
    "На вход — одно короткое сообщение клиента. Определи: клиент "
    "хочет ОТМЕНИТЬ или ПЕРЕНЕСТИ уже существующую запись?\n"
    "Примеры YES: «отмените», «не смогу прийти», «перенесите на "
    "другой день», «передумала», «не получится сегодня», «нужно "
    "отменить запись», «давайте на другой раз».\n"
    "Примеры NO: приветствия, вопросы про услуги или адрес, попытки "
    "ЗАПИСАТЬСЯ (а не отменить), благодарности.\n"
    "ОТВЕТ — строго один JSON-объект по обычной схеме, в поле reply "
    "только одно слово: «yes» если клиент хочет отменить/перенести, "
    "«no» в любом другом случае. actions=[], escalate=false, "
    "collected={}."
)


async def detect_cancel_intent(text: str) -> bool:
    """Return True if the message reads as a cancel/reschedule request.

    Soft-fails to False on parse errors or LLM unavailability — better
    to show the menu than silently swallow a perfectly innocent «Привет».
    """
    s = (text or "").strip()
    if not s or len(s) <= 1:
        return False
    try:
        result = await get_llm().generate(
            system_prompt=_SYSTEM_PROMPT,
            history=[],
            user_message=s,
        )
    except LLMServiceError as e:
        log.warning("cancel_intent classifier failed: %s", e)
        return False

    answer = (result.reply or "").strip().lower()
    # Tolerant matching — the model occasionally adds punctuation
    # («yes.»), wraps in quotes («"yes"») or appends a few words.
    return answer.startswith("yes") or answer.startswith("«yes")
