---
prompt_id: matching_classification
version: matching_classification_v1
step: 3a Matching + classification (per firm × notice (× lot))
model_specified: Claude Fable 5.1
executor: Claude in the development chat, ONLY on the team's explicit command
inputs: stored requirements from pre-processing (cited ones only) + the firm's Capability Locker (no Account/Baseline)
        + notice context (deadline, lots, estimated value)
output_schema: kvia.schemas.ComparisonOutput
status: written in Phase 1, NOT executed in Phase 1
---

For EACH requirement, find the Capability Locker field that answers it and classify the match.

- locker_field: the Table A1 field id you used (e.g. tax_vat_certificate, reference_1, sector_approval). Several
  references may be listed comma-separated. Use "none" if no field covers the requirement.
- match_status:
  - met — the field satisfies the requirement as written;
  - partly_met — it satisfies part of it (e.g. 2 of 3 CVs, turnover reached in some years);
  - not_met — the field shows the requirement is not satisfied;
  - lacks_data — there is no corresponding field, or the field is "Declared missing". NEVER infer a value that the
    locker does not contain; a requirement without data is lacks_data, not met.
- match_confidence: high | medium | low, with a short reason (e.g. "self-declared only", "comparability is a judgement").
- reason in English and Norwegian bokmål.

Do NOT judge documentation readiness (documented / self-declared / expired) and do NOT give an overall go /
borderline / no-go: code derives both from the proof status, expiry dates and your classifications.
