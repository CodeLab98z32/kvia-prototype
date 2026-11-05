"""Step 0 — Ingest (no AI). SPEC §2 ingest, §5.1.

Every notice is stored UNALTERED in its original 40-field structure, with a version hash over the original record.
Derived values (split multi-value fields, parsed numbers/dates, normalised legislation) are kept in a separate
`derived` block and never overwrite `original`.
"""
from __future__ import annotations

import csv
from pathlib import Path

from .util import ROOT, canonical_hash, parse_dt, read_json

MULTI_VALUE_FIELDS = ["cpv_additional", "place_of_performance_nuts", "buyer_name", "buyer_city", "buyer_nuts"]
LEGISLATION_CANON = "Anskaffelsesforskriften"
LEGISLATION_ALIASES = {
    "https://lovdata.no/eli/forskrift/2016/8/12/974": LEGISLATION_CANON,
    "lovdata.no/eli/forskrift/2016/8/12/974": LEGISLATION_CANON,
    "Anskaffelseforskriften": LEGISLATION_CANON,
    LEGISLATION_CANON: LEGISLATION_CANON,
}


def read_export(path: Path) -> tuple[list[str], list[dict]]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = [dict(r) for r in reader]
        return list(reader.fieldnames or []), rows


def split_multi(v: str) -> list[str]:
    return [p.strip() for p in v.split(" | ")] if v and v.strip() else []


def parse_value(v: str) -> float | None:
    """estimated_value: empty or 0 means unknown (SPEC §5.1 special_values) — never NOK 0."""
    if v is None or not v.strip():
        return None
    x = float(v)
    return None if x == 0 else x


def derive(orig: dict) -> dict:
    d: dict = {}
    for f in MULTI_VALUE_FIELDS:
        d[f + "_list"] = split_multi(orig.get(f, ""))
    d["cpv_all"] = [c for c in [orig.get("cpv_main", "").strip()] if c] + d["cpv_additional_list"]
    dl = parse_dt(orig.get("tender_deadline_utc"))
    d["tender_deadline"] = dl.isoformat() if dl else None
    d["estimated_value_nok"] = parse_value(orig.get("estimated_value", ""))
    d["estimated_value_status"] = (
        "missing" if not orig.get("estimated_value", "").strip()
        else "zero_treated_as_unknown" if d["estimated_value_nok"] is None else "present")
    leg = orig.get("legislation", "").strip()
    d["legislation_normalised"] = LEGISLATION_ALIASES.get(leg, leg) if leg else None
    d["framework"] = orig.get("framework_agreement") == "True"
    d["dps"] = orig.get("dynamic_purchasing_system") == "True"
    d["lot_count_int"] = int(orig["lot_count"]) if orig.get("lot_count", "").strip() else None
    d["place_anywhere"] = "anyw" in d["place_of_performance_nuts_list"]
    d["cpv_division"] = orig.get("cpv_main", "")[:2] or None
    return d


def ingest(export_path: Path, mock_path: Path | None) -> dict:
    columns, rows = read_export(export_path)
    records = []
    for r in rows:
        records.append({"doffin_id": r["doffin_id"], "mock": False, "source": "doffin_export",
                        "version_hash": canonical_hash(r), "original": r, "derived": derive(r)})
    if mock_path and Path(mock_path).exists():
        m = read_json(mock_path)
        assert m["columns"] == columns, "mock notices must use the export's 40-column structure"
        for r in m["notices"]:
            records.append({"doffin_id": r["doffin_id"], "mock": True, "source": "mock_notices (invented)",
                            "version_hash": canonical_hash(r), "original": r, "derived": derive(r)})
    return {"columns": columns, "export_rows": len(rows), "records": records,
            "export_file": str(Path(export_path).relative_to(ROOT))}
