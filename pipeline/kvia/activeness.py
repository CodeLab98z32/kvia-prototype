"""Step 0b — Activeness (code). SPEC §5.1 activeness_rule.

active  = notice_type == ANNOUNCEMENT_OF_COMPETITION AND tender_deadline_utc > reference_datetime
The `status` field is ignored on purpose (empty for 2026-116619 and 2026-116544). Award notices carry future dates in
tender_deadline_utc, so the deadline alone is not enough. A competition notice WITHOUT a deadline is not inactive: it
continues to pre-processing and is flagged by the release gate (missing_deadline).
"""
from __future__ import annotations

from datetime import datetime

COMPETITION = "ANNOUNCEMENT_OF_COMPETITION"


def classify(original: dict, ref: datetime) -> dict:
    nt = original.get("notice_type", "")
    dl_raw = (original.get("tender_deadline_utc") or "").strip()
    if nt != COMPETITION:
        kind = {"ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT": "award", "ADVISORY_NOTICE": "advisory",
                "ANNOUNCEMENT_OF_INTENT": "intent"}.get(nt, "other")
        return {"active": False, "category": kind, "reason_code": "not_competition_notice",
                "reason_en": f"Not a competition notice ({nt}); never screened, whatever its dates.",
                "reason_nb": f"Ikke en konkurransekunngjøring ({nt}); screenes aldri, uansett datoer."}
    if not dl_raw:
        return {"active": True, "category": "competition_missing_deadline", "reason_code": "missing_deadline",
                "reason_en": "Competition notice without tender deadline: not treated as inactive; flagged for adviser review.",
                "reason_nb": "Konkurransekunngjøring uten tilbudsfrist: regnes ikke som inaktiv; flagges for rådgivergjennomgang."}
    dl = datetime.strptime(dl_raw, "%Y-%m-%d %H:%M:%S")
    if dl > ref:
        empty = not (original.get("status") or "").strip()
        return {"active": True, "category": "active_competition", "reason_code":
                "active_empty_status" if empty else "active",
                "reason_en": "Competition notice with deadline after the reference date"
                             + (" (status field is empty and ignored)." if empty else "."),
                "reason_nb": "Konkurransekunngjøring med frist etter referansedatoen"
                             + (" (statusfeltet er tomt og ignoreres)." if empty else ".")}
    return {"active": False, "category": "closed", "reason_code": "deadline_passed",
            "reason_en": "Competition notice whose tender deadline has passed: inactive, not screened.",
            "reason_nb": "Konkurransekunngjøring med passert tilbudsfrist: inaktiv, screenes ikke."}


def run(store: dict, ref: datetime) -> dict:
    out = {}
    for rec in store["records"]:
        out[rec["doffin_id"]] = classify(rec["original"], ref)
    return out
