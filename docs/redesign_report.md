# Kvia redesign — "Nordic Precision" (2026-11-05)

Scope: complete visual and interaction redesign of the static Kvia website (all service pages A1–A5, notice and
report details, prototype pages B1–B6 and the internal Dev statistics page). The pipeline, the frozen run
`outputs/mock-2026-11-05`, the deterministic go / borderline / no-go logic and all source evidence are unchanged.
The website still never calls an AI model; manual additions remain browser-local.

## 1. Confirmed bugs (found and fixed)

| # | Bug | Where | Fix | Verified by |
|---|---|---|---|---|
| B1 | After a reload or firm switch, a report added manually in this browser briefly showed "No diagnostic report yet", and the previous firm's additions were applied for one render | app state (`lib/state.tsx`) | Manual additions are tracked per firm; the page waits until they are loaded | e2e "manual: direct link opens report without flashing hidden state", "not shown for another firm" |
| B2 | An unknown company in the URL (e.g. `?as=P9`) left every page loading forever | `useModel` | Falls back to the first profile | e2e "invalid firm falls back" |
| B3 | Opening a report or notice with a requirement selected (`?req=…`) scrolled the whole page to the PDF highlight | `PdfViewer` | The viewer now scrolls only its own panel | `window.scrollY = 0` on three deep links |
| B4 | Tabs, expanded rows and selected requirements were not restored by Back/Forward | report, notice, screening, prompts, company | One URL-state helper (`lib/url-state.ts`): tabs and requirement selection push history entries, popstate restores state | e2e "report: Back restores previous requirement", "Forward", "notices: Back returns with filters" |
| B5 | A failed data load crashed the page to a blank screen | all pages | Route error boundary with message and retry (`app/error.tsx`); not-found page | build + manual |
| B6 | Notices table cut off its right-hand columns at 1440 px and at tablet width | A2 | Fewer columns below 1536 px (CPV and place stay in the notice detail); sidebar becomes a drawer below 1280 px; phones get a card list | screenshots 1440 / 1024 / 390, overflow check |
| B7 | Report checklist text squeezed into a narrow column next to the document viewer | A4 detail | Status values on one line under each requirement; narrower viewer | screenshots |
| B8 | "MOCK" labels broke across two lines inside narrow table cells | chips | Labels never wrap | screenshots 390 |

Earlier fixes from the previous rounds (notice sorting lock-up, null-safe sorting, toggleable filters) remain covered
by the e2e script.

## 2. Design changes (recommendations implemented)

- Frame per reference 1: 232 px sidebar on the app background (logo, Service group, Prototype & evidence group,
  company "Demo control" card at the bottom), content in one white bordered panel with breadcrumb and controls.
- Tables per reference 2: toolbar (search left, filter buttons "Status: All" right), light header row, hairline rows,
  restrained tinted labels.
- Tokens: background #F7F8FA, surface #FFFFFF, ink #172235, secondary #526174, accent #4655A5, border #E5E9F0;
  semantic colours only for status. Dark theme with the same meanings. Gradient only inside the logo.
- Type: Inter; 30 px page titles, 18 px section titles, 14 px body, 12 px metadata, 26–28 px metrics; tabular numerals.
- Fewer boxes, borders, badges and icons; status shown as dot + text; confidence as a three-step meter.
- Motion: 140 ms hover, 150 ms tab underline, 160 ms dropdown, 180 ms modal, 200 ms drawer; disabled under
  `prefers-reduced-motion`.
- Page structure: A1 orientation (headline, two actions, three statistics, top matches, three stages);
  A2 data browser with four visible filters + advanced filters; notice detail with tabs and firm panel;
  A3 ranked list with threshold separator and expandable rows; A4 list with source switch; A4 detail as
  indication → readiness → checklist → missing documents → linked document (split panel on desktop, full-screen
  reader on phones) → technical details; A5 tabs; B1 six-stage walkthrough (AI vs deterministic code, rules
  collapsible); B2 evidence inspector with tabs and copy; B3 read-only QA queue; B4 verification dashboard;
  B5 searchable, printable Appendix A table with expandable cells; B6 provenance page with utility area.

## 3. Verification

- Screenshots before and after at 1440×900, 1024×768 and 390×844 for 17 pages (51 each); after-set in
  `docs/screenshots/after/`, side-by-side comparisons in `docs/screenshots/compare/`. No page scrolls horizontally
  at any of the three sizes; no console errors.
- `tests/e2e/journeys.cjs` (Playwright, against a local static server): 45 checks of firm switch, language,
  notices filters / sorting / URL / Back, notice tabs and PDF, screening expansion, manual addition persistence and
  reset, report requirement selection with Back/Forward, invalid URL state, theme persistence, keyboard (skip link,
  dropdown + Escape), CSV export, copy, mobile drawer and full-screen document reader. Result: all pass.
- Contrast (WCAG 2.1, computed from the tokens): lowest pair 5.2 : 1 (light) and 6.7 : 1 (dark); button text
  6.8 : 1 / 7.6 : 1. All ≥ 4.5 : 1 (AA).
- Python tests (`python3 -m pytest -q tests`): unchanged, all pass. TypeScript and i18n checks pass (705 keys, EN = NO).

## 4. Notes and open points

- Two items in the redesign brief reverse earlier team decisions (see `docs/conflict_log.md`, "Team decisions —
  round 2"): Overview again shows three compact statistics, and Data & run again shows provenance, manifest and
  limitations (the notice CSV is kept as a section).
- The Dev statistics page (mode coverage, manifest) stays as a small internal link at the bottom of the sidebar.
- The "Flag for review" button remains disabled on purpose (clarification desk not live in the prototype).
