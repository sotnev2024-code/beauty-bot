"""schedule_breaks.skip_dates — list of YYYY-MM-DD strings to skip the recurring
break on specific calendar dates.

Revision ID: 0007_break_skip_dates
Revises: 0006_master_reminder_cfg
Create Date: 2026-05-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007_break_skip_dates"
down_revision: str | None = "0006_master_reminder_cfg"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "schedule_breaks",
        sa.Column(
            "skip_dates",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("schedule_breaks", "skip_dates", server_default=None)


def downgrade() -> None:
    op.drop_column("schedule_breaks", "skip_dates")
