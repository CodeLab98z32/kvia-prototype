"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle, ArrowLeft, Ban, CheckCircle2, Clock, FileWarning, Flag, Info, Loader2, Lock, Quote, ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CreateReportButton } from "@/components/notice/CreateReportButton";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { Button, Card, CardHeader, Disclosure, JsonView, LinkButton, Loading, Tabs } from "@/components/ui/ui";
import {
  Chip, ConfidenceChip, ExpiringChip, FitBar, FlagChip, IndicationChip, MatchChip, MockChip, ReadinessChip, RouteChip,
} from "@/components/ui/chips";
import { docUrl } from "@/lib/data";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { buyer, shownLots, title } from "@/lib/reports";
import { useApp, useL, useModel, type Model } from "@/lib/state";
import type { Indication, Report, ReportLot, ReportRow } from "@/lib/types";

const BANNER: Record<Indication, { cls: string; icon: React.ReactNode }> = {
  go: { cls: "border-go/40 bg-go-soft text-go", icon: <CheckCircle2 className="h-7 w-7" aria-hidden /> },
  borderline: { cls: "border-warn/40 bg-warn-soft text-warn", icon: <AlertTriangle className="h-7 w-7" aria-hidden /> },
  "no-go": { cls: "border-nogo/40 bg-nogo-soft text-nogo", icon: <Ban className="h-7 w-7" aria-hidden /> },
};

function Processing({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ids = [setTimeout(() => setStep(1), 450), setTimeout(() => setStep(2), 900), setTimeout(onDone, 1450)];
    return () => ids.forEach(clearTimeout);
  }, [onDone]);
  return (
    <Card className="p-8">
      <div className="mx-auto max-w-md text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">{t("report.processing")}</h2>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full animate-progress rounded-full bg-accent" /></div>
        <ol className="mt-4 space-y-1 text-left text-sm">
          {[0, 1, 2].map((i) => <li key={i} className={cn("flex items-center gap-2", i <= step ? "text-fg" : "text-muted")}>{i < step ? <CheckCircle2 className="h-4 w-4 text-go" aria-hidden /> : <span className="h-4 w-4 rounded-full border border-border" />}{t(`report.proc${i}`)}</li>)}
        </ol>
        <p className="mt-4 text-xs text-muted">{t("report.procNote")}</p>
      </div>
    </Card>
  );
}

function reasonText(t: ReturnType<typeof useTranslations>, code: string) {
  return t(`indicationReason.${code}`);
}

function Banner({ lot, onPick }: { lot: ReportLot; onPick: (req: string) => void }) {
  const t = useTranslations();
  const b = BANNER[lot.indication];
  const groups = new Map<string, string[]>();
  lot.indication_reasons.forEach((r) => groups.set(r.code, [...(groups.get(r.code) ?? []), ...(r.req_id ? [r.req_id] : [])]));
  return (
    <div className={cn("rounded-xl border p-5", b.cls)} role="status">
      <div className="flex flex-wrap items-center gap-3">
        {b.icon}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{t("report.indication")}</div>
          <div className="text-2xl font-extrabold">{t(`indication.${lot.indication}`)}</div>
        </div>
        <div className="ml-auto text-xs font-medium opacity-90">{t("report.computedByCode")}</div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-fg">
        {[...groups.entries()].map(([code, ids]) => (
          <li key={code} className="flex flex-wrap items-center gap-1.5">
            <span>• {reasonText(t, code)}</span>
            {ids.map((id) => <button key={id} onClick={() => onPick(id)} className="rounded border border-current/30 bg-surface px-1.5 text-xs font-semibold hover:underline">{id}</button>)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LockerCell({ row }: { row: ReportRow }) {
  const t = useTranslations();
  const L = useL();
  if (!row.locker_snapshot.length) return <span className="text-xs text-flag">{t("report.noField")}</span>;
  const s = row.locker_snapshot[0];
  return (
    <div className="text-xs">
      <div className="font-semibold text-fg">{row.locker_snapshot.map((x) => L(x, "label")).join(", ")}</div>
      <div className="text-muted">{s.proof_status_original}{s.expiry_original && s.expiry_original !== "–" ? ` · ${t("report.expiry")}: ${s.expiry_original}` : ""}</div>
    </div>
  );
}

function RowDetail({ m, report, row }: { m: Model; report: Report; row: ReportRow }) {
  const t = useTranslations();
  const L = useL();
  const flags = m.run.firm_flags.filter((f) => f.firm_id === report.firm_id && f.notice_id === report.notice_id && f.req_key === row.template_key);
  return (
    <div className="space-y-3 border-t border-border bg-surface-2/50 p-4 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div><div className="text-xs font-semibold text-muted">{t("report.why")}</div><p>{L(row, "reason")}</p>
          <p className="mt-1 text-xs text-muted">{t("common.confidence")}: {L(row, "confidence_reason")}</p></div>
        <div><div className="text-xs font-semibold text-muted">{t("report.readinessRule")}</div>
          <p>{t(`readinessText.${row.readiness}`)}{row.valid_until ? ` ${t("report.validUntil", { d: row.valid_until })}` : ""}</p>
          {row.expiring_soon && <p className="mt-1 text-xs text-warn">{t("report.expiringText")}</p>}</div>
      </div>
      {row.source && (
        <blockquote className="rounded-lg border-l-4 border-accent bg-surface p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted"><Quote className="h-3.5 w-3.5" aria-hidden />{row.source.document} · {t("pdf.page")} {row.source.page_start}{!row.highlighted && ` · ${t("report.notHighlighted")}`}</div>
          <p className="italic">“{row.source.cited_text}”</p>
        </blockquote>
      )}
      {row.locker_snapshot.map((s) => (
        <div key={s.id} className="rounded-lg bg-surface p-3 text-xs">
          <div className="font-semibold">{L(s, "label")} <span className="font-normal text-muted">({s.id})</span></div>
          <div className="mt-1">{s.value}</div>
          <div className="mt-1 text-muted">{t("company.proof")}: {s.proof_status_original} · {t("company.updated")}: {s.last_updated} · {t("report.expiry")}: {s.expiry_original}</div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {row.adviser_corrected && <Chip tone="info" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>{t("report.adviserCorrected")}</Chip>}
        <Button disabled title={t("report.flagDisabled")}><Flag className="h-4 w-4" aria-hidden />{t("report.flag")}</Button>
        <span className="text-xs text-muted">{t("report.flagDisabled")}</span>
      </div>
      {flags.map((f) => (
        <div key={f.flag_id} className="rounded-lg border border-flag/30 bg-flag-soft p-3 text-xs">
          <div className="mb-1 flex items-center gap-2 font-semibold text-flag"><Flag className="h-3.5 w-3.5" aria-hidden />{t("report.flagExample")} {f.flag_id} · {f.status}</div>
          <p className="text-fg">“{L(f, "text")}”</p>
          {f.adviser_answer_en && <p className="mt-1 text-fg"><b>{t("report.adviserAnswer")}:</b> {L(f, "adviser_answer")}</p>}
        </div>
      ))}
    </div>
  );
}

function Checklist({ m, report, lot, active, setActive }: { m: Model; report: Report; lot: ReportLot; active: string | null; setActive: (id: string) => void }) {
  const t = useTranslations();
  const L = useL();
  return (
    <ol className="divide-y divide-border">
      {lot.rows.map((row) => {
        const isActive = active === row.req_id;
        return (
          <li key={row.req_id} id={`req-${row.req_id}`} className={cn(isActive && "bg-accent-soft/30")}>
            <button onClick={() => setActive(row.req_id)} aria-expanded={isActive} className="block w-full px-4 py-3 text-left hover:bg-surface-2/60">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <b className="text-fg">{row.req_id}</b>
                  <Chip>{t(`category.${row.category}`)}</Chip>
                  {row.mandatory ? <Chip tone="accent">{t("report.mandatory")}</Chip> : <Chip>{t("report.optional")}</Chip>}
                  {row.lot_id && <Chip tone="info">{t("report.lot")} {row.lot_id}</Chip>}
                  <span>· {t("pdf.page")} {row.source?.page_start}</span>
                </div>
                <div className="mt-1 font-medium">{L(row, "text_summary")}</div>
                <div className="mt-1.5"><LockerCell row={row} /></div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <MatchChip v={row.match_status} /><ConfidenceChip v={row.match_confidence} />
                <ReadinessChip v={row.readiness} />
                {row.expiring_soon && <ExpiringChip date={row.valid_until} />}
              </div>
            </button>
            {isActive && <RowDetail m={m} report={report} row={row} />}
          </li>
        );
      })}
    </ol>
  );
}

export function ReportPage({ id }: { id: string }) {
  const t = useTranslations();
  const m = useModel();
  const { href, lang, localAdds } = useApp();
  const L = useL();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const added = sp.get("added");
  const [processing, setProcessing] = useState(!!added);
  const [page, setPage] = useState(1);
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v); else p.delete(k);
    p.delete("added");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const report = m?.reports.reports[id];
  const lots = useMemo(() => (report && m ? (m.visibility(id) === "forwarded" ? shownLots(report) : report.lots) : []), [report, m, id]);
  const lotId = sp.get("lot") ?? lots[0]?.lot_id ?? null;
  const lot = lots.find((l) => l.lot_id === lotId) ?? lots[0];
  const active = sp.get("req");
  const activeRow = lot?.rows.find((r) => r.req_id === active);
  useEffect(() => { if (activeRow?.source) setPage(activeRow.source.page_start); }, [activeRow]);
  useEffect(() => { if (active) document.getElementById(`req-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  if (!m) return <Loading />;
  const rec = m.notices[id];
  const vis = m.visibility(id);
  const back = <Link href={href("/reports")} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />{t("reports.title")}</Link>;
  const head = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted"><span className="tnum">{id}</span>{rec?.mock && <MockChip />}<span>· {buyer(m, id)}</span></div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title(m, id, lang)}</h1>
      </div>
      <LinkButton href={href(`/notices/${id}`)}>{t("screening.openNotice")}</LinkButton>
    </div>
  );
  if (vis === "pending") {
    return <div className="space-y-4">{back}{head}<Card className="p-6"><FlagChip /><p className="mt-3">{t("report.pendingText")}</p>
      <LinkButton className="mt-3" href={href("/prototype/adviser", { notice: id })}>{t("notice.toAdviser")}</LinkButton></Card></div>;
  }
  if (vis === "not_screened" || !report) {
    return <div className="space-y-4">{back}{head}<Card className="p-6"><p>{t("notice.notScreened")}</p><p className="mt-1 text-sm text-muted">{L(m.act[id], "reason")}</p></Card></div>;
  }
  if (vis === "hidden") {
    return <div className="space-y-4">{back}{head}<Card className="p-6"><p className="font-medium">{t("report.hiddenTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("report.hiddenText", { fit: report.fit_score ?? "—", th: m.screening.threshold })}</p>
      <CreateReportButton className="mt-4" noticeId={id} via="notice_browser" /></Card></div>;
  }
  if (processing && localAdds.includes(id)) return <div className="space-y-4">{back}{head}<Processing onDone={() => { setProcessing(false); setParam("added", null); }} /></div>;
  if (!lot) return <Loading />;
  const sr = m.rank[id];
  const dl = daysLeft(report.deadline);
  const notRelevant = report.state === "forwarded" ? report.lots.filter((l) => !l.relevant && lots.length < report.lots.length) : [];
  const docs = m.index.docs[id];
  const missingRows = lot.rows.filter((r) => lot.missing_documents.includes(r.req_id));
  const stateLabel = vis === "forwarded" ? t("report.stateForwarded") : vis === "manual_recorded" ? t("report.stateManualRecorded") : t("report.stateManualLocal");

  return (
    <div className="animate-fadein space-y-5">
      {back}
      {head}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip tone={vis === "forwarded" ? "accent" : "proto"}>{stateLabel}</Chip>
        <RouteChip v={report.route} /><ConfidenceChip v={report.confidence} prefix />
        <span className="w-40"><FitBar value={report.fit_score} threshold={m.screening.threshold} compact /></span>
        <span className="inline-flex items-center gap-1 text-muted"><Clock className="h-4 w-4" aria-hidden />{t("notices.col.deadline")}: {fmtDate(report.deadline, lang, true)}{dl !== null ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</span>
        <span className="text-muted">· {t("notices.col.value")}: {rec.derived.estimated_value_nok === null ? t("common.unknown") : nok(rec.derived.estimated_value_nok, lang)}</span>
      </div>
      {report.manual_addition && vis === "manual_recorded" && <p className="text-sm text-muted">{L(report.manual_addition, "note")}</p>}

      {lots.length > 1 || notRelevant.length ? (
        <div className="flex flex-wrap items-center gap-3">
          {lots.length > 1 && <Tabs tabs={lots.map((l) => ({ id: l.lot_id ?? "-", label: <span className="flex items-center gap-1.5">{t("report.lot")} {l.lot_id}<IndicationChip v={l.indication} /></span> }))} value={lot.lot_id ?? "-"} onChange={(v) => setParam("lot", v)} />}
          {lots.length === 1 && <Chip tone="info">{t("report.lot")} {lot.lot_id}</Chip>}
          {notRelevant.map((l) => <span key={l.lot_id} className="text-sm text-muted">{t("report.lotNotRelevant", { lot: l.lot_id ?? "", fit: l.fit_score ?? "—" })}</span>)}
        </div>
      ) : null}

      <Banner lot={lot} onPick={(r) => setParam("req", r)} />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card className="min-w-0">
          <CardHeader title={t("report.checklist")} sub={t("report.checklistSub", { n: lot.rows.length })} />
          <Checklist m={m} report={report} lot={lot} active={active} setActive={(r) => setParam("req", active === r ? null : r)} />
        </Card>
        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          {docs && (
            <div className="h-[560px]">
              <PdfViewer url={docUrl(id, docs.files[0])} title={`${docs.files[0]}${docs.source === "placeholder" ? " (MOCK)" : ""}`} page={page} onPageChange={setPage}
                activeId={active} onSelect={(r) => setParam("req", r)}
                highlights={lot.rows.filter((r) => r.highlight).map((r) => ({ id: r.req_id, page: r.highlight!.page, rects: r.highlight!.rects, label: L(r, "text_summary") }))} />
            </div>
          )}
          <Card>
            <CardHeader title={t("report.missingDocs")} icon={<FileWarning className="h-5 w-5" />} sub={t("report.missingDocsSub")} />
            <ul className="divide-y divide-border">
              {missingRows.length === 0 && <li className="px-5 py-3 text-sm text-muted">{t("report.noMissing")}</li>}
              {missingRows.map((r) => (
                <li key={r.req_id}><button onClick={() => setParam("req", r.req_id)} className="flex w-full items-center justify-between gap-2 px-5 py-2.5 text-left text-sm hover:bg-surface-2">
                  <span><b>{r.req_id}</b> · {r.proof_type ?? L(r, "text_summary")}</span><ReadinessChip v={r.readiness} /></button></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Disclosure summary={t("common.underlying")}>
        <JsonView data={{
          notice_fields_used: { tender_deadline_utc: rec.original.tender_deadline_utc, lot_count: rec.original.lot_count, estimated_value: rec.original.estimated_value, currency: rec.original.currency },
          screening: sr ? { fit_score: sr.fit_score, confidence: sr.confidence, sub_scores: sr.sub_scores, lot_results: sr.lot_results } : null,
          lot: { lot_id: lot.lot_id, indication: lot.indication, indication_reasons: lot.indication_reasons, missing_documents: lot.missing_documents },
          requirements_with_comparison: lot.rows,
        }} />
      </Disclosure>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-4 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <p><b>{t("report.disclaimer")}</b> <span className="text-muted">{report.mock ? t("report.mockNote") : ""}</span></p>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5" aria-hidden />{t("report.footnote")}</p>
    </div>
  );
}
