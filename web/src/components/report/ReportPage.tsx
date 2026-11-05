"use client";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, FileText, Flag, Loader2, Lock, Quote, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CreateReportButton } from "@/components/notice/CreateReportButton";
import { DocReader } from "@/components/pdf/DocReader";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { BackLink, Button, Disclosure, EmptyState, JsonView, LinkButton, Loading, StatStrip, Tabs } from "@/components/ui/ui";
import { Chip, ConfidenceChip, ExpiringChip, FlagChip, IndicationChip, MatchChip, MockChip, ReadinessChip, indicationTone } from "@/components/ui/chips";
import { docUrl } from "@/lib/data";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { buyer, shownLots, title } from "@/lib/reports";
import { useApp, useL, useModel, type Model } from "@/lib/state";
import type { Report, ReportLot, ReportRow } from "@/lib/types";
import { useQueryState } from "@/lib/url-state";
import { useMedia } from "@/lib/use-media";

const BAR = { go: "bg-go", warn: "bg-warn", nogo: "bg-nogo", flag: "bg-flag", accent: "bg-accent", info: "bg-info", proto: "bg-proto", muted: "bg-muted" } as const;

function Processing({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ids = [setTimeout(() => setStep(1), 400), setTimeout(() => setStep(2), 800), setTimeout(onDone, 1300)];
    return () => ids.forEach(clearTimeout);
  }, [onDone]);
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border p-8 text-center" aria-live="polite">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" aria-hidden />
      <h2 className="mt-3 text-[16px] font-semibold">{t("report.processing")}</h2>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2"><div className="anim-progress h-full rounded-full bg-accent" /></div>
      <ol className="mt-4 space-y-1.5 text-left text-[13px]">
        {[0, 1, 2].map((i) => <li key={i} className={cn("flex items-center gap-2", i <= step ? "text-fg" : "text-muted")}>{i < step ? <CheckCircle2 className="h-4 w-4 text-go" aria-hidden /> : <span className="h-4 w-4 rounded-full border border-border" />}{t(`report.proc${i}`)}</li>)}
      </ol>
      <p className="mt-4 text-meta text-muted">{t("report.procNote")}</p>
    </div>
  );
}

function Summary({ lot, onPick }: { lot: ReportLot; onPick: (req: string) => void }) {
  const t = useTranslations();
  const tone = indicationTone(lot.indication);
  const groups = new Map<string, string[]>();
  lot.indication_reasons.forEach((r) => groups.set(r.code, [...(groups.get(r.code) ?? []), ...(r.req_id ? [r.req_id] : [])]));
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 pl-6" aria-label={t("report.indication")}>
      <span className={cn("absolute inset-y-0 left-0 w-1", BAR[tone])} aria-hidden />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="text-meta font-medium text-muted">{t("report.indication")}</div>
        <IndicationChip v={lot.indication} large />
        <div className="text-meta text-muted sm:ml-auto">{t("report.computedByCode")}</div>
      </div>
      <ul className="mt-3 space-y-1.5 text-[14px]">
        {[...groups.entries()].map(([code, ids]) => (
          <li key={code} className="flex flex-wrap items-center gap-1.5">
            <span>{t(`indicationReason.${code}`)}</span>
            {ids.map((id) => <button key={id} type="button" onClick={() => onPick(id)} className="t-fast tnum rounded-md border border-border px-1.5 text-meta font-semibold hover:border-accent hover:text-accent">{id}</button>)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowDetail({ m, report, row, onShow, docAvailable }: { m: Model; report: Report; row: ReportRow; onShow: () => void; docAvailable: boolean }) {
  const t = useTranslations();
  const L = useL();
  const flags = m.run.firm_flags.filter((f) => f.firm_id === report.firm_id && f.notice_id === report.notice_id && f.req_key === row.template_key);
  return (
    <div className="anim-dropdown space-y-5 border-t border-border bg-surface-2/40 px-4 py-5 text-[13.5px] sm:px-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div><div className="text-meta font-medium text-muted">{t("report.why")}</div><p className="mt-1">{L(row, "reason")}</p>
          <p className="mt-1 text-meta text-muted">{t("common.confidence")}: {L(row, "confidence_reason")}</p></div>
        <div><div className="text-meta font-medium text-muted">{t("report.readinessRule")}</div>
          <p className="mt-1">{t(`readinessText.${row.readiness}`)}{row.valid_until ? ` ${t("report.validUntil", { d: row.valid_until })}` : ""}</p>
          {row.expiring_soon && <p className="mt-1 text-meta text-warn">{t("report.expiringText")}</p>}</div>
      </div>
      {row.source && (
        <figure className="rounded-lg border border-border bg-surface p-4">
          <figcaption className="mb-1.5 flex flex-wrap items-center gap-x-2 text-meta text-muted"><Quote className="h-3.5 w-3.5" aria-hidden />{row.source.document} · {t("pdf.page")} {row.source.page_start}{!row.highlighted && ` · ${t("report.notHighlighted")}`}</figcaption>
          <blockquote className="italic">“{row.source.cited_text}”</blockquote>
          {docAvailable && <Button size="sm" className="mt-3" onClick={onShow}><FileText className="h-3.5 w-3.5" aria-hidden />{t("report.showInDocument")}</Button>}
        </figure>
      )}
      <div>
        <div className="mb-1.5 text-meta font-medium text-muted">{t("report.lockerConnection")}</div>
        {row.locker_snapshot.length === 0 ? <p className="text-flag">{t("report.noField")}</p> : row.locker_snapshot.map((s) => (
          <div key={s.id} className="border-t border-border py-2 first:border-0 first:pt-0">
            <div className="font-medium">{L(s, "label")} <span className="font-mono text-meta font-normal text-muted">{s.id}</span></div>
            <div className="mt-0.5">{s.value}</div>
            <div className="mt-0.5 text-meta text-muted">{t("company.proof")}: {s.proof_status_original} · {t("company.updated")} {s.last_updated} · {t("report.expiry")}: {s.expiry_original}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {row.adviser_corrected && <Chip tone="info" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>{t("report.adviserCorrected")}</Chip>}
        <Button size="sm" disabled title={t("report.flagDisabled")}><Flag className="h-3.5 w-3.5" aria-hidden />{t("report.flag")}</Button>
        <span className="text-meta text-muted">{t("report.flagDisabled")}</span>
      </div>
      {flags.map((f) => (
        <div key={f.flag_id} className="rounded-lg border border-flag/30 bg-flag-soft/50 p-3 text-[13px]">
          <div className="mb-1 font-medium text-flag">{t("report.flagExample")} {f.flag_id} · {f.status}</div>
          <p>“{L(f, "text")}”</p>
          {f.adviser_answer_en && <p className="mt-1"><span className="font-medium">{t("report.adviserAnswer")}:</span> {L(f, "adviser_answer")}</p>}
        </div>
      ))}
    </div>
  );
}

function Checklist({ m, report, lot, active, toggle, show, docAvailable }: { m: Model; report: Report; lot: ReportLot; active: string; toggle: (id: string) => void; show: (row: ReportRow) => void; docAvailable: boolean }) {
  const t = useTranslations();
  const L = useL();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <ol>
        {lot.rows.map((row) => {
          const open = active === row.req_id;
          const lockerLabel = row.locker_snapshot.length ? row.locker_snapshot.map((x) => L(x, "label")).join(", ") : t("report.noField");
          return (
            <li key={row.req_id} id={`req-${row.req_id}`} className="scroll-mt-20 border-t border-border first:border-0">
              <button type="button" onClick={() => toggle(row.req_id)} aria-expanded={open}
                className={cn("t-fast grid w-full grid-cols-[minmax(0,1fr)_16px] items-start gap-x-3 gap-y-2.5 px-4 py-4 text-left", open ? "bg-accent-soft/40" : "hover:bg-surface-2/50")}>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 text-meta text-muted">
                    <b className="tnum text-fg">{row.req_id}</b><span>{t(`category.${row.category}`)}</span><span>·</span>
                    <span className={row.mandatory ? "text-fg" : ""}>{row.mandatory ? t("report.mandatory") : t("report.optional")}</span>
                    {row.lot_id && <><span>·</span><span>{t("report.lot")} {row.lot_id}</span></>}<span>·</span><span>{t("pdf.page")} {row.source?.page_start}</span>
                  </span>
                  <span className="mt-1 block text-[14px] font-medium">{L(row, "text_summary")}</span>
                  <span className={cn("mt-0.5 block text-meta", row.locker_snapshot.length ? "text-muted" : "text-flag")}>{t("report.lockerShort")}: {lockerLabel}</span>
                </span>
                <ChevronDown className={cn("mt-1 h-4 w-4 text-muted transition-transform duration-150", open && "rotate-180")} aria-hidden />
                <span className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  <span><MatchChip v={row.match_status} /></span>
                  <span><ConfidenceChip v={row.match_confidence} /></span>
                  <span className="flex flex-wrap items-center gap-2"><ReadinessChip v={row.readiness} />{row.expiring_soon && <ExpiringChip date={row.valid_until} />}</span>
                </span>
              </button>
              {open && <RowDetail m={m} report={report} row={row} onShow={() => show(row)} docAvailable={docAvailable} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A4 detail — the flagship: indication, readiness, checklist, missing documents, linked document, technical details. */
export function ReportPage({ id }: { id: string }) {
  const t = useTranslations();
  const m = useModel();
  const { href, lang, localAdds } = useApp();
  const L = useL();
  const [added, setAdded] = useQueryState("added");
  const [lotParam, setLot] = useQueryState("lot");
  const [active, setActive] = useQueryState("req");
  const [page, setPage] = useState(1);
  const [reader, setReader] = useState(false);
  const desktop = useMedia("(min-width: 1280px)");
  const report = m?.reports.reports[id];
  const lots = useMemo(() => (report && m ? (m.visibility(id) === "forwarded" ? shownLots(report) : report.lots) : []), [report, m, id]);
  const lot = lots.find((l) => l.lot_id === lotParam) ?? lots[0];
  const activeRow = lot?.rows.find((r) => r.req_id === active);
  useEffect(() => { if (activeRow?.source) setPage(activeRow.source.page_start); }, [activeRow]);

  if (!m) return <Loading />;
  const rec = m.notices[id];
  if (!rec) return <EmptyState title={t("common.notFoundTitle")} text={t("common.notFound")} />;
  const vis = m.visibility(id);
  const head = (
    <header className="mb-8">
      <div className="mb-4"><BackLink href={href("/reports")}>{t("reports.title")}</BackLink></div>
      <div className="flex flex-wrap items-center gap-x-2 text-meta text-muted"><span className="tnum">{id}</span><span>·</span><span>{buyer(m, id)}</span>{rec.mock && <MockChip />}</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className="min-w-0 max-w-3xl text-[24px] font-semibold leading-tight tracking-[-0.015em] sm:text-title">{title(m, id, lang)}</h1>
        <LinkButton href={href(`/notices/${id}`)}>{t("screening.openNotice")}</LinkButton>
      </div>
    </header>
  );
  if (vis === "pending") return <div className="anim-page">{head}<div className="rounded-xl border border-border p-6"><FlagChip /><p className="mt-3 text-body">{t("report.pendingText")}</p><LinkButton className="mt-4" href={href("/prototype/adviser", { notice: id })}>{t("notice.toAdviser")}</LinkButton></div></div>;
  if (vis === "not_screened" || !report) return <div className="anim-page">{head}<EmptyState title={t("notice.notScreened")} text={L(m.act[id], "reason")} /></div>;
  if (vis === "hidden") return <div className="anim-page">{head}<EmptyState title={t("report.hiddenTitle")} text={t("report.hiddenText", { fit: report.fit_score ?? "—", th: m.screening.threshold })} action={<CreateReportButton noticeId={id} via="notice_browser" />} /></div>;
  if (added && localAdds.includes(id)) return <div className="anim-page">{head}<Processing onDone={() => setAdded(null)} /></div>;
  if (!lot) return <Loading />;

  const dl = daysLeft(report.deadline);
  const notRelevant = vis === "forwarded" ? report.lots.filter((l) => !l.relevant && lots.length < report.lots.length) : [];
  const docs = m.index.docs[id];
  const missingRows = lot.rows.filter((r) => lot.missing_documents.includes(r.req_id));
  const n = (s: string) => lot.rows.filter((r) => r.match_status === s).length;
  const highlights = lot.rows.filter((r) => r.highlight).map((r) => ({ id: r.req_id, page: r.highlight!.page, rects: r.highlight!.rects, label: L(r, "text_summary") }));
  const toggle = (rid: string) => setActive(active === rid ? null : rid, "push");
  const pick = (rid: string) => { setActive(rid, "push"); setTimeout(() => document.getElementById(`req-${rid}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50); };
  const show = (row: ReportRow) => { setActive(row.req_id); if (row.source) setPage(row.source.page_start); if (!desktop) setReader(true); };
  const stateLabel = vis === "forwarded" ? t("report.stateForwarded") : vis === "manual_recorded" ? t("report.stateManualRecorded") : t("report.stateManualLocal");

  return (
    <div className="anim-page">
      {head}
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
        <Chip tone={vis === "forwarded" ? "accent" : "proto"}>{stateLabel}</Chip>
        <span>{t("screening.fit")} <b className="tnum text-fg">{report.fit_score}</b></span>
        <ConfidenceChip v={report.confidence} prefix />
        <span className="tnum">{t("notices.col.deadline")} <b className="text-fg">{fmtDate(report.deadline, lang, true)}</b>{dl !== null ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</span>
        <span>{t("notices.col.value")} <b className="tnum text-fg">{rec.derived.estimated_value_nok === null ? t("common.unknown") : nok(rec.derived.estimated_value_nok, lang)}</b></span>
      </div>
      {report.manual_addition && vis === "manual_recorded" && <p className="-mt-4 mb-8 text-[13px] text-muted">{L(report.manual_addition, "note")}</p>}

      {(lots.length > 1 || notRelevant.length > 0) && (
        <div className="mb-6">
          {lots.length > 1 && <Tabs value={lot.lot_id ?? ""} onChange={(v) => setLot(v, "push")} tabs={lots.map((l) => ({ id: l.lot_id ?? "", label: <>{t("report.lot")} {l.lot_id}<IndicationChip v={l.indication} /></> }))} />}
          {lots.length === 1 && <div className="text-[14px] font-medium">{t("report.lot")} {lot.lot_id}</div>}
          {notRelevant.map((l) => <p key={l.lot_id} className="mt-1 text-meta text-muted">{t("report.lotNotRelevant", { lot: l.lot_id ?? "", fit: l.fit_score ?? "—" })}</p>)}
        </div>
      )}

      <div className="space-y-6">
        <Summary lot={lot} onPick={pick} />
        <StatStrip items={[
          { label: t("report.kRequirements"), value: lot.rows.length },
          { label: t("match.met"), value: n("met"), tone: n("met") ? "go" : undefined },
          { label: t("report.kPartlyNot"), value: n("partly_met") + n("not_met"), tone: n("not_met") ? "nogo" : n("partly_met") ? "warn" : undefined },
          { label: t("match.lacks_data"), value: n("lacks_data"), tone: n("lacks_data") ? "flag" : undefined },
          { label: t("report.missingDocs"), value: missingRows.length, tone: missingRows.length ? "warn" : undefined },
        ]} />
      </div>

      <div className="mt-10 grid gap-6 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-section font-semibold">{t("report.checklist")}</h2>
              <span className="text-meta text-muted">{t("report.checklistSub", { n: lot.rows.length })}</span>
            </div>
            <Checklist m={m} report={report} lot={lot} active={active} toggle={toggle} show={show} docAvailable={!!docs} />
          </section>
          <section>
            <h2 className="mb-1 text-section font-semibold">{t("report.missingDocs")}</h2>
            <p className="mb-3 text-[13px] text-muted">{t("report.missingDocsSub")}</p>
            {missingRows.length === 0 ? <p className="text-body text-muted">{t("report.noMissing")}</p> : (
              <ul className="overflow-hidden rounded-xl border border-border">
                {missingRows.map((r) => (
                  <li key={r.req_id} className="border-t border-border first:border-0">
                    <button type="button" onClick={() => pick(r.req_id)} className="t-fast flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-2/50">
                      <span className="min-w-0"><b className="tnum">{r.req_id}</b> <span className="text-muted">·</span> {r.proof_type ?? L(r, "text_summary")}</span>
                      <ReadinessChip v={r.readiness} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        {docs && desktop && (
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="h-[calc(100vh-120px)] min-h-[520px]">
              <PdfViewer url={docUrl(id, docs.files[0])} title={`${docs.files[0]}${docs.source === "placeholder" ? " · MOCK" : ""}`} page={page} onPageChange={setPage}
                activeId={active || null} onSelect={(r) => pick(r)} highlights={highlights} />
            </div>
          </aside>
        )}
      </div>
      {docs && !desktop && <Button className="mt-6 w-full" onClick={() => setReader(true)}><FileText className="h-4 w-4" aria-hidden />{t("report.openDocument")}</Button>}
      {reader && docs && <DocReader url={docUrl(id, docs.files[0])} title={docs.files[0]} page={page} highlights={highlights} activeId={active || null} onClose={() => setReader(false)} caption={activeRow ? `${activeRow.req_id} · ${L(activeRow, "text_summary")}` : undefined} />}

      <div className="mt-10 space-y-3">
        <Disclosure summary={t("report.technical")}>
          <JsonView data={{
            notice_fields_used: { tender_deadline_utc: rec.original.tender_deadline_utc, lot_count: rec.original.lot_count, estimated_value: rec.original.estimated_value, currency: rec.original.currency },
            screening: m.rank[id] ? { fit_score: m.rank[id].fit_score, confidence: m.rank[id].confidence, sub_scores: m.rank[id].sub_scores, lot_results: m.rank[id].lot_results } : null,
            lot: { lot_id: lot.lot_id, indication: lot.indication, indication_reasons: lot.indication_reasons, missing_documents: lot.missing_documents, ignored_uncited: lot.ignored_uncited },
            requirements_with_comparison: lot.rows,
          }} />
        </Disclosure>
        <p className="flex items-start gap-2 pt-3 text-[13px] text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span><b className="font-medium text-fg">{t("report.disclaimer")}</b> {report.mock ? t("report.mockNote") : ""} {t("report.footnote")}</span></p>
      </div>
    </div>
  );
}
