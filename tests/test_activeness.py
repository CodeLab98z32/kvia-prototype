from datetime import datetime

from kvia import activeness

REF = datetime(2026, 11, 4)


def n(**kw):
    base = {"notice_type": "ANNOUNCEMENT_OF_COMPETITION", "status": "ACTIVE", "tender_deadline_utc": "2026-11-20 11:00:00"}
    base.update(kw)
    return base


def test_active_competition():
    assert activeness.classify(n(), REF)["active"]


def test_empty_status_is_ignored():
    r = activeness.classify(n(status=""), REF)
    assert r["active"] and r["reason_code"] == "active_empty_status"


def test_award_with_future_date_excluded():
    r = activeness.classify(n(notice_type="ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT", tender_deadline_utc="2029-11-01 00:00:00"), REF)
    assert not r["active"] and r["category"] == "award"


def test_advisory_and_intent_excluded():
    assert not activeness.classify(n(notice_type="ADVISORY_NOTICE"), REF)["active"]
    assert not activeness.classify(n(notice_type="ANNOUNCEMENT_OF_INTENT"), REF)["active"]


def test_passed_deadline_inactive():
    r = activeness.classify(n(tender_deadline_utc="2026-11-03 23:59:59"), REF)
    assert not r["active"] and r["reason_code"] == "deadline_passed"


def test_deadline_equal_to_reference_is_inactive():
    assert not activeness.classify(n(tender_deadline_utc="2026-11-04 00:00:00"), REF)["active"]


def test_missing_deadline_not_inactive_but_flag_path():
    r = activeness.classify(n(tender_deadline_utc=""), REF)
    assert r["active"] and r["reason_code"] == "missing_deadline"
