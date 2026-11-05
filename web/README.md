# Kvia website

Static Next.js site (TypeScript, Tailwind, shadcn-style components, TanStack Table, next-intl, PDF.js) that
**only reads** the frozen run named in `config/website.json`. It never calls an AI model.

- `npm run sync-data` copies the run, profiles, prompts, documents, brand files and `/i18n` into `public/` and `src/messages/`.
- `npm run build` → `out/` (GitHub Pages; base path `/kvia-prototype`, override with `NEXT_PUBLIC_BASE_PATH`).
- `node scripts/check-i18n.mjs` checks that English and Norwegian have the same keys and that every key used exists.
- Local preview at the root: `NEXT_PUBLIC_BASE_PATH= npm run build && npx serve out`.

URL state: `?as=P1|P2|P3` (firm, "Viewing as"), `&lang=nb`, plus page parameters (`open`, `req`, `lot`, filters).
New profiles are added as data files in `/data/profiles` (plus a pipeline run) — no code change.
Manual additions made by a viewer are kept only in that browser (`localStorage`); "Reset demo" is on the Data & run page.

Pages: A1 Overview `/`, A2 Notices `/notices`, notice detail `/notices/{id}`, A3 Screening `/screening`,
A4 Reports `/reports` and `/reports/{id}`, A5 Company `/company`; prototype pages B1–B6 under `/prototype/…`;
internal development page `/internal/dev-stats` (mode coverage, manifest). Team design decisions: `docs/conflict_log.md`.
