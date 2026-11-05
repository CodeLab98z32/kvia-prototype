"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardCheck, FileWarning, Flag, Hand, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader, Loading, PageTitle } from "@/components/ui/ui";
import { Chip, FitBar, FlagChip, IndicationChip, MockChip } from "@/components/ui/chips";
import { daysLeft } from "@/lib/format";
import { buyer, title, visibleReports, type VisibleReport } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";

function Group({ icon, titleText, sub, children, empty }: { icon: ReactNode; titleText: string; sub: string; children: ReactNode[]; empty: string }) {
  return (
    <Card>
      <CardHeader icon={icon} title={<>{titleText} <span className="tnum text-muted">({children.length})</span></>} sub={sub} />
      <div className="divide-y divide-border">{children.length ? children : <p className="px-5 py-4 text-sm text-muted">{empty}</p>}</div>
    </Card>
  );
}

export default function ReportsPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  if (!m) return <Loading />;
  const vis = visibleReports(m);
  const row = (v: VisibleReport) => {
    const r = v.report;
    const missing = v.lots.reduce((a, l) => a + l.missing_documents.length, 0);
    const dl = daysLeft(r.deadline);
    return (
      <Link key={r.notice_id} href={href(`/reports/${r.notice_id}`)} className="grid gap-3 px-5 py-4 hover:bg-surface-2/60 md:grid-cols-[1fr_150px_auto]">
        <div className="min-w-0">
          <div className="truncate font-semibold">{title(m, r.notice_id, lang)}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="tnum">{r.notice_id}</span>·<span className="truncate">{buyer(m, r.notice_id)}</span>
            {r.mock && <MockChip />}
            {v.via === "manual_local" && <Chip tone="proto">{t("report.stateManualLocal")}</Chip>}
            {v.via === "manual_recorded" && <Chip tone="proto">{t("report.stateManualRecorded")}</Chip>}
            {dl !== null && <span>· {t("common.daysLeft", { n: dl })}</span>}
          </div>
          {v.via === "manual_recorded" && r.manual_addition && <p className="mt-1 text-xs text-muted">{L(r.manual_addition, "note")}</p>}
        </div>
        <FitBar value={r.fit_score} threshold={m.screening.threshold} compact />
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
          {v.lots.map((l) => <span key={l.lot_id ?? "-"} className="flex items-center gap-1">{l.lot_id && <span className="text-xs text-muted">{t("report.lot")} {l.lot_id}</span>}<IndicationChip v={l.indication} /></span>)}
          <Chip tone={missing ? "warn" : "muted"} icon={<FileWarning className="h-3.5 w-3.5" aria-hidden />}>{t("reports.missingN", { n: missing })}</Chip>
        </div>
      </Link>
    );
  };
  return (
    <div className="animate-fadein space-y-5">
      <PageTitle kicker={t("nav.groupA")} title={t("reports.title")} sub={t("reports.sub")} />
      <Group icon={<Send className="h-5 w-5" />} titleText={t("reports.forwarded")} sub={t("reports.forwardedSub", { th: m.screening.threshold })} empty={t("reports.noneForwarded")}>
        {vis.filter((v) => v.via === "forwarded").map(row)}
      </Group>
      <Group icon={<Hand className="h-5 w-5" />} titleText={t("reports.manual")} sub={t("reports.manualSub")} empty={t("reports.noneManual")}>
        {vis.filter((v) => v.via !== "forwarded").map(row)}
      </Group>
      <Group icon={<Flag className="h-5 w-5" />} titleText={t("reports.awaiting")} sub={t("reports.awaitingSub")} empty={t("reports.noneAwaiting")}>
        {m.pending.map((nid) => (
          <Link key={nid} href={href(`/notices/${nid}`)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-2/60">
            <div className="min-w-0"><div className="truncate font-semibold">{title(m, nid, lang)}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted"><span className="tnum">{nid}</span>{m.notices[nid].mock && <MockChip />}<span>· {m.gate[nid].reasons.map((r) => L(r, "label")).join("; ")}</span></div></div>
            <FlagChip label={t("reports.awaitingChip")} />
          </Link>
        ))}
      </Group>
      <p className="flex items-center gap-2 text-sm text-muted"><ClipboardCheck className="h-4 w-4" aria-hidden />{t("reports.hint")} <Link className="font-semibold text-accent hover:underline" href={href("/screening")}>{t("nav.screening")}</Link></p>
    </div>
  );
}
