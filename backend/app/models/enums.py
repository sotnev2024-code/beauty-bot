from enum import StrEnum


class Plan(StrEnum):
    TRIAL = "trial"
    PRO = "pro"
    PRO_PLUS = "pro_plus"


class ConversationState(StrEnum):
    BOT = "bot"
    HUMAN_TAKEOVER = "human_takeover"


class MessageDirection(StrEnum):
    IN = "in"
    OUT = "out"
    MASTER = "master"


class BookingStatus(StrEnum):
    SCHEDULED = "scheduled"
    DONE = "done"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ReminderType(StrEnum):
    BOOKING_24H = "booking_24h"
    BOOKING_2H = "booking_2h"
    FEEDBACK = "feedback"
    RETURN_TRIGGER = "return_trigger"
    # Master-targeted alerts (sent via direct bot DM, not Business connection):
    MASTER_BOOKING_1H = "master_booking_1h"
    MASTER_BOOKING_10M = "master_booking_10m"
    MASTER_DAILY_DIGEST = "master_daily_digest"


class Segment(StrEnum):
    REGULAR = "regular"
    NEW = "new"
    RISKY = "risky"
    LOST = "lost"
    VIP = "vip"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
