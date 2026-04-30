"""master address

Revision ID: 0003_master_address
Revises: 0002_master_settings
Create Date: 2026-04-30

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_master_address"
down_revision: str | None = "0002_master_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("masters", sa.Column("address", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("masters", "address")
