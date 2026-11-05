"use client";
import { useTranslations } from "next-intl";
import { Code2, Sparkles, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Disclosure, Loading } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { SUBSCORE_KEYS } from "@/lib/format";
import { useModel } from "@/lib/state";

const STAGES = [
  { k: "retrieval", step: "pre" }, { k: "extraction", step: "pre" }, { k: "matching", step: "screen" },
  { k: "ranking", step: "screen" }, { k: "matching2", step: "report" }, { k: "classification", step: "report" },
] as const;

const Assumption = () => { const t = useTranslations(); return <Chip tone="warn">{t("logic.assumption")}</Chip>; };
function Rule({ title, children, assumption }: { title: string; children: ReactNode; assumption?: boolean }) {
  return (
    <div className="border-t border-border pt-4 first:border-0 first:pt-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-2"><h4 className="text-[14px] font-semibold">{title}</h4>{assumption && <Assumption />}</div>
      <div className="space-y-2 text-[13.5px] text-muted [&_b]:text-fg [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-[12.5px] [&_code]:text-fg">{children}</div>
    </div>
  );
}

export default function LogicPage() {
  const t = useTranslations();
  const m = useModel();
  if (!m) return <Loading />;
  const run = m.run;
  const rules: Record<string, ReactNode> = {
    retrieval: <>
      <Rule title={t("logic.r.activeness.title")}><p>{t("logic.r.activeness.text")}</p><p><code>notice_type == ANNOUNCEMENT_OF_COMPETITION AND tender_deadline_utc &gt; {run.reference_datetime}</code></p></Rule>
      <Rule title={t("logic.r.retrieval.title")}><p>{t("logic.r.retrieval.text")}</p></Rule>
    </>,
    extraction: <Rule title={t("logic.r.gate.title")}><p>{t("logic.r.gate.text")}</p>
      <ul className="list-disc pl-5">{["documents", "deadline", "uncited", "conflict", "schema", "rating"].map((k) => <li key={k}>{t(`logic.r.gate.${k}`)}</li>)}</ul><p>{t("logic.r.gate.not")}</p></Rule>,
    matching: <Rule title={t("logic.r.matching.title")}><p>{t("logic.r.matching.text")}</p></Rule>,
    ranking: <>
      <Rule title={t("logic.r.weights.title")} assumption>
        <table className="w-full max-w-md"><tbody>{SUBSCORE_KEYS.map((k) => (
          <tr key={k} className="border-b border-border last:border-0"><td className="py-1.5 text-fg">{t(`sub.${k}`)}</td><td className="tnum py-1.5 text-right font-medium text-fg">{run.weights[k].toFixed(2)}</td>
            <td className="w-32 py-1.5 pl-3"><div className="h-1.5 rounded-full bg-accent/70" style={{ width: `${run.weights[k] * 200}%` }} /></td></tr>))}</tbody></table>
        <p><code>fit = Σ(wᵢ × sᵢ) / Σ(wᵢ)</code> {t("logic.r.weights.text")}</p>
      </Rule>
      <Rule title={t("logic.r.threshold.title")} assumption><p>{t("logic.r.threshold.text", { th: run.threshold })}</p><p>{t("logic.r.threshold.lots")}</p></Rule>
      <Rule title={t("logic.r.confidence.title")}><p>{t("logic.r.confidence.text")}</p></Rule>
    </>,
    matching2: <Rule title={t("logic.r.lacks.title")}><p>{t("logic.r.lacks.text")}</p></Rule>,
    classification: <>
      <Rule title={t("logic.r.readiness.title")} assumption>
        <ul className="list-disc pl-5">{["documented", "self", "expired", "none", "tax", "soon"].map((k) => <li key={k}>{t(`logic.r.readiness.${k}`, { days: run.readiness.expiring_soon_days_after_deadline, months: run.readiness.tax_certificate_max_age_months })}</li>)}</ul>
      </Rule>
      <Rule title={t("logic.r.indication.title")}>
        <ul className="list-disc pl-5"><li><b>{t("indication.no-go")}</b>: {t("logic.r.indication.nogo")}</li><li><b>{t("indication.borderline")}</b>: {t("logic.r.indication.borderline")}</li><li><b>{t("indication.go")}</b>: {t("logic.r.indication.go")}</li></ul>
        <p>{t("logic.r.indication.gap")}</p>
      </Rule>
    </>,
  };
  return (
    <ProtoPage title={t("logic.title")} sub={t("logic.sub2")}>
      <ol className="relative space-y-4">
        {STAGES.map(({ k, step }, i) => (
          <li key={k} className="relative rounded-xl border border-border bg-surface">
            <div className="grid gap-x-8 gap-y-4 p-5 sm:p-6 lg:grid-cols-[220px_1fr]">
              <div>
                <div className="tnum text-meta font-semibold text-proto">{t("logic.stage")} {i + 1} / 6</div>
                <h2 className="mt-1 text-section font-semibold">{t(`logic.cap.${k}.name`)}</h2>
                <div className="mt-1 text-meta text-muted">{t(`chain.${step}.title`)}</div>
              </div>
              <div className="min-w-0 space-y-4">
                <p className="text-body">{t(`logic.cap.${k}.text`)}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-warn-soft/40 p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 text-meta font-semibold text-warn"><Sparkles className="h-3.5 w-3.5" aria-hidden />{t("logic.aiPart")}</div>
                    <p className="text-[13.5px]">{t(`logic.stage6.${k}.ai`)}</p>
                  </div>
                  <div className="rounded-lg bg-info-soft/50 p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 text-meta font-semibold text-info"><Code2 className="h-3.5 w-3.5" aria-hidden />{t("logic.codePart")}</div>
                    <p className="text-[13.5px]">{t(`logic.stage6.${k}.code`)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted">
                  {t(`logic.stage6.${k}.human`) !== "—" && <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" aria-hidden />{t(`logic.stage6.${k}.human`)}</span>}
                  <span>{t("logic.output")}: {t(`logic.stage6.${k}.output`)}</span>
                </div>
                <Disclosure summary={t("logic.rulesAndAssumptions")}><div className="space-y-4">{rules[k]}</div></Disclosure>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 grid gap-6 text-[13.5px] text-muted md:grid-cols-2">
        <p>{t("logic.feedback")}</p>
        <p>{t("logic.phase1Note", { model: run.model.specified_in_docs })}</p>
      </div>
      <Disclosure className="mt-6" summary={`${t("logic.assumptionsTitle")} · ${run.assumptions.length}`}>
        <ul className="list-disc space-y-1 pl-5 text-[13.5px]">{run.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <div className="mt-4 border-t border-border pt-4"><Rule title={t("logic.r.health.title")} assumption><p>{t("logic.r.health.text", { days: run.health_check.expiring_within_days })}</p></Rule></div>
      </Disclosure>
    </ProtoPage>
  );
}
