"""Outbound auto-reply / clarification emails, sent via the same account the
inbox is polled from (SMTP with STARTTLS on port 587, the standard Gmail
combination for an app password). A send failure is logged and swallowed --
it must never crash the intake poller or block the complaint that was
already saved."""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("email_intake.mailer")


def send_email(to_address: str, subject: str, body: str, in_reply_to: str | None = None) -> bool:
    if not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        logger.warning("send_email skipped -- EMAIL_USERNAME/EMAIL_PASSWORD not configured")
        return False

    msg = EmailMessage()
    msg["From"] = settings.EMAIL_INTAKE_ADDRESS or settings.EMAIL_USERNAME
    msg["To"] = to_address
    msg["Subject"] = subject
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_address)
        return False


def send_complaint_confirmation(to_address: str, complaint_id: str) -> bool:
    return send_email(
        to_address,
        subject=f"We received your complaint [{complaint_id}]",
        body=(
            f"Thanks for reaching out to TravelNova.\n\n"
            f"We received your complaint and it's now being reviewed. Your reference number is "
            f"{complaint_id} -- reply to this email or include it in your subject line if you write "
            f"to us again about the same issue, and we'll keep it on the same case.\n\n"
            f"You can also track its status by signing in to your TravelNova account.\n\n"
            f"-- TravelNova Support"
        ),
    )


def send_clarification_request(to_address: str, complaint_id: str, questions: list[str]) -> bool:
    question_lines = "\n".join(f"- {q}" for q in questions)
    return send_email(
        to_address,
        subject=f"We need a bit more information [{complaint_id}]",
        body=(
            f"Thanks for your complaint (reference {complaint_id}).\n\n"
            f"To help us resolve this quickly, could you reply with the following:\n\n"
            f"{question_lines}\n\n"
            f"Please keep {complaint_id} in your reply's subject line so it's added to the same case.\n\n"
            f"-- TravelNova Support"
        ),
    )


def send_manual_review_holding_notice(to_address: str) -> bool:
    """Sent for a spoofed/unverified sender (Scenario 3) -- acknowledges
    receipt without promising anything or confirming account details, since
    the sender's authenticity hasn't been established yet."""
    return send_email(
        to_address,
        subject="We received your message",
        body=(
            "Thanks for contacting TravelNova. Your message is being reviewed by our team before "
            "we can process it further. We'll follow up once that review is complete.\n\n"
            "-- TravelNova Support"
        ),
    )
