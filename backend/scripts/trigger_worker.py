"""Manual trigger for the proactive workers.

Bypasses APScheduler so an operator can fire a tick on demand — useful for
QA on staging or for verifying a fix to a single worker without restarting
the whole stack.

Usage on the server:
    docker compose -f docker-compose.host-nginx.yml exec -T backend \
      python scripts/trigger_worker.py <name>

Where <name> is one of:
    return_invitations         — find clients due for a comeback nudge
    expire_return_campaigns    — flip stale «sent» campaigns to «expired»
    service_reminders          — repeat-visit prompts for masters who opted in
    master_digest              — daily 10:00-local stats DM to the master
    expire_subscriptions       — demote masters whose plan + trial both lapsed

Each command writes the count of items processed to stdout and exits.
"""

from __future__ import annotations

import asyncio
import sys
from typing import Awaitable, Callable

from app.core.db import session_factory


async def _return_invitations() -> int:
    from app.workers.return_campaigns import send_due_return_invitations
    from app.workers.scheduler import _send_via_bot

    async with session_factory() as session:
        return await send_due_return_invitations(session, sender=_send_via_bot)


async def _expire_return_campaigns() -> int:
    from app.workers.return_campaigns import expire_due_campaigns

    async with session_factory() as session:
        n = await expire_due_campaigns(session)
        await session.commit()
        return n


async def _service_reminders() -> int:
    from app.workers.scheduler import _send_via_bot
    from app.workers.service_reminders import send_due_service_reminders

    async with session_factory() as session:
        return await send_due_service_reminders(session, sender=_send_via_bot)


async def _master_digest() -> int:
    from app.workers.master_digest import send_due_master_digests
    from app.workers.scheduler import _send_via_bot

    async with session_factory() as session:
        return await send_due_master_digests(session, sender=_send_via_bot)


async def _expire_subscriptions() -> int:
    from app.services.billing import expire_lapsed_subscriptions

    async with session_factory() as session:
        n = await expire_lapsed_subscriptions(session)
        await session.commit()
        return n


COMMANDS: dict[str, Callable[[], Awaitable[int]]] = {
    "return_invitations": _return_invitations,
    "expire_return_campaigns": _expire_return_campaigns,
    "service_reminders": _service_reminders,
    "master_digest": _master_digest,
    "expire_subscriptions": _expire_subscriptions,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        names = ", ".join(sorted(COMMANDS))
        print(f"usage: trigger_worker.py <{names}>", file=sys.stderr)
        sys.exit(2)
    name = sys.argv[1]
    n = asyncio.run(COMMANDS[name]())
    print(f"{name}: processed {n} item(s)")


if __name__ == "__main__":
    main()
