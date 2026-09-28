"""Tests the pure MIME-parsing logic (body extraction, attachment
validation) against hand-built raw email bytes -- no network/IMAP
connection needed, since these are just functions over an
email.message.Message object."""

import email

from app.services.email_intake.imap_client import _extract_attachments, _extract_body

PLAIN_EMAIL = b"""\
From: Ali <ali@example.com>
To: supportnovaltd@gmail.com
Subject: Refund request
Content-Type: text/plain; charset="utf-8"

My flight was cancelled and I still haven't received my refund.
"""

HTML_ONLY_EMAIL = b"""\
From: Sara <sara@example.com>
To: supportnovaltd@gmail.com
Subject: Lost bag
Content-Type: text/html; charset="utf-8"

<html><body><p>My <b>baggage</b> was lost on the flight.</p></body></html>
"""

MULTIPART_WITH_ATTACHMENT = b"""\
From: Ali <ali@example.com>
To: supportnovaltd@gmail.com
Subject: Damaged room, see photo
Content-Type: multipart/mixed; boundary="BOUNDARY"

--BOUNDARY
Content-Type: text/plain; charset="utf-8"

The hotel room was damaged, photo attached.
--BOUNDARY
Content-Type: image/jpeg
Content-Disposition: attachment; filename="room.jpg"
Content-Transfer-Encoding: base64

/9j/4AAQSkZJRg==
--BOUNDARY
Content-Type: application/zip
Content-Disposition: attachment; filename="evidence.zip"
Content-Transfer-Encoding: base64

UEsDBAoAAAAAAA==
--BOUNDARY--
"""


def test_plain_text_body_extracted():
    msg = email.message_from_bytes(PLAIN_EMAIL)
    assert "cancelled" in _extract_body(msg)
    assert "refund" in _extract_body(msg)


def test_html_only_body_has_tags_stripped():
    msg = email.message_from_bytes(HTML_ONLY_EMAIL)
    body = _extract_body(msg)
    assert "<b>" not in body
    assert "baggage" in body


def test_multipart_prefers_plain_text_over_attachments():
    msg = email.message_from_bytes(MULTIPART_WITH_ATTACHMENT)
    body = _extract_body(msg)
    assert "damaged" in body
    assert "BOUNDARY" not in body


def test_allowed_attachment_type_is_accepted():
    msg = email.message_from_bytes(MULTIPART_WITH_ATTACHMENT)
    attachments = _extract_attachments(msg)
    jpg = next(a for a in attachments if a.filename == "room.jpg")
    assert jpg.accepted is True
    assert jpg.reason is None


def test_disallowed_attachment_type_is_rejected():
    msg = email.message_from_bytes(MULTIPART_WITH_ATTACHMENT)
    attachments = _extract_attachments(msg)
    zip_file = next(a for a in attachments if a.filename == "evidence.zip")
    assert zip_file.accepted is False
    assert "unsupported type" in zip_file.reason


def test_no_attachments_on_simple_email():
    msg = email.message_from_bytes(PLAIN_EMAIL)
    assert _extract_attachments(msg) == []
