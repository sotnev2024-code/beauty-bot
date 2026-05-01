"""master reminder config — bot_settings columns for digest hour + pre-visit offsets

Revision ID: 0006_master_reminder_cfg
Revises: 0005_drop_funnels_legacy
Create Date: 2026-05-01

Adds:
  * bot_settings.master_digest_enabled BOOL DEFAULT TRUE
  * bot_settings.master_digest_hour INT DEFAULT 10  (local hour 0-23)
  * bot_settings.master_pre_visit_enabled BOOL DEFAULT TRUE
  * bot_settings.master_pre_visit_offsets JSONB DEFAULT '[10,60]'
    (minutes before booking starts_at; one reminder per offset)
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006_master_reminder_cfg"
down_revision: str | None = "0005_drop_funnels_legacy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "bot_settings",
        sa.Column(
            "master_digest_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.alter_column("bot_settings", "master_digest_enabled", server_default=None)
    op.add_column(
        "bot_settings",
        sa.Column(
            "master_digest_hour",
            sa.Integer(),
            nullable=False,
            server_default="10",
        ),
    )
    op.alter_column("bot_settings", "master_digest_hour", server_default=None)
    op.add_column(
        "bot_settings",
        sa.Column(
            "master_pre_visit_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.alter_column("bot_settings", "master_pre_visit_enabled", server_default=None)
    op.add_column(
        "bot_settings",
        sa.Column(
            "master_pre_visit_offsets",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[10, 60]'::jsonb"),
        ),
    )
    op.alter_column("bot_settings", "master_pre_visit_offsets", server_default=None)


def downgrade() -> None:
    op.drop_column("bot_settings", "master_pre_visit_offsets")
    op.drop_column("bot_settings", "master_pre_visit_enabled")
    op.drop_column("bot_settings", "master_digest_hour")
    op.drop_column("bot_settings", "master_digest_enabled")
