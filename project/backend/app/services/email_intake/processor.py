"""Orchestrates one poll cycle: fetch unread emails, decide what each one
is, and act -- the flowchart in the email complaint flow doc. Reuses the
existing complaint pipeline unchanged (channel_extractor for field
extraction, ComplaintService.create_complaint + process_complaint for
everything downstream) rather than building a parallel path, per that doc's
own framing ("reuses the same complaint pipeline unchanged for all four
channels" already established for chat/document in Phase 9.5.17)."""

import asyncio
import logging
import re

from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.customer_message import CustomerMessage
from app.models.email_intake_log import EmailIntakeLog
from app.models.enums import (
    ComplaintChannel,
    ComplaintStatus,
    EmailIntakeOutcome,
    HistoryAction,
    MessageSender,
    PipelineType,
    Priority,
)
from app.models.pipeline_result import PipelineResult
from app.models.user import User
from app.schemas.complaint import ComplaintCreate
from app.services.complaint_service import ComplaintService, process_complaint
from app.services.email_intake.auth_check import parse_authentication_results
from app.services.email_intake.imap_client import FetchedEmail, ImapClient
from app.services.email_intake.keyword_filter import looks_like_complaint
from app.services.email_intake.mailer import (
    send_clarification_request,
    send_complaint_confirmation,
    send_email,
    send_manual_review_holding_notice,
)
from app.services.genai.channel_extractor import extract_complaint_fields

logger = logging.getLogger("email_intake.processor")

COMPLAINT_ID_PATTERN = re.compile(r"\[?(CMP-\d+)\]?", re.IGNORECASE)
PRIORITY_RANK = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


async def _already_processed(db, message_id: str) -> bool:
    existing = await db.scalar(select(EmailIntakeLog).where(EmailIntakeLog.message_id == message_id))
    return existing is not None


async def _find_user_by_email(db, email_address: str) -> User | None:
    return await db.scalar(select(User).where(func.lower(User.email) == email_address.lower()))


async def _log(
    db, msg: FetchedEmail, outcome: EmailIntakeOutcome, reason: str | None = None, complaint_id=None
) -> None:
    db.add(
        EmailIntakeLog(
            message_id=msg.message_id,
            from_address=msg.from_address,
            subject=msg.subject,
            outcome=outcome,
            reason=reason,
            complaint_id=complaint_id,
            received_at=msg.received_at,
        )
    )
    await db.commit()


async def _bump_priority_one_level(priority: Priority | None) -> Priority | None:
    if priority is None:
        return None
    rank = PRIORITY_RANK[priority.value]
    if rank == 0:
        return priority
    bumped = next(p for p, r in PRIORITY_RANK.items() if r == rank - 1)
    return Priority(bumped)


async def _handle_reply_to_existing(db, msg: FetchedEmail, complaint_ref: str) -> bool:
    """True if this email referenced an existing complaint AND the sender
    is verified as that complaint's own customer (so it was attached).
    False means normal new-complaint handling should run instead -- either
    no such complaint exists, or the sender doesn't own it and referencing
    someone else's complaint ID isn't trusted on its own (SRS Golden Rule 1:
    never trust user input)."""
    complaint = await db.scalar(select(Complaint).where(Complaint.complaint_id == complaint_ref.upper()))
    if complaint is None:
        return False

    owner = await db.get(User, complaint.customer_id)
    if owner is None or owner.email.lower() != msg.from_address.lower():
        return False

    # Same authenticity bar as a new complaint -- an email claiming to be
    # from the complaint's owner but failing SPF/DKIM isn't trusted to
    # append to their case either (falls through to normal handling, which
    # independently re-checks auth and routes to manual review).
    if not parse_authentication_results(msg.auth_header).passed:
        return False

    db.add(
        CustomerMessage(
            complaint_id=complaint.id,
            sender=MessageSender.CUSTOMER,
            message=msg.body_text or "(no message body)",
        )
    )

    was_closed = complaint.status in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)
    if was_closed:
        old_priority = complaint.priority
        complaint.priority = await _bump_priority_one_level(complaint.priority)
        complaint.status = ComplaintStatus.REOPENED
        complaint.escalation_level = max(complaint.escalation_level, 1)
        db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                action=HistoryAction.REOPENED,
                performed_by=None,
                old_value={
                    "status": "resolved_or_closed",
                    "priority": old_priority.value if old_priority else None,
                },
                new_value={
                    "status": "reopened",
                    "priority": complaint.priority.value if complaint.priority else None,
                },
                notes="Customer replied by email after resolution -- reopened and escalated",
            )
        )
    else:
        db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                action=HistoryAction.NOTE_ADDED,
                performed_by=None,
                notes="Customer replied by email",
            )
        )

    await db.commit()
    await _log(db, msg, EmailIntakeOutcome.ATTACHED_TO_EXISTING, complaint_id=complaint.id)
    send_email(
        msg.from_address,
        subject=f"Re: your complaint [{complaint.complaint_id}]",
        body=(
            f"Thanks -- we've added your reply to complaint {complaint.complaint_id}. "
            f"We'll follow up shortly.\n\n-- TravelNova Support"
        ),
    )
    return True


async def _process_one(db, msg: FetchedEmail) -> None:
    if await _already_processed(db, msg.message_id):
        return

    match = COMPLAINT_ID_PATTERN.search(msg.subject)
    if match and await _handle_reply_to_existing(db, msg, match.group(1)):
        return

    if not looks_like_complaint(msg.subject, msg.body_text):
        await _log(db, msg, EmailIntakeOutcome.UNCLASSIFIED, reason="no complaint keywords matched")
        return

    user = await _find_user_by_email(db, msg.from_address)
    if user is None:
        await _log(
            db, msg, EmailIntakeOutcome.MANUAL_REVIEW_UNREGISTERED_SENDER, reason="sender email not registered"
        )
        return

    auth = parse_authentication_results(msg.auth_header)
    if not auth.passed:
        await _log(
            db,
            msg,
            EmailIntakeOutcome.MANUAL_REVIEW_UNVERIFIED_SENDER,
            reason=f"spf={auth.spf} dkim={auth.dkim} dmarc={auth.dmarc}",
        )
        send_manual_review_holding_notice(msg.from_address)
        return

    raw_text = f"Subject: {msg.subject}\n\n{msg.body_text}"
    draft = await extract_complaint_fields(raw_text)

    service = ComplaintService(db)
    complaint = await service.create_complaint(
        ComplaintCreate(
            title=draft["title"],
            description=draft["description"],
            product_type=draft["product_type"],
            booking_reference=draft["booking_reference"],
            channel=ComplaintChannel.EMAIL,
            source_payload={
                "type": "email",
                "from_email": msg.from_address,
                "subject": msg.subject,
                "body": msg.body_text,
                "attachments": [
                    {"filename": a.filename, "size_bytes": a.size_bytes, "accepted": a.accepted, "reason": a.reason}
                    for a in msg.attachments
                ],
            },
        ),
        user,
    )

    await process_complaint(complaint.id)

    genai_result = await db.scalar(
        select(PipelineResult).where(
            PipelineResult.complaint_id == complaint.id, PipelineResult.pipeline == PipelineType.GENAI
        )
    )
    questions = genai_result.clarification_questions if genai_result else None
    if questions:
        send_clarification_request(msg.from_address, complaint.complaint_id, questions)
    else:
        send_complaint_confirmation(msg.from_address, complaint.complaint_id)

    await _log(db, msg, EmailIntakeOutcome.COMPLAINT_CREATED, complaint_id=complaint.id)


async def process_inbox() -> None:
    """Entry point for the scheduler (app.main's lifespan) -- a no-op unless
    email intake is enabled and credentials are configured."""
    if not settings.EMAIL_INTAKE_ENABLED or not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        return

    try:
        imap = await asyncio.to_thread(lambda: ImapClient().__enter__())
    except Exception:
        logger.exception("email intake: failed to connect to IMAP")
        return

    try:
        uids = await asyncio.to_thread(imap.list_unseen_uids)
        if not uids:
            return
        logger.info("email intake: %d unread email(s)", len(uids))

        async with AsyncSessionLocal() as db:
            for uid in uids:
                try:
                    msg = await asyncio.to_thread(imap.fetch, uid)
                    if msg is None:
                        continue
                    await _process_one(db, msg)
                    # Only mark read once the outcome is safely committed --
                    # a crash mid-processing leaves it unread for retry next
                    # cycle (email complaint flow doc, Step 8).
                    await asyncio.to_thread(imap.mark_seen, uid)
                except Exception:
                    await db.rollback()
                    logger.exception("email intake: failed to process uid=%s", uid)
    finally:
        await asyncio.to_thread(imap.__exit__, None, None, None)
