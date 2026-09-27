"""Extracts raw text from a customer-uploaded complaint document (PDF or
DOCX) so it can be fed into channel_extractor.extract_complaint_fields().
Shared groundwork for the document-upload complaint channel; the same
PDF-parsing path also closes the admin knowledge-base PDF-upload gap
(Phase 9.5.5) if reused there later.
"""

import io

from docx import Document
from fastapi import HTTPException, status
from pypdf import PdfReader

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _extract_docx_text(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def _validate_upload(filename: str, content: bytes) -> str:
    """Returns the validated file extension, raising HTTPException on bad input."""
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File must be 10MB or smaller.")
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    suffix = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Only PDF and DOCX files are supported for document upload."
        )
    return suffix


def extract_text_from_upload(filename: str, content: bytes) -> str:
    suffix = _validate_upload(filename, content)

    try:
        text = _extract_pdf_text(content) if suffix == ".pdf" else _extract_docx_text(content)
    except Exception as exc:  # noqa: BLE001 -- a corrupt/unreadable file must not 500 the request
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Could not read this file: {exc}") from exc

    if not text:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in this document -- it may be a scanned image without a text layer.",
        )

    return text


def extract_pages_from_upload(filename: str, content: bytes) -> list[str]:
    """Same validation as extract_text_from_upload, but preserves PDF page
    boundaries (one string per page) instead of joining them -- needed for
    chunk-level page_reference tracking (see chunking.py). A DOCX has no
    native page concept, so it comes back as a single "page"."""
    suffix = _validate_upload(filename, content)

    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(content))
            pages = [(page.extract_text() or "").strip() for page in reader.pages]
            pages = [p for p in pages if p]
        else:
            pages = [_extract_docx_text(content)]
    except Exception as exc:  # noqa: BLE001 -- a corrupt/unreadable file must not 500 the request
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Could not read this file: {exc}") from exc

    if not pages:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in this document -- it may be a scanned image without a text layer.",
        )

    return pages
