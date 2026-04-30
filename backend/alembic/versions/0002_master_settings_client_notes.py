"""master settings + client notes

Revision ID: 0002_master_settings
Revises: 0001_initial_schema
Create Date: 2026-04-30

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_master_settings"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "masters",
        sa.Column("bot_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("masters", "bot_enabled", server_default=None)
    op.add_column("masters", sa.Column("voice", sa.String(length=32), nullable=True))
    op.add_column("masters", sa.Column("greeting", sa.Text(), nullable=True))
    op.add_column("masters", sa.Column("rules", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "notes")
    op.drop_column("masters", "rules")
    op.drop_column("masters", "greeting")
    op.drop_column("masters", "voice")
    op.drop_column("masters", "bot_enabled")
