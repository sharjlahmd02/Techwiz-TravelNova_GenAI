"""Flags likely prompt-injection attempts in complaint text. Detection never
blocks processing -- the complaint (including an injection attempt) is still
a real support ticket and gets classified normally; it's just flagged in the
record and logged.
"""

import re
from dataclasses import dataclass, field

INJECTION_PATTERNS = [
    r"\bignore\b.{0,30}\b(previous|prior|above|all)\b.{0,20}\binstructions?\b",
    r"\byou are now\b",
    r"\bsystem\s*:",
    r"\badmin\s*(override|mode)?\s*:",
    r"\bforget\b.{0,20}\byour\b.{0,20}\b(rules?|instructions?|training)\b",
    r"\bnew instructions?\b",
    r"\bpretend\b.{0,20}\b(you are|to be)\b",
    r"\bact as\b",
    r"\bjailbreak\b",
    r"\bdisregard\b.{0,20}\b(previous|prior|above)\b",
    r"\breveal\b.{0,20}\b(your\s+)?(system\s+)?prompt\b",
    r"\boverride\b",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


@dataclass
class InjectionResult:
    is_injection: bool = False
    patterns_found: list[str] = field(default_factory=list)


def detect(text: str) -> InjectionResult:
    matched = [p.pattern for p in _COMPILED_PATTERNS if p.search(text)]
    return InjectionResult(is_injection=bool(matched), patterns_found=matched)
