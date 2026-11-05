"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, CardHeader, Disclosure, Loading } from "@/components/ui/ui";
import { useJson } from "@/lib/data";
import { evidenceHref } from "@/lib/evidence";
import { useApp } from "@/lib/state";
import type { Coverage, Manifest, RunInfo } from "@/lib/types";

/** Internal, development-only statistics: mode coverage of the mock run, manifest, input checksums. Not part of the
 *  graded prototype. */
export default function DevStatsPage() {
  const t = useTranslations();
  const { href, firm } = useApp();
  const d = useJson<[Coverage, Manifest, RunInfo]>(["run/mode_coverage.json", "run/manifest.json", "run/run_info.json"]);
  if (!d) return <Loading />;
  const [cov, man, run] = d;
  const groups = [...new Set(cov.modes.map((x) => x.group))];
  const covered = cov.modes.filter((x) => x.examples.length).length;
  return (
    <ProtoPage internal title={t("dev.title")} sub={t("dev.sub")}>
      <Card>
        <CardHeader title={t("tests.coverage")} sub={t("tests.coverageSub", { c: covered, n: cov.modes.length })} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g} className="rounded-md border border-border">
              <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.replace(/_/g, " ")}</div>
              <ul className="divide-y divide-border text-[13px]">
                {cov.modes.filter((x) => x.group === g).map((x) => (
                  <li key={x.mode} className="flex flex-wrap items-start gap-2 px-3 py-2">
                    {x.examples.length ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-go" aria-label="covered" /> : <XCircle className="mt-0.5 h-4 w-4 text-nogo" aria-label="missing" />}
                    <span className="min-w-0 flex-1">{x.mode}</span>
                    <span className="flex flex-wrap gap-1">{x.examples.slice(0, 3).map((e, i) => (
                      <Link key={i} href={evidenceHref(e, href, firm)} className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-accent hover:underline">
                        {[e.firm_id, e.notice_id, e.lot_id && `lot ${e.lot_id}`, e.req_id].filter(Boolean).join(" · ") || e.note}
                      </Link>))}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 space-y-3">
        <Disclosure summary={`${t("run.manifest")} · ${man.files.length} · ${man.manifest_sha256.slice(0, 16)}…`}>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-xs"><tbody>{man.files.map((f) => <tr key={f.path} className="border-b border-border last:border-0"><td className="py-1 pr-3 font-mono">{f.path}</td><td className="break-all py-1 font-mono text-muted">{f.sha256}</td><td className="tnum py-1 pl-3 text-right">{f.bytes}</td></tr>)}</tbody></table>
          </div>
        </Disclosure>
        <Disclosure summary={t("run.inputChecksums")}>
          <table className="w-full text-xs"><tbody>{Object.entries(run.input_checksums).map(([p, h]) => <tr key={p} className="border-b border-border last:border-0"><td className="py-1 pr-3">{p}</td><td className="break-all py-1 font-mono">{h}</td></tr>)}</tbody></table>
        </Disclosure>
        <Disclosure summary={t("run.steps")}>
          <ol className="list-decimal space-y-0.5 pl-6 text-[13px]">{run.steps_run.map((s) => <li key={s}>{s}</li>)}</ol>
        </Disclosure>
      </div>
    </ProtoPage>
  );
}
