"""CSV / JSON / PDF export of complaint data for the Admin dashboard."""

import csv
import io
import json
import uuid
from datetime import datetime

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint

EXPORT_FIELDS = [
    "complaint_id", "title", "product_type", "channel", "status", "priority", "urgency",
    "booking_reference", "has_conflict", "is_duplicate", "is_prompt_injection",
    "escalation_level", "satisfaction_rating", "created_at", "closed_at",
]


def _row(c: Complaint) -> dict:
    return {
        "complaint_id": c.complaint_id,
        "title": c.title,
        "product_type": c.product_type,
        "channel": c.channel.value,
        "status": c.status.value,
        "priority": c.priority.value if c.priority else None,
        "urgency": c.urgency.value if c.urgency else None,
        "booking_reference": c.booking_reference,
        "has_conflict": c.has_conflict,
        "is_duplicate": c.is_duplicate,
        "is_prompt_injection": c.is_prompt_injection,
        "escalation_level": c.escalation_level,
        "satisfaction_rating": c.satisfaction_rating,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "closed_at": c.closed_at.isoformat() if c.closed_at else None,
    }


async def _fetch_complaints(
    db: AsyncSession,
    department_id: uuid.UUID | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> list[Complaint]:
    conditions = []
    if department_id:
        conditions.append(Complaint.department_id == department_id)
    if date_from:
        conditions.append(Complaint.created_at >= date_from)
    if date_to:
        conditions.append(Complaint.created_at <= date_to)

    result = await db.execute(select(Complaint).where(*conditions).order_by(Complaint.created_at.desc()))
    return list(result.scalars().all())


async def export_csv(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints(db, department_id, date_from, date_to)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_FIELDS)
    writer.writeheader()
    for c in complaints:
        writer.writerow(_row(c))
    return buffer.getvalue().encode("utf-8")


async def export_json(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints(db, department_id, date_from, date_to)
    return json.dumps([_row(c) for c in complaints], indent=2).encode("utf-8")


async def export_pdf(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints(db, department_id, date_from, date_to)

    pdf = FPDF(orientation="L")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "SupportNova Complaint Export", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated {datetime.now().isoformat(timespec='seconds')} -- {len(complaints)} complaints", ln=True)
    pdf.ln(4)

    col_widths = [22, 55, 22, 18, 22, 14, 14, 30]
    headers = ["ID", "Title", "Product", "Status", "Priority", "Conflict", "Dup", "Created"]
    pdf.set_font("Helvetica", "B", 8)
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 7, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for c in complaints:
        row = _row(c)
        values = [
            row["complaint_id"],
            (row["title"] or "")[:40],
            (row["product_type"] or "")[:15],
            row["status"] or "",
            row["priority"] or "",
            "Y" if row["has_conflict"] else "",
            "Y" if row["is_duplicate"] else "",
            (row["created_at"] or "")[:19],
        ]
        for w, v in zip(col_widths, values):
            pdf.cell(w, 6, str(v), border=1)
        pdf.ln()

    return bytes(pdf.output())
