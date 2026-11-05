"""Step 1c — Release gate (code). SPEC §9.

Flag triggers (any one flags the notice):
  Data requirements.docx : tender documents missing or unreadable; tender_deadline_utc missing
  AI mechanism chain.docx: low extraction confidence, operationalised as
                           a requirement without a citation (incl. a failed citation check), conflicting values across
                           documents, pass-2 schema validation failed, model self-rating low
NOT triggers: missing cpv_main, contract_type, estimated_value or other structured fields (they only lower the
screening confidence, SPEC §6).
A flagged notice stays visible but gets no screening and no report for any firm until an adviser releases it.
Adviser decisions (data/adviser_decisions.json) are applied after the gate and before screening.
"""
from __future__ import annotations

import copy

REASONS = {
    "documents_missing": ("Tender documents missing", "Konkurransedokumenter mangler", "data_requirements"),
    "documents_unreadable": ("Tender documents unreadable (no text layer or unreadable pages)",
                             "Konkurransedokumenter uleselige (mangler tekstlag eller uleselige sider)", "data_requirements"),
    "deadline_missing": ("Tender deadline missing", "Tilbudsfrist mangler", "data_requirements"),
    "uncited_requirement": ("Low extraction confidence: a requirement has no valid citation",
                            "Lav ekstraksjonssikkerhet: et krav mangler gyldig kildehenvisning", "mechanism_chain"),
    "conflicting_values": ("Low extraction confidence: conflicting values across documents",
                           "Lav ekstraksjonssikkerhet: motstridende verdier mellom dokumenter", "mechanism_chain"),
    "schema_validation_failed": ("Low extraction confidence: pass-2 schema validation failed",
                                 "Lav ekstraksjonssikkerhet: skjemavalidering i pass 2 feilet", "mechanism_chain"),
    "model_self_rating_low": ("Low extraction confidence: model self-rating low",
                              "Lav ekstraksjonssikkerhet: modellens egenvurdering er lav", "mechanism_chain"),
}


def reason(code: str, detail_en: str = "", detail_nb: str = "") -> dict:
    en, nb, src = REASONS[code]
    return {"code": code, "label_en": en, "label_nb": nb, "source": src, "detail_en": detail_en, "detail_nb": detail_nb}


def gate(notice_id: str, docs_status: str, has_deadline: bool, extraction: dict | None) -> dict:
    """docs_status: available | available_mock | missing | unreadable. extraction: the checked extraction record."""
    reasons = []
    if docs_status == "missing":
        reasons.append(reason("documents_missing"))
    elif docs_status == "unreadable":
        reasons.append(reason("documents_unreadable"))
    if not has_deadline:
        reasons.append(reason("deadline_missing"))
    if extraction is not None:
        if not extraction["schema_ok"]:
            reasons.append(reason("schema_validation_failed", "; ".join(extraction["schema_errors"])[:300]))
        reqs = (extraction.get("validated") or {}).get("requirements", [])
        uncited = [r["req_id"] for r in reqs if not r.get("source")]
        failed = [c["req_id"] for c in extraction.get("citation_checks", []) if not c["citation_ok"]]
        if uncited or failed:
            ids = sorted(set(uncited) | set(failed))
            reasons.append(reason("uncited_requirement", ", ".join(ids), ", ".join(ids)))
        for c in (extraction.get("validated") or {}).get("conflicts", []):
            reasons.append(reason("conflicting_values", c["description_en"], c["description_nb"]))
        if (extraction.get("validated") or {}).get("model_self_rating") == "low":
            reasons.append(reason("model_self_rating_low"))
    return {"notice_id": notice_id, "gate_status": "flagged" if reasons else "released", "reasons": reasons,
            "auto_released": not reasons}


def apply_adviser_decision(gate_rec: dict, decision: dict | None, requirements: list[dict]) -> tuple[dict, list[dict]]:
    """Return (final gate record, effective requirements). Corrections are recorded human edits applied by code;
    the stored AI output itself is never changed."""
    rec = copy.deepcopy(gate_rec)
    reqs = copy.deepcopy(requirements)
    if gate_rec["gate_status"] == "released":
        rec["final_status"] = "released_automatically"
        return rec, reqs
    if not decision or decision.get("decision") != "released":
        rec["final_status"] = "flagged_pending"
        rec["adviser_decision"] = decision
        return rec, []
    applied = []
    for c in decision.get("corrections", []):
        if c["op"] == "replace_field":
            for r in reqs:
                if r["req_id"] == c["req_id"]:
                    old = r
                    for path_key, value in c["set"].items():
                        tgt = old
                        keys = path_key.split(".")
                        for k in keys[:-1]:
                            tgt = tgt[k]
                        tgt[keys[-1]] = value
                    r["adviser_corrected"] = True
                    applied.append(c)
        elif c["op"] == "remove":
            before = len(reqs)
            reqs = [r for r in reqs if r["req_id"] != c["req_id"]]
            if len(reqs) < before:
                applied.append(c)
    rec["final_status"] = "released_by_adviser"
    rec["adviser_decision"] = decision
    rec["corrections_applied"] = len(applied)
    return rec, reqs
