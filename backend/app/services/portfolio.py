"""Portfolio upload + retrieval.

Storage layout: {PORTFOLIO_STORAGE_PATH}/{master_id}/{ulid}.jpg
Public URL: {PUBLIC_PORTFOLIO_URL}/{master_id}/{ulid}.jpg
Nginx serves the storage path read-only at PUBLIC_PORTFOLIO_URL.
"""

from __future__ import annotations

import io
import logging
import secrets
from pathlib import Path
from random import sample

from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Master, PortfolioPhoto

log = logging.getLogger(__name__)

MAX_LONG_SIDE = 1280
JPEG_QUALITY = 85


class PortfolioError(Exception):
    pass


def _master_dir(master_id: int) -> Path:
    return Path(settings.PORTFOLIO_STORAGE_PATH) / str(master_id)


def _public_url(master_id: int, filename: str) -> str:
    base = settings.PUBLIC_PORTFOLIO_URL.rstrip("/")
    return f"{base}/{master_id}/{filename}"


async def save_photo(
    session: AsyncSession,
    *,
    master: Master,
    raw: bytes,
    original_filename: str | None = None,
) -> PortfolioPhoto:
    if len(raw) > settings.PORTFOLIO_MAX_FILE_SIZE_MB * 1024 * 1024:
        raise PortfolioError("file too large")

    try:
        with Image.open(io.BytesIO(raw)) as im:
            im = im.convert("RGB")
            im.thumbnail((MAX_LONG_SIDE, MAX_LONG_SIDE))
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            data = buf.getvalue()
    except Exception as e:
        raise PortfolioError(f"unsupported image: {e}") from e

    target_dir = _master_dir(master.id)
    target_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{secrets.token_urlsafe(12)}.jpg"
    (target_dir / fname).write_bytes(data)

    row = PortfolioPhoto(
        master_id=master.id,
        filename=original_filename or fname,
        file_path=str(target_dir / fname),
        public_url=_public_url(master.id, fname),
    )
    session.add(row)
    await session.flush()
    return row


async def random_photos(
    session: AsyncSession, *, master_id: int, count: int = 3
) -> list[PortfolioPhoto]:
    rows = (
        (await session.execute(select(PortfolioPhoto).where(PortfolioPhoto.master_id == master_id)))
        .scalars()
        .all()
    )
    if not rows:
        return []
    if len(rows) <= count:
        return list(rows)
    return sample(list(rows), count)


async def delete_photo(session: AsyncSession, *, master_id: int, photo_id: int) -> bool:
    row = (
        await session.execute(
            select(PortfolioPhoto).where(
                PortfolioPhoto.id == photo_id, PortfolioPhoto.master_id == master_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    try:
        Path(row.file_path).unlink(missing_ok=True)
    except Exception:
        log.exception("portfolio: failed to remove file %s", row.file_path)
    await session.delete(row)
    return True


async def send_portfolio_photos(
    *,
    bot,
    master_id: int,
    chat_id: int,
    session: AsyncSession,
    business_connection_id: str | None = None,
    count: int = 3,
) -> int:
    """Bot sends up to N random portfolio photos to the client."""
    rows = await random_photos(session, master_id=master_id, count=count)
    if not rows:
        return 0
    sent = 0
    for r in rows:
        try:
            kwargs: dict = {"chat_id": chat_id, "photo": r.public_url}
            if business_connection_id:
                kwargs["business_connection_id"] = business_connection_id
            await bot.send_photo(**kwargs)
            sent += 1
        except Exception:
            log.exception("portfolio send failed for %s", r.public_url)
    return sent
