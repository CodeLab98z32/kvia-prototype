"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, Clock, Flag, Info, Layers } from "lucide-react";
import { Fragment } from "react";
import { CreateReportButton } from "@/components/notice/CreateReportButton";
import { Card, Disclosure, JsonView, LinkButton, Loading, PageTitle } from "@/components/ui/ui";
import { Chip, ConfidenceChip, FitBar, IndicationChip, MockChip, RouteChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate } from "@/lib/format";
import { buyer, shownLotsFor, title } from "@/lib/reports";
import { SubScoreTable } from "@/components/screening/SubScoreTable";
import { useApp, useL, useModel, type Model } from "@/lib/state";
import type { ScreenResult } from "@/lib/types";

function Expanded({ m, r }: { m: Model; r: ScreenResult }) {
  const t = useTranslations();
  const L = useL();
  const { href, lang } = useApp();
  const rec = m.notices[r.notice_id];
  const vis = m.visibility(r.notice_id);
  return (
    <div className="space-y-4 border-t border-border bg-surface-2/60 p-4">
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_300px]">
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t("screening.subscores")}</h4>
          <SubScoreTable m={m} r={r} />
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-surface p-3">
            <div className="mb-1 font-semibold">{t("screening.howFit")}</div>
            <p className="text-xs text-muted">{t("screening.howFitText")}</p>
            <div className="tnum mt-2 text-xs">
              Σ(w×s) / Σw = {Object.values(r.weighted_contributions).filter((x) => x !== null).reduce((a, b) => a + (b ?? 0), 0).toFixed(1)} / {Object.values(r.weights_used).reduce((a, b) => a + b, 0).toFixed(2)} ≈ <b>{r.lot_results.length ? `${r.fit_score} (${t("screening.bestLot")})` : r.fit_score}</b>
            </div>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <div className="mb-1 flex items-center gap-2 font-semibold">{t("common.confidence")} <ConfidenceChip v={r.confidence} /></div>
            {r.confidence_reasons.length ? <ul className="list-disc pl-4 text-xs text-muted">{r.confidence_reasons.map((c, i) => <li key={i}>{lang === "nb" ? c.nb : c.en}</li>)}</ul> : <p className="text-xs text-muted">{t("screening.noConfReasons")}</p>}
          </div>
          {(r.data_quality_notes_en.length > 0) && (
            <div className="rounded-lg bg-surface p-3"><div className="mb-1 font-semibold">{t("screening.dataNotes")}</div>
              <ul className="list-disc pl-4 text-xs text-muted">{(lang === "nb" ? r.data_quality_notes_nb : r.data_quality_notes_en).map((n, i) => <li key={i}>{n}</li>)}</ul></div>
          )}
        </div>
      </div>
      {r.lot_results.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t("screening.lots")}</h4>
          <div className="grid gap-2 md:grid-cols-3">
            {r.lot_results.map((l) => (
              <div key={l.lot_id} className={cn("rounded-lg border p-3 text-sm", l.relevant ? "border-accent bg-accent-soft/50" : "border-border bg-surface")}>
                <div className="flex items-center justify-between"><b>{t("report.lot")} {l.lot_id}</b>{l.relevant ? <Chip tone="accent">{t("screening.lotRelevant")}</Chip> : <Chip>{t("screening.lotNotRelevant")}</Chip>}</div>
                <div className="mt-2"><FitBar value={l.fit_score} threshold={m.screening.threshold} compact /></div>
                <p className="mt-2 text-xs text-muted">{L(l.subject_relevance, "reason")}. {L(l.lots, "reason")}.</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {vis === "hidden" && <CreateReportButton noticeId={r.notice_id} via="ranked_list" />}
        {(vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local") && <LinkButton variant="primary" href={href(`/reports/${r.notice_id}`)}>{t("report.open")}</LinkButton>}
        <LinkButton href={href(`/notices/${r.notice_id}`)}>{t("screening.openNotice")}</LinkButton>
        <LinkButton href={href("/prototype/prompts", { task: "screening", notice: r.notice_id })}>{t("screening.promptIO")}</LinkButton>
      </div>
      <Disclosure summary={t("common.underlying")}>
        <JsonView data={{ notice_fields_used: Object.fromEntries(Object.entries(rec.original).filter(([k]) => !k.startsWith("contact_"))), sub_scores: r.sub_scores, contradictions: r.contradictions, lot_results: r.lot_results, weighted_contributions: r.weighted_contributions }} max={360} />
      </Disclosure>
    </div>
  );
}

export default function ScreeningPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = sp.get("open");
  const toggle = (id: string) => {
    const p = new URLSearchParams(sp.toString());
    if (open === id) p.delete("open"); else p.set("open", id);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  if (!m) return <Loading />;
  const th = m.screening.threshold;
  const ranked = m.screening.ranked;
  const firstBelow = ranked.findIndex((r) => r.route === "below_threshold");
  return (
    <div className="animate-fadein">
      <PageTitle title={t("screening.title")} sub={t("screening.sub", { n: ranked.length, th })} />
      {m.pending.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-flag/30 bg-flag-soft p-3 text-sm text-flag">
          <Flag className="h-4 w-4" aria-hidden />{t("screening.pendingNote", { n: m.pending.length })}
          <Link href={href("/reports")} className="font-semibold underline">{t("screening.pendingLink")}</Link>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[48px_1fr_170px_110px_110px_130px_28px] gap-3 border-b border-border bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted lg:grid">
          <span>#</span><span>{t("notices.col.notice")}</span><span>{t("screening.fit")}</span><span>{t("common.confidence")}</span><span>{t("notices.col.deadline")}</span><span>{t("screening.routeInd")}</span><span />
        </div>
        <ol>
          {ranked.map((r, i) => {
            const dl = daysLeft(m.notices[r.notice_id].derived.tender_deadline);
            const vis = m.visibility(r.notice_id);
            const lots = shownLotsFor(m, r.notice_id);
            const isOpen = open === r.notice_id;
            return (
              <Fragment key={r.notice_id}>
                {i === (firstBelow === -1 ? ranked.length : firstBelow) && (
                  <li aria-label={t("screening.thresholdLine", { th })} className="relative flex items-center gap-3 bg-accent-soft/40 px-4 py-2 text-xs font-semibold text-accent">
                    <span className="h-0.5 flex-1 bg-accent" /><span>{t("screening.thresholdLine", { th })} · {t("screening.nearMisses")}</span><span className="h-0.5 flex-1 bg-accent" />
                  </li>
                )}
                <li className={cn("border-b border-border last:border-0", isOpen && "bg-surface-2/40")}>
                  <button onClick={() => toggle(r.notice_id)} aria-expanded={isOpen}
                    className="grid w-full grid-cols-[28px_1fr] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[40px_1fr] sm:px-4 text-left hover:bg-surface-2/60 lg:grid-cols-[48px_1fr_170px_110px_110px_130px_28px]">
                    <span className="tnum text-lg font-bold text-muted">{r.rank}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold lg:truncate">{title(m, r.notice_id, lang)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="truncate">{buyer(m, r.notice_id)}</span>
                        {m.notices[r.notice_id].mock && <MockChip />}
                        {r.lot_results.length > 0 && <Chip tone="info" icon={<Layers className="h-3 w-3" aria-hidden />}>{t("screening.lotBadge", { n: r.lot_results.length, rel: r.lot_results.filter((l) => l.relevant).length })}</Chip>}
                        {r.contradictions.length > 0 && <Chip tone="warn" icon={<AlertTriangle className="h-3 w-3" aria-hidden />}>{t("screening.contradiction")}</Chip>}
                      </span>
                    </span>
                    <span className="col-span-2 lg:col-span-1"><FitBar value={r.fit_score} threshold={th} compact /></span>
                    <span className="hidden lg:block"><ConfidenceChip v={r.confidence} /></span>
                    <span className="hidden text-sm lg:block"><span className="tnum inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted" aria-hidden />{dl !== null ? t("common.daysLeft", { n: dl }) : "—"}</span><span className="block text-xs text-muted">{fmtDate(m.notices[r.notice_id].derived.tender_deadline, lang)}</span></span>
                    <span className="col-span-2 flex flex-wrap gap-1 lg:col-span-1">
                      <RouteChip v={r.route} />
                      {(vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local") && lots.map((l) => <IndicationChip key={l.lot_id ?? "-"} v={l.indication} />)}
                      {(vis === "manual_recorded" || vis === "manual_local") && <Chip tone="accent">{t("report.manual")}</Chip>}
                    </span>
                    <ChevronDown className={cn("hidden h-4 w-4 transition lg:block", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && <Expanded m={m} r={r} />}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </Card>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t("screening.footnote")}</p>
    </div>
  );
}
