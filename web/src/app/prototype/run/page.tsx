"use client";
import { useTranslations } from "next-intl";
import { Database, RotateCcw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Button, Card, CardHeader, Disclosure, Loading } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { useJson } from "@/lib/data";
import { useApp, useModel } from "@/lib/state";
import type { Manifest } from "@/lib/types";

export default function RunPage() {
  const t = useTranslations();
  const m = useModel();
  const { resetDemo } = useApp();
  const man = useJson<[Manifest]>(["run/manifest.json"])?.[0];
  const [done, setDone] = useState(false);
  if (!m || !man) return <Loading />;
  const run = m.run;
  const realN = m.store.records.filter((r) => !r.mock).length;
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
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("run.facts")} icon={<Database className="h-5 w-5" />} />
          <dl className="divide-y divide-border text-sm">{facts.map(([k, v]) => <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-5 py-2.5"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}</dl>
        </Card>
        <Card>
          <CardHeader title={t("run.sources")} />
          <ul className="space-y-2 p-5 text-sm">
            <li><b>{t("run.src.notices")}</b> — {m.store.export_file} ({t("run.src.noticesN", { n: realN })})</li>
            <li><b>{t("run.src.mockNotices")}</b> — data/mock/mock_notices.json ({m.store.records.length - realN})</li>
            <li><b>{t("run.src.profiles")}</b> — {run.profiles.map((p) => `data/profiles/${p}.json`).join(", ")}</li>
            <li><b>{t("run.src.docs")}</b> — {t("run.src.docsText")}</li>
            <li><b>{t("run.src.adviser")}</b> — data/adviser_decisions.json</li>
          </ul>
          <div className="px-5 pb-5"><Disclosure summary={t("run.inputChecksums")}>
            <table className="w-full text-xs"><tbody>{Object.entries(run.input_checksums).map(([p, h]) => <tr key={p} className="border-b border-border last:border-0"><td className="py-1 pr-3">{p}</td><td className="break-all py-1 font-mono">{h}</td></tr>)}</tbody></table>
          </Disclosure></div>
        </Card>
        <Card>
          <CardHeader title={t("run.steps")} />
          <ol className="list-decimal space-y-1 p-5 pl-10 text-sm">{run.steps_run.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
        <Card>
          <CardHeader title={t("run.limitations")} icon={<ShieldAlert className="h-5 w-5" />} />
          <ul className="list-disc space-y-1.5 p-5 pl-10 text-sm">{["mock", "docs", "model", "repro", "flags", "data"].map((k) => <li key={k}>{t(`run.lim.${k}`)}</li>)}</ul>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader title={t("run.manifest")} sub={t("run.manifestSub", { n: man.files.length })} />
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs"><thead className="sticky top-0 bg-surface-2 text-left text-muted"><tr><th className="px-4 py-2">{t("run.file")}</th><th className="px-4 py-2">SHA-256</th><th className="px-4 py-2 text-right">bytes</th></tr></thead>
            <tbody>{man.files.map((f) => <tr key={f.path} className="border-b border-border last:border-0"><td className="px-4 py-1.5 font-mono">{f.path}</td><td className="break-all px-4 py-1.5 font-mono text-muted">{f.sha256}</td><td className="tnum px-4 py-1.5 text-right">{f.bytes}</td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">{t("run.reset")}</h3><p className="text-sm text-muted">{t("run.resetSub")}</p></div>
          <Button onClick={() => { resetDemo(); setDone(true); }}><RotateCcw className="h-4 w-4" aria-hidden />{done ? t("run.resetDone") : t("run.reset")}</Button>
        </div>
      </Card>
    </ProtoPage>
  );
}
