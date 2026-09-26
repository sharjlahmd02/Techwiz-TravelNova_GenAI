import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.datetime import new_uuid


class ResolutionRule(Base):
    __tablename__ = "resolution_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    rule_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    subcategory: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    conditions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), nullable=False)
    priority: Mapped[str] = mapped_column(String(10), nullable=False)
    policy_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    escalation_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    escalation_level: Mapped[int] = mapped_column(default=0, nullable=False)
    required_actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    prohibited_actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    follow_up: Mapped[str | None] = mapped_column(String(255), nullable=True)
    compensation_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    refund_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
