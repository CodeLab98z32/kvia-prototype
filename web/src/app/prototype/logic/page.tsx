"use client";
import { useTranslations } from "next-intl";
import { Code2, Sparkles, UserCheck } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, Loading } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { SUBSCORE_KEYS } from "@/lib/format";
import { useModel } from "@/lib/state";

const CHAIN = [
  { k: "pre", caps: ["retrieval", "extraction"], human: true },
  { k: "screen", caps: ["matching", "ranking"], human: true },
  { k: "report", caps: ["matching2", "classification"], human: true },
] as const;

function Kind({ k }: { k: "ai" | "code" }) {
  const t = useTranslations();
  return k === "ai" ? <Chip tone="warn" icon={<Sparkles className="h-3 w-3" aria-hidden />}>{t("logic.ai")}</Chip>
    : <Chip tone="info" icon={<Code2 className="h-3 w-3" aria-hidden />}>{t("logic.code")}</Chip>;
}
const Assumption = () => { const t = useTranslations(); return <Chip tone="warn">{t("logic.assumption")}</Chip>; };

function Rule({ title, children, assumption }: { title: string; children: React.ReactNode; assumption?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-semibold">{title}</h3>{assumption && <Assumption />}</div>
      <div className="space-y-2 text-[13px] text-muted [&_b]:text-fg [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-fg">{children}</div>
    </div>
  );
}

export default function LogicPage() {
  const t = useTranslations();
  const m = useModel();
  if (!m) return <Loading />;
  const run = m.run;
  return (
    <ProtoPage title={t("logic.title")} sub={t("logic.sub")}>
      <section className="mb-10">
        <h2 className="text-[15px] font-semibold">{t("logic.chain")}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{t("logic.chainSub")}</p>
        <ol className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
          {CHAIN.map((c, i) => (
            <li key={c.k} className="bg-surface p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("overview.step")} {i + 1}</div>
              <h3 className="mt-1 font-semibold">{t(`chain.${c.k}.title`)}</h3>
              <p className="mt-1 text-[13px] text-muted">{t(`logic.chain3.${c.k}.what`)}</p>
              <ul className="mt-4 space-y-3">
                {c.caps.map((cap) => (
                  <li key={cap} className="text-[13px]">
                    <div className="flex items-center gap-2"><Kind k="ai" /><b>{t(`logic.cap.${cap}.name`)}</b></div>
                    <p className="mt-1 text-muted">{t(`logic.cap.${cap}.text`)}</p>
                    <p className="mt-0.5 text-xs text-muted"><span className="font-medium">{t("logic.implemented")}:</span> {t(`logic.cap.${cap}.impl`)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-border pt-3 text-[13px]">
                <div className="flex items-start gap-1.5 text-info"><UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t(`logic.chain3.${c.k}.human`)}</div>
                <div className="mt-1 text-xs text-muted">{t("logic.output")}: {t(`logic.chain3.${c.k}.output`)}</div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">{t("logic.feedback")}</p>
        <p className="mt-1 text-xs text-muted">{t("logic.phase1Note", { model: run.model.specified_in_docs })}</p>
      </section>
      <h2 className="mb-4 text-[15px] font-semibold">{t("logic.rulesTitle")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Rule title={t("logic.r.activeness.title")}><p>{t("logic.r.activeness.text")}</p><p><code>notice_type == ANNOUNCEMENT_OF_COMPETITION AND tender_deadline_utc &gt; {run.reference_datetime}</code></p></Rule>
        <Rule title={t("logic.r.gate.title")}><p>{t("logic.r.gate.text")}</p>
          <ul className="list-disc pl-5">{["documents", "deadline", "uncited", "conflict", "schema", "rating"].map((k) => <li key={k}>{t(`logic.r.gate.${k}`)}</li>)}</ul>
          <p>{t("logic.r.gate.not")}</p></Rule>
        <Rule title={t("logic.r.weights.title")} assumption>
          <table className="w-full text-sm"><tbody>{SUBSCORE_KEYS.map((k) => (
            <tr key={k} className="border-b border-border last:border-0"><td className="py-1 text-fg">{t(`sub.${k}`)}</td><td className="tnum py-1 text-right font-semibold text-fg">{run.weights[k].toFixed(2)}</td>
              <td className="w-1/2 py-1 pl-3"><div className="h-2 rounded-full bg-accent" style={{ width: `${run.weights[k] * 180}%` }} /></td></tr>))}</tbody></table>
          <p><code>fit = Σ(wᵢ × sᵢ) / Σ(wᵢ)</code> {t("logic.r.weights.text")}</p>
        </Rule>
        <Rule title={t("logic.r.threshold.title")} assumption><p>{t("logic.r.threshold.text", { th: run.threshold })}</p><p>{t("logic.r.threshold.lots")}</p></Rule>
        <Rule title={t("logic.r.confidence.title")}><p>{t("logic.r.confidence.text")}</p></Rule>
        <Rule title={t("logic.r.readiness.title")} assumption>
          <ul className="list-disc pl-5">{["documented", "self", "expired", "none", "tax", "soon"].map((k) => <li key={k}>{t(`logic.r.readiness.${k}`, { days: run.readiness.expiring_soon_days_after_deadline, months: run.readiness.tax_certificate_max_age_months })}</li>)}</ul>
        </Rule>
        <Rule title={t("logic.r.indication.title")}>
          <ul className="list-disc pl-5"><li><b>{t("indication.no-go")}</b>: {t("logic.r.indication.nogo")}</li><li><b>{t("indication.borderline")}</b>: {t("logic.r.indication.borderline")}</li><li><b>{t("indication.go")}</b>: {t("logic.r.indication.go")}</li></ul>
          <p>{t("logic.r.indication.gap")}</p>
        </Rule>
        <Rule title={t("logic.r.health.title")} assumption><p>{t("logic.r.health.text", { days: run.health_check.expiring_within_days })}</p></Rule>
      </div>
      <Card className="mt-6 p-5 text-[13px]">
        <h3 className="mb-2 font-semibold">{t("logic.assumptionsTitle")}</h3>
        <ul className="list-disc pl-5 text-muted">{run.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
      </Card>
    </ProtoPage>
  );
}
