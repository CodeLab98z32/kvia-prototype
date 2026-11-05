"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { FitBar, IndicationChip, MockChip, RouteChip } from "@/components/ui/chips";
import { LinkButton, Loading, Section, StatStrip, TableCard, td, th, tr } from "@/components/ui/ui";
import { daysLeft } from "@/lib/format";
import { buyer, shownLotsFor, title, visibleReports } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";

const STAGES = ["pre", "screen", "report"] as const;

/** A1 Overview: orientation for the selected firm — what Kvia does, its current results, how it works. */
export default function Overview() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  if (!m) return <Loading />;
  const vis = visibleReports(m);
  const forwarded = m.screening.ranked.filter((r) => r.route === "forwarded").length;
  const missing = vis.reduce((s, v) => s + v.lots.reduce((a, l) => a + l.missing_documents.length, 0), 0);
  const top = m.screening.ranked.slice(0, 5);
  return (
    <div className="anim-page space-y-12">
      <header>
        <div className="text-meta font-medium text-muted">{m.profile.firm.name} · {L(m.profile.firm, "sector")}</div>
        <h1 className="mt-2 max-w-3xl text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-title">{t("overview.title")}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{t("overview.lead")}</p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkButton variant="primary" href={href("/screening")}>{t("overview.ctaScreening")}<ArrowRight className="h-4 w-4" aria-hidden /></LinkButton>
          <LinkButton href={href("/reports")}>{t("overview.ctaReports")}</LinkButton>
        </div>
      </header>

      <StatStrip items={[
        { label: t("overview.kpi.screened"), value: m.screening.ranked.length, sub: t("overview.kpi.screenedSub", { n: m.pending.length }) },
        { label: t("overview.kpi.reports"), value: vis.length, sub: t("overview.kpi.reportsSub2", { f: forwarded, m: vis.length - forwarded }) },
        { label: t("overview.kpi.missing"), value: missing, sub: t("overview.kpi.missingSub"), tone: missing ? "warn" : undefined },
      ]} />

      <Section title={t("overview.topTitle")} sub={t("overview.topSub", { th: m.screening.threshold })}
        right={<Link href={href("/screening")} className="t-fast inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">{t("overview.seeAll")}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>}>
        <TableCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={`${th} hidden sm:table-cell`}>#</th><th className={th}>{t("notices.col.notice")}</th><th className={th}>{t("screening.fit")}</th><th className={`${th} hidden sm:table-cell`}>{t("notices.col.deadline")}</th><th className={`${th} hidden md:table-cell`}>{t("screening.routeInd")}</th></tr></thead>
              <tbody>
                {top.map((r) => {
                  const dl = daysLeft(m.notices[r.notice_id].derived.tender_deadline);
                  const lots = shownLotsFor(m, r.notice_id);
                  const v = m.visibility(r.notice_id);
                  return (
                    <tr key={r.notice_id} className={tr}>
                      <td className={`${td} tnum hidden w-10 pr-0 text-muted sm:table-cell`}>{r.rank}</td>
                      <td className={td}>
                        <Link href={href("/screening", { open: r.notice_id })} className="font-medium hover:text-accent">{title(m, r.notice_id, lang)}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted"><span>{buyer(m, r.notice_id)}</span>{m.notices[r.notice_id].mock && <MockChip />}</div>
                      </td>
                      <td className={td}><FitBar value={r.fit_score} threshold={m.screening.threshold} compact /></td>
                      <td className={`${td} tnum hidden whitespace-nowrap text-muted sm:table-cell`}>{dl !== null ? t("common.daysLeft", { n: dl }) : "—"}</td>
                      <td className={`${td} hidden md:table-cell`}><span className="flex flex-wrap items-center gap-1.5"><RouteChip v={r.route} />{(v === "forwarded" || v === "manual_recorded" || v === "manual_local") && lots.map((l) => <IndicationChip key={l.lot_id ?? "-"} v={l.indication} />)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TableCard>
      </Section>

      <Section title={t("overview.how")} sub={t("overview.howSub")}>
        <ol className="grid gap-8 border-t border-border pt-6 md:grid-cols-3">
          {STAGES.map((k, i) => (
            <li key={k} className="min-w-0">
              <div className="tnum text-meta font-semibold text-accent">0{i + 1}</div>
              <h3 className="mt-1 text-[16px] font-semibold">{t(`chain.${k}.title`)}</h3>
              <p className="mt-2 text-body text-muted">{t(`chain.${k}.text`)}</p>
              <dl className="mt-4 space-y-1 text-[13px]">
                <div><dt className="inline text-muted">{t("overview.aiLabel")}: </dt><dd className="inline">{t(`chain.${k}.ai`)}</dd></div>
                <div><dt className="inline text-muted">{t("overview.humanLabel")}: </dt><dd className="inline">{t(`chain.${k}.human`)}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[13px] text-muted">{t("report.disclaimer")} {t("overview.disclaimerMore")} <Link href={href("/prototype/logic")} className="font-medium text-accent hover:underline">{t("overview.moreLogic")}</Link></p>
      </Section>
    </div>
  );
}
