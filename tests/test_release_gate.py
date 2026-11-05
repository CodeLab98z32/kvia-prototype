from kvia import release_gate


def ext(reqs=None, conflicts=None, rating="high", schema_ok=True, checks=None):
    reqs = reqs if reqs is not None else [{"req_id": "R01", "source": {"document": "d.pdf", "page_start": 1}}]
    return {"schema_ok": schema_ok, "schema_errors": [] if schema_ok else ["x: bad"],
            "validated": {"requirements": reqs, "conflicts": conflicts or [], "model_self_rating": rating} if schema_ok else None,
            "citation_checks": checks or [{"req_id": r["req_id"], "citation_ok": True} for r in reqs]}


def codes(g):
    return {r["code"] for r in g["reasons"]}


def test_clean_notice_released_automatically():
    g = release_gate.gate("N", "available", True, ext())
    assert g["gate_status"] == "released"


def test_placeholder_counts_as_available_in_phase_1():
    assert release_gate.gate("N", "available_mock", True, ext())["gate_status"] == "released"


def test_each_trigger_flags():
    assert codes(release_gate.gate("N", "missing", True, None)) == {"documents_missing"}
    assert codes(release_gate.gate("N", "unreadable", True, None)) == {"documents_unreadable"}
    assert codes(release_gate.gate("N", "available", False, ext())) == {"deadline_missing"}
    assert "uncited_requirement" in codes(release_gate.gate("N", "available", True, ext(reqs=[{"req_id": "R01", "source": None}])))
    assert "conflicting_values" in codes(release_gate.gate("N", "available", True, ext(
        conflicts=[{"description_en": "a", "description_nb": "b"}])))
    assert "schema_validation_failed" in codes(release_gate.gate("N", "available", True, ext(schema_ok=False)))
    assert "model_self_rating_low" in codes(release_gate.gate("N", "available", True, ext(rating="low")))


def test_failed_citation_check_flags():
    g = release_gate.gate("N", "available", True, ext(checks=[{"req_id": "R01", "citation_ok": False}]))
    assert "uncited_requirement" in codes(g)


def test_pending_flag_has_no_effective_requirements():
    g = release_gate.gate("N", "missing", True, None)
    final, reqs = release_gate.apply_adviser_decision(g, {"decision": "pending"}, [{"req_id": "R01"}])
    assert final["final_status"] == "flagged_pending" and reqs == []


def test_adviser_release_with_correction():
    g = release_gate.gate("N", "available", True, ext(conflicts=[{"description_en": "a", "description_nb": "b"}]))
    reqs = [{"req_id": "R01", "source": {"cited_text": "x"}}, {"req_id": "R02", "source": {"cited_text": "y"}}]
    final, eff = release_gate.apply_adviser_decision(g, {"decision": "released", "corrections": [
        {"op": "remove", "req_id": "R01"}, {"op": "replace_field", "req_id": "R02", "set": {"source.cited_text": "z"}}]}, reqs)
    assert final["final_status"] == "released_by_adviser" and final["corrections_applied"] == 2
    assert [r["req_id"] for r in eff] == ["R02"] and eff[0]["source"]["cited_text"] == "z" and eff[0]["adviser_corrected"]
    assert reqs[1]["source"]["cited_text"] == "y", "stored AI output must not be changed"
