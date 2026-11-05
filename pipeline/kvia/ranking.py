"""Step 2b — Ranking (code). SPEC §6.

fit = Σ(w_i × s_i) / Σ(w_i) over non-null sub-scores, rounded to an integer 0–100.
confidence starts at high and drops one level per missing data point with w >= 0.10 and per contradiction the model
reports; bands high | medium | low (floor low).
route: forwarded if fit >= threshold, otherwise below_threshold. Multi-lot: per-lot fit; the notice fit is the best
lot's fit; forwarded if any lot reaches the threshold.
ranked list: ALL screened notices for the firm, sorted by fit descending; nothing is hidden or dropped.
"""
from __future__ import annotations

BANDS = ["high", "medium", "low"]


def aggregate(sub_scores: dict[str, dict], weights: dict[str, float]) -> float | None:
    num = den = 0.0
    for k, w in weights.items():
        s = sub_scores.get(k)
        if s is None or s.get("value") is None:
            continue
        num += w * s["value"]
        den += w
    return (num / den) if den else None


def confidence(sub_scores: dict[str, dict], contradictions: list[dict], weights: dict[str, float],
               floor: float) -> tuple[str, list[dict]]:
    level = 0
    reasons = []
    for k, w in weights.items():
        s = sub_scores.get(k)
        if w >= floor and (s is None or s.get("value") is None):
            level += 1
            reasons.append({"code": f"missing:{k}", "en": f"Missing data point excluded from the score: {k}",
                            "nb": f"Manglende datapunkt holdt utenfor scoren: {k}"})
    for c in contradictions:
        level += 1
        reasons.append({"code": f"contradiction:{c['code']}", "en": c["description_en"], "nb": c["description_nb"]})
    return BANDS[min(level, len(BANDS) - 1)], reasons


def score_notice(screen: dict, weights: dict, threshold: int, floor: float) -> dict:
    subs = screen["sub_scores"]
    conf, conf_reasons = confidence(subs, screen.get("contradictions", []), weights, floor)
    lots_out = []
    if screen.get("lot_scores"):
        for ls in screen["lot_scores"]:
            merged = dict(subs)
            merged["subject_relevance"] = ls["subject_relevance"]
            merged["lots"] = ls["lots"]
            f = aggregate(merged, weights)
            fit = round(f) if f is not None else None
            lots_out.append({"lot_id": ls["lot_id"], "fit_score": fit,
                             "route": "forwarded" if fit is not None and fit >= threshold else "below_threshold",
                             "relevant": fit is not None and fit >= threshold,
                             "subject_relevance": ls["subject_relevance"], "lots": ls["lots"]})
        best = max(lots_out, key=lambda x: x["fit_score"] or -1)
        fit = best["fit_score"]
    else:
        f = aggregate(subs, weights)
        fit = round(f) if f is not None else None
    route = "forwarded" if fit is not None and fit >= threshold else "below_threshold"
    contributions = {k: (round(weights[k] * subs[k]["value"], 2) if subs.get(k) and subs[k].get("value") is not None
                         else None) for k in weights}
    return {"notice_id": screen["notice_id"], "fit_score": fit, "confidence": conf,
            "confidence_reasons": conf_reasons, "route": route, "lot_results": lots_out,
            "weighted_contributions": contributions,
            "weights_used": {k: w for k, w in weights.items() if subs.get(k) and subs[k].get("value") is not None}}


def ranked_list(results: list[dict]) -> list[dict]:
    order = sorted(results, key=lambda r: (-(r["fit_score"] if r["fit_score"] is not None else -1), r["notice_id"]))
    for i, r in enumerate(order, start=1):
        r["rank"] = i
    return order
