"use client";
import { useTranslations } from "next-intl";
import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { Loading, PageTitle } from "@/components/ui/ui";
import { cn } from "@/lib/format";
import { useL, useModel } from "@/lib/state";
import type { HealthFlag, ProfileField } from "@/lib/types";

const DOT: Record<string, string> = { expired: "bg-nogo", expiring: "bg-warn", declared_missing: "bg-flag" };

function proofCls(s: string) {
  if (s.startsWith("Documented")) return "text-go";
  if (s === "Self-declared") return "text-warn";
  if (s === "Declared missing") return "text-flag";
  return "text-muted";
}

function Proof({ f }: { f: ProfileField }) {
  if (f.parts) return <span className="flex flex-col">{f.parts.map((p) => <span key={p.part} className={cn("text-xs", proofCls(p.proof_status))}>{p.part}: {p.proof_status}</span>)}</span>;
  return <span className={cn("text-xs font-medium", proofCls(f.proof_status))}>{f.proof_status_original}</span>;
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="mt-0.5 text-[13px] text-muted">{sub}</p>
    </div>
  );
}

const split = (v: string) => v.split(";").map((x) => x.trim()).filter(Boolean);

/** Statement such as "Framework: yes (…)" → icon by yes / no / not applicable. */
function YesNo({ text }: { text: string }) {
  const lc = text.toLowerCase();
  const neg = /:\s*no\b|not applicable|declared missing|unsure/.test(lc);
  const pos = /:\s*yes\b/.test(lc);
  const Icon = pos ? Check : neg ? (/not applicable|unsure/.test(lc) ? Minus : X) : Minus;
  return (
    <li className="flex items-start gap-2 text-[14px]">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", pos ? "text-go" : neg ? "text-muted" : "text-muted")} aria-hidden />
      <span>{text}</span>
    </li>
  );
}

function SearchValue({ f }: { f: ProfileField }) {
  if (f.id === "main_cpv" || f.id === "secondary_cpv" || f.id === "region_nuts") {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {split(f.value).map((x) => {
          const [code, ...rest] = x.split(" ");
          return <li key={x} className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-surface-2/60 px-2 py-1 text-[13px]"><span className="tnum font-semibold">{code}</span><span className="text-muted">{rest.join(" ")}</span></li>;
        })}
      </ul>
    );
  }
  if (f.id === "contract_form" || f.id === "framework_dps") {
    return <ul className="space-y-1">{f.value.split(/\.\s+/).map((s) => s.replace(/\.$/, "")).filter(Boolean).map((s) => <YesNo key={s} text={s} />)}</ul>;
  }
  if (f.id === "size_band") return <span className="tnum text-[15px] font-semibold">{f.value}</span>;
  return <span className="text-[14px]">{f.value}</span>;
}

function Row({ label, children, meta }: { label: ReactNode; children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1.5 py-3.5 md:grid-cols-[200px_1fr_170px]">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className="min-w-0">{children}</div>
      <div className="text-xs text-muted md:text-right">{meta}</div>
    </div>
  );
}

function LockerTable({ fields, flags }: { fields: ProfileField[]; flags: Map<string, HealthFlag[]> }) {
  const t = useTranslations();
  const L = useL();
  const cats = [...new Set(fields.map((f) => f.table_a1_category))];
  return (
    <div className="space-y-6">
      {cats.map((c) => {
        const fs = fields.filter((f) => f.table_a1_category === c);
        return (
          <div key={c}>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t(`company.cat.${c}`)}</h3>
            <div className="divide-y divide-border border-y border-border">
              {fs.map((f) => (
                <Row key={f.id} label={L(f, "label")}
                  meta={<div className="space-y-0.5"><Proof f={f} /><div>{t("company.updated")} {f.last_updated}</div>
                    {f.expiry_original && f.expiry_original !== "–" && <div>{t("report.expiry")}: {f.expiry_original}</div>}
                    {(flags.get(f.id) ?? []).map((h, i) => <div key={i} className="inline-flex items-center gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", DOT[h.kind])} />{t(`health.${h.kind}`)}</div>)}</div>}>
                  <span className="text-[14px]">{f.value}</span>
                </Row>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyPage() {
  const t = useTranslations();
  const m = useModel();
  const L = useL();
  if (!m) return <Loading />;
  const p = m.profile;
  const flags = new Map<string, HealthFlag[]>();
  m.health.forEach((h) => flags.set(h.field, [...(flags.get(h.field) ?? []), h]));
  return (
    <div className="animate-fadein space-y-12">
      <PageTitle title={p.firm.name} sub={`${L(p.firm, "sector")} · ${t("company.sub")}`} />

      <section>
        <SectionHead title={t("company.health")} sub={t("company.healthSub", { days: m.run.health_check.expiring_within_days })} />
        <ul className="divide-y divide-border border-y border-border">
          {m.health.map((h, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[14px]">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[h.kind])} aria-hidden />
              <span className="w-36 shrink-0 text-[13px] text-muted">{t(`health.${h.kind}`)}</span>
              <span className="font-medium">{L(h, "label")}</span>
              {h.date && <span className="tnum text-[13px] text-muted">{h.date}{h.days_left !== undefined ? ` · ${t("common.daysLeft", { n: h.days_left })}` : ""}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHead title={t("company.search")} sub={t("company.searchSub")} />
        <div className="divide-y divide-border border-y border-border">
          {p.search_profile.map((f) => (
            <Row key={f.id} label={L(f, "label")} meta={<div className="space-y-0.5"><Proof f={f} /><div>{t("company.updated")} {f.last_updated}</div></div>}>
              <SearchValue f={f} />
            </Row>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title={t("company.locker")} sub={t("company.lockerSub")} />
        <LockerTable fields={p.capability_locker} flags={flags} />
      </section>

      <section>
        <SectionHead title={t("company.account")} sub={t("company.accountSub")} />
        <LockerTable fields={p.account_and_baseline} flags={flags} />
      </section>
      <p className="text-xs text-muted">{t("company.source", { src: p.source, model: p.data_model })} {L(p.firm, "name_note")}</p>
    </div>
  );
}
