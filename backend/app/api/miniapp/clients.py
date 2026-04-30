from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentMaster, SessionDep
from app.models import (
    Booking,
    BookingStatus,
    Client,
    ClientSegment,
    ClientTag,
)
from app.schemas.client import (
    ClientDetail,
    ClientListItem,
    ClientRead,
    ClientStats,
    ClientUpdate,
    TagPayload,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientListItem])
async def list_clients(
    master: CurrentMaster,
    session: SessionDep,
    q: str | None = Query(None, description="search by name/phone"),
    segment: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ClientListItem]:
    stmt = (
        select(Client)
        .where(Client.master_id == master.id)
        .options(selectinload(Client.segments))
        .order_by(desc(Client.last_seen_at).nullslast(), Client.id.desc())
        .limit(limit)
        .offset(offset)
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Client.name.ilike(like), Client.phone.ilike(like)))
    if segment:
        stmt = stmt.join(ClientSegment).where(ClientSegment.segment == segment)

    rows = (await session.execute(stmt)).scalars().all()

    out: list[ClientListItem] = []
    for c in rows:
        visits = await session.scalar(
            select(func.count(Booking.id)).where(
                Booking.client_id == c.id, Booking.status == BookingStatus.DONE
            )
        )
        last_visit = await session.scalar(
            select(func.max(Booking.starts_at)).where(
                Booking.client_id == c.id, Booking.status == BookingStatus.DONE
            )
        )
        out.append(
            ClientListItem(
                id=c.id,
                telegram_id=c.telegram_id,
                name=c.name,
                phone=c.phone,
                first_seen_at=c.first_seen_at,
                last_seen_at=c.last_seen_at,
                source=c.source,
                notes=c.notes,
                visits_total=visits or 0,
                last_visit_at=last_visit,
                segments=[s.segment for s in c.segments],
            )
        )
    return out


@router.get("/{client_id}", response_model=ClientDetail)
async def get_client(client_id: int, master: CurrentMaster, session: SessionDep) -> ClientDetail:
    c = await _get_owned(session, master.id, client_id, with_relations=True)

    visits_total = await session.scalar(
        select(func.count(Booking.id)).where(Booking.client_id == c.id)
    )
    visits_done = await session.scalar(
        select(func.count(Booking.id)).where(
            Booking.client_id == c.id, Booking.status == BookingStatus.DONE
        )
    )
    avg_check = await session.scalar(
        select(func.avg(Booking.price)).where(
            Booking.client_id == c.id, Booking.status == BookingStatus.DONE
        )
    )
    last_visit = await session.scalar(
        select(func.max(Booking.starts_at)).where(
            Booking.client_id == c.id, Booking.status == BookingStatus.DONE
        )
    )

    return ClientDetail(
        **ClientRead.model_validate(c).model_dump(),
        stats=ClientStats(
            visits_total=visits_total or 0,
            visits_done=visits_done or 0,
            avg_check=avg_check,
            last_visit_at=last_visit,
            tags=[t.tag for t in c.tags],
            segments=[s.segment for s in c.segments],
        ),
    )


@router.patch("/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: int,
    payload: ClientUpdate,
    master: CurrentMaster,
    session: SessionDep,
) -> ClientRead:
    c = await _get_owned(session, master.id, client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    await session.commit()
    await session.refresh(c)
    return ClientRead.model_validate(c)


@router.post("/{client_id}/tags", response_model=list[str], status_code=status.HTTP_201_CREATED)
async def add_tag(
    client_id: int,
    payload: TagPayload,
    master: CurrentMaster,
    session: SessionDep,
) -> list[str]:
    c = await _get_owned(session, master.id, client_id, with_relations=True)
    if payload.tag not in [t.tag for t in c.tags]:
        session.add(ClientTag(client_id=c.id, tag=payload.tag))
        await session.commit()
        await session.refresh(c)
    return [t.tag for t in c.tags]


@router.delete(
    "/{client_id}/tags/{tag}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def remove_tag(
    client_id: int,
    tag: str,
    master: CurrentMaster,
    session: SessionDep,
) -> None:
    c = await _get_owned(session, master.id, client_id, with_relations=True)
    for t in c.tags:
        if t.tag == tag:
            await session.delete(t)
            await session.commit()
            return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tag not found")


async def _get_owned(
    session: SessionDep,
    master_id: int,
    client_id: int,
    *,
    with_relations: bool = False,
) -> Client:
    stmt = select(Client).where(Client.id == client_id, Client.master_id == master_id)
    if with_relations:
        stmt = stmt.options(selectinload(Client.tags), selectinload(Client.segments))
    c = (await session.execute(stmt)).scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")
    return c
