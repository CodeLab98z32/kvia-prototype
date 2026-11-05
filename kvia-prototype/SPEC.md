---
doc_type: prototype_build_spec
version: 0.11-draft
status: DRAFT — remaining OPEN_QUESTION markers must be resolved before build (§16, §17)
audience: an AI coding/build agent (and the student team that supervises it)
project: "AI for Business" group assignment (BI, Autumn 2026) — target quality: grade A
service: "Service 2 — Tender Matching (flagship)"
language_of_spec: en
authoritative_sources (project docs; if this spec and a source disagree, the source wins and the conflict is logged):
  - Final service portfolio.docx      # service definition (four parts), go/borderline/no-go rules
  - AI mechanism chain.docx           # pre-processing → screening → diagnostic report; capabilities; models; triggers
  - Data requirements.docx            # data sources, storage, quality rules incl. adviser-review flags, sensitivity
  - Company profile data.docx         # profile data model (Table A1)
  - Synthetic company profiles.docx   # three test firms (Tables B1–B3) + anchor notices
  - doffin_notices_2026-10-26_25.csv  # the ONLY notice dataset
  - AI for Business Group Assignment 2026 (PDF)  # prototype and test requirements; Appendix A = Prototype Test Log
hard_rule: Never use, cite or refer to any 2022 notice data. The 2026 export above is the only notice source.
changelog:
  - 0.1–0.3: scope, stack, replay design, dashboard inputs
  - 0.4: aligned with first project docs; 2026 export analysed; activeness rule; personal-data minimisation
  - 0.5: reference date 2026-11-04; soon-expiring proof valid + flagged; notice browser; success targets as assumptions
  - 0.6: extraction on arrival; manual "add to diagnostics"; incomplete notices flagged
  - 0.7: aligned with updated docs — three-step chain (pre-processing, screening, diagnostic report); flagged notices
         visible but EXCLUDED from screening and report until released; flag triggers reduced to missing/unreadable
         documents, missing deadline and low extraction confidence (missing CPV or contract type now only lowers
         confidence); Claude Fable 5.1 for all three AI steps; all notices below threshold are near misses (no hidden
         tier); platform = static GitHub Pages site replaying one frozen AI run; frozen-run and stability rules (§10.3)
  - 0.8: AI run executed in a Claude chat session on the team's command (no API); website only displays frozen runs;
         private, non-public prototype → hosting visibility question reframed (Q11); flagged-notice failure mode to be
         tested without editing data; phased build — Phase 1 with real notices and profiles, mock AI outputs and
         placeholder tender documents (§18)
  - 0.9: one ranked list of all screened notices (near misses = top of the below-threshold part); every defined mode
         shown in the mock run; nothing removed from the notice data; original PDFs included with highlighted,
         linked passages; website "Anbudskompass": page structure (service pages vs visibly separate prototype pages),
         light/dark mode, brand and visual direction (§8)
  - 0.10: website shown from one company's perspective with a "Viewing as" switch for the grader; "Anbudskompass"
          rejected, three new name options (Q15)
  - 0.11: brand decided — name "Kvia", mark = ranked bars with spark (variant H), blue to blue-purple palette
---

# Build spec: Tender Matching prototype (flagship service only)

## 0. How to read this document

- You (the build agent) build a **demonstrable prototype** of the flagship's central AI mechanism as a static website. It is not a product.
- `MUST` = required. `SHOULD` = desirable. `OUT_OF_SCOPE` = must not be built.
- `PROVIDED_BY_TEAM:` = an input the team hands over. Do not create a substitute; stop and ask if it is missing.
- `ASSUMPTION:` = design choice without evidence; it must stay visible in outputs and run info, because the report has to separate evidence from assumptions.
- `OPEN_QUESTION:` = unresolved. If forced to proceed, use the stated `default` and log that you did.
- Never invent facts about real tenders or buyers. All firm data is synthetic.

## 1. Context (orientation only — do not build)

```yaml
centre: Government-supported AI Adoption and Innovation Centre (Norway)
client_segment: {employees: [5, 50], bidding_history: none_or_limited, trade_focus: none, user: named bid coordinator}
problem: >
  Small firms rarely bid on public tenders because finding relevant notices, reading requirements
  scattered across long legal Norwegian documents and checking whether they qualify takes too much effort.
portfolio:
  - {id: S1, name: Profile Set-up,     ai: none, prototype: OUT_OF_SCOPE — profiles are provided as data}
  - {id: S2, name: Tender Matching,    ai: yes,  prototype: BUILD (this spec)}
  - {id: S3, name: Support & Learning, ai: "none (rule-based and human-led)",
     prototype: OUT_OF_SCOPE except read-only adviser queue, firm-flag examples and rule-based expiry flags}
```

## 2. What the flagship does

The firm's profile has two parts: the **search profile** (what it looks for → drives screening) and the **Capability Locker** (what it can offer and prove → drives the diagnostic report). The chain has three steps that differ in what they process and how their cost scales.

```yaml
ingest (no AI):
  - Store each Doffin notice unaltered in its original field structure, with its tender documents alongside.
  - AI-derived data are stored separately, linked by notice ID and notice version, reused for every firm, and never
    overwrite the original record.
step_1_pre_processing (once per competition notice, on arrival; cost scales with number of notices):
  ai_capabilities: [retrieval, extraction]
  - Retrieval locates the relevant passages in the tender documents (grounding; Lewis et al., 2020).
  - Extraction (Claude Fable 5.1) lists every mandatory requirement and proof demand, each with a source reference.
  - Release gate: notices with low extraction confidence or missing data (§9) are flagged for adviser review.
    A flagged notice still appears in the dashboard, marked as flagged, but is EXCLUDED from screening and the
    diagnostic report until an adviser releases it. All other notices are released automatically.
step_2_screening (per firm, all released notices; cost scales with notices × firms, but is light):
  ai_capabilities: [matching, ranking]
  - Claude Fable 5.1 matches every available data point of a released notice, incl. free-text title and description,
    with the corresponding search-profile entry and gives a sub-score per data point.
  - Ranking combines the sub-scores into a fit score 0–100, weighted toward subject relevance.
  - Missing data are excluded from the score and lower a separate confidence indicator.
    Contradictory data are interpreted by the model and also lower confidence.
  - Every screened notice appears in ONE ranked list per firm, sorted by fit score (highest first). No screened notice
    is ever left out of this list.
  - Notices at or above the fit threshold are marked "forwarded" and get a diagnostic report automatically.
  - Notices below the threshold stay in the same list, below the threshold line. The highest-scoring of them (the
    near misses) therefore appear directly under it. The bid coordinator can add ANY below-threshold notice manually.
  - No rule-based CPV/keyword pre-filter: fields are not always filled in, correct or decisive for relevance.
step_3_diagnostic_report (per firm, forwarded or manually added notices):
  ai_capabilities: [matching, classification]
  - Uses the stored requirements from pre-processing; the document analysis is never repeated per firm.
  - Matching (Claude Fable 5.1) links each requirement to the corresponding Capability Locker entry; notice data
    (deadline, lots, estimated value) give context.
  - Classification rates each requirement met / partly met / not met / lacks data, each with a confidence.
  - Fixed rules (§7) derive go / borderline / no-go.
human_control:
  - An adviser reviews every flagged notice and releases it once the extraction has been checked or corrected.
  - Firms can flag any AI result with a short description (clarification desk, S3).
  - The bid coordinator decides whether to bid. Nothing is submitted automatically.
```

Invariants (MUST hold everywhere):

```yaml
invariants:
  - Every requirement shown carries a source reference (document + page) and cited text.
  - Every comparison shows which Capability Locker field it used, with that field's proof status and expiry.
  - The firm can open the underlying data of every result: notice fields used, sub-scores, extracted requirements,
    references, profile fields.
  - A requirement without a source reference never influences the indication.
  - A flagged, unreleased notice has no fit score and no report for any firm.
  - Only active, released notices are screened.
  - The indication is computed by code from classifications, never by the LLM.
  - The website never calls an AI model; it only reads the frozen results.
```

## 3. Mechanism chain (matches Figure 2 in AI mechanism chain.docx)

| Step | Inputs | AI task | Model / tool | Output | Human decision | Feedback |
|---|---|---|---|---|---|---|
| 0 Ingest | Doffin export, tender documents | none | code | Immutable notice store with version hash | — | — |
| 0b Activeness | Notice store, reference date | none | code | Active competition notices | — | — |
| 1a Retrieval | Tender documents | Retrieval | code (page chunks + BM25) | Candidate passages per notice | — | Recall test T8 |
| 1b Extraction | Passages + notice data | Extraction with citations | Claude Fable 5.1 | Requirement list per notice version; extraction confidence | — | Corrections logged |
| 1c Release gate | Extraction confidence, completeness checks | none | code (§9) | released / flagged | Adviser reviews flagged notices and releases them | Review decisions logged |
| 2a Screening | Released notices (all fields) + search profile | Matching (sub-scores per data point) | Claude Fable 5.1 | Sub-scores, reasons, data-quality notes | — | Picks and manual additions logged |
| 2b Ranking | Sub-scores | Ranking | code (weighted aggregation, §6) | One ranked list of all screened notices per firm; fit score 0–100, confidence, forwarded / below threshold | Above threshold proceeds automatically; coordinator may add any below-threshold notice | Manual additions logged as missed matches |
| 3a Matching + classification | Stored requirements + Capability Locker (+ notice data) | Matching, classification | Claude Fable 5.1 | Per requirement: locker field, match status, confidence | Firm may flag | Flags logged |
| 3b Readiness | Locker proof status/expiry + tender deadline | none | code | Documentation readiness, missing documents | — | Expiry flags |
| 3c Indication | Classifications + readiness | none | code (§7) | go / borderline / no-go + reasons | Coordinator decides whether to bid | Bid outcome logged |

## 4. Processing model (one frozen run, replayed)

```yaml
principle: The AI runs once on the provided data. Results are frozen and replayed by the website.
change_triggers (production logic from AI mechanism chain.docx; demonstrated in the prototype by the trigger script only):
  new_notice:             pre-processing (1a–1c) on arrival; if released → screening (2a–2b) for all firms;
                          report (3a–3c) for every firm where it is forwarded
  notice_amendment:       re-extract (1a–1c) the new version; update affected reports (3a–3c); re-screen (2a–2b)
  search_profile_edit:    re-run screening (2a–2b) for that firm
  capability_locker_edit: re-run comparison (3a–3c) for that firm
  adviser_release:        run 2a–2b and 3a–3c for the released notice
  manual_addition:        run 3a–3c for that firm (requirements already stored)
  date_based (code only): deadline passed → notice inactive; proof expiry evaluated against each tender deadline
reuse: extraction output is keyed by (notice_id, notice_version_hash, prompt_version, model) and shared by all firms
frozen_run_for_prototype:
  - Pre-processing runs for all 12 active competition notices.
  - Adviser decisions (/data/adviser_decisions.json) are applied after the release gate and before screening.
  - Screening runs for every firm × released notice.
  - Comparison (3a–3c) is precomputed for every firm × released notice (and lot) pair, so that a manual addition can be
    replayed. The website shows a report only when the notice is forwarded for that firm or manually added.
  - A trigger-simulation script SHOULD demonstrate selective recompute (e.g. change one locker field) — run by the
    team, recorded as a test, and its outputs frozen as a separate, labelled run.
```

## 5. Data inputs

### 5.1 Notices — `doffin_notices_2026-10-26_25.csv` (provided, analysed)

```yaml
format: {encoding: utf-8-sig, separator: ";", rows: 25, columns: 40}
multi_value_fields: [cpv_additional, place_of_performance_nuts, buyer_name]   # separated by " | "
columns:
  identity: [doffin_id, doffin_url, case_number, eforms_notice_form, eforms_notice_subtype, notice_type, status]
  dates: [issue_date, publication_date, tender_deadline_utc, contract_signed_date]
  buyer: [buyer_name, buyer_org_nr, buyer_type, buyer_activity, buyer_city, buyer_postal_code, buyer_nuts]
  contact: [contact_name, contact_email, contact_phone]   # kept unaltered (unaltered_rule)
  content: [title, title_en, description, trade, cpv_main, cpv_additional, place_of_performance_nuts]
  terms: [contract_type, procedure, legislation, framework_agreement, dynamic_purchasing_system, lot_count,
          currency, estimated_value]
  award: [awarded_value, received_tenders, winner_name, winner_org_nr]
composition:
  notice_type: {ANNOUNCEMENT_OF_COMPETITION: 12, ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT: 7, ADVISORY_NOTICE: 4, ANNOUNCEMENT_OF_INTENT: 2}
  multi_lot_competition_notices: 2026-115833 (3 lots), 2026-116566 (3 lots), 2026-116579 (2 lots); lot details only in description
  among_12_competition_notices:
    missing: {tender_deadline_utc: 0, cpv_main: 0, contract_type: 0, description: 0, estimated_value: 3, title_en: 2}
activeness_rule (MUST):
  active: notice_type == ANNOUNCEMENT_OF_COMPETITION AND tender_deadline_utc > reference_datetime
  missing_deadline: a competition notice without tender_deadline_utc is NOT treated as inactive; it is flagged for
                    adviser review (§9). None of the 12 competition notices lacks a deadline.
  do_not_use_status_field: >
    `status` is empty for 2 of 12 competition notices, including Profile 1's anchor (2026-116619) and
    2026-116544. Award notices carry later dates (2028/2029) in tender_deadline_utc, so the deadline alone is not enough either.
  result_at_reference_date: 12 active competition notices
reference_date: 2026-11-04 (fixed for the prototype; stored in config; shown in the website header)
special_values:
  place_of_performance_nuts == "anyw": performance anywhere in Norway → compatible with every region, noted in reasons
  estimated_value empty or 0: unknown → excluded from score, lowers confidence; never treated as NOK 0
  cpv_main or contract_type empty: excluded from score, lowers confidence (not a flag trigger)
  legislation: normalise URL "lovdata.no/eli/forskrift/2016/8/12/974" and the misspelling "Anskaffelseforskriften" to "Anskaffelsesforskriften"
limitation: the export holds notice metadata and descriptions only — NO tender documents (see 5.2)
unaltered_rule (team decision): nothing is removed from the notice data. All 40 fields, including contact_name,
                contact_email and contact_phone, are stored and displayed unaltered, as on doffin.no.
prompt_scope: prompts include the fields a task needs; contact fields are not needed for any AI task and are therefore
              not part of the prompt inputs (B2 shows exactly what each prompt received)
```

### 5.2 Tender documents — PROVIDED_BY_TEAM (confirmed; must be present before build, see §17)

```yaml
need: konkurransegrunnlag, kravspesifikasjon and annexes, as text-layer PDFs, for ALL 12 active competition notices
      (every competition notice is pre-processed on arrival); the three anchors (2026-116619, 2026-116579, 2026-116568)
      are the minimum for the tests; stored at /data/raw/tender_docs/{doffin_id}/
why: requirements and proof demands are in these documents, not in the export; descriptions refer to them
     ("se konkurransegrunnlaget", "Bilag 1 Vedlegg 1A/1B")
missing_or_unreadable: flag trigger (§9) — documents absent, no text layer, or unreadable pages
display_rule (team decision): the original PDFs are part of the prototype and shown in an embedded viewer; every
              extracted requirement's cited passage is highlighted in the original and linked both ways
              (checklist row ↔ highlight); also shown: document name, page and a link to the notice on doffin.no
phase_1: placeholders only (§18)
```

### 5.3 Company profiles — Synthetic company profiles.docx (provided)

Data model = Table A1 (Company profile data.docx). Every data point MUST carry: value, proof status, last updated, expiry (where relevant). Every field is mandatory; a value the firm does not provide is declared missing.

```yaml
proof_status_values: [Documented, Self-declared, Not applicable, Declared missing, "Documented (n of m)"]
llm_input_rule: send search profile and Capability Locker only; exclude the Account and Baseline sections
                (bid coordinator contact, bidding history, baseline) — not needed for the task
profiles:
  P1:
    firm: synthetic carpentry/renovation firm, 14 employees, Telemark/Vestfold
    search: {main_cpv: 45453000, secondary: [45000000, 45210000, 45262700, 45421000], nuts: [NO094, NO093],
             subject: Works, band_nok: [0.3e6, 8e6], framework: yes, dps: no, lots: "max 2; prefers <= NOK 4m"}
    anchor: 2026-116619 Vaskeri Frednes – ombygging (Porsgrunn; Works; CPV 45000000; NOK 6m; deadline 2026-11-20)
    should_not_surface: 2026-116578 R02029 byggevarer (award notice, Supplies)
    built_in_gaps: [notice includes design (prosjektering) not covered by the firm's DiBK approval and no designer CV;
                    tax certificate issued 2026-03-10 (older than six months); insurance expires 2026-12-31;
                    profit 2021–2024 declared missing]
  P2:
    firm: synthetic water/sewer/road engineering consultancy, 9 employees, Rogaland
    search: {main_cpv: 71322000, secondary: [71300000, 71311000, 71311300, 71320000], nuts: [NO0A1],
             subject: Services, band_nok: [0.2e6, 5e6] per contract or expected call-off, framework: yes incl. parallel, dps: yes,
             lots: "only water, sewer or road; max 2"}
    anchor: 2026-116579 Rammeavtale rådgivende konsulenttjenester (Haugesund; 2 lots; CPV 71310000; NOK 60m; deadline 2026-11-27)
    lot_expectation: Lot B (vei, vann og avløp) fits; Lot A (mobilitet, transport, regulering) does not
    built_in_gaps: [place of performance NO0A2 although buyer is NO0A1; aggregate value above band (framework, parallel);
                    StartBANK expired 2026-09-30; HMS only self-declared; credit rating declared missing]
  P3:
    firm: synthetic septic/sewer/sludge services firm, 22 employees, Agder/Telemark
    search: {main_cpv: 90460000, secondary: [90470000, 90513600, 90513700, 90640000], nuts: [NO092, NO094],
             subject: Services, band_nok: [1e6, 25e6] incl. options, framework: yes, dps: declared missing, lots: "all within Agder"}
    anchor: 2026-116568 Slamtømming Agder Renovasjon (CPV 90460000; NO092; no estimated value; deadline 2026-11-26)
    should_not_surface: 2026-116531 Kantinedrift (award notice, NO073)
    built_in_gaps: [estimated value missing; ISO 14001 expires 2026-11-30, four days after deadline; no CVs;
                    DPS preference declared missing; Table A1 has no field for fleet/equipment capacity although the
                    contract (≈2,100–2,300 units/year) is likely to demand it → must come out as "lacks data"]
note: >
  All three profiles are built to move the indication away from Go. The build agent MUST NOT create a passing
  profile itself; the team may add one (P4) that reaches Go on the provided data (see §17).
```

## 6. Screening specification (released notices only)

```yaml
sub_scores (0–100 each, or null when the data point is missing on either side):
  subject_relevance: title, title_en, description, cpv_main, cpv_additional, trade vs main/secondary CPV and implied scope
  region:            place_of_performance_nuts (and buyer_nuts as context) vs firm NUTS
  contract_subject:  contract_type vs Works/Supplies/Services
  contract_form:     inferred from description (e.g. design-and-build, execution) vs firm contract form
  size:              estimated_value vs size band (framework and multi-lot values interpreted, not compared blindly)
  framework_dps:     framework_agreement / dynamic_purchasing_system vs firm willingness
  lots:              lot_count + lot descriptions vs lot preferences; per-lot sub-scores where lots exist
weights (ASSUMPTION accepted by team as starting values; calibrate in tests):
  {subject_relevance: 0.50, region: 0.15, contract_subject: 0.10, size: 0.10, contract_form: 0.05, framework_dps: 0.05, lots: 0.05}
aggregation (code): fit = Σ(w_i × s_i) / Σ(w_i) over non-null sub-scores
confidence (code + model notes):
  starts at high; lower one level per missing data point with w >= 0.10, or per contradiction the model reports
  (e.g. NUTS vs buyer location, aggregate vs call-off value); bands: high | medium | low
threshold (ASSUMPTION accepted by team as starting value): forwarded if fit >= 60, otherwise below_threshold
ranked_list (MUST): per firm, one list of ALL screened notices sorted by fit descending; the threshold is drawn as a line
                    inside the list; no notice is hidden or dropped because of a low score
near_miss: informal name for the highest-scoring below-threshold notices; NOT a separate category, tab or cut-off
multi_lot: a notice is forwarded if any lot reaches the threshold; non-matching lots are shown as not relevant
output_per_firm_notice: {fit_score, rank, sub_scores{value, reason_en, reason_nb}, confidence, confidence_reasons, lot_scores, route: forwarded|below_threshold}
```

## 7. Diagnostic report specification

```yaml
retrieval (pre-processing):
  - split each tender document into page chunks (keep document name + page number)
  - BM25 retrieval per requirement category using Norwegian and English query terms
    (e.g. kvalifikasjonskrav, dokumentasjonskrav, skal, minimum, krav til, attest, sertifikat, referanser, økonomisk)
  - pass top-k pages (default k = 40) plus every page whose heading matches a requirements section
  - log retrieved page IDs; a requirement later found outside them counts as a retrieval miss (T8)
extraction (pre-processing; Claude Fable 5.1, citations enabled):
  per requirement: {req_id, lot_id, category, text_summary_en, text_summary_nb, mandatory: true|false,
                    proof_demanded: true|false, proof_type, source{document, page_start, page_end, cited_text},
                    extraction_confidence: high|medium|low}
  categories: [qualification, technical, financial, certification, hms, reference, capacity, formal]
  highlight (code): after the citation check, locate cited_text on its page with pdfplumber and store
                    {page, rects: [[x0, y0, x1, y1], …]} in PDF coordinates; the viewer draws these as overlays.
                    If the text cannot be located, the requirement keeps its page reference and is marked
                    "passage not highlighted" (counts against source_reference_accuracy)
  two_pass: citations cannot be combined with structured outputs in one request →
            pass 1 extract with citations; pass 2 convert to the JSON schema with structured outputs; code copies citations across
matching_and_classification (Claude Fable 5.1, per firm × requirement):
  locker_field: the Table A1 data point used, or "none" if no field exists
  match_status: met | partly_met | not_met | lacks_data
    lacks_data when: no corresponding locker field, or field is "Declared missing"
  match_confidence: high | medium | low (with reason)
documentation_readiness (code; only where proof_demanded):
  documented: locker proof status Documented AND valid on the tender deadline
  self_declared_proof_needed: proof status Self-declared (or Documented for only part, e.g. "2 of 3")
  expired: expiry date before the tender deadline
  rule_tax_certificate: valid if issued no more than six months before the tender deadline, unless the tender states another limit (ASSUMPTION)
  expiring_soon_flag: proof valid on the deadline but expiring within 30 days after it (e.g. P3 ISO 14001, 2026-11-30)
                      → readiness stays "documented" (counts as valid for the indication) AND the checklist row carries a
                      visible flag "expires shortly after the deadline" (30-day window = ASSUMPTION)
missing_documents: every requirement with readiness self_declared_proof_needed or expired
indication (code, exact wording from Final service portfolio.docx):
  no-go:      at least one mandatory requirement is not_met
  borderline: no requirement is not_met, but at least one is partly_met, lacks_data, has low match confidence,
              or demanded proof is not documented and valid on the tender deadline
  go:         all requirements met with high confidence, and all demanded proof documented and valid on the tender deadline
multi_lot: one report per relevant lot
```

## 8. Website — "Kvia" (structure, interaction, design)

### 8.1 Brand (decided 2026-11-05)

```yaml
name: Kvia                    # wordmark set in lowercase: "kvia"
name_check: a web search (2026-11-05) found no software product named exactly "Kvia"; similar names exist (e.g. Kavia AI, Kiva)
tagline_en: "Tender matching for SMEs"
tagline_nb: "Anbudsmatching for SMB-er"   # SMB = små og mellomstore bedrifter
mark: variant H of the "Ranked" concept — gradient tile with three rounded bars of decreasing length (the ranked
      screening list) and a four-point spark at the end of the top bar (the best match)
files (brand/): kvia_mark.svg (icon / favicon), kvia_logo_light.svg, kvia_logo_dark.svg, kvia_logo_sheet.png (preview)
palette (team: blue to blue-purple): brand gradient #6D3BEF → #4F46E5 → #2F7BF6 (bottom-left to top-right);
         UI accent #4F46E5; text #0B1020 (light) / #F8FAFC (dark); muted #64748B / #94A3B8
wordmark: Inter ExtraBold (800), letter-spacing −3 % ; tagline Inter Medium, sentence case (keeps "SMEs" readable)
usage: header = 36 px mark + "kvia" wordmark; favicon = mark at 16/32 px; the mark keeps its gradient tile in both themes
attribution_line (footer): "Kvia — prototype for the AI Adoption and Innovation Centre. Synthetic company data,
                            real Doffin notices (snapshot 2026-10-26)."
```

### 8.2 Information architecture (separate pages, MUST)

Two clearly separated navigation groups. Group A is the service as a firm would use it. Group B exists only for the prototype and MUST look visibly different (own colour band, "Prototype" label, separator in the navigation).

```yaml
perspective (MUST): the service pages are seen through ONE company's account at a time — the selected synthetic
             profile. Header, screening, reports and company page all show that firm's view (firm name, initials avatar,
             bid coordinator as stated in the profile). Nothing from another firm is visible at the same time.
profile_switch_for_grader (MUST): a "Viewing as" control lets the professor switch between all provided synthetic
             profiles (P1 | P2 | P3 | any later profile) on every page. It sits in a prototype strip at the top, styled
             like group B, so it reads as a demo control and not as a product feature. Switching keeps the current page
             (e.g. the same notice) and reloads it from the new firm's perspective; the choice is part of the URL.
             New profiles are added as data files only — no code change.
global_header (every page): logo + name; firm identity of the selected profile; language switcher
                            (English default | Norsk bokmål); light/dark mode switcher (follows system on first visit);
                            reference-date badge "Today: 2026-11-04"; run badge (run ID, MOCK if mock run)
group_A_service:
  A1 Overview (landing page):
     - what the service is, for whom, what it provides (screening, diagnostic report, human review)
     - "How it works": illustrated three-step chain (pre-processing → screening → diagnostic report) with the human
       decisions; links into A2–A4
     - key figures of the current run for the selected firm (notices screened, forwarded, reports, missing documents)
  A2 Notices (Doffin-like search):
     - ALL 25 notices in the dataset, with a status filter: active competition | closed (deadline passed) |
       award | advisory | intent | flagged for adviser review
     - rule-based filters: free text (title, title_en, description, buyer), CPV (main/additional, by division), trade,
       contract type, region (NUTS), deadline range, estimated value range incl. "unknown", framework, DPS, lots
     - notice detail page: every original field, unaltered; tender documents with an embedded PDF viewer;
       for the selected firm: fit score and route if screened, and the button "Create diagnostic report"
       (= manual addition) when the notice is active, released and below the threshold
  A3 Screening:
     - one ranked list of ALL screened notices for the selected firm (§6), threshold line inside the list
     - each row: rank, title, buyer, fit score bar, confidence chip, deadline countdown, lot badge, route, indication
     - row expands to sub-scores with reasons; "Create diagnostic report" on below-threshold rows
  A4 Diagnostic reports:
     - list of the selected firm's reports (forwarded, manually added, awaiting adviser review) with indication chips
     - report page: indication banner with reasons; requirement checklist (one row per requirement: requirement,
       match status + confidence, documentation readiness, expiry flag, locker field used); missing-documents list;
       side-by-side source panel: clicking a row opens the original PDF at the cited page with the passage highlighted;
       "show underlying data"; "Flag for review" shown as a disabled example (clarification desk); disclaimer
       "Indication only. The firm decides whether to bid. Nothing is submitted."
     - lot tabs for multi-lot notices
  A5 Company profile (read-only):
     - search profile and Capability Locker of the selected firm; proof status, last updated and expiry per field;
       health-check flags (expired, expiring, declared missing)
group_B_prototype (visually distinct):
  B1 Internal logic: the mechanism chain step by step with the deterministic rules (activeness, release gate, weights,
     threshold, confidence bands, readiness, indication) and which steps are AI vs code; ASSUMPTION labels
  B2 Prompts & I/O: per AI task (extraction, screening, matching + classification): prompt text and version, the exact
     input given, the raw output, the validated output, schema-check and citation-check results; selectable by
     notice / firm / requirement
  B3 Adviser view (simulated): release-gate queue with flag reasons, recorded decisions (pending / released, with
     correction), and their effect on screening and reports
  B4 Test cases: summary table of T1–T11 with status (passed / failed / not observed) and links to the evidence
     in A2–A4 and B2; mode-coverage matrix of the mock run (§18)
  B5 Test log: the assignment's Appendix A format (# | case type | scenario | expected | observed | learning/revision),
     exportable as CSV and printable
  B6 Data & run: data sources, snapshot and reference dates, run ID, model identifier, manifest with checksums,
     known limitations
```

### 8.3 Interaction ("as if live")

```yaml
behaviour: every list item, chip, score and requirement is clickable and leads to its detail; navigation between
           A2 ↔ A3 ↔ A4 keeps the selected firm and filters; deep links (URL parameters) for every notice, report and
           requirement so the grader can be sent to an exact state
manual_addition: "Create diagnostic report" reveals the precomputed report with a short processing animation and the
                 label "manually added"; kept per viewer in browser storage (try/catch) with "reset demo" in B6
no_ai_calls: all results come from the frozen run; nothing the viewer does starts an AI run
inputs_allowed: profile, language and theme switchers; search and filters; navigation; "Create diagnostic report"
not_allowed: profile edits, uploads, pasting notices, adviser actions, triggering AI
```

### 8.4 Visual design

```yaml
direction: modern and structured, but not minimalistic — clear cards, colour-coded status chips, icons, small charts
           (fit-score bars, sub-score radar or bars, indication distribution), illustrated "how it works" section
layout: left sidebar navigation with the two groups (collapses to a top menu on mobile); content max width ~1280 px;
        responsive down to phone width
theme: light and dark mode via CSS variables; both themes checked for contrast (WCAG AA)
colour_semantics (same in both themes): go = green, borderline = amber, no-go = red, flagged / awaiting review =
           violet, mock = striped grey banner; group B pages use a distinct accent band and "Prototype" badge
typography: one sans-serif UI typeface (e.g. Inter), tabular numbers for scores
pdf_viewer: PDF.js (pdfjs-dist); highlights drawn as overlays from stored coordinates (§7 highlight)
accessibility: keyboard navigation, focus states, chip text never relies on colour alone
visual_requirements_doc: optional; if the team sends one, it overrides §8.4
```

## 9. Release gate, human review and error handling

```yaml
flag_triggers (pre-processing; any one flags the notice):
  from Data requirements.docx:
    - tender documents missing or unreadable (absent, no text layer, unreadable pages)
    - tender_deadline_utc missing
  from AI mechanism chain.docx (low extraction confidence), operationalised as:
    - a requirement without a citation
    - conflicting values across documents
    - pass-2 schema validation fails
    - model self-rating low
not_flag_triggers: missing cpv_main, contract_type, estimated_value or any other structured field → excluded from the
                   fit score and lowers its confidence (§6)
effect_of_flag:
  - notice appears in the notice browser and the adviser queue with a "flagged for adviser review" badge
  - no screening and no diagnostic report for any firm until an adviser releases it
  - on release: screening (2a–2b) and, where forwarded, reports (3a–3c) are produced
adviser_decisions_in_prototype: recorded by the team in /data/adviser_decisions.json
flag_failure_mode (team decision): a required test (T7); demonstrated only by what the real tender documents and
                                   extraction produce — the notice data are not edited
firm_flags: shown read-only as examples of the clarification desk
error_log_fields: [test_id, step, error_type, detected_by, correction, revision_made]
error_types: [missed_requirement, hallucinated_requirement, wrong_source_reference, wrong_locker_field,
              wrong_match_status, wrong_readiness, relevant_notice_ranked_low, irrelevant_notice_forwarded,
              lot_mixed_up, inactive_notice_screened, flagged_notice_screened, lacks_data_silently_matched,
              stale_result_after_change]
improvement_loop: error log, bid outcomes and manually added notices adjust prompts, weights and thresholds
```

## 10. Technology

### 10.1 Platform (decided)

```yaml
platform: static website on GitHub Pages
principle: the AI process runs once, its outputs are frozen in the repository, and the website only displays them
website: TypeScript; Next.js with static export (output: "export", basePath = repository name); Tailwind CSS + shadcn/ui;
         TanStack Table; next-intl (en.json, nb.json); deployed by a GitHub Actions workflow
no_server: no backend, no API key, no AI call in the browser
repository: private GitHub repository created by the team (e.g. "kvia-prototype"); GitHub Pages from a private
            repository needs GitHub Pro / Team (Pro is free for students via the GitHub Student Developer Pack)
deploy: GitHub Actions workflow builds the static export and publishes it to Pages on every push to main
visibility (decided): unlisted GitHub Pages URL shared with the team and the grader. A Pages site is reachable by anyone
                      with the URL even when the repository is private (access control needs GitHub Enterprise Cloud);
                      this is acceptable because no content on the site is confidential:
  - notice data: public open data, kept unaltered
  - firm data: synthetic
  - tender documents: public procurement documents; the originals are included for review (team decision).
    Team note: buyer platforms' terms of use apply; the team accepts this for a non-public academic prototype
```

### 10.2 How the AI run is executed (decided: Claude chat session, on command)

```yaml
trigger: only the team, in a development chat, with an explicit instruction (e.g. "run pre-processing", "run screening",
         "run full pipeline"). The website can never start a run.
executor: Claude in the chat session, following the versioned prompts in /prompts step by step
deterministic_parts: written as Python scripts and executed in the session (ingest, activeness, retrieval/BM25,
                     release gate, aggregation, readiness, indication, citation check, manifest)
ai_parts: pre-processing extraction, screening sub-scores, matching + classification — produced by Claude in the
          session and saved as JSON that must pass the pydantic schemas before they are accepted
after_each_run: write /outputs/{run_id}/ + manifest; point the website config to the new run; rebuild and redeploy
logging: run ID, session model identifier as reported in the session, date, prompt versions, input checksums, and
         which steps were run
model_note: the session model cannot be pinned and may not be Claude Fable 5.1, which AI mechanism chain.docx names.
            Either the report states that the prototype ran in a Claude chat session (and names the model reported
            there), or the team accepts the mismatch knowingly. Disclose in the GenAI-use appendix. (team reminder)
no_api: no API key, no anthropic SDK calls
```

### 10.3 Frozen run and stability

```yaml
freeze:
  - one run ID per frozen run; every output records run ID, model ID, prompt version, input checksums, timestamp
  - outputs are committed to /outputs/{run_id}/ and never edited by hand; the website reads one configured run
  - a manifest lists all output files with SHA-256 checksums; the website shows the run ID and manifest checksum
deterministic_by_design (code, not LLM): activeness, release gate, fit aggregation, confidence bands, threshold routing,
                                        documentation readiness, expiry flags, indication
constrained_llm_output: fixed enumerations and JSON schema; outputs failing validation are rejected and logged
citation_check (code): every cited_text must occur on the cited page of the stored document; a failed check makes the
                       requirement uncited and lowers extraction confidence
stability_measurement: pre-processing for the three anchor notices runs 3 times; requirements found in all runs count
                       as stable; requirements found in only some runs are reported and flagged for adviser review;
                       the agreement rate is a test result (T11)
disclosure: the GenAI-use appendix states that generation is not bit-for-bit reproducible and that the website replays
            one frozen run
data_protection (design note for the report):
  - prototype uses synthetic firms only; prompt inputs limited to the fields each task needs (§5.1, §5.3)
  - production: Capability Locker is high-sensitivity (financials, CVs under GDPR) → data processing agreement,
    EU-region processing option, access logging
prompts: versioned in /prompts; quoted in the GenAI-use appendix
```

## 11. Required tests (assignment: ≥ 2 typical, ≥ 2 edge/failure, ≥ 1 assumption challenge)

```yaml
tests:
  - {id: T1, type: typical, scenario: "P3 screening vs all released notices", expected: "2026-116568 forwarded with top fit; confidence lowered for missing value; Kantinedrift not screened (award notice)"}
  - {id: T2, type: typical, scenario: "P1 screening + report on 2026-116619", expected: "forwarded; design scope → partly_met or not_met; tax certificate → expired/missing document; indication not Go; R02029 not screened"}
  - {id: T3, type: edge, scenario: "P2 vs multi-lot framework 2026-116579", expected: "Lot B relevant, Lot A not; NUTS and aggregate-value contradictions lower confidence instead of excluding; StartBANK expired; credit rating lacks_data"}
  - {id: T4, type: edge, scenario: "P3 report: fleet-capacity requirement with no locker field", expected: "lacks_data → borderline, never silently matched"}
  - {id: T5, type: edge, scenario: "P3 ISO 14001 valid on deadline, expires 4 days later", expected: "readiness documented (valid) + visible expiry flag in the checklist"}
  - {id: T6, type: failure, scenario: "Competition notices with empty status (2026-116619, 2026-116544) and award notices with future dates", expected: "activeness rule screens the former, excludes the latter"}
  - {id: T7, type: failure, scenario: "Notice with missing or unreadable tender documents, or low extraction confidence", expected: "flagged; visible in notice browser and adviser queue; no fit score and no report until released; after recorded release, screened normally"}
  - {id: T8, type: key_assumption, scenario: "Retrieval + extraction find ALL mandatory requirements and proof demands with correct page references (manual gold list per anchor tender)", expected: "recall ≥ target (§12); zero uncited requirements"}
  - {id: T9, type: key_assumption, scenario: "LLM screening vs a rule-based CPV filter on the same notices and profiles", expected: "evidence for or against the claim that rule-based filtering misses relevant notices"}
  - {id: T10, type: recompute, scenario: "Change one Capability Locker field and run trigger script", expected: "only that firm's comparison re-runs; extraction reused"}
  - {id: T11, type: stability, scenario: "Pre-processing of the three anchor notices run 3 times", expected: "agreement rate reported; unstable requirements flagged"}
revision_rule: after testing, change at least one prompt, rule, weight or threshold — and the Table A1 data model
               (missing fleet/equipment field) — then re-run the affected tests and record before/after.
data_note_for_T7: no competition notice in the export lacks a deadline, CPV code or contract type, so the flag can only
                  be triggered by missing/unreadable tender documents or low extraction confidence. The data are not
                  edited; if no notice is flagged in the real run, T7 is reported as "trigger not observed" with the
                  gate logic shown on the Phase 1 mock run.
```

## 12. Success criteria

```yaml
status: no external targets exist (chapter 4.3 sets none for the prototype). These are prototype acceptance
        targets set by the team as ASSUMPTIONS; report them as such and compare observed values against them.
targets:
  extraction_recall_mandatory: ">= 0.90 vs gold list"
  source_reference_accuracy: ">= 0.95"
  uncited_requirements_shown: 0
  inactive_notices_screened: 0
  flagged_unreleased_notices_screened: 0
  anchor_notice_forwarded_for_its_profile: "3 of 3"
  should_not_surface_notices_forwarded: 0
  lacks_data_silently_matched: 0
  stale_results_after_change: 0
  extraction_agreement_across_3_runs: ">= 0.90"
```

## 13. OUT_OF_SCOPE

- Any input other than profile, language and theme switchers, search, filters, navigation and "Create diagnostic report".
- Profile set-up, document upload, extraction from firm documents (S1). Workshops, live clarification desk (S3).
- Live Doffin API, any AI call from the website, accounts, notifications, backend.
- Bid writing, submission, pricing. Model training or fine-tuning.

## 14. Deliverables from the build agent

```yaml
deliverables:
  - /pipeline: code (route A) or written run protocol (route B), config (model, weights, threshold, reference date),
    trigger-simulation script, README
  - /web: Next.js app "Kvia" incl. brand files from brand/, GitHub Actions workflow for GitHub Pages, README, live link
  - /data/raw: notice export (unaltered) and tender documents (original PDFs); /data/profiles: P1–P3 as JSON
  - /data/adviser_decisions.json; /prompts (versioned); /outputs/{run_id} (frozen JSON + manifest); /i18n
  - test_log.md in the assignment's Appendix A format (# | case type | scenario | expected | observed | learning/revision)
  - screenshots of each website view; sample inputs and outputs
```

## 15. Resolved decisions

| Topic | Decision | Source |
|---|---|---|
| Trade focus | None; per firm via search profile | Portfolio |
| Notice data | 2026 Doffin export (25 notices) only | Team, project rule |
| Activeness | Competition notice + deadline after reference date; `status` field ignored | Data analysis |
| Profiles | P1–P3 from Tables B1–B3, data model Table A1 | Project docs |
| Chain | Pre-processing (once per notice) → screening (per firm) → diagnostic report (per firm) | Mechanism chain |
| Pre-processing | Retrieval-grounded extraction, once per notice version, reused for all firms | Mechanism chain, data requirements |
| Flag triggers | Missing/unreadable documents, missing deadline, low extraction confidence | Data requirements, mechanism chain |
| Flagged notice | Visible with badge; excluded from screening and report until released | Portfolio |
| Missing structured fields | Excluded from fit score; lower confidence | Data requirements |
| Screening | Sub-scores per data point, code aggregation to 0–100, threshold 60 | Mechanism chain, team |
| Ranked list | One list per firm of ALL screened notices, sorted by fit, threshold line inside; near misses = top of the below-threshold part, not a separate list | Team |
| Manual addition | Any below-threshold notice can be added; reveals precomputed report | Portfolio, team |
| Model | Claude Fable 5.1 for all three AI steps | Mechanism chain |
| Match status | met / partly met / not met / lacks data, with confidence | Portfolio |
| Documentation readiness | documented / self-declared (proof needed) / expired, on the tender deadline | Portfolio |
| Proof expiring soon after deadline | Valid, flagged in checklist | Team |
| Indication rules | As in §7 | Portfolio |
| Storage | Original notice unaltered; AI data separate, linked by ID + version | Data requirements |
| Platform | Static GitHub Pages site replaying one frozen AI run | Team |
| Language | English default, Norwegian switch | Team |
| Reference date | 2026-11-04 | Team |
| Tender documents | Provided by team before build | Team |
| Control profile | Not built by agent; team may add P4 | Team |
| Success criteria | No external targets; §12 targets are assumptions | Team |
| Notice browser | Doffin-like page of all active competition notices with search and filters | Team |
| AI execution | Claude chat session on team command; no API; website cannot trigger runs | Team |
| Flag failure mode | Tested without editing data | Team |
| Build order | Phase 1 mock run with real notices/profiles and placeholder documents, then Phase 2 real run | Team |

## 16. Open questions

| ID | Question | Default if unresolved |
|---|---|---|
| — | No open questions for Phase 1. | — |

## 16a. Known inconsistencies with project documents (team to resolve in the report; do not block the build)

- Appendix labels: the assignment fixes Appendix A = Prototype Test Log, B = Generative AI Use and Verification,
  C = Team Contribution Statements. The project docs label the profile data model "Appendix A" (Company profile
  data.docx) and refer to the synthetic profiles as "Appendix B" (portfolio; Tables B1–B3). Data requirements.docx
  refers to "Appendix X" (placeholder) for notice data and to "Appendix B" for the mandatory-field opt-out, which is
  described in the Table A1 note.

## 17. Pre-build checklist (the build agent MUST confirm each item with the team before starting)

Phase 1 (mock build) may start when:
- [x] Q11, Q13, Q14 answered (2026-11-05)
- [x] Visual direction defined in §8 (2026-11-05); a separate visual requirements document is optional
- [ ] Team gives the command "start Phase 1"

Phase 2 (real run) may start only when:
- [ ] Tender documents for all 12 active notices delivered as text-layer PDFs (minimum: 2026-116619, 2026-116579, 2026-116568)
- [ ] Team decision on a passing profile P4 (added or explicitly declined)
- [ ] Team has seen §16a (appendix labels) and the model note in §10.2
- [ ] The team gives the explicit run command in chat

## 18. Build phases

```yaml
phase_1_mock_build:
  goal: complete, clickable website and all deterministic code, tested end to end before real tender documents exist
  real_inputs: notice export (all 25 notices, unaltered), profiles P1–P3 (Tables B1–B3), reference date,
               weights, threshold, indication rules
  placeholders: /data/raw/tender_docs/{doffin_id}/PLACEHOLDER.json for each of the 12 active notices
                {status: "placeholder", expected_documents: [konkurransegrunnlag, kravspesifikasjon, annexes]}
                → in Phase 1 a placeholder counts as "available (mock)", not as missing, so the chain can run
  placeholder_pdfs: one generated multi-page PDF per active notice, watermarked "PLACEHOLDER — MOCK, not the tender
                    document", containing the mock requirement sentences, so the PDF viewer, page links and highlights
                    can be built and tested; replaced by the original PDFs in Phase 2
  mock_ai_outputs: written to /outputs/mock-{date}/ in exactly the Phase 2 schemas, every object carrying
                   {mock: true}; generated by code from templates, not by the AI
    extraction: generic requirement types per category (tax certificate, HMS, turnover, references, certificates,
                capacity), cited to their page and highlighted passage in the placeholder PDF
    screening: mock (team decision) — sub-scores from simple CPV/NUTS/value overlap, tuned so that every mode below appears
    classification: derived from locker proof status, so that the built-in gaps of P1–P3 show up in the checklist
  mode_coverage (MUST; team decision: the mock run demonstrates EVERY defined mode at least once):
    activeness:     [active competition notice; competition notice with empty status; award / advisory / intent notice excluded;
                     competition notice with passed deadline excluded]
    release_gate:   [released automatically; flagged – low extraction confidence, pending; flagged – low extraction confidence,
                     released by adviser with correction; flagged – documents missing or unreadable; flagged – deadline missing]
    screening:      [forwarded (>= threshold); below threshold; confidence high / medium / low; missing value excluded from score;
                     contradictory data lowering confidence; multi-lot with one relevant lot; "anyw" place of performance]
    manual:         [below-threshold notice added via ranked list; added via notice browser]
    match_status:   [met; partly_met; not_met; lacks_data — each with high, medium and low confidence somewhere]
    readiness:      [documented; self_declared_proof_needed; expired; documented + expiring-soon flag; proof not demanded]
    indication:     [go; borderline; no-go]
    report_states:  [awaiting adviser review; available; manually added]
    review_and_s3:  [adviser queue entries (pending, released); firm-flag example; profile health-check flags
                     (expired, expiring, declared missing)]
    ui:             [English and Norwegian texts for every generated string; every filter returns at least one result]
  mock_only_notices: modes that the real export cannot produce without editing it (e.g. missing deadline, passed deadline)
                     are shown with clearly invented notices with IDs "MOCK-0001", "MOCK-0002", …, labelled MOCK, never
                     mixed into the real export file, and removed in Phase 2. The real notice data are not edited.
  coverage_check: /outputs/mock-{date}/mode_coverage.json lists each mode with the notice/firm/requirement that shows it;
                  a test fails the build if any mode has no example
  must_not: present mock requirements as facts about real tenders; every mock view shows a banner
            "MOCK DATA — tender documents not yet processed"
  invariant_note: mock requirements cite the placeholder PDFs, so the citation check and highlighting run for real on
                  mock content; the MOCK banner and {mock: true} make clear that no real tender is described
  fixture_tests: code-level tests of activeness, release gate, aggregation, readiness, expiry flag and indication using
                 small invented fixture documents in /tests/fixtures (never shown on the website)
phase_2_real_run:
  trigger: team command in chat after the Phase 2 checklist (§17) is complete
  steps: replace placeholders with documents → pre-processing → (adviser decisions) → screening → diagnostic report
  result: new run ID; website switched from the mock run to the real run; mock run kept in the repository, not displayed
```
