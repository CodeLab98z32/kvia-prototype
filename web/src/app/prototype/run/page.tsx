"use client";
import { useTranslations } from "next-intl";
import { Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Button, CopyButton, Disclosure, KV, Loading, Section, TableCard, inputCls } from "@/components/ui/ui";
import { MockChip } from "@/components/ui/chips";
import { BASE, useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { useApp, useModel } from "@/lib/state";
import type { Manifest } from "@/lib/types";

/** RFC-4180-style parser for the semicolon-separated export (quoted fields may contain ; and line breaks). */
function parseCsv(text: string, sep = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0]);
}

/** B6: provenance and run information; reset utility kept apart. */
export default function RunPage() {
  const t = useTranslations();
  const m = useModel();
  const { resetDemo } = useApp();
  const man = useJson<[Manifest]>(["run/manifest.json"])?.[0];
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [csvErr, setCsvErr] = useState(false);
  const [q, setQ] = useState("");
  const [done, setDone] = useState(false);
  const file = m?.store.export_file.split("/").pop() ?? "";
  useEffect(() => {
    if (!file) return;
    fetch(`${BASE}/data/raw/${file}`).then((r) => { if (!r.ok) throw new Error(); return r.text(); }).then((x) => setCsv(parseCsv(x))).catch(() => setCsvErr(true));
  }, [file]);
  const rows = useMemo(() => {
    if (!csv) return [];
    const body = csv.slice(1); const s = q.toLowerCase().trim();
    return s ? body.filter((r) => r.join(" ").toLowerCase().includes(s)) : body;
  }, [csv, q]);
  if (!m || !man) return <Loading />;
  const run = m.run;
  return (
    <ProtoPage title={t("run.title")} sub={t("run.sub2")}>
      <div className="space-y-12">
        <Section title={t("run.facts")}>
          <div className="rounded-xl border border-border px-5 py-2">
            <KV cols={2} items={[
              [t("run.runId"), <span key="r" className="inline-flex items-center gap-2 font-mono text-[13px]">{run.run_id}{run.mock && <MockChip />}</span>],
              [t("run.created"), <span key="c" className="tnum">{run.created_utc}</span>],
              [t("run.reference"), <span key="d" className="tnum">{run.reference_datetime}</span>],
              [t("run.snapshot"), <span key="s" className="tnum">{run.snapshot_date}</span>],
              [t("run.modelSpecified"), run.model.specified_in_docs],
              [t("run.modelUsed"), run.model.used],
              [t("run.prompts"), Object.values(run.prompt_versions).join(", ")],
              [t("run.manifestSha"), <span key="m" className="flex items-center gap-2"><span className="break-all font-mono text-[12px]">{man.manifest_sha256}</span><CopyButton text={man.manifest_sha256} /></span>],
            ]} />
          </div>
        </Section>

        <Section title={t("run.sources")} sub={t("run.sourcesSub")}>
          <TableCard>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px] [overflow-wrap:normal]">
                <thead className="bg-surface-2/50"><tr><th className="h-10 px-4 text-left text-meta font-medium text-muted">{t("run.file")}</th><th className="h-10 px-4 text-left text-meta font-medium text-muted">SHA-256</th></tr></thead>
                <tbody>{Object.entries(run.input_checksums).map(([p, h]) => (
                  <tr key={p} className="border-t border-border"><td className="px-4 py-2.5">{p}</td><td className="px-4 py-2.5 font-mono text-[12px] text-muted">{h.slice(0, 24)}…</td></tr>))}</tbody>
              </table>
            </div>
          </TableCard>
          <Disclosure className="mt-3" summary={`${t("run.manifest")} · ${t("run.manifestSub", { n: man.files.length })}`}>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-[12px] [overflow-wrap:normal]"><tbody>{man.files.map((f) => <tr key={f.path} className="border-b border-border last:border-0"><td className="py-1.5 pr-3 font-mono">{f.path}</td><td className="py-1.5 font-mono text-muted">{f.sha256.slice(0, 16)}…</td><td className="tnum py-1.5 pl-3 text-right">{f.bytes}</td></tr>)}</tbody></table>
            </div>
          </Disclosure>
        </Section>

        <Section title={t("run.limitations")}>
          <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-body text-muted">{["mock", "docs", "model", "repro", "flags", "data"].map((k) => <li key={k}>{t(`run.lim.${k}`)}</li>)}</ul>
        </Section>

        <Section title={t("run.csvTitle")} sub={t("run.csvSub", { file: m.store.export_file, n: Math.max(0, (csv?.length ?? 1) - 1), c: csv?.[0]?.length ?? 0 })}>
          <TableCard
            toolbar={<>
              <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
                <input type="search" aria-label={t("run.csvSearch")} className={cn(inputCls, "pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("run.csvSearch")} /></div>
              <a href={`${BASE}/data/raw/${file}`} download className="t-fast inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-surface-2 sm:ml-auto"><Download className="h-4 w-4" aria-hidden />CSV</a>
            </>}
            footer={t("run.csvNote")}>
            {csvErr ? <p className="px-4 py-6 text-body text-nogo">{t("common.errorText")}</p> : !csv ? <div className="p-4"><Loading rows={2} /></div> : (
              <div className="max-h-[560px] overflow-auto">
                <table className="text-left text-[12px] [overflow-wrap:normal]">
                  <thead className="sticky top-0 z-10 bg-surface-2"><tr>{csv[0]?.map((h) => <th key={h} className="h-10 whitespace-nowrap px-3 font-mono font-medium text-muted">{h}</th>)}</tr></thead>
                  <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border align-top hover:bg-surface-2/50">{r.map((c, j) => <td key={j} className="max-w-[300px] px-3 py-2"><div className="line-clamp-3 whitespace-pre-line" title={c}>{c}</div></td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </TableCard>
        </Section>

        <section className="rounded-xl border border-dashed border-border-strong bg-surface-2/40 px-5 py-4" aria-labelledby="utility">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="utility" className="text-[14px] font-semibold">{t("run.utility")} · {t("run.reset")}</h2><p className="text-[13px] text-muted">{t("run.resetSub")}</p></div>
            <Button onClick={() => { resetDemo(); setDone(true); }}><RotateCcw className="h-4 w-4" aria-hidden />{done ? t("run.resetDone") : t("run.reset")}</Button>
          </div>
        </section>
      </div>
    </ProtoPage>
  );
}
