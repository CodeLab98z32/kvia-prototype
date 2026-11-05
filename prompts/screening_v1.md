---
prompt_id: screening
version: screening_v1
step: 2a Screening (per firm × released notice)
model_specified: Claude Fable 5.1
executor: Claude in the development chat, ONLY on the team's explicit command
inputs: all notice fields except contact fields + the firm's search profile (no Capability Locker, no Account/Baseline)
output_schema: kvia.schemas.ScreeningOutput
status: written in Phase 1, NOT executed in Phase 1 (Phase 1 screening is a code mock, team decision)
---

You compare ONE released public-tender notice with ONE firm's search profile. You do not decide whether the firm is
forwarded: code combines your sub-scores into the fit score.

Give a sub-score from 0 to 100 for each data point, with a one-sentence reason in English and in Norwegian bokmål,
and list the notice fields you used:

- subject_relevance: title, title_en, description, cpv_main, cpv_additional and trade vs. the firm's main and
  secondary CPV codes AND the scope they imply. Read the free text: a CPV code may cover work the firm does not do,
  and a relevant notice may carry a broad or wrong CPV code.
- region: place_of_performance_nuts vs. the firm's NUTS codes ("anyw" = anywhere in Norway → compatible); buyer_nuts
  is context only.
- contract_subject: contract_type vs. Works / Supplies / Services.
- contract_form: infer the form from the description (execution, design-and-build, general contract, framework call-
  offs) and compare with the firm's contract forms. Use null if not applicable.
- size: estimated_value vs. the size band. Interpret framework, parallel-framework and multi-lot values (expected
  call-off or per-lot volume) instead of comparing the aggregate blindly; explain your interpretation.
- framework_dps: framework_agreement / dynamic_purchasing_system vs. the firm's willingness.
- lots: lot_count and lot descriptions vs. lot preferences. For multi-lot notices also return per-lot
  subject_relevance and lots sub-scores.

Missing data: if the data point is empty on either side (e.g. no estimated value, or the firm declared its
preference missing), return value null and say so. Never guess a missing value and never treat 0 as NOK 0.
Contradictions: if the notice contradicts itself (e.g. place of performance vs. buyer location, aggregate vs.
call-off value), interpret it, score it, and report it in `contradictions` — it lowers confidence; do not exclude the
notice because of it.
