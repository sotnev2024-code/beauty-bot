"""conversations.flow_state — JSONB blob for the deterministic
button-only booking funnel.

Holds the in-flight selection between callback taps:
  {"step": "picking_time", "service_id": 1, "addon_ids": [11], "day": "2026-05-07"}

Used only when the master's bot_settings.message_format == "buttons".
LLM-driven dialogs (text/hybrid) leave it NULL.

Revision ID: 0009_conversation_flow_state
Revises: 0008_service_addons
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009_conversation_flow_state"
down_revision: str | None = "0008_service_addons"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column(
            "flow_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("conversations", "flow_state")
