"""APScheduler job (runs every 5 minutes): marks breached SLAs and
auto-escalates priority for responses that never got marked met. "At risk"
(deadline within 25%) is a purely-derived frontend concept (see
SLAIndicator.tsx) -- nothing to persist for that state.
"""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.enums import ComplaintStatus, HistoryAction, Priority

logger = logging.getLogger("sla_monitor")

# Complaints not yet in a terminal or pre-assignment state -- these are the
# only ones an SLA clock is meaningfully ticking against.
ACTIVE_STATUSES = (
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.AWAITING_CUSTOMER,
)

PRIORITY_ESCALATION: dict[Priority, Priority] = {
    Priority.P3: Priority.P2,
    Priority.P2: Priority.P1,
    Priority.P1: Priority.P0,
}


async def check_sla_breaches() -> None:
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        response_breaches = (
            await db.scalars(
                select(Complaint).where(
                    Complaint.status.in_(ACTIVE_STATUSES),
                    Complaint.sla_response_deadline.is_not(None),
                    Complaint.sla_response_deadline < now,
                    Complaint.sla_response_met.is_(None),
                )
            )
        ).all()

        for complaint in response_breaches:
            complaint.sla_response_met = False
            old_priority = complaint.priority
            new_priority = PRIORITY_ESCALATION.get(complaint.priority) if complaint.priority else None
            if new_priority:
                complaint.priority = new_priority

            db.add(
                ComplaintHistory(
                    complaint_id=complaint.id,
                    action=HistoryAction.ESCALATED,
                    performed_by=None,
                    old_value={"priority": old_priority.value if old_priority else None},
                    new_value={"priority": complaint.priority.value if complaint.priority else None},
                    notes="SLA response deadline breached -- auto-escalated by the SLA monitor",
                )
            )

        if response_breaches:
            logger.info("SLA monitor: %d complaint(s) response-breached and escalated", len(response_breaches))

        resolution_breaches = (
            await db.scalars(
                select(Complaint).where(
                    Complaint.status.in_(ACTIVE_STATUSES),
                    Complaint.sla_resolution_deadline.is_not(None),
                    Complaint.sla_resolution_deadline < now,
                    Complaint.sla_resolution_met.is_(None),
                )
            )
        ).all()

        for complaint in resolution_breaches:
            complaint.sla_resolution_met = False
            db.add(
                ComplaintHistory(
                    complaint_id=complaint.id,
                    action=HistoryAction.ESCALATED,
                    performed_by=None,
                    notes="SLA resolution deadline breached",
                )
            )

        if resolution_breaches:
            logger.info("SLA monitor: %d complaint(s) resolution-breached", len(resolution_breaches))

        if response_breaches or resolution_breaches:
            await db.commit()


def start_sla_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_sla_breaches, "interval", minutes=5, id="sla_monitor", next_run_time=datetime.now())
    scheduler.start()
    return scheduler
