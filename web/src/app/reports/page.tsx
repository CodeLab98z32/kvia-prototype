"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Loading, PageTitle } from "@/components/ui/ui";
import { Chip, IndicationChip, MockChip } from "@/components/ui/chips";
import { daysLeft } from "@/lib/format";
import { buyer, title, visibleReports, type VisibleReport } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";

function Section({ titleText, sub, count, children, empty }: { titleText: string; sub: string; count: number; children: ReactNode; empty: string }) {
  return (
    <section>
      <div className="flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">{titleText}</h2>
        <span className="tnum text-sm text-muted">{count}</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">{sub}</p>
      <div className="mt-3 divide-y divide-border border-y border-border">{count ? children : <p className="py-4 text-sm text-muted">{empty}</p>}</div>
    </section>
  );
}

export default function ReportsPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  if (!m) return <Loading />;
  const vis = visibleReports(m);
  const forwardedN = m.screening.ranked.filter((r) => r.route === "forwarded").length;
  const missing = vis.reduce((s, v) => s + v.lots.reduce((a, l) => a + l.missing_documents.length, 0), 0);
  const row = (v: VisibleReport) => {
    const r = v.report;
    const miss = v.lots.reduce((a, l) => a + l.missing_documents.length, 0);
    const dl = daysLeft(r.deadline);
    return (
      <Link key={r.notice_id} href={href(`/reports/${r.notice_id}`)} className="group grid items-center gap-x-6 gap-y-2 py-3.5 md:grid-cols-[1fr_auto_auto]">
        <div className="min-w-0">
          <div className="truncate font-medium group-hover:text-accent">{title(m, r.notice_id, lang)}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="tnum">{r.notice_id}</span><span>·</span><span className="truncate">{buyer(m, r.notice_id)}</span>
            {dl !== null && <><span>·</span><span>{t("common.daysLeft", { n: dl })}</span></>}
            <span>·</span><span className="tnum">{t("screening.fit")} {r.fit_score}</span>
            {r.mock && <MockChip />}
            {v.via === "manual_local" && <Chip tone="proto">{t("report.stateManualLocal")}</Chip>}
          </div>
          {v.via === "manual_recorded" && r.manual_addition && <p className="mt-1 text-xs text-muted">{L(r.manual_addition, "note")}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {v.lots.map((l) => <span key={l.lot_id ?? "-"} className="inline-flex items-center gap-1">{l.lot_id && <span className="text-xs text-muted">{t("report.lot")} {l.lot_id}</span>}<IndicationChip v={l.indication} /></span>)}
          <span className="text-xs text-muted">· {t("reports.missingN", { n: miss })}</span>
        </div>
        <ChevronRight className="hidden h-4 w-4 text-muted md:block" aria-hidden />
      </Link>
    );
  };
  const facts: [string, number][] = [
    [t("overview.kpi.screened"), m.screening.ranked.length], [t("overview.kpi.forwarded"), forwardedN],
    [t("overview.kpi.reports"), vis.length], [t("overview.kpi.missing"), missing],
  ];
  return (
    <div className="animate-fadein space-y-10">
      <PageTitle title={t("reports.title")} sub={t("reports.sub")} />
      <dl className="grid grid-cols-2 gap-y-4 border-y border-border py-4 sm:grid-cols-4">
        {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="tnum mt-0.5 text-xl font-semibold">{v}</dd></div>)}
      </dl>
      <Section titleText={t("reports.forwarded")} sub={t("reports.forwardedSub", { th: m.screening.threshold })} count={vis.filter((v) => v.via === "forwarded").length} empty={t("reports.noneForwarded")}>
        {vis.filter((v) => v.via === "forwarded").map(row)}
      </Section>
      <Section titleText={t("reports.manual")} sub={t("reports.manualSub")} count={vis.filter((v) => v.via !== "forwarded").length} empty={t("reports.noneManual")}>
        {vis.filter((v) => v.via !== "forwarded").map(row)}
      </Section>
      <p className="text-[13px] text-muted">{t("reports.hint")} <Link className="font-medium text-accent hover:underline" href={href("/screening")}>{t("nav.screening")}</Link>.</p>
    </div>
  );
}
