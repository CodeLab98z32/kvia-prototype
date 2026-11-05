"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Fragment } from "react";
import { CreateReportButton } from "@/components/notice/CreateReportButton";
import { SubScoreTable } from "@/components/screening/SubScoreTable";
import { Disclosure, JsonView, LinkButton, Loading, PageTitle, StatStrip, TableCard } from "@/components/ui/ui";
import { Chip, ConfidenceChip, FitBar, IndicationChip, MockChip, RouteChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate } from "@/lib/format";
import { buyer, shownLotsFor, title } from "@/lib/reports";
import { useApp, useL, useModel, type Model } from "@/lib/state";
import type { ScreenResult } from "@/lib/types";
import { useQueryState } from "@/lib/url-state";

const GRID = "lg:grid-cols-[40px_minmax(0,1fr)_150px_110px_120px_170px_20px]";

function Expanded({ m, r }: { m: Model; r: ScreenResult }) {
  const t = useTranslations();
  const L = useL();
  const { href, lang } = useApp();
  const rec = m.notices[r.notice_id];
  const vis = m.visibility(r.notice_id);
  const sum = Object.values(r.weighted_contributions).reduce<number>((a, b) => a + (b ?? 0), 0);
  const wsum = Object.values(r.weights_used).reduce((a, b) => a + b, 0);
  return (
    <div className="anim-dropdown border-t border-border bg-surface-2/40 px-4 py-6 sm:px-6">
      <div className="grid gap-8 [&>*]:min-w-0 xl:grid-cols-[1fr_280px]">
        <div>
          <h4 className="mb-3 text-[14px] font-semibold">{t("screening.subscores")}</h4>
          <SubScoreTable m={m} r={r} />
          {r.lot_results.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-[14px] font-semibold">{t("screening.lots")}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {r.lot_results.map((l) => (
                  <div key={l.lot_id} className={cn("rounded-xl border bg-surface p-4", l.relevant ? "border-accent/50" : "border-border")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold">{t("report.lot")} {l.lot_id}</span>
                      {l.relevant ? <Chip tone="accent">{t("screening.lotRelevant")}</Chip> : <span className="text-meta text-muted">{t("screening.lotNotRelevant")}</span>}
                    </div>
                    <div className="mt-3"><FitBar value={l.fit_score} threshold={m.screening.threshold} /></div>
                    <p className="mt-3 text-[13px] text-muted">{L(l.subject_relevance, "reason")}. {L(l.lots, "reason")}.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-5 text-[13px]">
          <div>
            <div className="font-semibold">{t("screening.howFit")}</div>
            <p className="mt-1 text-muted">{t("screening.howFitText")}</p>
            <p className="tnum mt-2">Σ(w×s) / Σw = {sum.toFixed(1)} / {wsum.toFixed(2)} → <b>{r.fit_score}</b>{r.lot_results.length ? ` (${t("screening.bestLot")})` : ""}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold">{t("common.confidence")} <ConfidenceChip v={r.confidence} /></div>
            {r.confidence_reasons.length ? <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">{r.confidence_reasons.map((c, i) => <li key={i}>{lang === "nb" ? c.nb : c.en}</li>)}</ul>
              : <p className="mt-1 text-muted">{t("screening.noConfReasons")}</p>}
          </div>
          {r.data_quality_notes_en.length > 0 && (
            <div><div className="font-semibold">{t("screening.dataNotes")}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">{(lang === "nb" ? r.data_quality_notes_nb : r.data_quality_notes_en).map((n, i) => <li key={i}>{n}</li>)}</ul></div>
          )}
          <div className="flex flex-col gap-2">
            {vis === "hidden" && <CreateReportButton noticeId={r.notice_id} via="ranked_list" />}
            {(vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local") && <LinkButton variant="primary" href={href(`/reports/${r.notice_id}`)}>{t("report.open")}</LinkButton>}
            <div className="flex gap-2"><LinkButton size="sm" href={href(`/notices/${r.notice_id}`)}>{t("screening.openNotice")}</LinkButton>
              <LinkButton size="sm" variant="ghost" href={href("/prototype/prompts", { task: "screening", notice: r.notice_id })}>{t("screening.promptIO")}</LinkButton></div>
          </div>
        </div>
      </div>
      <Disclosure className="mt-6" summary={t("common.underlying")}>
        <JsonView data={{ notice_fields_used: Object.fromEntries(Object.entries(rec.original).filter(([k]) => !k.startsWith("contact_"))), sub_scores: r.sub_scores, contradictions: r.contradictions, lot_results: r.lot_results, weighted_contributions: r.weighted_contributions }} max={360} />
      </Disclosure>
    </div>
  );
}

export default function ScreeningPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const [open, setOpen] = useQueryState("open");
  if (!m) return <Loading />;
  const th = m.screening.threshold;
  const ranked = m.screening.ranked;
  const firstBelow = ranked.findIndex((r) => r.route === "below_threshold");
  const fwd = ranked.filter((r) => r.route === "forwarded").length;
  return (
    <div className="anim-page">
      <PageTitle title={t("screening.title")} sub={t("screening.sub", { n: ranked.length, th })} />
      <StatStrip className="mb-8" items={[
        { label: t("screening.kScreened"), value: ranked.length },
        { label: t("screening.kForwarded"), value: fwd, sub: t("overview.kpi.forwardedSub", { th }) },
        { label: t("screening.kBelow"), value: ranked.length - fwd },
        { label: t("screening.kPending"), value: m.pending.length, sub: <Link className="text-accent hover:underline" href={href("/prototype/adviser")}>{t("screening.kPendingSub")}</Link>, tone: m.pending.length ? "flag" : undefined },
      ]} />
      <TableCard footer={t("screening.footnote")}>
        <div className={cn("hidden h-11 items-center gap-4 bg-surface-2/50 px-4 text-meta font-medium text-muted lg:grid", GRID)}>
          <span>#</span><span>{t("notices.col.notice")}</span><span>{t("screening.fit")}</span><span>{t("common.confidence")}</span><span>{t("notices.col.deadline")}</span><span>{t("screening.routeInd")}</span><span />
        </div>
        <ol>
          {ranked.map((r, i) => {
            const nd = m.notices[r.notice_id].derived.tender_deadline;
            const dl = daysLeft(nd);
            const vis = m.visibility(r.notice_id);
            const lots = shownLotsFor(m, r.notice_id);
            const isOpen = open === r.notice_id;
            const report = vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local";
            return (
              <Fragment key={r.notice_id}>
                {i === (firstBelow === -1 ? ranked.length : firstBelow) && (
                  <li aria-label={t("screening.thresholdLine", { th })} className="flex items-center gap-3 border-t border-border bg-accent-soft/40 px-4 py-2 text-meta font-medium text-accent">
                    <span className="h-px flex-1 bg-accent/50" /><span className="whitespace-nowrap">{t("screening.thresholdLine", { th })}</span><span className="hidden whitespace-nowrap text-muted sm:inline">· {t("screening.nearMisses")}</span><span className="h-px flex-1 bg-accent/50" />
                  </li>
                )}
                <li className="border-t border-border">
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.notice_id)} aria-expanded={isOpen}
                    className={cn("t-fast grid w-full grid-cols-[28px_minmax(0,1fr)_20px] items-center gap-x-4 gap-y-2 px-4 py-4 text-left lg:py-3.5", GRID, isOpen ? "bg-surface-2/40" : "hover:bg-surface-2/50")}>
                    <span className="tnum text-[15px] font-semibold text-muted">{r.rank}</span>
                    <span className="min-w-0">
                      <span className="block font-medium lg:truncate">{title(m, r.notice_id, lang)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                        <span className="truncate">{buyer(m, r.notice_id)}</span>
                        {m.notices[r.notice_id].mock && <MockChip />}
                        {r.lot_results.length > 0 && <span>· {t("screening.lotBadge", { n: r.lot_results.length, rel: r.lot_results.filter((l) => l.relevant).length })}</span>}
                        {r.contradictions.length > 0 && <span className="text-warn">· {t("screening.contradiction")}</span>}
                      </span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted transition-transform duration-150 lg:order-last", isOpen && "rotate-180")} aria-hidden />
                    <span className="col-span-3 flex flex-wrap items-center gap-x-5 gap-y-2 pl-[44px] lg:contents">
                      <span><FitBar value={r.fit_score} threshold={th} compact /></span>
                      <span><ConfidenceChip v={r.confidence} /></span>
                      <span className="tnum text-[13px]">{dl !== null ? t("common.daysLeft", { n: dl }) : "—"}<span className="block text-meta text-muted">{fmtDate(nd, lang)}</span></span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <RouteChip v={r.route} />
                        {report && lots.map((l) => <IndicationChip key={l.lot_id ?? "-"} v={l.indication} />)}
                        {(vis === "manual_recorded" || vis === "manual_local") && <Chip tone="proto">{t("report.manual")}</Chip>}
                      </span>
                    </span>
                  </button>
                  {isOpen && <Expanded m={m} r={r} />}
                </li>
              </Fragment>
            );
          })}
          {m.pending.map((nid) => (
            <li key={nid} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-[13px] text-muted">
              <span className="w-[28px] lg:w-10">—</span>
              <Link href={href(`/notices/${nid}`)} className="min-w-0 flex-1 truncate hover:text-fg">{title(m, nid, lang)}</Link>
              <Chip tone="flag" dot>{t("screening.notScored")}</Chip>
            </li>
          ))}
        </ol>
      </TableCard>
    </div>
  );
}
