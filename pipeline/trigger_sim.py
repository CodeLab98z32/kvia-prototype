"""Trigger simulation: selective recompute after a change (SPEC §4 change_triggers, test T10).

Takes a frozen base run, applies ONE change event and writes a new, separately labelled run that recomputes only the
steps the trigger requires. Everything else is copied unchanged from the base run, and pre-processing output is reused
by key (notice_id, notice_version_hash, prompt_version, model). A recompute log lists what re-ran and what was reused.

Examples (run by the team; outputs are frozen as a separate labelled run):
  python3 pipeline/trigger_sim.py --base mock-2026-11-05 --event capability_locker_edit --firm P1 \
      --field tax_vat_certificate --set structured.issue_date=2026-11-01 --set proof_status=Documented
  python3 pipeline/trigger_sim.py --base mock-2026-11-05 --event search_profile_edit --firm P2 \
      --field size_band --set structured.max_nok=20000000
"""
from __future__ import annotations

import argparse
import copy
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kvia import chain, manifest  # noqa: E402
from kvia.mock.requirements import requirement_set  # noqa: E402
from kvia.util import ROOT, load_config, read_json, sha256_file, write_json  # noqa: E402

STEPS = {
    "capability_locker_edit": ["3a matching + classification", "3b readiness", "3c indication"],
    "search_profile_edit": ["2a screening", "2b ranking", "3a–3c report states for that firm"],
}


def _set(entry: dict, path: str, raw: str) -> None:
    try:
        val = json.loads(raw)
    except json.JSONDecodeError:
        val = raw
    keys = path.split(".")
    tgt = entry
    for k in keys[:-1]:
        tgt = tgt.setdefault(k, {})
    tgt[keys[-1]] = val


def load_pre(base: Path, cfg: dict) -> dict:
    gate_file = read_json(base / "1c_release_gate.json")
    pre = {"gate": gate_file["gate"], "effective": gate_file["effective_requirements"], "extraction": {},
           "retrieval": {}, "templates": {}}
    for p in sorted((base / "1b_extraction").glob("*.json")):
        e = read_json(p)
        pre["extraction"][e["notice_id"]] = e
        pre["templates"][e["notice_id"]] = {t["req_id"]: {"check": t["check"], "key": t["key"]}
                                            for t in requirement_set(e["notice_id"])}
    return pre


def run(base_id: str, event: str, firm: str, field_id: str, sets: list[str], run_id: str | None = None) -> dict:
    cfg = load_config()
    base = ROOT / "outputs" / base_id
    run_id = run_id or f"{base_id}-trigger-{event}-{firm}"
    out = ROOT / "outputs" / run_id
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(base, out)
    base_hashes = {e["path"]: e["sha256"] for e in read_json(base / "manifest.json")["files"]}

    profiles = chain.load_profiles(cfg)
    prof = copy.deepcopy(profiles[firm])
    section = "capability_locker" if event == "capability_locker_edit" else "search_profile"
    entry = next(e for e in prof[section] if e["id"] == field_id)
    before = copy.deepcopy(entry)
    for s in sets:
        k, v = s.split("=", 1)
        _set(entry, k, v)

    store = read_json(base / "00_ingest" / "notice_store.json")
    pre = load_pre(base, cfg)
    reuse = [{"notice_id": n, "key": [n, e["validated"]["notice_version_hash"] if e["validated"] else None,
                                      e["prompt_version"], e["model"]]} for n, e in pre["extraction"].items()]
    manual = read_json(ROOT / cfg["recorded_manual_additions"])["additions"]

    if event == "capability_locker_edit":
        screening = read_json(base / "2_screening" / f"{firm}.json")
    else:
        screening = chain.step_screen(cfg, store, pre, prof)
        write_json(out / "2_screening" / f"{firm}.json", screening)
    reports = chain.step_report(cfg, store, pre, screening, prof, manual)
    write_json(out / "3_reports" / f"{firm}.json", reports)
    write_json(out / "s3_health_check" / f"{firm}.json", chain.step_health(cfg, prof))
    write_json(out / "profile_override" / f"{firm}.json", prof)

    info = read_json(out / "run_info.json")
    info.update({"run_id": run_id, "created_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                 "label": f"TRIGGER SIMULATION ({event}) — derived from {base_id}", "base_run": base_id})
    write_json(out / "run_info.json", info)
    man = manifest.write(out, run_id)
    changed = sorted(e["path"] for e in man["files"] if base_hashes.get(e["path"]) != e["sha256"])
    log = {"run_id": run_id, "base_run": base_id, "event": event, "firm": firm, "field": field_id,
           "field_before": before, "field_after": entry, "steps_rerun": STEPS[event],
           "steps_reused": ["0 ingest", "0b activeness", "1a retrieval", "1b extraction", "1c release gate"]
           + (["2a screening", "2b ranking"] if event == "capability_locker_edit" else []),
           "extraction_reused_by_key": reuse, "other_firms_unchanged": sorted(set(profiles) - {firm}),
           "files_changed_vs_base": changed, "base_profile_sha256": sha256_file(ROOT / cfg["profiles_dir"] / f"{firm}.json")}
    write_json(out / "recompute_log.json", log)
    manifest.write(out, run_id)
    return log


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--event", choices=list(STEPS), required=True)
    ap.add_argument("--firm", required=True)
    ap.add_argument("--field", required=True)
    ap.add_argument("--set", action="append", default=[], help="path=value inside the field entry")
    ap.add_argument("--run-id")
    a = ap.parse_args()
    log = run(a.base, a.event, a.firm, a.field, a.set, a.run_id)
    print(json.dumps({k: log[k] for k in ("run_id", "steps_rerun", "other_firms_unchanged", "files_changed_vs_base")},
                     indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
