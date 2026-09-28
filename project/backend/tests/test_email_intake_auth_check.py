from app.services.email_intake.auth_check import parse_authentication_results

REAL_GMAIL_HEADER_PASS = (
    "mx.google.com; dkim=pass header.i=@example.com header.s=selector1 header.b=abc123; "
    "spf=pass (google.com: domain of ali@example.com designates 1.2.3.4 as permitted sender) "
    "smtp.mailfrom=ali@example.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=example.com"
)

REAL_GMAIL_HEADER_SPF_FAIL = (
    "mx.google.com; dkim=neutral (body hash did not verify) header.i=@example.com; "
    "spf=fail (google.com: domain of spoofed@example.com does not designate 5.6.7.8 as permitted sender) "
    "smtp.mailfrom=spoofed@example.com; dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=example.com"
)


def test_both_pass_is_authenticated():
    result = parse_authentication_results(REAL_GMAIL_HEADER_PASS)
    assert result.spf == "pass"
    assert result.dkim == "pass"
    assert result.passed is True


def test_spf_fail_is_not_authenticated():
    result = parse_authentication_results(REAL_GMAIL_HEADER_SPF_FAIL)
    assert result.spf == "fail"
    assert result.passed is False


def test_missing_header_is_not_authenticated():
    result = parse_authentication_results(None)
    assert result.spf is None
    assert result.dkim is None
    assert result.passed is False


def test_missing_dkim_only_is_not_authenticated():
    header = "mx.google.com; spf=pass smtp.mailfrom=a@b.com"
    result = parse_authentication_results(header)
    assert result.spf == "pass"
    assert result.dkim is None
    assert result.passed is False


def test_dmarc_alone_does_not_grant_pass():
    """DMARC is informational only -- SPF+DKIM are the hard gate, matching
    the doc's own flowchart ("SPF/DKIM pass?")."""
    header = "mx.google.com; spf=fail; dkim=fail; dmarc=pass"
    result = parse_authentication_results(header)
    assert result.passed is False
