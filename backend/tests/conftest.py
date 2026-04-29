"""Test fixtures.

Tests run inside the docker compose stack via:
    docker compose run --rm backend pytest

Each test gets a fresh asyncpg connection (NullPool) and a clean DB
(truncate-after fixture) so cross-loop state doesn't bleed between tests.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.db import get_session
from app.main import app
from app.models.base import Base


@pytest_asyncio.fixture(loop_scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    """A NullPool engine — every connection is fresh, no cross-loop pooling."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=None, future=True)
    # Ensure schema exists (migration in CI may have created it; safe-create here too)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield test_engine
    finally:
        await test_engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def truncate_after(engine: AsyncEngine) -> AsyncIterator[None]:
    yield
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE'))


@pytest_asyncio.fixture(loop_scope="session")
async def test_session(engine: AsyncEngine, truncate_after: None) -> AsyncIterator[AsyncSession]:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(loop_scope="session")
async def client(engine: AsyncEngine, truncate_after: None) -> AsyncIterator[AsyncClient]:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Pin every async test to the session-scoped event loop so pooled DB engines
    don't get torn down between tests."""
    for item in items:
        if "asyncio" in item.keywords:
            item.add_marker(pytest.mark.asyncio(loop_scope="session"))
