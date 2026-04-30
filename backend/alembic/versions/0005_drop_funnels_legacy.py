"""drop funnels + legacy master fields (voice/greeting/rules) +
conversations.current_funnel_id, current_step_id

Revision ID: 0005_drop_funnels_legacy
Revises: 0004_bot_hub_schema
Create Date: 2026-04-30

After Step 9 the production code no longer reads any of these. We DROP:
  * masters.voice (replaced by bot_settings.voice_tone)
  * masters.greeting (replaced by bot_settings.greeting)
  * masters.rules (unused entirely)
  * conversations.current_funnel_id (FK + column)
  * conversations.current_step_id (FK + column)
  * funnel_steps table
  * funnels table

`downgrade` recreates the columns/tables empty (data loss is acceptable for
this rollback path; the funnel concept is dead).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_drop_funnels_legacy"
down_revision: str | None = "0004_bot_hub_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop FKs + columns on conversations first.
    op.drop_constraint(
        "fk_conversations_current_funnel_id_funnels",
        "conversations",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_conversations_current_step_id_funnel_steps",
        "conversations",
        type_="foreignkey",
    )
    op.drop_column("conversations", "current_step_id")
    op.drop_column("conversations", "current_funnel_id")

    # Drop the funnels tables.
    op.drop_table("funnel_steps")
    op.drop_table("funnels")

    # Drop legacy master columns.
    op.drop_column("masters", "voice")
    op.drop_column("masters", "greeting")
    op.drop_column("masters", "rules")


def downgrade() -> None:
    op.add_column(
        "masters", sa.Column("rules", sa.Text(), nullable=True)
    )
    op.add_column(
        "masters", sa.Column("greeting", sa.Text(), nullable=True)
    )
    op.add_column(
        "masters", sa.Column("voice", sa.String(length=32), nullable=True)
    )

    op.create_table(
        "funnels",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("preset_key", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name="fk_funnels_master_id_masters",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_funnels"),
    )
    op.create_table(
        "funnel_steps",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("funnel_id", sa.BigInteger(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("collected_fields", sa.JSON(), nullable=True),
        sa.Column("transition_conditions", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["funnel_id"],
            ["funnels.id"],
            name="fk_funnel_steps_funnel_id_funnels",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_funnel_steps"),
    )

    op.add_column(
        "conversations",
        sa.Column("current_funnel_id", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("current_step_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_conversations_current_funnel_id_funnels",
        "conversations",
        "funnels",
        ["current_funnel_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_conversations_current_step_id_funnel_steps",
        "conversations",
        "funnel_steps",
        ["current_step_id"],
        ["id"],
        ondelete="SET NULL",
    )
