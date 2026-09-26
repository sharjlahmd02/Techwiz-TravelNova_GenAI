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
    level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    level_name: Mapped[str] = mapped_column(String(100), nullable=False)
    response_time: Mapped[str] = mapped_column(String(50), nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
