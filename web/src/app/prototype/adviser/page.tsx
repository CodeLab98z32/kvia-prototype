"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, Lock } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Loading, StatStrip, TableCard } from "@/components/ui/ui";
import { Chip, Dot, MockChip } from "@/components/ui/chips";
import { cn } from "@/lib/format";
import { title } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";
import { useQueryState } from "@/lib/url-state";

/** B3: read-only QA queue of the release gate. Decisions are recorded by the team in data/adviser_decisions.json. */
export default function AdviserPage() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  const [open, setOpen] = useQueryState("notice");
  if (!m) return <Loading />;
  const queue = Object.values(m.gate).filter((g) => g.gate_status === "flagged");
  const auto = Object.values(m.gate).filter((g) => g.gate_status === "released").length;
  const pending = queue.filter((g) => g.final_status === "flagged_pending").length;
  return (
    <ProtoPage title={t("adviser.title")} sub={t("adviser.sub")}>
      <StatStrip className="mb-8" items={[
        { label: t("adviser.auto"), value: auto },
        { label: t("adviser.pending"), value: pending, tone: pending ? "flag" : undefined },
        { label: t("adviser.released"), value: queue.length - pending, tone: queue.length - pending ? "go" : undefined },
      ]} />
      <TableCard toolbar={<span className="inline-flex items-center gap-2 text-[13px] text-muted"><Lock className="h-3.5 w-3.5" aria-hidden />{t("adviser.readOnly")}</span>} footer={t("adviser.footnote")}>
        <div className="hidden h-11 grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_130px_minmax(0,1fr)_20px] items-center gap-4 bg-surface-2/50 px-4 text-meta font-medium text-muted lg:grid">
          <span>{t("notices.col.notice")}</span><span>{t("adviser.reasons")}</span><span>{t("notices.col.status")}</span><span>{t("adviser.effect")}</span><span />
        </div>
        <ul>
          {queue.map((g) => {
            const d = g.adviser_decision;
            const released = g.final_status === "released_by_adviser";
            const isOpen = open === g.notice_id;
            const sr = m.rank[g.notice_id];
            return (
              <li key={g.notice_id} className="border-t border-border">
                <button type="button" onClick={() => setOpen(isOpen ? null : g.notice_id)} aria-expanded={isOpen}
                  className={cn("t-fast grid w-full gap-x-4 gap-y-2 px-4 py-3.5 text-left lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_130px_minmax(0,1fr)_20px] lg:items-center", isOpen ? "bg-surface-2/40" : "hover:bg-surface-2/50")}>
                  <span className="min-w-0"><span className="block font-medium">{title(m, g.notice_id, lang)}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-meta text-muted"><span className="tnum">{g.notice_id}</span>{m.notices[g.notice_id].mock && <MockChip />}</span></span>
                  <span className="text-[13px]">{g.reasons.map((r) => L(r, "label")).join("; ")}</span>
                  <span>{released ? <Dot tone="go">{t("adviser.statusReleased")}</Dot> : <Dot tone="flag">{t("adviser.statusPending")}</Dot>}</span>
                  <span className="text-[13px] text-muted">{released ? (sr ? t("adviser.effectFit", { firm: m.profile.profile_id, fit: sr.fit_score ?? "—" }) : t("adviser.effectReleased")) : t("adviser.effectPendingShort")}</span>
                  <ChevronDown className={cn("hidden h-4 w-4 text-muted transition-transform duration-150 lg:block", isOpen && "rotate-180")} aria-hidden />
                </button>
                {isOpen && (
                  <div className="anim-dropdown grid gap-6 border-t border-border bg-surface-2/40 px-4 py-5 text-[13.5px] md:grid-cols-3">
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("adviser.reasons")}</div>
                      <ul className="space-y-2">{g.reasons.map((r) => <li key={r.code}><div>{L(r, "label")}</div>{r.detail_en && <div className="text-meta text-muted">{L(r, "detail")}</div>}<div className="text-meta text-muted">{t(`adviser.src.${r.source}`)}</div></li>)}</ul></div>
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("adviser.decision")}</div>
                      {d ? <div className="space-y-1.5"><div className="font-medium">{t(`adviser.dec.${d.decision}`)}{d.decided_on ? ` · ${d.decided_on}` : ""}</div><p className="text-muted">{L(d, "comment")}</p>
                        {d.corrections.map((c, i) => <div key={i} className="rounded-md bg-surface px-2.5 py-1.5 text-meta"><b>{t("adviser.correction")}:</b> {c.op} {c.req_id} — {L(c, "reason")}</div>)}
                        <div className="text-meta text-muted">{d.adviser}{d.mock ? " · MOCK" : ""}</div></div> : <p className="text-muted">{t("adviser.noDecision")}</p>}</div>
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("adviser.effect")}</div>
                      <p>{released ? t("adviser.effectReleased") : t("adviser.effectPending")}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[13px]"><Link className="text-accent hover:underline" href={href(`/notices/${g.notice_id}`)}>{t("screening.openNotice")}</Link>
                        {released && <Link className="text-accent hover:underline" href={href("/screening", { open: g.notice_id })}>{t("notice.inList")}</Link>}</div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </TableCard>
      <p className="mt-4 text-meta text-muted"><Chip tone="muted">{t("adviser.sourceFile")}</Chip></p>
    </ProtoPage>
  );
}
