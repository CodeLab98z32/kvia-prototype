"use client";
import { useTranslations } from "next-intl";
import { Download, Printer } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Button, Card, Loading } from "@/components/ui/ui";
import { useJson } from "@/lib/data";
import { useApp, useL } from "@/lib/state";
import type { RunInfo, TestCase } from "@/lib/types";

const TYPE: Record<string, string> = { typical: "Typical", edge: "Edge / difficult", failure: "Edge / failure", key_assumption: "Key assumption", recompute: "Recompute", stability: "Stability" };

export default function TestLogPage() {
  const t = useTranslations();
  const { lang } = useApp();
  const L = useL();
  const d = useJson<[TestCase[], { notes: Record<string, { en: string; nb: string }> }, RunInfo]>(["run/tests.json", "test_log_notes.json", "run/run_info.json"]);
  if (!d) return <Loading />;
  const [tests, notes, run] = d;
  const rows = tests.map((x, i) => ({
    n: i + 1, id: x.id, type: TYPE[x.type] ?? x.type, scenario: `${x.id}: ${x.scenario}`, expected: x.expected,
    observed: `[${x.status}] ${L(x, "observed")}`, learning: notes.notes[x.id]?.[lang] ?? "",
  }));
  const csv = () => {
    const head = ["#", "Case type", "Scenario / input", "Expected outcome", "Observed result", "Learning / revision"];
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const body = [head, ...rows.map((r) => [r.n, r.type, r.scenario, r.expected, r.observed, r.learning])].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `kvia_test_log_${run.run_id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <ProtoPage title={t("testlog.title")} sub={t("testlog.sub")}
      right={<div className="no-print flex gap-2"><Button onClick={csv}><Download className="h-4 w-4" aria-hidden />CSV</Button><Button onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />{t("testlog.print")}</Button></div>}>
      <Card className="overflow-x-auto">
        <div className="border-b border-border px-4 py-3 text-sm"><b>Appendix A: Prototype Test Log</b> · {t("header.run")} {run.run_id}{run.mock ? " (MOCK)" : ""}</div>
        <table className="w-full min-w-[760px] text-sm [overflow-wrap:normal]">
          <thead className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Case type</th><th className="px-3 py-2">Scenario / input</th><th className="px-3 py-2">Expected outcome</th><th className="px-3 py-2">Observed result</th><th className="px-3 py-2">Learning / revision</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border align-top last:border-0">
                <td className="px-3 py-2 font-bold">{r.n}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.scenario}</td>
                <td className="px-3 py-2 text-xs">{r.expected}</td><td className="px-3 py-2 text-xs">{r.observed}</td><td className="px-3 py-2 text-xs">{r.learning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-muted">{t("testlog.note")}</p>
    </ProtoPage>
  );
}
