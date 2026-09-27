import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.datetime import new_uuid, utcnow


class KnowledgeBaseChunk(Base):
    """A section-sized slice of a KnowledgeBaseDocument, retaining the
    provenance fields the SRS asks for (Chunk ID, Document ID, Section,
    Heading, Page reference, Version) so a citation can point at exactly the
    passage a response was based on, not just "somewhere in this document"."""

    __tablename__ = "knowledge_base_chunks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_uuid)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_base_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str | None] = mapped_column(String(20), nullable=True)
    heading: Mapped[str | None] = mapped_column(String(255), nullable=True)
    page_reference: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    document: Mapped["KnowledgeBaseDocument"] = relationship(back_populates="chunks")
