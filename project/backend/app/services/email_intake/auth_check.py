"""SPF/DKIM/DMARC verification via the `Authentication-Results` header
(email complaint flow doc, Step 5). The receiving MTA (Gmail, since we fetch
from a Gmail inbox) already performed the actual SPF/DKIM/DMARC checks and
stamped the verdict into this header -- this module only parses that
existing verdict, it never re-implements SPF/DKIM verification itself."""

import re
from dataclasses import dataclass

_RESULT_PATTERN = re.compile(r"\b(spf|dkim|dmarc)\s*=\s*(\w+)", re.IGNORECASE)


@dataclass
class AuthResult:
    spf: str | None = None
    dkim: str | None = None
    dmarc: str | None = None

    @property
    def passed(self) -> bool:
        """SPF and DKIM must both explicitly pass. DMARC is informational
        here (many legitimate senders don't publish a DMARC policy at all),
        matching the doc's own flowchart gate ("SPF/DKIM pass?")."""
        return self.spf == "pass" and self.dkim == "pass"


def parse_authentication_results(header_value: str | None) -> AuthResult:
    if not header_value:
        return AuthResult()
    values = {m.group(1).lower(): m.group(2).lower() for m in _RESULT_PATTERN.finditer(header_value)}
    return AuthResult(spf=values.get("spf"), dkim=values.get("dkim"), dmarc=values.get("dmarc"))
