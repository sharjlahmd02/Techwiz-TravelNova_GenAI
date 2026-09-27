"""Splits extracted document text into section-sized chunks. Pure Python,
heuristic (regex-based heading detection) -- no AI, consistent with the
ground-truth pipeline's "no LLM" rule and appropriate here since chunking
runs at upload time, independent of which pipeline later reads the result.

A "page" here means one PDF page (pypdf gives real per-page text) or, for a
DOCX with no native page concept, the whole document as a single page --
page_reference stays None in that case since there's nothing real to report.
"""

import re
from dataclasses import dataclass

NUMBERED_HEADING = re.compile(r"^(\d+(?:\.\d+)*)[.):]?\s+([A-Z][A-Za-z0-9 ,'&/()-]{2,80})$")
ALLCAPS_HEADING = re.compile(r"^[A-Z][A-Z0-9 &/()-]{2,60}$")
MAX_HEADING_WORDS = 8


@dataclass
class Chunk:
    section: str | None
    heading: str | None
    page_reference: int | None
    content_text: str


def _heading_match(line: str) -> tuple[str | None, str] | None:
    line = line.strip()
    if not line or len(line) > 100:
        return None
    numbered = NUMBERED_HEADING.match(line)
    if numbered:
        return numbered.group(1), numbered.group(2).strip()
    if (
        ALLCAPS_HEADING.match(line)
        and any(c.isalpha() for c in line)
        and len(line.split()) <= MAX_HEADING_WORDS
    ):
        return None, line.title()
    return None


def _chunk_page(text: str, page_reference: int | None) -> list[Chunk]:
    chunks: list[Chunk] = []
    section: str | None = None
    heading: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        content = "\n".join(buffer).strip()
        if content:
            chunks.append(Chunk(section, heading, page_reference, content))

    for line in text.splitlines():
        found = _heading_match(line)
        if found:
            flush()
            section, heading = found
            buffer = []
        else:
            buffer.append(line)
    flush()

    if not chunks:
        content = text.strip()
        if content:
            chunks.append(Chunk(None, None, page_reference, content))
    return chunks


def chunk_document(pages: list[str]) -> list[Chunk]:
    """`pages` is a list of per-page text (length 1 for a DOCX/single-page
    source). Returns every chunk across all pages, in reading order."""
    multi_page = len(pages) > 1
    chunks: list[Chunk] = []
    for i, page_text in enumerate(pages, start=1):
        chunks.extend(_chunk_page(page_text, i if multi_page else None))
    return chunks
