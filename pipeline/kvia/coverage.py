"""Mode coverage of the mock run (SPEC §18 mode_coverage, coverage_check).

Lists each defined mode with the notice / firm / requirement that shows it. run_mock.py fails if any mode has none.
"""
from __future__ import annotations

from .chain import released_ids


def _ex(notice=None, firm=None, req=None, lot=None, note=None):
    return {k: v for k, v in {"notice_id": notice, "firm_id": firm, "req_id": req, "lot_id": lot, "note": note}.items()
            if v is not None}


def _bilingual_ok(obj, path="") -> list[str]:
    """Every generated *_en string has a *_nb sibling (and vice versa)."""
    bad = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.endswith("_en") and (k[:-3] + "_nb") not in obj:
                bad.append(path + "/" + k)
            if k.endswith("_nb") and (k[:-3] + "_en") not in obj:
                bad.append(path + "/" + k)
            bad += _bilingual_ok(v, path + "/" + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            bad += _bilingual_ok(v, f"{path}[{i}]")
    return bad


def filter_examples(store: dict, act: dict, gate: dict) -> dict:
    """Every filter value of the notice browser (A2) must return at least one notice."""
    recs = store["records"]
    res: dict[str, list[str]] = {}

    def add(k, nid):
        res.setdefault(k, []).append(nid)

    for r in recs:
        nid, o, d = r["doffin_id"], r["original"], r["derived"]
        a = act[nid]
        cat = a["category"]
        g = gate.get(nid)
        if g and g["final_status"] == "flagged_pending":
            add("status:flagged", nid)
        elif cat in ("active_competition", "competition_missing_deadline"):
            add("status:active", nid)
        add({"closed": "status:closed", "award": "status:award", "advisory": "status:advisory",
             "intent": "status:intent"}.get(cat, "status:other"), nid) if cat in ("closed", "award", "advisory", "intent") else None
        add(f"contract_type:{o['contract_type'] or 'empty'}", nid)
        add(f"framework:{'yes' if d['framework'] else 'no'}", nid)
        add(f"dps:{'yes' if d['dps'] else 'no'}", nid)
        add(f"lots:{'multi' if (d['lot_count_int'] or 1) > 1 else 'single'}", nid)
        add(f"value:{'unknown' if d['estimated_value_nok'] is None else 'known'}", nid)
        add(f"deadline:{'present' if d['tender_deadline'] else 'missing'}", nid)
        add(f"cpv_division:{d['cpv_division']}", nid)
        for p in d["place_of_performance_nuts_list"]:
            add(f"nuts:{p}", nid)
    return res


def build(store, act, pre, screening, reports, health, flags, manual, decisions) -> dict:
    modes = []

    def mode(group, name, examples):
        modes.append({"group": group, "mode": name, "examples": examples[:6]})

    recs = {r["doffin_id"]: r for r in store["records"]}
    # activeness ----------------------------------------------------------------------------------------------
    mode("activeness", "active competition notice", [_ex(n) for n, a in act.items() if a["reason_code"] == "active"])
    mode("activeness", "competition notice with empty status (screened)",
         [_ex(n) for n, a in act.items() if a["reason_code"] == "active_empty_status"])
    mode("activeness", "award / advisory / intent notice excluded",
         [_ex(n, note=a["category"]) for n, a in act.items() if a["reason_code"] == "not_competition_notice"])
    mode("activeness", "competition notice with passed deadline excluded",
         [_ex(n) for n, a in act.items() if a["reason_code"] == "deadline_passed"])
    # release gate --------------------------------------------------------------------------------------------
    g = pre["gate"]
    low = {"uncited_requirement", "conflicting_values", "schema_validation_failed", "model_self_rating_low"}
    codes = lambda n: {r["code"] for r in g[n]["reasons"]}  # noqa: E731
    mode("release_gate", "released automatically", [_ex(n) for n in g if g[n]["final_status"] == "released_automatically"])
    mode("release_gate", "flagged – low extraction confidence, pending",
         [_ex(n) for n in g if g[n]["final_status"] == "flagged_pending" and codes(n) & low])
    mode("release_gate", "flagged – low extraction confidence, released by adviser with correction",
         [_ex(n) for n in g if g[n]["final_status"] == "released_by_adviser" and codes(n) & low
          and g[n].get("corrections_applied")])
    mode("release_gate", "flagged – documents missing or unreadable",
         [_ex(n) for n in g if codes(n) & {"documents_missing", "documents_unreadable"}])
    mode("release_gate", "flagged – deadline missing", [_ex(n) for n in g if "deadline_missing" in codes(n)])
    # screening -----------------------------------------------------------------------------------------------
    rows = [(pid, r) for pid, s in screening.items() for r in s["ranked"]]
    mode("screening", "forwarded (>= threshold)", [_ex(r["notice_id"], pid) for pid, r in rows if r["route"] == "forwarded"])
    mode("screening", "below threshold", [_ex(r["notice_id"], pid) for pid, r in rows if r["route"] == "below_threshold"])
    for c in ("high", "medium", "low"):
        mode("screening", f"confidence {c}", [_ex(r["notice_id"], pid) for pid, r in rows if r["confidence"] == c])
    mode("screening", "missing value excluded from score",
         [_ex(r["notice_id"], pid) for pid, r in rows if r["sub_scores"]["size"]["value"] is None])
    mode("screening", "contradictory data lowering confidence",
         [_ex(r["notice_id"], pid, note=",".join(c["code"] for c in r["contradictions"])) for pid, r in rows
          if r["contradictions"]])
    mode("screening", "multi-lot with one relevant lot",
         [_ex(r["notice_id"], pid, lot=[l for l in r["lot_results"] if l["relevant"]][0]["lot_id"]) for pid, r in rows
          if r["lot_results"] and sum(l["relevant"] for l in r["lot_results"]) == 1])
    mode("screening", "'anyw' place of performance",
         [_ex(r["notice_id"], pid) for pid, r in rows if recs[r["notice_id"]]["derived"]["place_anywhere"]])
    # manual --------------------------------------------------------------------------------------------------
    mode("manual", "below-threshold notice added via ranked list",
         [_ex(m["notice_id"], m["firm_id"]) for m in manual if m["via"] == "ranked_list"])
    mode("manual", "added via notice browser",
         [_ex(m["notice_id"], m["firm_id"]) for m in manual if m["via"] == "notice_browser"])
    # match status / readiness / indication over ALL precomputed comparisons ----------------------------------
    allrows = [(pid, rep["notice_id"], lot["lot_id"], row) for pid, rp in reports.items()
               for rep in rp["reports"].values() for lot in rep["lots"] for row in lot["rows"]]
    for st in ("met", "partly_met", "not_met", "lacks_data"):
        for c in ("high", "medium", "low"):
            mode("match_status", f"{st} / {c} confidence",
                 [_ex(n, pid, row["req_id"], lot) for pid, n, lot, row in allrows
                  if row["match_status"] == st and row["match_confidence"] == c])
    for rd, label in (("documented", "documented"), ("self_declared_proof_needed", "self_declared_proof_needed"),
                      ("expired", "expired"), ("not_demanded", "proof not demanded")):
        mode("readiness", label, [_ex(n, pid, row["req_id"], lot) for pid, n, lot, row in allrows
                                  if row["readiness"] == rd and not row["expiring_soon"]])
    mode("readiness", "documented + expiring-soon flag",
         [_ex(n, pid, row["req_id"], lot) for pid, n, lot, row in allrows
          if row["readiness"] == "documented" and row["expiring_soon"]])
    lots_all = [(pid, rep, lot) for pid, rp in reports.items() for rep in rp["reports"].values() for lot in rep["lots"]]
    for ind in ("go", "borderline", "no-go"):
        vis = [(pid, rep, lot) for pid, rep, lot in lots_all if lot["indication"] == ind]
        shown = [x for x in vis if x[1]["state"] == "manually_added" or (x[1]["state"] == "forwarded" and x[2]["relevant"])]
        mode("indication", ind, [_ex(rep["notice_id"], pid, lot=lot["lot_id"],
                                     note=rep["state"]) for pid, rep, lot in (shown or vis)])
    # report states -------------------------------------------------------------------------------------------
    pending = [n for n in g if g[n]["final_status"] == "flagged_pending"]
    mode("report_states", "awaiting adviser review", [_ex(n, pid) for pid in reports for n in pending])
    mode("report_states", "available", [_ex(rep["notice_id"], pid) for pid, rp in reports.items()
                                        for rep in rp["reports"].values() if rep["state"] == "forwarded"])
    mode("report_states", "manually added", [_ex(rep["notice_id"], pid) for pid, rp in reports.items()
                                             for rep in rp["reports"].values() if rep["state"] == "manually_added"])
    # review and S3 -------------------------------------------------------------------------------------------
    mode("review_and_s3", "adviser queue entry – pending", [_ex(n) for n in pending])
    mode("review_and_s3", "adviser queue entry – released",
         [_ex(n) for n in g if g[n]["final_status"] == "released_by_adviser"])
    mode("review_and_s3", "firm-flag example", [_ex(f["notice_id"], f["firm_id"], note=f["flag_id"]) for f in flags])
    for k in ("expired", "expiring", "declared_missing"):
        mode("review_and_s3", f"profile health-check flag – {k}",
             [_ex(firm=pid, note=f["field"] + (f" ({f['part']})" if f.get("part") else "")) for pid, fl in health.items()
              for f in fl if f["kind"] == k])
    # ui --------------------------------------------------------------------------------------------------------
    bad = []
    for pid in reports:
        bad += _bilingual_ok(screening[pid]["ranked"], f"screening/{pid}")
        bad += _bilingual_ok(list(reports[pid]["reports"].values()), f"reports/{pid}")
    bad += _bilingual_ok(g, "gate") + _bilingual_ok({k: v for k, v in act.items()}, "activeness")
    mode("ui", "English and Norwegian texts for every generated string",
         [] if bad else [_ex(note="all *_en strings in screening, reports, gate and activeness have *_nb siblings")])
    fx = filter_examples(store, act, g)
    required = ["status:active", "status:closed", "status:award", "status:advisory", "status:intent", "status:flagged",
                "contract_type:Works", "contract_type:Supplies", "contract_type:Services", "framework:yes", "framework:no",
                "dps:yes", "dps:no", "lots:multi", "lots:single", "value:unknown", "value:known"]
    empty = [k for k in required if not fx.get(k)]
    mode("ui", "every filter returns at least one result",
         [] if empty else [_ex(note=f"{k}: {len(fx[k])} notices") for k in required])
    return {"modes": modes, "bilingual_violations": bad[:50], "filter_examples": fx,
            "filters_without_result": empty, "released_notices": released_ids(pre)}
