"use client";
import { useTranslations } from "next-intl";
import { Code2, Sparkles, UserCheck } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, CardHeader, Loading } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { SUBSCORE_KEYS } from "@/lib/format";
import { useModel } from "@/lib/state";

const STEPS = [
  { id: "0", kind: "code" }, { id: "0b", kind: "code" }, { id: "1a", kind: "code" }, { id: "1b", kind: "ai" },
  { id: "1c", kind: "code", human: true }, { id: "2a", kind: "ai" }, { id: "2b", kind: "code", human: true },
  { id: "3a", kind: "ai", human: true }, { id: "3b", kind: "code" }, { id: "3c", kind: "code", human: true },
] as const;

function Kind({ k }: { k: "ai" | "code" }) {
  const t = useTranslations();
  return k === "ai" ? <Chip tone="warn" icon={<Sparkles className="h-3 w-3" aria-hidden />}>{t("logic.ai")}</Chip>
    : <Chip tone="info" icon={<Code2 className="h-3 w-3" aria-hidden />}>{t("logic.code")}</Chip>;
}
const Assumption = () => { const t = useTranslations(); return <Chip tone="warn">{t("logic.assumption")}</Chip>; };

function Rule({ title, children, assumption }: { title: string; children: React.ReactNode; assumption?: boolean }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{title}</h3>{assumption && <Assumption />}</div>
      <div className="space-y-2 text-sm text-muted [&_b]:text-fg [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-fg">{children}</div>
    </Card>
  );
}

export default function LogicPage() {
  const t = useTranslations();
  const m = useModel();
  if (!m) return <Loading />;
  const run = m.run;
  return (
    <ProtoPage title={t("logic.title")} sub={t("logic.sub")}>
      <Card className="mb-5 overflow-hidden">
        <CardHeader title={t("logic.chain")} sub={t("logic.chainSub")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2">{t("logic.step")}</th><th className="px-4 py-2">{t("logic.what")}</th><th className="px-4 py-2">{t("logic.by")}</th><th className="px-4 py-2">{t("logic.output")}</th><th className="px-4 py-2">{t("logic.human")}</th></tr>
            </thead>
            <tbody>
              {STEPS.map((s) => (
                <tr key={s.id} className="border-b border-border align-top last:border-0">
                  <td className="tnum px-4 py-3 font-bold">{s.id}</td>
                  <td className="px-4 py-3"><b>{t(`logic.steps.${s.id}.name`)}</b><div className="text-xs text-muted">{t(`logic.steps.${s.id}.input`)}</div></td>
                  <td className="px-4 py-3"><Kind k={s.kind} /><div className="mt-1 text-xs text-muted">{t(`logic.steps.${s.id}.tool`)}</div></td>
                  <td className="px-4 py-3 text-xs">{t(`logic.steps.${s.id}.output`)}</td>
                  <td className="px-4 py-3 text-xs">{"human" in s && s.human ? <span className="inline-flex items-start gap-1 text-info"><UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t(`logic.steps.${s.id}.humanText`)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted">{t("logic.phase1Note", { model: run.model.specified_in_docs })}</p>
      </Card>
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
      <Card className="mt-5 p-5 text-sm">
        <h3 className="mb-2 font-semibold">{t("logic.assumptionsTitle")}</h3>
        <ul className="list-disc pl-5 text-muted">{run.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
      </Card>
    </ProtoPage>
  );
}
