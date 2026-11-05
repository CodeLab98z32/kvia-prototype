"""Evaluate the required tests T1–T11 (SPEC §11) against a run.

On the Phase 1 mock run the results only show that the CODE PATHS behave as specified on mock content: status values
are "passed (mock)", "failed (mock)" or "not observed / Phase 2". They are NOT test evidence about real tenders and
must not be reported as such in the test log.
"""
from __future__ import annotations

TESTS = [
    ("T1", "typical", "P3 screening vs all released notices",
     "2026-116568 forwarded with top fit; confidence lowered for missing value; Kantinedrift not screened (award notice)"),
    ("T2", "typical", "P1 screening + report on 2026-116619",
     "forwarded; design scope → partly_met or not_met; tax certificate → expired/missing document; indication not Go; "
     "R02029 not screened"),
    ("T3", "edge", "P2 vs multi-lot framework 2026-116579",
     "Lot B relevant, Lot A not; NUTS and aggregate-value contradictions lower confidence instead of excluding; "
     "StartBANK expired; credit rating lacks_data"),
    ("T4", "edge", "P3 report: fleet-capacity requirement with no locker field", "lacks_data → borderline, never silently matched"),
    ("T5", "edge", "P3 ISO 14001 valid on deadline, expires 4 days later",
     "readiness documented (valid) + visible expiry flag in the checklist"),
    ("T6", "failure", "Competition notices with empty status (2026-116619, 2026-116544) and award notices with future dates",
     "activeness rule screens the former, excludes the latter"),
    ("T7", "failure", "Notice with missing or unreadable tender documents, or low extraction confidence",
     "flagged; visible in notice browser and adviser queue; no fit score and no report until released; after recorded "
     "release, screened normally"),
    ("T8", "key_assumption", "Retrieval + extraction find ALL mandatory requirements and proof demands with correct page "
     "references (manual gold list per anchor tender)", "recall ≥ 0.90; zero uncited requirements"),
    ("T9", "key_assumption", "LLM screening vs a rule-based CPV filter on the same notices and profiles",
     "evidence for or against the claim that rule-based filtering misses relevant notices"),
    ("T10", "recompute", "Change one Capability Locker field and run trigger script",
     "only that firm's comparison re-runs; extraction reused"),
    ("T11", "stability", "Pre-processing of the three anchor notices run 3 times", "agreement rate reported; unstable requirements flagged"),
]


def _row(reports, pid, nid, key, lot=None):
    rep = reports[pid]["reports"].get(nid)
    if not rep:
        return None
    for l in rep["lots"]:
        if lot is None or l["lot_id"] == lot:
            for r in l["rows"]:
                if r["template_key"] == key:
                    return r
    return None


def evaluate(store, act, pre, screening, reports) -> list[dict]:
    res = {}
    rank = {pid: {r["notice_id"]: r for r in s["ranked"]} for pid, s in screening.items()}

    def put(tid, ok, obs_en, obs_nb, evidence, status=None):
        res[tid] = {"status": status or ("passed (mock)" if ok else "failed (mock)"), "observed_en": obs_en,
                    "observed_nb": obs_nb, "evidence": evidence}

    # T1
    p3 = screening["P3"]["ranked"]
    top = p3[0]["notice_id"] if p3 else None
    r68 = rank["P3"].get("2026-116568")
    ok = (top == "2026-116568" and r68 and r68["route"] == "forwarded" and r68["confidence"] != "high"
          and "2026-116531" not in rank["P3"])
    put("T1", ok, f"Top of P3 list: {top} (fit {r68 and r68['fit_score']}, {r68 and r68['route']}, confidence "
                  f"{r68 and r68['confidence']}); Kantinedrift 2026-116531 screened: {'2026-116531' in rank['P3']}",
        f"Øverst på P3-listen: {top} (score {r68 and r68['fit_score']}, {r68 and r68['route']}, sikkerhet "
        f"{r68 and r68['confidence']}); Kantinedrift 2026-116531 screenet: {'2026-116531' in rank['P3']}",
        [{"page": "screening", "firm": "P3", "notice": "2026-116568"}])
    # T2
    r19 = rank["P1"].get("2026-116619")
    rep = reports["P1"]["reports"].get("2026-116619")
    design = _row(reports, "P1", "2026-116619", "approval_design")
    taxr = _row(reports, "P1", "2026-116619", "tax")
    ind = rep["lots"][0]["indication"] if rep else None
    ok = bool(r19 and r19["route"] == "forwarded" and design and design["match_status"] in ("partly_met", "not_met")
              and taxr and taxr["readiness"] == "expired" and ind != "go" and "2026-116578" not in rank["P1"])
    put("T2", ok, f"2026-116619 {r19 and r19['route']} (fit {r19 and r19['fit_score']}); design approval "
                  f"{design and design['match_status']}; tax certificate readiness {taxr and taxr['readiness']}; "
                  f"indication {ind}; R02029 screened: {'2026-116578' in rank['P1']}",
        f"2026-116619 {r19 and r19['route']} (score {r19 and r19['fit_score']}); prosjekteringsgodkjenning "
        f"{design and design['match_status']}; skatteattest {taxr and taxr['readiness']}; indikasjon {ind}; "
        f"R02029 screenet: {'2026-116578' in rank['P1']}",
        [{"page": "report", "firm": "P1", "notice": "2026-116619", "req": design and design["req_id"]}])
    # T3
    r79 = rank["P2"].get("2026-116579")
    lots = {l["lot_id"]: l for l in (r79 or {}).get("lot_results", [])}
    codes = {c["code"] for c in (r79 or {}).get("contradictions", [])}
    sb = _row(reports, "P2", "2026-116579", "startbank", "B")
    cr = _row(reports, "P2", "2026-116579", "credit", "B")
    ok = bool(r79 and lots.get("B", {}).get("relevant") and not lots.get("A", {}).get("relevant")
              and {"nuts_vs_buyer_location", "aggregate_vs_calloff_value"} <= codes and r79["confidence"] == "low"
              and sb and sb["readiness"] == "expired" and cr and cr["match_status"] == "lacks_data")
    put("T3", ok, f"Lot A fit {lots.get('A', {}).get('fit_score')} (relevant {lots.get('A', {}).get('relevant')}), "
                  f"Lot B fit {lots.get('B', {}).get('fit_score')} (relevant {lots.get('B', {}).get('relevant')}); "
                  f"contradictions {sorted(codes)}; confidence {r79 and r79['confidence']}; StartBANK readiness "
                  f"{sb and sb['readiness']}; credit rating {cr and cr['match_status']}",
        f"Delkontrakt A score {lots.get('A', {}).get('fit_score')}, delkontrakt B score {lots.get('B', {}).get('fit_score')}; "
        f"motstrid {sorted(codes)}; sikkerhet {r79 and r79['confidence']}; StartBANK {sb and sb['readiness']}; "
        f"kredittvurdering {cr and cr['match_status']}",
        [{"page": "screening", "firm": "P2", "notice": "2026-116579"},
         {"page": "report", "firm": "P2", "notice": "2026-116579", "lot": "B"}])
    # T4
    fl = _row(reports, "P3", "2026-116568", "fleet")
    rep3 = reports["P3"]["reports"].get("2026-116568")
    ind3 = rep3["lots"][0]["indication"] if rep3 else None
    ok = bool(fl and fl["match_status"] == "lacks_data" and fl["locker_field"] == "none" and ind3 in ("borderline", "no-go"))
    put("T4", ok, f"Fleet requirement {fl and fl['req_id']}: {fl and fl['match_status']} (locker field "
                  f"{fl and fl['locker_field']}); indication {ind3}",
        f"Krav om bilpark {fl and fl['req_id']}: {fl and fl['match_status']} (felt {fl and fl['locker_field']}); "
        f"indikasjon {ind3}", [{"page": "report", "firm": "P3", "notice": "2026-116568", "req": fl and fl["req_id"]}])
    # T5
    iso = _row(reports, "P3", "2026-116568", "iso14001")
    ok = bool(iso and iso["readiness"] == "documented" and iso["expiring_soon"])
    put("T5", ok, f"ISO 14001 readiness {iso and iso['readiness']}, valid until {iso and iso['valid_until']}, "
                  f"expiring-soon flag {iso and iso['expiring_soon']}",
        f"ISO 14001: {iso and iso['readiness']}, gyldig til {iso and iso['valid_until']}, utløper snart "
        f"{iso and iso['expiring_soon']}", [{"page": "report", "firm": "P3", "notice": "2026-116568", "req": iso and iso["req_id"]}])
    # T6
    empty_ok = all(act[n]["active"] for n in ("2026-116619", "2026-116544"))
    future_award = [r["doffin_id"] for r in store["records"] if r["original"]["notice_type"] != "ANNOUNCEMENT_OF_COMPETITION"
                    and r["derived"]["tender_deadline"] and r["derived"]["tender_deadline"] > "2026-11-04"]
    excl = all(not act[n]["active"] for n in future_award)
    screened = any(n in rank[p] for p in rank for n in future_award)
    ok = empty_ok and excl and not screened and all(n in rank["P1"] for n in ("2026-116619", "2026-116544"))
    put("T6", ok, f"Empty-status competition notices active and screened: {empty_ok}; award notices with future dates "
                  f"{future_award} excluded: {excl}",
        f"Konkurranser med tom status aktive og screenet: {empty_ok}; tildelinger med fremtidige datoer "
        f"{future_award} utelatt: {excl}", [{"page": "notices", "notice": "2026-116619"},
                                            {"page": "notices", "notice": future_award[0] if future_award else None}])
    # T7
    g = pre["gate"]
    pending = [n for n in g if g[n]["final_status"] == "flagged_pending"]
    released = [n for n in g if g[n]["final_status"] == "released_by_adviser"]
    leak = [n for n in pending if any(n in rank[p] for p in rank)]
    rel_ok = all(any(n in rank[p] for p in rank) for n in released)
    ok = bool(pending) and not leak and rel_ok
    real_flags = [n for n in g if not n.startswith("MOCK") and g[n]["gate_status"] == "flagged"]
    put("T7", ok, f"Flagged pending: {pending} (screened: {leak or 'none'}); released by adviser and screened: {released}. "
                  f"Gate logic shown on the MOCK run only; real flags in Phase 2 depend on the real documents.",
        f"Flagget og venter: {pending} (screenet: {leak or 'ingen'}); frigitt av rådgiver og screenet: {released}. "
        f"Portlogikken er bare vist på mock-kjøringen.", [{"page": "adviser"}],
        status="passed (mock, gate logic)" if ok else "failed (mock)")
    # T8
    misses = sum(len(r.get("retrieval_misses", [])) for r in pre["retrieval"].values())
    uncited_shown = sum(1 for p in reports for rep in reports[p]["reports"].values() for l in rep["lots"]
                        for r in l["rows"] if not r.get("source"))
    put("T8", True, f"Not observable on mock data (no gold list; mock requirements are placed by code). Code checks run: "
                    f"retrieval misses {misses}, uncited requirements shown {uncited_shown}.",
        f"Kan ikke observeres på mock-data (ingen gullstandard). Kodekontroller: gjenfinningsbom {misses}, krav uten "
        f"kilde vist {uncited_shown}.", [{"page": "prompts"}], status="not observed (Phase 2)")
    put("T9", True, "Not observable: Phase 1 screening is itself a mock CPV/NUTS overlap (team decision).",
        "Kan ikke observeres: screeningen i fase 1 er selv en mock basert på CPV/NUTS-overlapp.", [{"page": "logic"}],
        status="not observed (Phase 2)")
    put("T10", True, "Trigger script built (pipeline/trigger_sim.py) and covered by a fixture test; the recorded test run "
                     "is executed by the team.",
        "Utløserskriptet er bygget og dekket av en kodetest; den registrerte testkjøringen gjøres av teamet.",
        [{"page": "run"}], status="ready – team to run")
    put("T11", True, "Requires three real extraction runs (Phase 2).", "Krever tre reelle ekstraksjonskjøringer (fase 2).",
        [{"page": "run"}], status="not observed (Phase 2)")
    return [{"id": t, "type": ty, "scenario": sc, "expected": ex, **res[t]} for t, ty, sc, ex in TESTS]
