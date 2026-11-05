"use client";
import { useTranslations } from "next-intl";
import { Download, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Button, EmptyState, Loading, TableCard, inputCls, th } from "@/components/ui/ui";
import { useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { useApp, useL } from "@/lib/state";
import type { RunInfo, TestCase } from "@/lib/types";

const TYPE: Record<string, string> = { typical: "Typical", edge: "Edge / difficult", failure: "Edge / failure", key_assumption: "Key assumption", recompute: "Recompute", stability: "Stability" };

/** Long text: clamped to three lines with a per-cell "show more"; always fully visible in print. */
function Clamp({ text }: { text: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const long = text.length > 150;
  return (
    <div>
      <div className={cn(!open && long && "line-clamp-3 print:line-clamp-none")}>{text}</div>
      {long && <button type="button" onClick={() => setOpen(!open)} className="no-print mt-1 text-meta font-medium text-accent hover:underline">{open ? t("common.showLess") : t("common.showMore")}</button>}
    </div>
  );
}

export default function TestLogPage() {
  const t = useTranslations();
  const { lang } = useApp();
  const L = useL();
  const [q, setQ] = useState("");
  const d = useJson<[TestCase[], { notes: Record<string, { en: string; nb: string }> }, RunInfo]>(["run/tests.json", "test_log_notes.json", "run/run_info.json"]);
  const rows = useMemo(() => !d ? [] : d[0].map((x, i) => ({
    n: i + 1, id: x.id, type: TYPE[x.type] ?? x.type, scenario: `${x.id}: ${x.scenario}`, expected: x.expected,
    observed: `[${x.status}] ${L(x, "observed")}`, learning: d[1].notes[x.id]?.[lang] ?? "",
  })), [d, L, lang]);
  if (!d) return <Loading />;
  const run = d[2];
  const s = q.toLowerCase().trim();
  const shown = s ? rows.filter((r) => Object.values(r).join(" ").toLowerCase().includes(s)) : rows;
  const csv = () => {
    const head = ["#", "Case type", "Scenario / input", "Expected outcome", "Observed result", "Learning / revision"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [head, ...rows.map((r) => [r.n, r.type, r.scenario, r.expected, r.observed, r.learning])].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body + "\r\n"], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `kvia_test_log_${run.run_id}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <ProtoPage title={t("testlog.title")} sub={t("testlog.sub")}
      right={<div className="no-print flex gap-2"><Button onClick={csv}><Download className="h-4 w-4" aria-hidden />{t("testlog.csv")}</Button><Button onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />{t("testlog.print")}</Button></div>}>
      <TableCard
        toolbar={<>
          <div className="no-print relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
            <input type="search" aria-label={t("testlog.search")} className={cn(inputCls, "pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("testlog.search")} /></div>
          <span className="text-[13px] text-muted sm:ml-auto"><b className="font-medium text-fg">Appendix A: Prototype Test Log</b> · {run.run_id}{run.mock ? " (MOCK)" : ""}</span>
        </>}
        footer={t("testlog.note")}>
        {!shown.length ? <EmptyState title={t("testlog.none")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-[13.5px] [overflow-wrap:normal]">
              <thead className="bg-surface-2/50"><tr>
                <th className={cn(th, "w-10")}>#</th><th className={cn(th, "w-32")}>Case type</th><th className={th}>Scenario / input</th><th className={th}>Expected outcome</th><th className={th}>Observed result</th><th className={th}>Learning / revision</th>
              </tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="tnum px-4 py-3 font-semibold">{r.n}</td><td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3 font-medium">{r.scenario}</td>
                    <td className="px-4 py-3 text-muted"><Clamp text={r.expected} /></td>
                    <td className="px-4 py-3"><Clamp text={r.observed} /></td>
                    <td className="px-4 py-3 text-muted"><Clamp text={r.learning} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </ProtoPage>
  );
}
