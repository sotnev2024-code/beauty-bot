"""bot hub schema: bot_settings, knowledge_base_items, return_*, reminder_logs,
service_categories + columns on services/bookings/messages

Revision ID: 0004_bot_hub_schema
Revises: 0003_master_address
Create Date: 2026-04-30

This migration is purely additive: it creates the new tables and adds new
columns, then migrates data from existing master fields (greeting/voice/address)
into the new bot_settings and knowledge_base_items rows.

It deliberately does NOT drop:
  * masters.voice / masters.greeting / masters.address — kept deprecated for
    one release (read-only) so the frontend mid-rollout can still see them.
  * conversations.current_funnel_id / current_step_id — drop deferred until
    the dialog code stops using them.
  * funnels / funnel_steps tables — drop deferred until all funnel API/UI is
    removed.

Those drops happen in `0005_drop_funnels.py` after Step 9.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_bot_hub_schema"
down_revision: str | None = "0003_master_address"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. service_categories
    op.create_table(
        "service_categories",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_service_categories_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_service_categories")),
    )
    op.create_index(
        op.f("ix_service_categories_master_id"),
        "service_categories",
        ["master_id"],
        unique=False,
    )

    # 2. bot_settings (master_id PK)
    op.create_table(
        "bot_settings",
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "greeting",
            sa.Text(),
            nullable=False,
            server_default="Здравствуйте! Подскажите, чем могу помочь?",
        ),
        sa.Column(
            "voice_tone", sa.String(length=20), nullable=False, server_default="warm"
        ),
        sa.Column(
            "message_format", sa.String(length=20), nullable=False, server_default="hybrid"
        ),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("configured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_bot_settings_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("master_id", name=op.f("pk_bot_settings")),
    )

    # 3. knowledge_base_items
    op.create_table(
        "knowledge_base_items",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("geolocation_lat", sa.Float(), nullable=True),
        sa.Column("geolocation_lng", sa.Float(), nullable=True),
        sa.Column("yandex_maps_url", sa.Text(), nullable=True),
        sa.Column("is_short", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_knowledge_base_items_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_base_items")),
    )
    op.create_index(
        op.f("ix_knowledge_base_items_master_id"),
        "knowledge_base_items",
        ["master_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_knowledge_base_items_type"),
        "knowledge_base_items",
        ["type"],
        unique=False,
    )

    # 4. return_settings (master_id PK)
    op.create_table(
        "return_settings",
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("trigger_after_days", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("discount_percent", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("discount_valid_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("configured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_return_settings_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("master_id", name=op.f("pk_return_settings")),
    )

    # 5. return_campaigns (booking_id FK uses use_alter — added after bookings.return_campaign_id)
    op.create_table(
        "return_campaigns",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("client_id", sa.BigInteger(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("discount_percent", sa.Integer(), nullable=False),
        sa.Column("discount_valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="sent"),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("booking_id", sa.BigInteger(), nullable=True),
        sa.Column("message_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_return_campaigns_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name=op.f("fk_return_campaigns_client_id_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
            name=op.f("fk_return_campaigns_message_id_messages"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_return_campaigns")),
    )
    op.create_index(
        op.f("ix_return_campaigns_master_id"),
        "return_campaigns",
        ["master_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_return_campaigns_client_id"),
        "return_campaigns",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_return_campaigns_status"),
        "return_campaigns",
        ["status"],
        unique=False,
    )

    # 6. reminder_logs
    op.create_table(
        "reminder_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("master_id", sa.BigInteger(), nullable=False),
        sa.Column("client_id", sa.BigInteger(), nullable=False),
        sa.Column("service_id", sa.BigInteger(), nullable=False),
        sa.Column("source_booking_id", sa.BigInteger(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "was_skipped_due_to_return", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["master_id"],
            ["masters.id"],
            name=op.f("fk_reminder_logs_master_id_masters"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name=op.f("fk_reminder_logs_client_id_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["services.id"],
            name=op.f("fk_reminder_logs_service_id_services"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_booking_id"],
            ["bookings.id"],
            name=op.f("fk_reminder_logs_source_booking_id_bookings"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
            name=op.f("fk_reminder_logs_message_id_messages"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reminder_logs")),
    )
    op.create_index(
        op.f("ix_reminder_logs_master_id"),
        "reminder_logs",
        ["master_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reminder_logs_client_id"),
        "reminder_logs",
        ["client_id"],
        unique=False,
    )

    # 7. ALTER services
    op.add_column("services", sa.Column("category_id", sa.BigInteger(), nullable=True))
    op.add_column("services", sa.Column("reminder_after_days", sa.Integer(), nullable=True))
    op.create_foreign_key(
        op.f("fk_services_category_id_service_categories"),
        "services",
        "service_categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 8. ALTER bookings
    op.add_column(
        "bookings",
        sa.Column(
            "discount_applied", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.alter_column("bookings", "discount_applied", server_default=None)
    op.add_column("bookings", sa.Column("discount_percent", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("return_campaign_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        op.f("fk_bookings_return_campaign_id_return_campaigns"),
        "bookings",
        "return_campaigns",
        ["return_campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 9. ALTER messages: is_proactive
    op.add_column(
        "messages",
        sa.Column("is_proactive", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("messages", "is_proactive", server_default=None)

    # 10. Add the deferred FK return_campaigns.booking_id → bookings.id
    op.create_foreign_key(
        op.f("fk_return_campaigns_booking_id_bookings"),
        "return_campaigns",
        "bookings",
        ["booking_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 11. Data migration — populate bot_settings, return_settings, knowledge_base_items
    op.execute(
        """
        INSERT INTO bot_settings
          (master_id, greeting, voice_tone, message_format, is_enabled,
           reminders_enabled, configured_at, created_at, updated_at)
        SELECT
          m.id,
          COALESCE(NULLIF(TRIM(m.greeting), ''),
                   'Здравствуйте! Подскажите, чем могу помочь?'),
          COALESCE(NULLIF(LOWER(m.voice), ''), 'warm'),
          'hybrid',
          COALESCE(m.bot_enabled, TRUE),
          FALSE,
          NULL,
          NOW(),
          NOW()
        FROM masters m
        ON CONFLICT (master_id) DO NOTHING;
        """
    )

    op.execute(
        """
        INSERT INTO return_settings
          (master_id, is_enabled, trigger_after_days, discount_percent,
           discount_valid_days, configured_at, created_at, updated_at)
        SELECT m.id, FALSE, 60, 15, 7, NULL, NOW(), NOW()
        FROM masters m
        ON CONFLICT (master_id) DO NOTHING;
        """
    )

    op.execute(
        """
        INSERT INTO knowledge_base_items
          (master_id, type, title, content, is_short, position,
           created_at, updated_at)
        SELECT
          m.id,
          'address',
          'Адрес',
          m.address,
          TRUE,
          0,
          NOW(),
          NOW()
        FROM masters m
        WHERE m.address IS NOT NULL AND TRIM(m.address) <> '';
        """
    )


def downgrade() -> None:
    # Drop FKs that point into return_campaigns first to avoid cycle
    op.drop_constraint(
        op.f("fk_bookings_return_campaign_id_return_campaigns"), "bookings", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("fk_return_campaigns_booking_id_bookings"), "return_campaigns", type_="foreignkey"
    )

    # Reverse ALTERs
    op.drop_column("messages", "is_proactive")

    op.drop_column("bookings", "return_campaign_id")
    op.drop_column("bookings", "discount_percent")
    op.drop_column("bookings", "discount_applied")

    op.drop_constraint(
        op.f("fk_services_category_id_service_categories"), "services", type_="foreignkey"
    )
    op.drop_column("services", "reminder_after_days")
    op.drop_column("services", "category_id")

    # Drop new tables in reverse FK order
    op.drop_index(op.f("ix_reminder_logs_client_id"), table_name="reminder_logs")
    op.drop_index(op.f("ix_reminder_logs_master_id"), table_name="reminder_logs")
    op.drop_table("reminder_logs")

    op.drop_index(op.f("ix_return_campaigns_status"), table_name="return_campaigns")
    op.drop_index(op.f("ix_return_campaigns_client_id"), table_name="return_campaigns")
    op.drop_index(op.f("ix_return_campaigns_master_id"), table_name="return_campaigns")
    op.drop_table("return_campaigns")

    op.drop_table("return_settings")

    op.drop_index(op.f("ix_knowledge_base_items_type"), table_name="knowledge_base_items")
    op.drop_index(op.f("ix_knowledge_base_items_master_id"), table_name="knowledge_base_items")
    op.drop_table("knowledge_base_items")

    op.drop_table("bot_settings")

    op.drop_index(op.f("ix_service_categories_master_id"), table_name="service_categories")
    op.drop_table("service_categories")
