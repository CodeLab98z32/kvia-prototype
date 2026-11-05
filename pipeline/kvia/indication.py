"""Step 3c — Indication (code, never the LLM). Exact rules from Final service portfolio.docx (SPEC §7).

no-go      : at least one mandatory requirement is not met
borderline : no requirement is not met, but at least one is partly met, lacks data, has low match confidence,
             or demanded proof is not documented and valid on the tender deadline
go         : all requirements met with high confidence, and all demanded proof documented and valid on the deadline

Gap in the wording (docs/conflict_log.md C4): a NON-mandatory requirement that is not met fits neither borderline
("no requirement is not met") nor go ("all requirements met"); likewise a requirement met with MEDIUM confidence
fits neither borderline (only "low match confidence") nor go ("met with high confidence"). Agent default: both yield
borderline.
Requirements without a valid source reference never influence the indication (SPEC §2 invariants).
"""
from __future__ import annotations


def indicate(rows: list[dict]) -> dict:
    """rows: [{req_id, mandatory, cited, match_status, match_confidence, readiness}]"""
    counted = [r for r in rows if r.get("cited")]
    ignored = [r["req_id"] for r in rows if not r.get("cited")]
    reasons = []
    nogo = [r for r in counted if r["mandatory"] and r["match_status"] == "not_met"]
    if nogo:
        for r in nogo:
            reasons.append({"code": "mandatory_not_met", "req_id": r["req_id"]})
        return {"indication": "no-go", "reasons": reasons, "ignored_uncited": ignored}
    for r in counted:
        if r["match_status"] == "not_met":
            reasons.append({"code": "optional_not_met", "req_id": r["req_id"]})
        if r["match_status"] == "partly_met":
            reasons.append({"code": "partly_met", "req_id": r["req_id"]})
        if r["match_status"] == "lacks_data":
            reasons.append({"code": "lacks_data", "req_id": r["req_id"]})
        if r["match_confidence"] == "low":
            reasons.append({"code": "low_confidence", "req_id": r["req_id"]})
        if r["readiness"] not in ("documented", "not_demanded"):
            reasons.append({"code": "proof_not_documented_valid", "req_id": r["req_id"], "readiness": r["readiness"]})
    if reasons:
        return {"indication": "borderline", "reasons": reasons, "ignored_uncited": ignored}
    for r in counted:
        if r["match_status"] != "met" or r["match_confidence"] != "high":
            reasons.append({"code": "met_below_high_confidence", "req_id": r["req_id"]})
    if reasons or not counted:
        if not counted:
            reasons.append({"code": "no_cited_requirements"})
        return {"indication": "borderline", "reasons": reasons, "ignored_uncited": ignored}
    return {"indication": "go", "reasons": [{"code": "all_met_high_and_documented"}], "ignored_uncited": ignored}


REASON_TEXT = {
    "mandatory_not_met": ("Mandatory requirement not met", "Obligatorisk krav ikke oppfylt"),
    "optional_not_met": ("Non-mandatory requirement not met (treated as borderline)",
                         "Ikke-obligatorisk krav ikke oppfylt (behandles som grensetilfelle)"),
    "partly_met": ("Requirement partly met", "Krav delvis oppfylt"),
    "lacks_data": ("Requirement lacks data in the Capability Locker", "Kravet mangler data i Capability Locker"),
    "low_confidence": ("Low match confidence", "Lav matchesikkerhet"),
    "proof_not_documented_valid": ("Demanded proof not documented and valid on the tender deadline",
                                   "Krevd dokumentasjon er ikke dokumentert og gyldig på tilbudsfristen"),
    "met_below_high_confidence": ("Requirement met, but not with high confidence (treated as borderline)", "Krav oppfylt, men ikke med høy sikkerhet (behandles som grensetilfelle)"),
    "no_cited_requirements": ("No cited requirements to assess", "Ingen krav med kildehenvisning å vurdere"),
    "all_met_high_and_documented": ("All requirements met with high confidence and all demanded proof documented and "
                                    "valid on the tender deadline",
                                    "Alle krav oppfylt med høy sikkerhet og all krevd dokumentasjon er dokumentert og "
                                    "gyldig på tilbudsfristen"),
}
