"""Fetches unread emails from the official complaint inbox via IMAP
(stdlib `imaplib` -- no OAuth/API-client dependency needed for a Gmail app
password). One connection is held open for a whole poll cycle so marking an
email read happens right after it's safely processed (email complaint flow
doc, Step 8 / "Extra Safeguards": never mark read before the complaint is
saved)."""

import email
import imaplib
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime

from app.config import settings

logger = logging.getLogger("email_intake.imap_client")

_TAG_RE = re.compile(r"<[^>]+>")

# Same limits as the document-upload complaint channel (document_extractor.py) --
# the email flow doc's own safeguard says attachments get "same as the web form"
# validation, not a separate policy.
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}


@dataclass
class EmailAttachment:
    filename: str
    size_bytes: int
    accepted: bool
    reason: str | None = None


@dataclass
class FetchedEmail:
    uid: str
    message_id: str
    from_address: str
    from_name: str
    subject: str
    body_text: str
    received_at: datetime | None
    auth_header: str | None
    in_reply_to: str | None
    attachments: list[EmailAttachment]


def _decode(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    decoded = ""
    for text, charset in parts:
        if isinstance(text, bytes):
            decoded += text.decode(charset or "utf-8", errors="replace")
        else:
            decoded += text
    return decoded.strip()


def _extract_attachments(msg: email.message.Message) -> list[EmailAttachment]:
    if not msg.is_multipart():
        return []

    attachments: list[EmailAttachment] = []
    for part in msg.walk():
        if part.get_content_disposition() != "attachment":
            continue
        filename = _decode(part.get_filename()) or "unnamed"
        try:
            payload = part.get_payload(decode=True) or b""
        except Exception:
            payload = b""
        size = len(payload)
        suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if size > MAX_ATTACHMENT_BYTES:
            attachments.append(EmailAttachment(filename, size, accepted=False, reason="exceeds 10MB limit"))
        elif suffix not in ALLOWED_ATTACHMENT_EXTENSIONS:
            attachments.append(EmailAttachment(filename, size, accepted=False, reason=f"unsupported type {suffix!r}"))
        else:
            attachments.append(EmailAttachment(filename, size, accepted=True))

    return attachments


def _extract_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        plain, html = None, None
        for part in msg.walk():
            if part.get_content_disposition() == "attachment":
                continue
            content_type = part.get_content_type()
            try:
                payload = part.get_payload(decode=True)
            except Exception:
                continue
            if not payload:
                continue
            charset = part.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if content_type == "text/plain" and plain is None:
                plain = text
            elif content_type == "text/html" and html is None:
                html = text
        if plain is not None:
            return plain.strip()
        if html is not None:
            return _TAG_RE.sub(" ", html).strip()
        return ""

    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    charset = msg.get_content_charset() or "utf-8"
    text = payload.decode(charset, errors="replace")
    if msg.get_content_type() == "text/html":
        text = _TAG_RE.sub(" ", text)
    return text.strip()


class ImapClient:
    def __init__(self) -> None:
        self._conn: imaplib.IMAP4_SSL | None = None

    def __enter__(self) -> "ImapClient":
        self._conn = imaplib.IMAP4_SSL(settings.EMAIL_IMAP_HOST, settings.EMAIL_IMAP_PORT)
        self._conn.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
        self._conn.select("INBOX")
        return self

    def __exit__(self, *exc_info) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            try:
                self._conn.logout()
            except Exception:
                pass

    def list_unseen_uids(self) -> list[bytes]:
        typ, data = self._conn.search(None, "UNSEEN")
        if typ != "OK" or not data or not data[0]:
            return []
        return data[0].split()

    def fetch(self, uid: bytes) -> FetchedEmail | None:
        # BODY.PEEK[] (not RFC822/BODY[]) -- fetching the RAW message body
        # normally sets \Seen as a side effect, which would mark an email
        # read before it's actually been processed, defeating the "mark
        # read only after safely saved" safeguard entirely.
        typ, msg_data = self._conn.fetch(uid, "(BODY.PEEK[])")
        if typ != "OK" or not msg_data or not isinstance(msg_data[0], tuple):
            logger.warning("Failed to fetch email uid=%s", uid)
            return None

        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)

        message_id = (msg.get("Message-ID") or "").strip()
        if not message_id:
            # Extremely rare, but a message with no Message-ID can't be
            # deduplicated reliably -- synthesize one from the uid so it's
            # still processed exactly once.
            message_id = f"<no-message-id-uid-{uid.decode()}@local>"

        from_name, from_address = parseaddr(msg.get("From", ""))
        received_at = None
        date_header = msg.get("Date")
        if date_header:
            try:
                received_at = parsedate_to_datetime(date_header)
            except (TypeError, ValueError):
                received_at = None

        return FetchedEmail(
            uid=uid.decode(),
            message_id=message_id,
            from_address=from_address.lower().strip(),
            from_name=_decode(from_name),
            subject=_decode(msg.get("Subject")),
            body_text=_extract_body(msg),
            received_at=received_at,
            auth_header=msg.get("Authentication-Results"),
            in_reply_to=msg.get("In-Reply-To"),
            attachments=_extract_attachments(msg),
        )

    def mark_seen(self, uid: bytes | str) -> None:
        if isinstance(uid, str):
            uid = uid.encode()
        self._conn.store(uid, "+FLAGS", "\\Seen")
