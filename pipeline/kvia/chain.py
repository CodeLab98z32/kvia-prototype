"""The mechanism chain, step by step (SPEC §3). Shared by run_mock.py and trigger_sim.py.

AI steps (1b extraction, 2a screening, 3a matching + classification) are produced by the mock generators in Phase 1;
in Phase 2 they are produced by Claude in the development chat following /prompts and saved as JSON that must pass the
same schemas. Everything else is deterministic code.
"""
from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from . import activeness, healthcheck, indication, ranking, readiness, release_gate, retrieval
from .ingest import ingest
from .mock import classification as mclass
from .mock import extraction as mextract
from .mock import pdfs as mpdfs
from .mock import screening as mscreen
from .mock.requirements import LOTS, requirement_set
from .util import ROOT, parse_date, read_json

M = 1_000_000


def load_profiles(cfg: dict) -> dict:
    out = {}
    for p in sorted((ROOT / cfg["profiles_dir"]).glob("*.json")):
        prof = read_json(p)
        out[prof["profile_id"]] = prof
    return out


def doc_path(cfg: dict, nid: str) -> tuple[str, Path | None]:
    real = ROOT / cfg["tender_docs_dir"] / nid
    if real.is_dir() and any(real.glob("*.pdf")):
        return "available", sorted(real.glob("*.pdf"))[0]
    ph = ROOT / cfg["placeholder_docs_dir"] / nid
    if (ph / "PLACEHOLDER.json").exists():
        pdf = next(iter(sorted(ph.glob("*.pdf"))), None)
        return ("available_mock", pdf) if pdf else ("unreadable", None)
    return "missing", None


# Step 0 / 0b ---------------------------------------------------------------------------------------------------
def step_ingest(cfg: dict) -> tuple[dict, dict]:
    store = ingest(ROOT / cfg["notice_export"], ROOT / cfg["mock_notices"])
    ref = datetime.fromisoformat(cfg["reference_datetime"])
    act = activeness.run(store, ref)
    return store, act


# Phase 1 placeholder generation -------------------------------------------------------------------------------
def generate_placeholders(cfg: dict, store: dict, act: dict) -> dict:
    """Write PLACEHOLDER.json + placeholder PDF for every active notice with mock templates. Returns layouts."""
    layouts = {}
    for rec in store["records"]:
        nid = rec["doffin_id"]
        if not act[nid]["active"]:
            continue
        tpl = requirement_set(nid)
        if not tpl:
            continue                       # e.g. MOCK-0002: documents missing on purpose
        folder = ROOT / cfg["placeholder_docs_dir"] / nid
        name = f"PLACEHOLDER_{nid}_konkurransegrunnlag.pdf"
        layouts[nid] = mpdfs.build_pdf(folder / name, rec["original"], tpl, LOTS.get(nid, []))
        mpdfs.write_placeholder_json(folder, name)
    return layouts


# Step 1 --------------------------------------------------------------------------------------------------------
def step_preprocess(cfg: dict, store: dict, act: dict, layouts: dict, decisions: dict) -> dict:
    pv = cfg["prompt_versions"]["extraction"]
    out = {"retrieval": {}, "extraction": {}, "gate": {}, "effective": {}, "templates": {}}
    for rec in store["records"]:
        nid = rec["doffin_id"]
        if not act[nid]["active"]:
            continue
        status, pdf = doc_path(cfg, nid)
        has_deadline = bool((rec["original"].get("tender_deadline_utc") or "").strip())
        ext = None
        if pdf is not None:
            chunks = retrieval.page_chunks(pdf)
            ret = retrieval.retrieve(chunks, cfg)
            if ret["unreadable_pages"]:
                status = "unreadable"
            tpl = requirement_set(nid)
            out["templates"][nid] = {t["req_id"]: {"check": t["check"], "key": t["key"]} for t in tpl}
            ext = mextract.run(rec, tpl, layouts.get(nid, {}), pdf, pv)
            ext["prompt_input"] = mextract.prompt_input(rec, ret, chunks)
            ext["document"] = {"name": pdf.name, "path": str(pdf.relative_to(ROOT)), "pages": len(chunks),
                               "status": status}
            # retrieval misses (T8 helper): cited pages outside the retrieved set
            sel = set(ret["retrieved_page_ids"])
            ret["retrieval_misses"] = [r["req_id"] for r in (ext["validated"] or {}).get("requirements", [])
                                       if r.get("source") and f"{pdf.name}#p{r['source']['page_start']}" not in sel]
            out["retrieval"][nid] = ret
            out["extraction"][nid] = ext
        g = release_gate.gate(nid, status, has_deadline, ext)
        g["documents_status"] = status
        reqs = (ext["validated"] or {}).get("requirements", []) if ext else []
        highlights = {c["req_id"]: c for c in (ext or {}).get("citation_checks", [])}
        for r in reqs:
            c = highlights.get(r["req_id"], {})
            r["highlight"] = c.get("highlight")
            r["highlighted"] = bool(c.get("highlighted"))
        final, eff = release_gate.apply_adviser_decision(g, decisions.get(nid), reqs)
        out["gate"][nid] = final
        out["effective"][nid] = eff
    return out


def released_ids(pre: dict) -> list[str]:
    return [nid for nid, g in pre["gate"].items() if g["final_status"] in ("released_automatically", "released_by_adviser")]


# Step 2 --------------------------------------------------------------------------------------------------------
def step_screen(cfg: dict, store: dict, pre: dict, profile: dict) -> dict:
    sc = cfg["screening"]
    pv = cfg["prompt_versions"]["screening"]
    recs = {r["doffin_id"]: r for r in store["records"]}
    results, io = [], {}
    for nid in released_ids(pre):
        lots = (pre["extraction"][nid]["validated"] or {}).get("lots", []) if nid in pre["extraction"] else []
        s, inp = mscreen.screen(recs[nid], profile, lots, pv)
        if not s["schema_ok"]:
            io[nid] = {"input": inp, **s}
            continue
        r = ranking.score_notice(s["validated"], sc["weights"], sc["threshold"], sc["confidence_weight_floor"])
        r["sub_scores"] = s["validated"]["sub_scores"]
        r["contradictions"] = s["validated"]["contradictions"]
        r["data_quality_notes_en"] = s["validated"]["data_quality_notes_en"]
        r["data_quality_notes_nb"] = s["validated"]["data_quality_notes_nb"]
        r["mock"] = True
        results.append(r)
        io[nid] = {"prompt_version": pv, "model": s["raw"]["model"], "input": inp, "raw_output": s["raw"],
                   "schema_ok": s["schema_ok"], "schema_errors": s["schema_errors"], "validated_output": s["validated"]}
    return {"firm_id": profile["profile_id"], "threshold": sc["threshold"], "weights": sc["weights"],
            "ranked": ranking.ranked_list(results), "prompt_io": io}


# Step 3 --------------------------------------------------------------------------------------------------------
def _locker_field(profile: dict, locker: str):
    if locker == "none" or not locker:
        return None, []
    ids = [x.strip() for x in locker.split(",")]
    snaps = []
    for e in profile["capability_locker"]:
        if e["id"] in ids:
            snaps.append(e)
    if not snaps:
        return None, []
    if len(snaps) == 1:
        return snaps[0], snaps
    # several references -> combined pseudo-field: Documented only if all used entries are documented
    allsd = all(s["proof_status"] == "Documented" for s in snaps)
    return {"id": "references", "proof_status": "Documented" if allsd else "Self-declared", "expiry_date": None,
            "structured": {}}, snaps


def snapshot(e: dict) -> dict:
    return {k: e.get(k) for k in ("id", "label_en", "label_nb", "value", "proof_status_original", "proof_status",
                                  "last_updated", "expiry_original", "expiry_date", "parts")}


def step_report(cfg: dict, store: dict, pre: dict, screening: dict, profile: dict, manual: list[dict]) -> dict:
    pv = cfg["prompt_versions"]["matching_classification"]
    recs = {r["doffin_id"]: r for r in store["records"]}
    routes = {r["notice_id"]: r for r in screening["ranked"]}
    manual_ids = {m["notice_id"]: m for m in manual if m["firm_id"] == profile["profile_id"]}
    reports, io = {}, {}
    for nid in released_ids(pre):
        if nid not in routes:
            continue
        rec = recs[nid]
        deadline = parse_date(rec["derived"]["tender_deadline"])
        reqs = pre["effective"][nid]
        checks = {k: v["check"] for k, v in pre["templates"][nid].items()}
        keys = {k: v["key"] for k, v in pre["templates"][nid].items()}
        lots = (pre["extraction"][nid]["validated"] or {}).get("lots", [])
        lot_ids = [l["lot_id"] for l in lots] or [None]
        sr = routes[nid]
        lot_out = []
        for lot in lot_ids:
            lreqs = [r for r in reqs if r.get("lot_id") in (None, lot)]
            cited = [r for r in lreqs if r.get("source")]
            comp = mclass.compare(nid, lot, cited, checks, profile, deadline, pv)
            io_key = f"{nid}" + (f"#lot{lot}" if lot else "")
            io[io_key] = {"prompt_version": pv, "model": comp["raw"]["model"],
                          "input": mclass.prompt_input(rec, cited, profile, lot), "raw_output": comp["raw"],
                          "schema_ok": comp["schema_ok"], "schema_errors": comp["schema_errors"],
                          "validated_output": comp["validated"]}
            rows = []
            by_id = {it["req_id"]: it for it in (comp["validated"] or {}).get("items", [])}
            for r in cited:
                it = by_id[r["req_id"]]
                fld, snaps = _locker_field(profile, it["locker_field"])
                rd = readiness.evaluate(r["proof_demanded"], fld, deadline, cfg, comp["parts"].get(r["req_id"]))
                if r["proof_demanded"] and it["match_status"] in ("not_met", "lacks_data"):
                    # proof of a requirement that is not met / lacks data cannot be on file, whatever the field's status
                    rd = {"readiness": "no_proof_on_file", "expiring_soon": False, "valid_until": None,
                          "rule": f"requirement {it['match_status']}"}
                rows.append({**{k: r.get(k) for k in ("req_id", "lot_id", "category", "text_summary_en", "text_summary_nb",
                                                       "mandatory", "proof_demanded", "proof_type", "source",
                                                       "extraction_confidence", "highlight", "highlighted",
                                                       "adviser_corrected")},
                             "template_key": keys[r["req_id"]], "cited": True,
                             "locker_field": it["locker_field"], "locker_snapshot": [snapshot(s) for s in snaps],
                             "match_status": it["match_status"], "match_confidence": it["match_confidence"],
                             "reason_en": it["reason_en"], "reason_nb": it["reason_nb"],
                             "confidence_reason_en": it["confidence_reason_en"],
                             "confidence_reason_nb": it["confidence_reason_nb"], **rd, "mock": True})
            ind = indication.indicate(rows)
            missing = [r["req_id"] for r in rows if r["readiness"] in readiness.MISSING_DOC_STATES]
            lot_res = next((x for x in sr["lot_results"] if x["lot_id"] == lot), None)
            lot_out.append({"lot_id": lot, "relevant": lot_res["relevant"] if lot_res else sr["route"] == "forwarded",
                            "fit_score": lot_res["fit_score"] if lot_res else sr["fit_score"],
                            "indication": ind["indication"], "indication_reasons": ind["reasons"],
                            "ignored_uncited": [r["req_id"] for r in lreqs if not r.get("source")],
                            "rows": rows, "missing_documents": missing})
        state = ("forwarded" if sr["route"] == "forwarded" else
                 "manually_added" if nid in manual_ids else "precomputed_not_shown")
        reports[nid] = {"notice_id": nid, "firm_id": profile["profile_id"], "route": sr["route"], "state": state,
                        "manual_addition": manual_ids.get(nid), "fit_score": sr["fit_score"],
                        "confidence": sr["confidence"], "lots": lot_out, "deadline": rec["derived"]["tender_deadline"],
                        "mock": True}
    return {"firm_id": profile["profile_id"], "reports": reports, "prompt_io": io}


def step_health(cfg: dict, profile: dict) -> list[dict]:
    ref = datetime.fromisoformat(cfg["reference_datetime"]).date()
    return healthcheck.run(profile, ref, cfg["health_check"]["expiring_within_days"])
