import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.datetime import new_uuid


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    rule_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    trigger_condition: Mapped[str] = mapped_column(Text, nullable=False)
    # Nullable: a handful of rules escalate *relative* to the complaint's current
    # level (e.g. "current+1") rather than to a fixed level. See relative_level.
    level: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    relative_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    level_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority_override: Mapped[str | None] = mapped_column(String(10), nullable=True)
    response_time: Mapped[str] = mapped_column(String(50), nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
