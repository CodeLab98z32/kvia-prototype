// Copies ONE frozen run (config/website.json -> run_id) plus profiles, documents, prompts and brand files into
// web/public so the static site can read them. The website never computes or calls an AI model; it only reads these.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(WEB, "..");
const PUB = path.join(WEB, "public");
const DATA = path.join(PUB, "data");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config/website.json"), "utf8"));
const RUN = path.join(ROOT, "outputs", cfg.run_id);
if (!fs.existsSync(RUN)) throw new Error(`Run ${cfg.run_id} not found in /outputs`);

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const wr = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o)); };
fs.rmSync(DATA, { recursive: true, force: true });
fs.rmSync(path.join(PUB, "docs"), { recursive: true, force: true });

// run-level files
for (const f of ["run_info.json", "manifest.json", "mode_coverage.json", "tests.json", "0b_activeness.json", "1c_release_gate.json"])
  wr(path.join(DATA, "run", f), rd(path.join(RUN, f)));
wr(path.join(DATA, "run", "notices.json"), rd(path.join(RUN, "00_ingest/notice_store.json")));
for (const dir of ["1a_retrieval", "1b_extraction"])
  for (const f of fs.readdirSync(path.join(RUN, dir))) wr(path.join(DATA, "run", dir, f), rd(path.join(RUN, dir, f)));

// per-firm files: split prompt I/O away from the display data
const firms = [];
for (const f of fs.readdirSync(path.join(RUN, "2_screening"))) {
  const pid = f.replace(".json", "");
  const s = rd(path.join(RUN, "2_screening", f));
  const r = rd(path.join(RUN, "3_reports", f));
  wr(path.join(DATA, "run/io", `screening-${pid}.json`), s.prompt_io); delete s.prompt_io;
  wr(path.join(DATA, "run/io", `reports-${pid}.json`), r.prompt_io); delete r.prompt_io;
  wr(path.join(DATA, "run/screening", f), s);
  wr(path.join(DATA, "run/reports", f), r);
  wr(path.join(DATA, "run/health", f), rd(path.join(RUN, "s3_health_check", f)));
  firms.push(pid);
}

// profiles (new profiles = new data files only; no code change)
const profiles = [];
for (const f of fs.readdirSync(path.join(ROOT, "data/profiles")).filter((x) => x.endsWith(".json")).sort()) {
  const p = rd(path.join(ROOT, "data/profiles", f));
  wr(path.join(DATA, "profiles", f), p);
  if (firms.includes(p.profile_id)) profiles.push({ id: p.profile_id, name: p.firm.name, initials: p.firm.initials,
    sector_en: p.firm.sector_en, sector_nb: p.firm.sector_nb });
}

// tender documents: Phase 2 originals (data/raw/tender_docs) take precedence over Phase 1 placeholders
const docs = {};
for (const base of ["data/mock/tender_docs", "data/raw/tender_docs"]) {
  const dir = path.join(ROOT, base);
  if (!fs.existsSync(dir)) continue;
  for (const id of fs.readdirSync(dir)) {
    const pdfs = fs.readdirSync(path.join(dir, id)).filter((x) => x.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) continue;
    docs[id] = { source: base.includes("mock") ? "placeholder" : "original", files: pdfs };
    for (const p of pdfs) {
      fs.mkdirSync(path.join(PUB, "docs", id), { recursive: true });
      fs.copyFileSync(path.join(dir, id, p), path.join(PUB, "docs", id, p));
    }
  }
}

// raw notice export (shown unaltered on the Data & run page)
fs.mkdirSync(path.join(DATA, "raw"), { recursive: true });
const exportFile = rd(path.join(RUN, "00_ingest/notice_store.json")).export_file;
fs.copyFileSync(path.join(ROOT, exportFile), path.join(DATA, "raw", path.basename(exportFile)));

// prompts
const prompts = {};
for (const f of fs.readdirSync(path.join(ROOT, "prompts")).filter((x) => x.endsWith(".md")))
  prompts[f.replace(".md", "")] = fs.readFileSync(path.join(ROOT, "prompts", f), "utf8");
wr(path.join(DATA, "prompts.json"), prompts);
wr(path.join(DATA, "test_log_notes.json"), rd(path.join(ROOT, "data/test_log_notes.json")));
wr(path.join(DATA, "adviser_decisions.json"), rd(path.join(ROOT, "data/adviser_decisions.json")));

// brand
fs.mkdirSync(path.join(PUB, "brand"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "brand"))) fs.copyFileSync(path.join(ROOT, "brand", f), path.join(PUB, "brand", f));
fs.copyFileSync(path.join(ROOT, "brand/kvia_mark.svg"), path.join(WEB, "src/app/icon.svg"));

wr(path.join(DATA, "index.json"), { run_id: cfg.run_id, profiles, docs, synced_utc: new Date().toISOString() });
console.log(`synced run ${cfg.run_id}: ${profiles.length} profiles, ${Object.keys(docs).length} document folders`);

// PDF.js worker and translation catalogues (canonical copies live in /i18n)
fs.copyFileSync(path.join(WEB, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"), path.join(PUB, "pdf.worker.min.mjs"));
fs.mkdirSync(path.join(WEB, "src/messages"), { recursive: true });
for (const l of ["en", "nb"]) fs.copyFileSync(path.join(ROOT, "i18n", `${l}.json`), path.join(WEB, "src/messages", `${l}.json`));
