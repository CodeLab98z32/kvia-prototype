"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight, ClipboardCheck, FileSearch, FileWarning, Flag, Gavel, ListOrdered, ScanSearch, Send, ShieldCheck, Sparkles, UserCheck,
} from "lucide-react";
import { Card, CardHeader, LinkButton, Loading, Stat } from "@/components/ui/ui";
import { FitBar, IndicationChip, RouteChip } from "@/components/ui/chips";
import { cn } from "@/lib/format";
import { title, visibleReports } from "@/lib/reports";
import { useApp, useL, useModel } from "@/lib/state";

function Step({ n, icon, title: tt, text, ai, human, href, cta }: { n: number; icon: React.ReactNode; title: string; text: string; ai: string; human: string; href: string; cta: string }) {
  const t = useTranslations();
  return (
    <div className="relative flex flex-col rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="brand-gradient grid h-10 w-10 place-items-center rounded-xl text-white">{icon}</div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t("overview.step")} {n}</div>
          <h3 className="font-semibold">{tt}</h3>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted">{text}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn"><Sparkles className="h-3 w-3" aria-hidden />{ai}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 font-semibold text-info"><UserCheck className="h-3 w-3" aria-hidden />{human}</span>
      </div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">{cta}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
    </div>
  );
}

export default function Overview() {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  if (!m) return <Loading />;
  const vis = visibleReports(m);
  const forwarded = m.screening.ranked.filter((r) => r.route === "forwarded").length;
  const missing = vis.reduce((s, v) => s + v.lots.reduce((a, l) => a + l.missing_documents.length, 0), 0);
  const dist = { go: 0, borderline: 0, "no-go": 0 } as Record<string, number>;
  vis.forEach((v) => v.lots.forEach((l) => { dist[l.indication] += 1; }));
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const sector = L(m.profile.firm, "sector");

  return (
    <div className="animate-fadein space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">{t("overview.kicker")}</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("overview.title")}</h1>
            <p className="mt-3 max-w-2xl text-[15px] text-muted">{t("overview.lead")}</p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              {(["screening", "report", "review"] as const).map((k) => (
                <li key={k} className="rounded-lg bg-surface-2 p-3"><b className="block">{t(`overview.provides.${k}.title`)}</b><span className="text-muted">{t(`overview.provides.${k}.text`)}</span></li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted"><b className="text-fg">{t("overview.forWhom")}</b> {t("overview.forWhomText")}</p>
          </div>
          <div className="brand-gradient relative rounded-2xl p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">{t("overview.yourView")}</div>
            <div className="mt-1 text-lg font-bold">{m.profile.firm.name}</div>
            <div className="text-sm text-white/85">{sector}</div>
            <div className="mt-4 space-y-2">
              {m.screening.ranked.slice(0, 5).map((r) => (
                <Link key={r.notice_id} href={href(`/screening`, { open: r.notice_id })} className="block rounded-lg bg-white/15 p-2.5 text-sm hover:bg-white/25">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{title(m, r.notice_id, lang)}</span>
                    <span className="tnum rounded bg-white/25 px-1.5 text-xs font-bold">{r.fit_score}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${r.fit_score ?? 0}%` }} /></div>
                </Link>
              ))}
            </div>
            <div className="mt-3 text-xs text-white/80">{t("overview.topNote")}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("overview.keyFigures")} <span className="font-normal text-muted">· {m.profile.firm.name}</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("overview.kpi.screened")} value={m.screening.ranked.length} icon={<ListOrdered className="h-5 w-5" />} sub={t("overview.kpi.screenedSub", { n: m.pending.length })} />
          <Stat label={t("overview.kpi.forwarded")} value={forwarded} icon={<Send className="h-5 w-5" />} sub={t("overview.kpi.forwardedSub", { th: m.screening.threshold })} />
          <Stat label={t("overview.kpi.reports")} value={vis.length} icon={<ClipboardCheck className="h-5 w-5" />} tone="go" sub={t("overview.kpi.reportsSub")} />
          <Stat label={t("overview.kpi.missing")} value={missing} icon={<FileWarning className="h-5 w-5" />} tone="warn" sub={t("overview.kpi.missingSub")} />
        </div>
        <Card className="mt-4 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <b>{t("overview.distribution")}</b>
            <div className="flex gap-2">{(["go", "borderline", "no-go"] as const).map((k) => <span key={k} className="flex items-center gap-1"><IndicationChip v={k} /><span className="tnum font-semibold">{dist[k]}</span></span>)}</div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={t("overview.distribution")}>
            <div className="bg-go" style={{ width: `${(dist.go / total) * 100}%` }} />
            <div className="bg-warn" style={{ width: `${(dist.borderline / total) * 100}%` }} />
            <div className="bg-nogo" style={{ width: `${(dist["no-go"] / total) * 100}%` }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {vis.map((v) => (
              <Link key={v.report.notice_id} href={href(`/reports/${v.report.notice_id}`)} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-surface-2">
                <span className="min-w-0 truncate">{title(m, v.report.notice_id, lang)}</span>
                <span className="flex shrink-0 gap-1">{v.lots.map((l) => <IndicationChip key={l.lot_id ?? "-"} v={l.indication} />)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-bold">{t("overview.how")}</h2>
        <p className="mb-4 text-sm text-muted">{t("overview.howSub")}</p>
        <div className="relative grid gap-4 lg:grid-cols-3">
          <Step n={1} icon={<ScanSearch className="h-5 w-5" />} title={t("chain.pre.title")} text={t("chain.pre.text")} ai={t("chain.pre.ai")} human={t("chain.pre.human")} href={href("/prototype/adviser")} cta={t("chain.pre.cta")} />
          <Step n={2} icon={<ListOrdered className="h-5 w-5" />} title={t("chain.screen.title")} text={t("chain.screen.text")} ai={t("chain.screen.ai")} human={t("chain.screen.human")} href={href("/screening")} cta={t("chain.screen.cta")} />
          <Step n={3} icon={<ClipboardCheck className="h-5 w-5" />} title={t("chain.report.title")} text={t("chain.report.text")} ai={t("chain.report.ai")} human={t("chain.report.human")} href={href("/reports")} cta={t("chain.report.cta")} />
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[{ i: <ShieldCheck className="h-4 w-4" />, k: "adviser" }, { i: <Flag className="h-4 w-4" />, k: "flag" }, { i: <Gavel className="h-4 w-4" />, k: "decide" }].map((x) => (
            <div key={x.k} className={cn("flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft p-3 text-info")}>
              <span className="mt-0.5">{x.i}</span><span><b>{t(`overview.human.${x.k}.title`)}</b> — {t(`overview.human.${x.k}.text`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("overview.nextTitle")} icon={<FileSearch className="h-5 w-5" />} />
          <div className="space-y-2 p-5 text-sm">
            {m.screening.ranked.filter((r) => r.route === "forwarded").map((r) => (
              <div key={r.notice_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <span className="min-w-0 flex-1 truncate font-medium">{title(m, r.notice_id, lang)}</span>
                <FitBar value={r.fit_score} compact />
                <RouteChip v={r.route} />
                <LinkButton href={href(`/reports/${r.notice_id}`)} variant="primary" className="px-2.5 py-1.5 text-xs">{t("overview.openReport")}</LinkButton>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("overview.disclaimerTitle")} icon={<Gavel className="h-5 w-5" />} />
          <p className="p-5 text-sm text-muted">{t("report.disclaimer")} {t("overview.disclaimerMore")}</p>
        </Card>
      </section>
    </div>
  );
}
