"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { EmptyState, LinkButton, Loading, PageTitle, Segmented, StatStrip, TableCard, td, th, tr } from "@/components/ui/ui";
import { Chip, IndicationChip, MockChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate } from "@/lib/format";
import { buyer, title, visibleReports } from "@/lib/reports";
import { useApp, useModel } from "@/lib/state";
import { useQueryState } from "@/lib/url-state";

type Src = "all" | "forwarded" | "manual";

export default function ReportsPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const [src, setSrc] = useQueryState("src", "all");
  if (!m) return <Loading />;
  const vis = visibleReports(m);
  const lotsAll = vis.flatMap((v) => v.lots);
  const count = (k: string) => lotsAll.filter((l) => l.indication === k).length;
  const missing = vis.reduce((s, v) => s + v.lots.reduce((a, l) => a + l.missing_documents.length, 0), 0);
  const rows = vis.filter((v) => src === "all" || (src === "forwarded" ? v.via === "forwarded" : v.via !== "forwarded"));
  return (
    <div className="anim-page">
      <PageTitle title={t("reports.title")} sub={t("reports.sub2")} />
      <StatStrip className="mb-8" items={[
        { label: t("reports.kReports"), value: vis.length, sub: t("overview.kpi.reportsSub2", { f: vis.filter((v) => v.via === "forwarded").length, m: vis.filter((v) => v.via !== "forwarded").length }) },
        { label: t("indication.go"), value: count("go"), tone: count("go") ? "go" : undefined },
        { label: t("indication.borderline"), value: count("borderline"), tone: count("borderline") ? "warn" : undefined },
        { label: t("indication.no-go"), value: count("no-go"), tone: count("no-go") ? "nogo" : undefined },
        { label: t("overview.kpi.missing"), value: missing },
      ]} />
      <TableCard
        toolbar={<Segmented<Src> label={t("reports.source")} value={src as Src} onChange={(v) => setSrc(v)}
          options={[{ id: "all", label: t("common.all") }, { id: "forwarded", label: t("reports.forwarded") }, { id: "manual", label: t("reports.manual") }]} />}
        footer={<>{t("reports.hint")} <Link className="font-medium text-accent hover:underline" href={href("/screening")}>{t("nav.screening")}</Link>.</>}>
        {!rows.length ? <EmptyState title={src === "manual" ? t("reports.noneManual") : t("reports.noneForwarded")} action={<LinkButton href={href("/screening")}>{t("nav.screening")}</LinkButton>} /> : (
          <>
            <ul className="md:hidden">
              {rows.map((v) => {
                const r = v.report; const miss = v.lots.reduce((a, l) => a + l.missing_documents.length, 0); const dl = daysLeft(r.deadline);
                return (
                  <li key={r.notice_id} className="border-t border-border first:border-0">
                    <Link href={href(`/reports/${r.notice_id}`)} className="t-fast block px-4 py-3.5 active:bg-surface-2">
                      <div className="font-medium">{title(m, r.notice_id, lang)}</div>
                      <div className="mt-1 text-meta text-muted">{r.notice_id} · {buyer(m, r.notice_id)}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                        {v.lots.map((l) => <IndicationChip key={l.lot_id ?? "-"} v={l.indication} />)}
                        <span className="text-muted">{t("reports.missingN", { n: miss })}</span>
                        {dl !== null && <span className="tnum text-muted">· {t("common.daysLeft", { n: dl })}</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full [overflow-wrap:normal]">
                <thead className="bg-surface-2/50"><tr>
                  <th className={th}>{t("reports.colTender")}</th><th className={th}>{t("report.indication")}</th><th className={th}>{t("reports.colMissing")}</th>
                  <th className={th}>{t("notices.col.deadline")}</th><th className={th}>{t("reports.source")}</th><th className={cn(th, "w-8")} />
                </tr></thead>
                <tbody>
                  {rows.map((v) => {
                    const r = v.report; const miss = v.lots.reduce((a, l) => a + l.missing_documents.length, 0); const dl = daysLeft(r.deadline);
                    return (
                      <tr key={r.notice_id} className={tr}>
                        <td className={td}>
                          <Link href={href(`/reports/${r.notice_id}`)} className="font-medium hover:text-accent">{title(m, r.notice_id, lang)}</Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-muted"><span className="tnum">{r.notice_id}</span><span>·</span><span>{buyer(m, r.notice_id)}</span>{r.mock && <MockChip />}</div>
                        </td>
                        <td className={td}><span className="flex flex-wrap items-center gap-1.5">{v.lots.map((l) => <span key={l.lot_id ?? "-"} className="inline-flex items-center gap-1">{l.lot_id && <span className="text-meta text-muted">{t("report.lot")} {l.lot_id}</span>}<IndicationChip v={l.indication} /></span>)}</span></td>
                        <td className={cn(td, "tnum")}>{miss ? <span className="text-warn">{t("reports.missingN", { n: miss })}</span> : <span className="text-muted">{t("reports.none")}</span>}</td>
                        <td className={cn(td, "tnum whitespace-nowrap")}>{fmtDate(r.deadline, lang)}<div className="text-meta text-muted">{dl !== null ? t("common.daysLeft", { n: dl }) : ""}</div></td>
                        <td className={td}>{v.via === "forwarded" ? <span className="text-[13px]">{t("reports.srcForwarded")}</span> : <Chip tone="proto">{v.via === "manual_local" ? t("reports.srcManualLocal") : t("reports.srcManual")}</Chip>}</td>
                        <td className={td}><Link href={href(`/reports/${r.notice_id}`)} aria-label={t("report.open")} className="text-muted hover:text-fg"><ChevronRight className="h-4 w-4" aria-hidden /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </TableCard>
    </div>
  );
}
