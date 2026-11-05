"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ClipboardCheck, ListOrdered, ScanSearch, Sparkles, UserCheck } from "lucide-react";
import { useApp } from "@/lib/state";

const STEPS = [
  { k: "pre", icon: ScanSearch, path: "/prototype/adviser" },
  { k: "screen", icon: ListOrdered, path: "/screening" },
  { k: "report", icon: ClipboardCheck, path: "/reports" },
] as const;

/** A1 Overview: what the flagship service is and how it works (no run statistics — those live on the report page). */
export default function Overview() {
  const t = useTranslations();
  const { href } = useApp();
  return (
    <div className="animate-fadein max-w-[1080px] space-y-16">
      <section>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-accent">{t("overview.kicker")}</div>
        <h1 className="mt-3 max-w-3xl text-[32px] font-bold leading-tight tracking-tight sm:text-[38px]">{t("overview.title")}</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">{t("overview.lead")}</p>
        <p className="mt-3 max-w-2xl text-[14px] text-muted"><b className="font-semibold text-fg">{t("overview.forWhom")}</b> {t("overview.forWhomText")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={href("/screening")} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg hover:opacity-90">{t("overview.ctaScreening")}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          <Link href={href("/reports")} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-semibold hover:bg-surface-2">{t("overview.ctaReports")}</Link>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{t("overview.whatTitle")}</h2>
        <div className="mt-4 grid gap-x-10 gap-y-6 border-t border-border pt-6 sm:grid-cols-3">
          {(["screening", "report", "review"] as const).map((k) => (
            <div key={k}>
              <h3 className="font-semibold">{t(`overview.provides.${k}.title`)}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t(`overview.provides.${k}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{t("overview.how")}</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">{t("overview.howSub")}</p>
        <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
          {STEPS.map(({ k, icon: Icon, path }, i) => (
            <li key={k} className="flex flex-col bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-soft text-accent"><Icon className="h-4 w-4" aria-hidden /></span>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">{t("overview.step")} {i + 1}</span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold">{t(`chain.${k}.title`)}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{t(`chain.${k}.text`)}</p>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-[13px]">
                <div className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden /><dt className="sr-only">AI</dt><dd><span className="text-muted">{t("overview.aiLabel")}:</span> {t(`chain.${k}.ai`)}</dd></div>
                <div className="flex gap-2"><UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden /><dt className="sr-only">Human</dt><dd><span className="text-muted">{t("overview.humanLabel")}:</span> {t(`chain.${k}.human`)}</dd></div>
              </dl>
              <Link href={href(path)} className="mt-5 inline-flex items-center gap-1 text-[13.5px] font-semibold text-accent hover:underline">{t(`chain.${k}.cta`)}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl border-l-2 border-border pl-4 text-[13.5px] text-muted">{t("report.disclaimer")} {t("overview.disclaimerMore")}</p>
      </section>
    </div>
  );
}
