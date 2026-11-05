from kvia import ranking

W = {"subject_relevance": 0.5, "region": 0.15, "contract_subject": 0.10, "size": 0.10, "contract_form": 0.05,
     "framework_dps": 0.05, "lots": 0.05}


def s(v):
    return {"value": v, "reason_en": "", "reason_nb": ""}


def full(**over):
    d = {k: s(80) for k in W}
    d.update({k: s(v) for k, v in over.items()})
    return d


def test_weighted_mean():
    subs = full(subject_relevance=100, region=0)
    assert abs(ranking.aggregate(subs, W) - (50 + 0 + 0.35 * 80)) < 1e-9


def test_missing_excluded_from_score_and_renormalised():
    subs = full(size=None)
    assert abs(ranking.aggregate(subs, W) - 80) < 1e-9
    conf, reasons = ranking.confidence(subs, [], W, 0.10)
    assert conf == "medium" and reasons[0]["code"] == "missing:size"


def test_missing_low_weight_does_not_lower_confidence():
    conf, _ = ranking.confidence(full(contract_form=None), [], W, 0.10)
    assert conf == "high"


def test_contradictions_lower_confidence_with_floor():
    c = [{"code": "a", "description_en": "", "description_nb": ""}] * 3
    assert ranking.confidence(full(), c, W, 0.10)[0] == "low"


def test_threshold_routing_inclusive():
    r = ranking.score_notice({"notice_id": "N", "sub_scores": full(subject_relevance=60, region=60, contract_subject=60,
                                                                  size=60, contract_form=60, framework_dps=60, lots=60)}, W, 60, 0.1)
    assert r["fit_score"] == 60 and r["route"] == "forwarded"


def test_multilot_forwarded_if_any_lot_reaches_threshold():
    screen = {"notice_id": "N", "sub_scores": full(subject_relevance=10),
              "lot_scores": [{"lot_id": "A", "subject_relevance": s(10), "lots": s(0)},
                             {"lot_id": "B", "subject_relevance": s(95), "lots": s(100)}]}
    r = ranking.score_notice(screen, W, 60, 0.1)
    assert r["route"] == "forwarded" and [l["relevant"] for l in r["lot_results"]] == [False, True]


def test_ranked_list_keeps_every_notice():
    res = [{"notice_id": f"N{i}", "fit_score": v} for i, v in enumerate([10, 90, 0, 55])]
    out = ranking.ranked_list(res)
    assert [r["fit_score"] for r in out] == [90, 55, 10, 0] and len(out) == 4 and out[-1]["rank"] == 4
