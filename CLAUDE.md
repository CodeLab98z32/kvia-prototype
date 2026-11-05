# Kvia prototype — instructions for Claude

1. Read `SPEC.md` completely before doing anything. It is the single source of truth for this build.
2. The project documents in `docs/` are the authoritative sources named in SPEC.md. If SPEC.md and a document
   disagree, the document wins: log the conflict and ask the team.
3. Never use, cite or refer to any 2022 notice data. The only notice dataset is `data/raw/doffin_notices_2026-10-26_25.csv`.
4. Never edit anything in `data/raw/`. Original data stays unaltered.
5. Build in phases (SPEC.md §18). Phase 1 = mock build. Phase 2 (real AI run) starts ONLY when the team says so in
   chat and the checklist in SPEC.md §17 is complete.
6. AI steps run only in a development chat on the team's explicit command. The website never calls an AI model.
7. Before starting Phase 2, remind the team of the open items in `docs/team_reminders.md`.
8. Synthetic company profiles: `docs/Synthetic company profiles.docx` (Tables B1–B3); convert them to
   `data/profiles/P1.json`, `P2.json`, `P3.json` following the Table A1 data model (`docs/Company profile data.docx`).
