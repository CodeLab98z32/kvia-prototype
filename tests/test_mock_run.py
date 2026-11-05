"""End-to-end: the mock run covers every mode, keeps the invariants, and the trigger script recomputes selectively."""
import json
import shutil
import subprocess
import sys

import pytest
from conftest import ROOT

from kvia import manifest

RUN = "pytest-mock-run"   # separate run id: tests never overwrite the frozen run
OUT = ROOT / "outputs" / RUN


@pytest.fixture(scope="module")
def run():
    r = subprocess.run([sys.executable, str(ROOT / "pipeline" / "run_mock.py"), "--run-id", RUN], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    yield OUT
    shutil.rmtree(OUT, ignore_errors=True)


def load(p):
    return json.loads((OUT / p).read_text(encoding="utf-8"))


def test_every_mode_has_an_example(run):
    cov = load("mode_coverage.json")
    assert [m["mode"] for m in cov["modes"] if not m["examples"]] == []


def test_raw_export_unaltered_in_store(run):
    import csv
    rows = list(csv.DictReader(open(ROOT / "data/raw/doffin_notices_2026-10-26_25.csv", encoding="utf-8-sig"), delimiter=";"))
    store = {r["doffin_id"]: r for r in load("00_ingest/notice_store.json")["records"]}
    assert len(rows) == 25
    for r in rows:
        assert store[r["doffin_id"]]["original"] == r


def test_invariants(run):
    gate = load("1c_release_gate.json")["gate"]
    pending = {n for n, g in gate.items() if g["final_status"] == "flagged_pending"}
    act = load("0b_activeness.json")
    for pid in ("P1", "P2", "P3"):
        ranked = load(f"2_screening/{pid}.json")["ranked"]
        ids = {r["notice_id"] for r in ranked}
        assert not ids & pending, "flagged unreleased notice screened"
        assert all(act[n]["active"] for n in ids), "inactive notice screened"
        for rep in load(f"3_reports/{pid}.json")["reports"].values():
            for lot in rep["lots"]:
                for row in lot["rows"]:
                    assert row["source"] and row["source"]["cited_text"] and row["source"]["page_start"]
                    assert row["locker_field"]
                    assert row["mock"] is True


def test_manifest_verifies(run):
    assert manifest.verify(OUT) == []


def test_trigger_recomputes_only_that_firm(run):
    sys.path.insert(0, str(ROOT / "pipeline"))
    import trigger_sim
    rid = "pytest-trigger"
    try:
        log = trigger_sim.run(RUN, "capability_locker_edit", "P1", "tax_vat_certificate",
                              ["structured.issue_date=2026-11-01"], rid)
        assert "3_reports/P1.json" in log["files_changed_vs_base"]
        assert not [f for f in log["files_changed_vs_base"] if "P2" in f or "P3" in f or f.startswith(("1b_", "2_"))]
        rep = json.loads((ROOT / "outputs" / rid / "3_reports/P1.json").read_text())["reports"]["2026-116619"]
        tax = next(r for r in rep["lots"][0]["rows"] if r["template_key"] == "tax")
        assert tax["readiness"] == "documented"
    finally:
        shutil.rmtree(ROOT / "outputs" / rid, ignore_errors=True)
