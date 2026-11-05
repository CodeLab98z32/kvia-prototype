"use client";
import { useTranslations } from "next-intl";
import { Check, Minus, X } from "lucide-react";
import { Loading, PageTitle, Section, Tabs } from "@/components/ui/ui";
import { Dot } from "@/components/ui/chips";
import { cn } from "@/lib/format";
import { useL, useModel } from "@/lib/state";
import type { HealthFlag, ProfileField } from "@/lib/types";
import { useQueryState } from "@/lib/url-state";

type Tab = "search" | "locker" | "account";
const HTONE = { expired: "nogo", expiring: "warn", declared_missing: "flag" } as const;
const proofTone = (s: string) => (s.startsWith("Documented") ? "go" : s === "Self-declared" ? "warn" : s === "Declared missing" ? "flag" : "muted") as "go" | "warn" | "flag" | "muted";

function Proof({ f }: { f: ProfileField }) {
  if (f.parts) return <span className="flex flex-col gap-1">{f.parts.map((p) => <Dot key={p.part} tone={proofTone(p.proof_status)}>{p.part}: {p.proof_status}</Dot>)}</span>;
  return <Dot tone={proofTone(f.proof_status)}>{f.proof_status_original}</Dot>;
}

const split = (v: string) => v.split(";").map((x) => x.trim()).filter(Boolean);
function YesNo({ text }: { text: string }) {
  const lc = text.toLowerCase();
  const pos = /:\s*yes\b/.test(lc);
  const neg = /:\s*no\b/.test(lc);
  const Icon = pos ? Check : neg ? X : Minus;
  return <li className="flex items-start gap-2"><Icon className={cn("mt-0.5 h-4 w-4 shrink-0", pos ? "text-go" : "text-muted")} aria-hidden /><span>{text}</span></li>;
}
function Value({ f }: { f: ProfileField }) {
  if (["main_cpv", "secondary_cpv", "region_nuts"].includes(f.id)) {
    return (
      <ul className="flex flex-col gap-1">
        {split(f.value).map((x) => { const [code, ...rest] = x.split(" "); return <li key={x}><span className="tnum font-medium">{code}</span> <span className="text-muted">{rest.join(" ")}</span></li>; })}
      </ul>
    );
  }
  if (f.id === "contract_form" || f.id === "framework_dps") return <ul className="space-y-1">{f.value.split(/\.\s+/).map((s) => s.replace(/\.$/, "")).filter(Boolean).map((s) => <YesNo key={s} text={s} />)}</ul>;
  return <span>{f.value}</span>;
}

function FieldTable({ fields, flags }: { fields: ProfileField[]; flags: Map<string, HealthFlag[]> }) {
  const t = useTranslations();
  const L = useL();
  const cats = [...new Set(fields.map((f) => f.table_a1_category))];
  return (
    <div className="space-y-8">
      {cats.map((c) => (
        <div key={c}>
          {cats.length > 1 && <h3 className="mb-2 text-[14px] font-semibold">{t(`company.cat.${c}`)}</h3>}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden h-10 grid-cols-[200px_minmax(0,1fr)_190px_150px] items-center gap-4 bg-surface-2/50 px-4 text-meta font-medium text-muted md:grid">
              <span>{t("company.dataPoint")}</span><span>{t("company.value")}</span><span>{t("company.proof")}</span><span>{t("report.expiry")}</span>
            </div>
            {fields.filter((f) => f.table_a1_category === c).map((f) => {
              const fl = flags.get(f.id) ?? [];
              return (
                <div key={f.id} className={cn("grid gap-x-4 gap-y-1.5 border-t border-border px-4 py-3.5 text-body first:border-0 md:grid-cols-[200px_minmax(0,1fr)_190px_150px] md:first:border-t", fl.length && "bg-warn-soft/25")}>
                  <div className="font-medium md:font-normal md:text-muted">{L(f, "label")}</div>
                  <div className="min-w-0"><Value f={f} /></div>
                  <div className="text-[13px]"><Proof f={f} /><div className="mt-0.5 text-meta text-muted">{t("company.updated")} {f.last_updated}</div></div>
                  <div className="text-[13px]">
                    <span className={cn(f.expiry_original === "–" && "text-muted")}>{f.expiry_original}</span>
                    {fl.map((h, i) => <div key={i} className="mt-1"><Dot tone={HTONE[h.kind]}>{t(`health.${h.kind}`)}</Dot></div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CompanyPage() {
  const t = useTranslations();
  const m = useModel();
  const L = useL();
  const [tab, setTab] = useQueryState("tab", "search");
  if (!m) return <Loading />;
  const p = m.profile;
  const flags = new Map<string, HealthFlag[]>();
  m.health.forEach((h) => flags.set(h.field, [...(flags.get(h.field) ?? []), h]));
  return (
    <div className="anim-page">
      <PageTitle kicker={L(p.firm, "sector")} title={p.firm.name} sub={t("company.sub2")} />
      <Section title={t("company.health")} sub={t("company.healthSub", { days: m.run.health_check.expiring_within_days })} className="mb-10">
        {m.health.length === 0 ? <p className="text-body text-muted">{t("company.noIssues")}</p> : (
          <ul className="overflow-hidden rounded-xl border border-border">
            {m.health.map((h, i) => (
              <li key={i} className="grid gap-x-4 gap-y-0.5 border-t border-border px-4 py-3 first:border-0 sm:grid-cols-[170px_minmax(0,1fr)_auto]">
                <Dot tone={HTONE[h.kind]}>{t(`health.${h.kind}`)}</Dot>
                <span className="font-medium">{L(h, "label")}</span>
                <span className="tnum text-[13px] text-muted">{h.date ?? ""}{h.days_left !== undefined ? ` · ${t("common.daysLeft", { n: h.days_left })}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Tabs<Tab> className="mb-6" value={tab as Tab} onChange={(v) => setTab(v, "push")} tabs={[
        { id: "search", label: t("company.search") }, { id: "locker", label: t("company.locker") }, { id: "account", label: t("company.account") }]} />
      <p className="mb-5 text-body text-muted">{tab === "search" ? t("company.searchSub") : tab === "locker" ? t("company.lockerSub") : t("company.accountSub")}</p>
      <FieldTable fields={tab === "search" ? p.search_profile : tab === "locker" ? p.capability_locker : p.account_and_baseline} flags={flags} />
      <p className="mt-8 text-meta text-muted">{t("company.source", { src: p.source, model: p.data_model })} {L(p.firm, "name_note")}</p>
    </div>
  );
}
