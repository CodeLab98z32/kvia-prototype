"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Flag } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, Loading } from "@/components/ui/ui";
import { Chip, FlagChip, MockChip } from "@/components/ui/chips";
import { cn } from "@/lib/format";
import { title } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";

export default function AdviserPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  const focus = useSearchParams().get("notice");
  if (!m) return <Loading />;
  const queue = Object.values(m.gate).filter((g) => g.gate_status === "flagged");
  const auto = Object.values(m.gate).filter((g) => g.gate_status === "released").length;
  return (
    <ProtoPage title={t("adviser.title")} sub={t("adviser.sub")}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3 text-sm">
        <Card className="p-4"><div className="text-muted">{t("adviser.auto")}</div><div className="tnum text-2xl font-bold">{auto}</div></Card>
        <Card className="p-4"><div className="text-muted">{t("adviser.pending")}</div><div className="tnum text-2xl font-bold text-flag">{queue.filter((g) => g.final_status === "flagged_pending").length}</div></Card>
        <Card className="p-4"><div className="text-muted">{t("adviser.released")}</div><div className="tnum text-2xl font-bold text-go">{queue.filter((g) => g.final_status === "released_by_adviser").length}</div></Card>
      </div>
      <div className="space-y-4">
        {queue.map((g) => {
          const d = g.adviser_decision;
          const released = g.final_status === "released_by_adviser";
          const sr = m.rank[g.notice_id];
          return (
            <Card key={g.notice_id} className={cn("p-5", focus === g.notice_id && "ring-2 ring-accent")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted"><span className="tnum">{g.notice_id}</span>{m.notices[g.notice_id].mock && <MockChip />}</div>
                  <Link href={href(`/notices/${g.notice_id}`)} className="mt-1 block font-semibold hover:text-accent hover:underline">{title(m, g.notice_id, lang)}</Link>
                </div>
                {released ? <Chip tone="go" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}>{t("adviser.statusReleased")}</Chip> : <FlagChip label={t("adviser.statusPending")} />}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("adviser.reasons")}</div>
                  <ul className="space-y-1">{g.reasons.map((r) => <li key={r.code} className="flex items-start gap-1.5"><Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flag" aria-hidden /><span>{L(r, "label")}{r.detail_en ? <span className="block text-xs text-muted">{L(r, "detail")}</span> : null}<span className="block text-[11px] text-muted">{t(`adviser.src.${r.source}`)}</span></span></li>)}</ul>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("adviser.decision")}</div>
                  {d ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">{d.decision === "released" ? <CheckCircle2 className="h-4 w-4 text-go" aria-hidden /> : <Clock className="h-4 w-4 text-flag" aria-hidden />}<b>{t(`adviser.dec.${d.decision}`)}</b>{d.decided_on && <span className="text-muted">· {d.decided_on}</span>}</div>
                      <p className="text-muted">{L(d, "comment")}</p>
                      {d.corrections.map((c, i) => <div key={i} className="rounded bg-surface-2 p-2 text-xs"><b>{t("adviser.correction")}:</b> {c.op} {c.req_id} — {L(c, "reason")}</div>)}
                      <div className="text-xs text-muted">{d.adviser}{d.mock ? " · MOCK" : ""}</div>
                    </div>
                  ) : <p className="text-muted">{t("adviser.noDecision")}</p>}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("adviser.effect")}</div>
                  {released ? (
                    <p>{t("adviser.effectReleased")} {sr && <Link className="text-accent hover:underline" href={href("/screening", { open: g.notice_id })}>{t("adviser.effectFit", { firm: m.profile.profile_id, fit: sr.fit_score ?? "—" })}</Link>}</p>
                  ) : <p className="text-muted">{t("adviser.effectPending")}</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">{t("adviser.footnote")}</p>
    </ProtoPage>
  );
}
