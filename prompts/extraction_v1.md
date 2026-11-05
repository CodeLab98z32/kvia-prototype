---
prompt_id: extraction
version: extraction_v1
step: 1b Extraction (pre-processing, once per notice version)
model_specified: Claude Fable 5.1 (AI mechanism chain.docx)
executor: Claude in the development chat, ONLY on the team's explicit command (SPEC §10.2)
inputs: notice fields needed for the task (no contact fields) + retrieved passages (page_id, document, page, text)
output_schema: kvia.schemas.ExtractionOutput (pass 2)
status: written in Phase 1, NOT executed in Phase 1
---

# Pass 1 — extraction with citations

You extract the mandatory requirements and proof demands of ONE Norwegian public tender from the passages below.
The passages come from the tender documents (konkurransegrunnlag, kravspesifikasjon, annexes). They are the only
source you may use. The notice fields give context (title, deadline, lots); never invent requirements from them.

For every requirement:
1. Quote the exact sentence(s) from ONE page that state it (cited text, verbatim, Norwegian as in the document).
2. Give document name and page number of that quote.
3. Classify the category: qualification | technical | financial | certification | hms | reference | capacity | formal.
4. State whether it is mandatory ("skal", "må", "minimumskrav", "kvalifikasjonskrav") or desirable ("bør", "ønskelig",
   tildelingskriterium) — award criteria are NOT requirements; list them only if they set a minimum.
5. State whether documented proof is demanded and which proof (e.g. skatteattest, referanseliste, sertifikat).
6. If the requirement applies to one lot (delkontrakt) only, give the lot.
7. Write a short summary in English and in Norwegian bokmål.
8. Rate your extraction confidence: high | medium | low (low = ambiguous wording, values that conflict between
   documents, or a passage you are not sure is binding).

Also list:
- the lots (delkontrakter) with their titles, if any;
- every conflict between documents (e.g. different coverage amounts) — do not resolve conflicts yourself;
- your overall self-rating (high | medium | low) of how complete the list is.

Rules:
- Do not summarise legal boilerplate that sets no requirement on the supplier.
- Do not merge two requirements with different proof demands.
- If you cannot cite a requirement, still list it and write "NO CITATION" — the release gate will flag the notice.
- Never use knowledge about the buyer or similar tenders from outside the passages.

# Pass 2 — conversion to JSON (structured outputs)

Convert the pass-1 result into the ExtractionOutput JSON schema. Copy the requirement texts, categories, flags and
lots; leave `source` empty — code copies the citations from pass 1 (citations and structured outputs cannot be
combined in one request). Do not add, drop or reword requirements in this pass.
