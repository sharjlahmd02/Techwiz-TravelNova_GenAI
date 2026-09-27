import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import KnowledgeBaseStatus
from app.utils.datetime import new_uuid


class KnowledgeBaseDocument(Base):
    __tablename__ = "knowledge_base_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    document_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # `status` is authoritative for policy-retrieval filtering (only ACTIVE docs feed
    # GenAI's context); `is_active` is kept as a simpler legacy flag for anything still
    # reading it and is kept in sync with status (True only when status == ACTIVE).
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[KnowledgeBaseStatus] = mapped_column(
        Enum(KnowledgeBaseStatus, name="knowledge_base_status"),
        default=KnowledgeBaseStatus.ACTIVE,
        nullable=False,
    )
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    chunks: Mapped[list["KnowledgeBaseChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
