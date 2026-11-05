"""Step 3b — Documentation readiness (code). SPEC §7 documentation_readiness.

Only where proof is demanded. Evaluated on the TENDER DEADLINE:
  documented                 : proof status Documented AND valid on the deadline
  self_declared_proof_needed : proof status Self-declared, or Documented for only part ("2 of 3")
  expired                    : expiry date before the deadline
  no_proof_on_file           : value declared missing or no Capability Locker field exists (agent default — see
                               docs/conflict_log.md C5; listed as a missing document)
  rule_tax_certificate       : valid if issued no more than six months before the deadline (ASSUMPTION)
  expiring_soon flag         : valid on the deadline but expiring within 30 days after it (ASSUMPTION) — readiness
                               stays `documented` and the checklist row carries a visible flag
A requirement classified not_met or lacks_data whose proof is demanded is set to no_proof_on_file by the chain.
missing_documents = every requirement with readiness self_declared_proof_needed, expired or no_proof_on_file.
"""
from __future__ import annotations

from datetime import date

from .util import add_months, days, parse_date

MISSING_DOC_STATES = {"self_declared_proof_needed", "expired", "no_proof_on_file"}


def _status_and_expiry(field: dict, part: str | None) -> tuple[str, str | None]:
    if field.get("parts"):
        parts = field["parts"]
        p = next((x for x in parts if part and x["part"] == part), None) or parts[0]
        return p["proof_status"], p.get("expiry_date")
    return field["proof_status"], field.get("expiry_date")


def evaluate(proof_demanded: bool, field: dict | None, deadline: date, cfg: dict, part: str | None = None) -> dict:
    rc = cfg["readiness"]
    if not proof_demanded:
        return {"readiness": "not_demanded", "expiring_soon": False, "valid_until": None, "rule": None}
    if field is None:
        return {"readiness": "no_proof_on_file", "expiring_soon": False, "valid_until": None,
                "rule": "no Capability Locker field for this requirement"}
    status, expiry = _status_and_expiry(field, part)
    rule = None
    if field["id"] == "tax_vat_certificate" and field.get("structured", {}).get("issue_date"):
        issued = parse_date(field["structured"]["issue_date"])
        valid_until = add_months(issued, rc["tax_certificate_max_age_months"])
        rule = f"tax certificate valid {rc['tax_certificate_max_age_months']} months from issue (ASSUMPTION)"
    else:
        valid_until = parse_date(expiry) if expiry else None
    if status == "Declared missing":
        return {"readiness": "no_proof_on_file", "expiring_soon": False, "valid_until": None, "rule": "declared missing"}
    if status == "Not applicable":
        return {"readiness": "no_proof_on_file", "expiring_soon": False, "valid_until": None, "rule": "not applicable"}
    if status in ("Self-declared", "Documented (n of m)"):
        r = "self_declared_proof_needed"
        if valid_until and valid_until < deadline:
            r = "expired"
        return {"readiness": r, "expiring_soon": False, "valid_until": valid_until and valid_until.isoformat(),
                "rule": rule or ("partly documented" if status == "Documented (n of m)" else "self-declared")}
    # Documented
    if valid_until and valid_until < deadline:
        return {"readiness": "expired", "expiring_soon": False, "valid_until": valid_until.isoformat(), "rule": rule}
    soon = bool(valid_until and valid_until <= deadline + days(rc["expiring_soon_days_after_deadline"]))
    return {"readiness": "documented", "expiring_soon": soon,
            "valid_until": valid_until.isoformat() if valid_until else None, "rule": rule}
