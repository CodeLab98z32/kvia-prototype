"use client";
import { useTranslations } from "next-intl";
import { Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Button, Card, CardHeader, Loading, inputCls } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
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
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0]);
}

export default function RunPage() {
  const t = useTranslations();
  const m = useModel();
  const { resetDemo } = useApp();
  const man = useJson<[Manifest]>(["run/manifest.json"])?.[0];
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [q, setQ] = useState("");
  const [done, setDone] = useState(false);
  const file = m?.store.export_file.split("/").pop() ?? "";
  useEffect(() => {
    if (!file) return;
    fetch(`${BASE}/data/raw/${file}`).then((r) => r.text()).then((x) => setCsv(parseCsv(x))).catch(() => setCsv([]));
  }, [file]);
  const rows = useMemo(() => {
    if (!csv) return [];
    const body = csv.slice(1);
    const s = q.toLowerCase().trim();
    return s ? body.filter((r) => r.join(" ").toLowerCase().includes(s)) : body;
  }, [csv, q]);
  if (!m || !man) return <Loading />;
  const run = m.run;
  const facts: [string, React.ReactNode][] = [
    [t("run.runId"), <span key="r" className="font-mono">{run.run_id} {run.mock && <Chip className="mock-stripes text-fg">MOCK</Chip>}</span>],
    [t("run.created"), run.created_utc],
    [t("run.reference"), run.reference_datetime],
    [t("run.snapshot"), run.snapshot_date],
    [t("run.modelSpecified"), run.model.specified_in_docs],
    [t("run.modelUsed"), run.model.used],
    [t("run.prompts"), Object.values(run.prompt_versions).join(", ")],
    [t("run.manifestSha"), <span key="m" className="break-all font-mono text-xs">{man.manifest_sha256}</span>],
  ];
  return (
    <ProtoPage title={t("run.title")} sub={t("run.sub")}>
      <Card>
        <CardHeader title={t("run.facts")} />
        <dl className="grid divide-y divide-border text-[13.5px] md:grid-cols-2 md:divide-y-0">
          {facts.map(([k, v]) => <div key={k} className="grid grid-cols-[170px_1fr] gap-3 border-border px-5 py-2.5 md:border-b"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </Card>

      <Card className="mt-6 min-w-0">
        <CardHeader title={t("run.csvTitle")} sub={t("run.csvSub", { file: m.store.export_file, n: Math.max(0, (csv?.length ?? 1) - 1), c: csv?.[0]?.length ?? 0 })}
          right={<a href={`${BASE}/data/raw/${file}`} download className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] hover:bg-surface-2"><Download className="h-3.5 w-3.5" aria-hidden />CSV</a>} />
        <div className="border-b border-border px-4 py-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
            <input aria-label={t("run.csvSearch")} className={cn(inputCls, "pl-8")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("run.csvSearch")} />
          </div>
        </div>
        {!csv ? <div className="p-4"><Loading /></div> : (
          <div className="max-h-[620px] overflow-auto">
            <table className="text-left text-xs [overflow-wrap:normal]">
              <thead className="sticky top-0 z-10 bg-surface-2">
                <tr>{csv[0]?.map((h) => <th key={h} className="whitespace-nowrap border-b border-border px-3 py-2 font-mono font-medium text-muted">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border align-top last:border-0 hover:bg-surface-2/50">
                    {r.map((c, j) => <td key={j} className="max-w-[320px] px-3 py-1.5"><div className="line-clamp-3 whitespace-pre-line" title={c}>{c}</div></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted">{t("run.csvNote")}</p>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-5 py-4">
        <div><h3 className="text-[14px] font-semibold">{t("run.reset")}</h3><p className="text-[13px] text-muted">{t("run.resetSub")}</p></div>
        <Button onClick={() => { resetDemo(); setDone(true); }}><RotateCcw className="h-4 w-4" aria-hidden />{done ? t("run.resetDone") : t("run.reset")}</Button>
      </div>
    </ProtoPage>
  );
}
