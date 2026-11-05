import json
from datetime import date
from pathlib import Path

from kvia import indication, readiness

CFG = {"readiness": {"tax_certificate_max_age_months": 6, "expiring_soon_days_after_deadline": 30}}
P = {e["id"]: e for e in json.loads((Path(__file__).parent / "fixtures" / "fixture_profile.json").read_text())["capability_locker"]}


def ev(fid, deadline, demanded=True, part=None):
    return readiness.evaluate(demanded, P.get(fid), deadline, CFG, part)["readiness"]


def test_not_demanded():
    assert ev("tax_vat_certificate", date(2026, 11, 20), demanded=False) == "not_demanded"


def test_tax_certificate_six_month_rule():
    assert ev("tax_vat_certificate", date(2026, 11, 1)) == "documented"
    assert ev("tax_vat_certificate", date(2026, 11, 2)) == "expired"


def test_expiry_before_deadline_and_expiring_soon_flag():
    r = readiness.evaluate(True, P["insurance"], date(2026, 11, 20), CFG)
    assert r["readiness"] == "documented" and r["expiring_soon"]           # 20 days after deadline
    r = readiness.evaluate(True, P["insurance"], date(2026, 11, 5), CFG)
    assert r["readiness"] == "documented" and not r["expiring_soon"]       # 35 days after deadline
    assert ev("insurance", date(2026, 12, 11)) == "expired"


def test_self_declared_partial_missing():
    assert ev("hms_declaration", date(2026, 11, 20)) == "self_declared_proof_needed"
    assert ev("key_personnel_cvs", date(2026, 11, 20)) == "self_declared_proof_needed"
    assert ev("credit_rating", date(2026, 11, 20)) == "no_proof_on_file"
    assert ev("nonexistent", date(2026, 11, 20)) == "no_proof_on_file"


def test_parts():
    assert ev("startbank_achilles", date(2026, 11, 20), part="StartBANK") == "expired"
    assert ev("startbank_achilles", date(2026, 11, 20), part="Achilles") == "no_proof_on_file"


def row(rid="R", mandatory=True, status="met", conf="high", rd="documented", cited=True):
    return {"req_id": rid, "mandatory": mandatory, "match_status": status, "match_confidence": conf, "readiness": rd,
            "cited": cited}


def test_go():
    assert indication.indicate([row(), row(rd="not_demanded")])["indication"] == "go"


def test_nogo_needs_mandatory_not_met():
    assert indication.indicate([row(), row(status="not_met")])["indication"] == "no-go"
    assert indication.indicate([row(), row(status="not_met", mandatory=False)])["indication"] == "borderline"


def test_borderline_triggers():
    for r in (row(status="partly_met"), row(status="lacks_data"), row(conf="low"), row(rd="expired"),
              row(rd="self_declared_proof_needed"), row(rd="no_proof_on_file"), row(conf="medium")):
        assert indication.indicate([row(), r])["indication"] == "borderline"


def test_uncited_requirement_never_influences():
    out = indication.indicate([row(), row(rid="X", status="not_met", cited=False)])
    assert out["indication"] == "go" and out["ignored_uncited"] == ["X"]
