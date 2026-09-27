"""CSV / JSON / PDF export of complaint data for the Admin dashboard."""

import csv
import io
import json
import uuid
from datetime import datetime, timezone

from fpdf import FPDF
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.complaint import Complaint
from app.models.enums import PipelineType
from app.models.pipeline_result import PipelineResult

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

    priority_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    conflict_count = 0
    duplicate_count = 0
    for c in complaints:
        if c.priority:
            priority_counts[c.priority.value] = priority_counts.get(c.priority.value, 0) + 1
        status_counts[c.status.value] = status_counts.get(c.status.value, 0) + 1
        if c.has_conflict:
            conflict_count += 1
        if c.is_duplicate:
            duplicate_count += 1

    pdf = FPDF(orientation="L")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "SupportNova Complaint Export", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated {datetime.now().isoformat(timespec='seconds')} -- {len(complaints)} complaints", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Summary", ln=True)
    pdf.set_font("Helvetica", "", 8)
    priority_line = "  ".join(f"{k}: {v}" for k, v in sorted(priority_counts.items())) or "none"
    status_line = "  ".join(f"{k}: {v}" for k, v in sorted(status_counts.items())) or "none"
    pdf.cell(0, 5, f"By priority -- {priority_line}", ln=True)
    pdf.cell(0, 5, f"By status -- {status_line}", ln=True)
    pdf.cell(0, 5, f"Pipeline conflicts: {conflict_count}   Duplicates flagged: {duplicate_count}", ln=True)
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


# ---- SRS deliverable #8: GenAI/Python Comparison Report ----
# One row per complaint, both pipelines' values side by side per compared field,
# plus a match/mismatch flag. `PipelineComparison.genai_values`/`ground_truth_values`
# already store exactly the compared-field dicts, so no join to PipelineResult needed.
COMPARISON_FIELDS = [
    "category", "subcategory", "priority", "urgency",
    "department", "escalation_required", "escalation_level",
    "refund_eligible", "compensation_eligible",
]


async def _fetch_complaints_with_comparison(
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

    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.comparison))
        .where(*conditions)
        .order_by(Complaint.created_at.desc())
    )
    return [c for c in result.scalars().all() if c.comparison is not None]


def _comparison_row(c: Complaint) -> dict:
    comp = c.comparison
    genai_vals = comp.genai_values or {}
    gt_vals = comp.ground_truth_values or {}
    row: dict = {
        "complaint_id": c.complaint_id,
        "conflict_severity": comp.conflict_severity.value if hasattr(comp.conflict_severity, "value") else comp.conflict_severity,
        "has_conflict": comp.has_conflict,
    }
    for field in COMPARISON_FIELDS:
        gv, tv = genai_vals.get(field), gt_vals.get(field)
        row[f"{field}_genai"] = gv
        row[f"{field}_ground_truth"] = tv
        row[f"{field}_match"] = gv == tv
    return row


async def export_comparison_report_csv(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints_with_comparison(db, department_id, date_from, date_to)
    fieldnames = ["complaint_id", "conflict_severity", "has_conflict"]
    for field in COMPARISON_FIELDS:
        fieldnames += [f"{field}_genai", f"{field}_ground_truth", f"{field}_match"]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for c in complaints:
        writer.writerow(_comparison_row(c))
    return buffer.getvalue().encode("utf-8")


async def export_comparison_report_json(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints_with_comparison(db, department_id, date_from, date_to)
    return json.dumps([_comparison_row(c) for c in complaints], indent=2, default=str).encode("utf-8")


async def export_comparison_report_pdf(db: AsyncSession, department_id=None, date_from=None, date_to=None) -> bytes:
    complaints = await _fetch_complaints_with_comparison(db, department_id, date_from, date_to)
    agree_count = sum(1 for c in complaints if not c.comparison.has_conflict)

    pdf = FPDF(orientation="L")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "SupportNova GenAI / Ground-Truth Comparison Report", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated {datetime.now().isoformat(timespec='seconds')} -- {len(complaints)} complaints", ln=True)
    agreement_pct = round(100 * agree_count / len(complaints)) if complaints else 0
    pdf.cell(0, 6, f"Pipeline agreement: {agree_count}/{len(complaints)} ({agreement_pct}%)", ln=True)
    pdf.ln(2)

    col_widths = [22, 16, 20, 65, 20]
    headers = ["ID", "Severity", "Match?", "Mismatched fields (Pipeline 1 vs Pipeline 2)", "Escalation"]
    pdf.set_font("Helvetica", "B", 8)
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 7, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for c in complaints:
        comp = c.comparison
        mismatches = ", ".join(
            f"{f}: {(comp.genai_values or {}).get(f)!r} vs {(comp.ground_truth_values or {}).get(f)!r}"
            for f in (comp.conflict_fields or [])
        )
        severity = comp.conflict_severity.value if hasattr(comp.conflict_severity, "value") else comp.conflict_severity
        values = [
            c.complaint_id,
            severity,
            "No" if comp.has_conflict else "Yes",
            mismatches[:95],
            str(c.escalation_level),
        ]
        for w, v in zip(col_widths, values):
            pdf.cell(w, 6, str(v), border=1)
        pdf.ln()

    return bytes(pdf.output())


# ---- SRS deliverable #9: Complaint Intelligence Report ----
# Aggregate stats, not a per-complaint listing: category/priority/sentiment
# distribution, escalations, repeat complaints, SLA risk, policy usage,
# disagreement rate, manual-review count. Reuses the same counting style as
# app/services/admin_service.py's analytics() rather than introducing a
# second way of computing the same numbers.
async def _intelligence_stats(db: AsyncSession) -> dict:
    from app.models.category import Category
    from app.models.enums import ConflictSeverity, Priority
    from app.models.pipeline_comparison import PipelineComparison

    total = await db.scalar(select(func.count()).select_from(Complaint)) or 0

    category_distribution: dict[str, int] = {}
    for row in (await db.execute(select(Category.name))).all():
        (name,) = row
        count = await db.scalar(
            select(func.count()).select_from(Complaint).join(Category, Complaint.category_id == Category.id)
            .where(Category.name == name)
        )
        if count:
            category_distribution[name] = count

    priority_distribution: dict[str, int] = {}
    for p in Priority:
        count = await db.scalar(select(func.count()).select_from(Complaint).where(Complaint.priority == p))
        if count:
            priority_distribution[p.value] = count

    sentiment_distribution: dict[str, int] = {}
    for row in (
        await db.execute(
            select(PipelineResult.sentiment, func.count())
            .where(PipelineResult.pipeline == PipelineType.GENAI, PipelineResult.sentiment.isnot(None))
            .group_by(PipelineResult.sentiment)
        )
    ).all():
        sentiment, count = row
        sentiment_distribution[sentiment] = count

    escalations = await db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.escalation_level > 0)
    ) or 0
    repeat_complaints = await db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.is_duplicate.is_(True))
    ) or 0
    sla_breached = await db.scalar(
        select(func.count()).select_from(Complaint).where(
            (Complaint.sla_response_met.is_(False)) | (Complaint.sla_resolution_met.is_(False))
        )
    ) or 0
    manual_review_count = await db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.review_reason.isnot(None))
    ) or 0

    conflicts = await db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.has_conflict.is_(True))
    ) or 0
    disagreement_rate = round(conflicts / total, 3) if total else None

    severity_distribution: dict[str, int] = {}
    for row in (
        await db.execute(select(PipelineComparison.conflict_severity, func.count()).group_by(PipelineComparison.conflict_severity))
    ).all():
        severity, count = row
        key = severity.value if hasattr(severity, "value") else severity
        if key != ConflictSeverity.NONE.value:
            severity_distribution[key] = count

    policy_usage: dict[str, int] = {}
    for row in (
        await db.execute(select(PipelineResult.policy_references).where(PipelineResult.policy_references.isnot(None)))
    ).all():
        (refs,) = row
        for ref in refs or []:
            doc_id = ref.get("document_id") if isinstance(ref, dict) else ref
            if doc_id:
                policy_usage[doc_id] = policy_usage.get(doc_id, 0) + 1

    return {
        "total_complaints": total,
        "category_distribution": category_distribution,
        "priority_distribution": priority_distribution,
        "sentiment_distribution": sentiment_distribution,
        "escalations": escalations,
        "repeat_complaints": repeat_complaints,
        "sla_breached": sla_breached,
        "manual_review_count": manual_review_count,
        "disagreement_rate": disagreement_rate,
        "conflict_severity_distribution": severity_distribution,
        "top_policy_usage": dict(sorted(policy_usage.items(), key=lambda kv: kv[1], reverse=True)[:10]),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


async def export_intelligence_report_json(db: AsyncSession) -> bytes:
    return json.dumps(await _intelligence_stats(db), indent=2).encode("utf-8")


async def export_intelligence_report_csv(db: AsyncSession) -> bytes:
    stats = await _intelligence_stats(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["metric", "value"])
    for key, value in stats.items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                writer.writerow([f"{key}.{sub_key}", sub_value])
        else:
            writer.writerow([key, value])
    return buffer.getvalue().encode("utf-8")


async def export_intelligence_report_pdf(db: AsyncSession) -> bytes:
    stats = await _intelligence_stats(db)

    pdf = FPDF(orientation="P")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "SupportNova Complaint Intelligence Report", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated {stats['generated_at']} -- {stats['total_complaints']} total complaints", ln=True)
    pdf.ln(4)

    def section(title: str, lines: list[str]) -> None:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, title, ln=True)
        pdf.set_font("Helvetica", "", 9)
        for line in lines:
            pdf.cell(0, 5.5, line, ln=True)
        pdf.ln(3)

    section("Key metrics", [
        f"Escalated complaints: {stats['escalations']}",
        f"Repeat/duplicate complaints: {stats['repeat_complaints']}",
        f"SLA breached: {stats['sla_breached']}",
        f"Manually reviewed (any reason): {stats['manual_review_count']}",
        f"Pipeline disagreement rate: {round(stats['disagreement_rate'] * 100)}%" if stats["disagreement_rate"] is not None else "Pipeline disagreement rate: n/a",
    ])

    section("Category distribution", [
        f"{k}: {v}" for k, v in sorted(stats["category_distribution"].items(), key=lambda kv: -kv[1])
    ] or ["none"])

    section("Priority distribution", [f"{k}: {v}" for k, v in stats["priority_distribution"].items()] or ["none"])

    section("Sentiment distribution (GenAI)", [
        f"{k}: {v}" for k, v in stats["sentiment_distribution"].items()
    ] or ["no GenAI sentiment data"])

    section("Conflict severity (excluding none)", [
        f"{k}: {v}" for k, v in stats["conflict_severity_distribution"].items()
    ] or ["none"])

    section("Top cited policies", [
        f"{k}: {v} citation(s)" for k, v in stats["top_policy_usage"].items()
    ] or ["no policy citations recorded"])

    return bytes(pdf.output())
