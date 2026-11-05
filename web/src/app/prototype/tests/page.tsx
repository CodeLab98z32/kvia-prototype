"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, CardHeader, Loading } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { useJson } from "@/lib/data";
import { evidenceHref } from "@/lib/evidence";
import { useApp, useL } from "@/lib/state";
import type { TestCase } from "@/lib/types";

function StatusChipTest({ s }: { s: string }) {
  if (s.startsWith("passed")) return <Chip tone="go" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}>{s}</Chip>;
  if (s.startsWith("failed")) return <Chip tone="nogo" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />}>{s}</Chip>;
  if (s.startsWith("ready")) return <Chip tone="info" icon={<Clock className="h-3.5 w-3.5" aria-hidden />}>{s}</Chip>;
  return <Chip icon={<CircleDashed className="h-3.5 w-3.5" aria-hidden />}>{s}</Chip>;
}

export default function TestsPage() {
  const t = useTranslations();
  const { href, firm } = useApp();
  const L = useL();
  const d = useJson<[TestCase[]]>(["run/tests.json"]);
  if (!d) return <Loading />;
  const [tests] = d;
  return (
    <ProtoPage title={t("tests.title")} sub={t("tests.sub")}>
      <Card className="overflow-hidden">
        <CardHeader title={t("tests.cases")} sub={t("tests.casesSub")} />
        <ul className="divide-y divide-border md:hidden">
          {tests.map((x) => (
            <li key={x.id} className="space-y-1.5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><b>{x.id}</b><Chip>{x.type}</Chip><StatusChipTest s={x.status} /></div>
              <div className="font-medium">{x.scenario}</div>
              <div className="text-xs text-muted">{t("tests.expected")}: {x.expected}</div>
              <div className="text-xs">{t("tests.observed")}: {L(x, "observed")}</div>
              <div className="flex flex-wrap gap-x-3 text-xs">{x.evidence.map((e, i) => <Link key={i} href={evidenceHref(e, href, firm)} className="text-accent hover:underline">{String(e.page)}{e.notice ? ` ${e.notice}` : ""}{e.req ? ` ${e.req}` : ""}</Link>)}</div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">{t("tests.type")}</th><th className="px-4 py-2">{t("tests.scenario")}</th><th className="px-4 py-2">{t("tests.status")}</th><th className="px-4 py-2">{t("tests.observed")}</th><th className="px-4 py-2">{t("tests.evidence")}</th></tr>
            </thead>
            <tbody>
              {tests.map((x) => (
                <tr key={x.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3 font-bold">{x.id}</td>
                  <td className="px-4 py-3"><Chip>{x.type}</Chip></td>
                  <td className="px-4 py-3"><b>{x.scenario}</b><div className="mt-1 text-xs text-muted">{t("tests.expected")}: {x.expected}</div></td>
                  <td className="px-4 py-3"><StatusChipTest s={x.status} /></td>
                  <td className="px-4 py-3 text-xs">{L(x, "observed")}</td>
                  <td className="px-4 py-3 text-xs">{x.evidence.map((e, i) => <Link key={i} href={evidenceHref(e, href, firm)} className="block text-accent hover:underline">{String(e.page)}{e.notice ? ` ${e.notice}` : ""}{e.req ? ` ${e.req}` : ""}</Link>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted">{t("tests.mockWarning")}</p>
      </Card>
    </ProtoPage>
  );
}
