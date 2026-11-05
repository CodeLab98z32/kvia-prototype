"""Profile health check (Service 3, rule-based, no AI). Flags expired, expiring and declared-missing entries relative
to the reference date. The expiring window (60 days) is an ASSUMPTION (agent default, Phase 1)."""
from __future__ import annotations

from datetime import date

from .util import days, parse_date


def run(profile: dict, ref: date, window_days: int) -> list[dict]:
    flags = []
    for sec in ("search_profile", "capability_locker"):
        for e in profile[sec]:
            parts = e.get("parts") or [{"part": None, "proof_status": e["proof_status"], "expiry_date": e.get("expiry_date")}]
            for p in parts:
                label = e["label_en"] + (f" — {p['part']}" if p.get("part") else "")
                label_nb = e["label_nb"] + (f" — {p['part']}" if p.get("part") else "")
                if p["proof_status"] == "Declared missing":
                    flags.append({"field": e["id"], "part": p.get("part"), "kind": "declared_missing",
                                  "label_en": label, "label_nb": label_nb, "date": None})
                exp = parse_date(p.get("expiry_date")) if p.get("expiry_date") else None
                if exp:
                    if exp < ref:
                        flags.append({"field": e["id"], "part": p.get("part"), "kind": "expired",
                                      "label_en": label, "label_nb": label_nb, "date": exp.isoformat()})
                    elif exp <= ref + days(window_days):
                        flags.append({"field": e["id"], "part": p.get("part"), "kind": "expiring",
                                      "label_en": label, "label_nb": label_nb, "date": exp.isoformat(),
                                      "days_left": (exp - ref).days})
    return flags
