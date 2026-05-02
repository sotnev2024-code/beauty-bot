"""service_addons + bookings.addon_ids

Each service can have a list of paid add-ons (duration + price deltas).
Booking remembers which ones were applied for history/analytics.

Revision ID: 0008_service_addons
Revises: 0007_break_skip_dates
Create Date: 2026-05-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008_service_addons"
down_revision: str | None = "0007_break_skip_dates"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_addons",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("service_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column(
            "duration_delta", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "price_delta", sa.Numeric(10, 2), nullable=False, server_default="0"
        ),
        sa.Column(
            "is_default", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["services.id"],
            name=op.f("fk_service_addons_service_id_services"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_service_addons")),
    )
    op.create_index(
        op.f("ix_service_addons_service_id"),
        "service_addons",
        ["service_id"],
        unique=False,
    )

    op.add_column(
        "bookings",
        sa.Column(
            "addon_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("bookings", "addon_ids", server_default=None)


def downgrade() -> None:
    op.drop_column("bookings", "addon_ids")
    op.drop_index(
        op.f("ix_service_addons_service_id"), table_name="service_addons"
    )
    op.drop_table("service_addons")
