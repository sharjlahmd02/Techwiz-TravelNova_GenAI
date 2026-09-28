"""APScheduler job, same pattern as sla_monitor.py's -- polls the complaint
inbox every EMAIL_POLL_INTERVAL_MINUTES (default 30, per the email
complaint flow doc). Returns None (no scheduler started) when the feature
is disabled or unconfigured, so this is a safe no-op in every environment
that doesn't set EMAIL_INTAKE_ENABLED=true."""

from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.services.email_intake.processor import process_inbox


def start_email_intake_scheduler() -> AsyncIOScheduler | None:
    if not settings.EMAIL_INTAKE_ENABLED or not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        return None

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        process_inbox,
        "interval",
        minutes=settings.EMAIL_POLL_INTERVAL_MINUTES,
        id="email_intake",
        next_run_time=datetime.now(),
    )
    scheduler.start()
    return scheduler
