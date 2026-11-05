# Pipeline

Implements the mechanism chain of SPEC §3. Deterministic steps are Python code; the three AI steps are produced by
mock generators in Phase 1 and by Claude in a development chat in Phase 2 (only on the team's explicit command,
following `/prompts`, and only accepted if the JSON passes `kvia/schemas.py`).

| Step | Module | AI? |
|---|---|---|
| 0 Ingest (unaltered store + version hash; derived values kept separately) | `kvia/ingest.py` | no |
| 0b Activeness (`status` ignored) | `kvia/activeness.py` | no |
| 1a Retrieval (page chunks + BM25, top-k 40 + heading pages, logged page IDs) | `kvia/retrieval.py` | no |
| 1b Extraction (two-pass, citations) | Phase 1: `kvia/mock/extraction.py` · Phase 2: `prompts/extraction_v1.md` | yes |
| Citation check + highlight rectangles (pdfplumber, PDF coordinates) | `kvia/citations.py` | no |
| 1c Release gate + adviser decisions | `kvia/release_gate.py` | no |
| 2a Screening sub-scores | Phase 1: `kvia/mock/screening.py` · Phase 2: `prompts/screening_v1.md` | yes |
| 2b Ranking (weighted aggregation, confidence, threshold, one ranked list) | `kvia/ranking.py` | no |
| 3a Matching + classification | Phase 1: `kvia/mock/classification.py` · Phase 2: `prompts/matching_classification_v1.md` | yes |
| 3b Readiness / expiry flag | `kvia/readiness.py` | no |
| 3c Indication | `kvia/indication.py` | no |
| S3 profile health check | `kvia/healthcheck.py` | no |
| Manifest (SHA-256 of every output) | `kvia/manifest.py` | no |

Configuration (reference date, weights, threshold, windows, retrieval terms): `config.yaml`.
Assumptions are marked `ASSUMPTION` there and listed in each run's `run_info.json`.

## Commands

```bash
python3 pipeline/tools/build_profiles.py     # docs/Synthetic company profiles.docx -> data/profiles/P*.json
python3 pipeline/run_mock.py                 # Phase 1 mock run -> outputs/mock-2026-11-05 (+ mode_coverage.json)
python3 pipeline/tools/write_test_log.py     # outputs/{run}/tests.json -> test_log.md
python3 pipeline/trigger_sim.py --base mock-2026-11-05 --event capability_locker_edit --firm P1 \
    --field tax_vat_certificate --set structured.issue_date=2026-11-01     # T10: selective recompute
```

`run_mock.py` fails (exit 1) if any mode of SPEC §18 has no example. Mock-only notices (`MOCK-0001`…`MOCK-0004`)
live in `data/mock/mock_notices.json`, never in the export.

## Phase 2 (not started)

1. Team delivers the original PDFs into `data/raw/tender_docs/{doffin_id}/` (the pipeline prefers them over placeholders).
2. Pre-processing → adviser decisions → screening → reports are produced in the development chat with the prompts in
   `/prompts`, validated against `kvia/schemas.py`, and written to a new `outputs/{run_id}/` with manifest.
3. `config/website.json` is switched to the new run; the mock run stays in the repository, not displayed.
