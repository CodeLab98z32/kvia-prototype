"use client";
import { useTranslations } from "next-intl";
import { AlertOctagon, Building2, CalendarClock, CircleSlash, Lock, Search } from "lucide-react";
import { Card, CardHeader, Loading, PageTitle } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { cn } from "@/lib/format";
import { useL, useModel } from "@/lib/state";
import type { ProfileField } from "@/lib/types";

function proofTone(s: string) {
  if (s.startsWith("Documented")) return "go" as const;
  if (s === "Self-declared") return "warn" as const;
  if (s === "Declared missing") return "flag" as const;
  return "muted" as const;
}

function FieldTable({ fields, flagged }: { fields: ProfileField[]; flagged: Map<string, string[]> }) {
  const t = useTranslations();
  const L = useL();
  const cats = [...new Set(fields.map((f) => f.table_a1_category))];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
          <tr><th className="px-4 py-2">{t("company.dataPoint")}</th><th className="px-4 py-2">{t("company.value")}</th><th className="px-4 py-2">{t("company.proof")}</th><th className="px-4 py-2">{t("company.updated")}</th><th className="px-4 py-2">{t("report.expiry")}</th></tr>
        </thead>
        {cats.map((c) => {
          const fs = fields.filter((f) => f.table_a1_category === c);
          return (
            <tbody key={c}>
              <tr><th colSpan={5} className="bg-surface-2/50 px-4 py-1.5 text-left text-xs font-semibold text-accent">{L(fs[0], "table_a1_category") || c}</th></tr>
              {fs.map((f) => {
                const kinds = flagged.get(f.id) ?? [];
                return (
                  <tr key={f.id} className={cn("border-b border-border align-top last:border-0", kinds.length && "bg-warn-soft/30")}>
                    <td className="w-52 px-4 py-2.5 font-medium">{L(f, "label")}<div className="font-mono text-[10px] text-muted">{f.id}</div></td>
                    <td className="px-4 py-2.5">{f.value}</td>
                    <td className="px-4 py-2.5">
                      {f.parts ? <div className="flex flex-col gap-1">{f.parts.map((p) => <Chip key={p.part} tone={proofTone(p.proof_status)}>{p.part}: {p.proof_status}</Chip>)}</div>
                        : <Chip tone={proofTone(f.proof_status)}>{f.proof_status_original}</Chip>}
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-2.5 text-xs">{f.last_updated}</td>
                    <td className="px-4 py-2.5 text-xs">{f.expiry_original}{kinds.map((k) => <div key={k} className="mt-1"><Chip tone={k === "expired" ? "nogo" : k === "expiring" ? "warn" : "flag"}>{t(`health.${k}`)}</Chip></div>)}</td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

export default function CompanyPage() {
  const t = useTranslations();
  const m = useModel();
  const L = useL();
  if (!m) return <Loading />;
  const p = m.profile;
  const flagged = new Map<string, string[]>();
  m.health.forEach((h) => flagged.set(h.field, [...(flagged.get(h.field) ?? []), h.kind]));
  const icon = { expired: <AlertOctagon className="h-4 w-4" aria-hidden />, expiring: <CalendarClock className="h-4 w-4" aria-hidden />, declared_missing: <CircleSlash className="h-4 w-4" aria-hidden /> };
  return (
    <div className="animate-fadein space-y-5">
      <PageTitle kicker={t("nav.groupA")} title={`${p.firm.name}`} sub={`${L(p.firm, "sector")} · ${t("company.sub")}`} />
      <Card>
        <CardHeader title={t("company.health")} sub={t("company.healthSub", { days: m.run.health_check.expiring_within_days })} icon={<AlertOctagon className="h-5 w-5" />} />
        <ul className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {m.health.map((h, i) => (
            <li key={i} className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", h.kind === "expired" ? "border-nogo/30 bg-nogo-soft text-nogo" : h.kind === "expiring" ? "border-warn/30 bg-warn-soft text-warn" : "border-flag/30 bg-flag-soft text-flag")}>
              {icon[h.kind]}
              <span><b>{t(`health.${h.kind}`)}</b> — <span className="text-fg">{L(h, "label")}{h.date ? ` (${h.date}${h.days_left !== undefined ? `, ${t("common.daysLeft", { n: h.days_left })}` : ""})` : ""}</span></span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title={t("company.search")} sub={t("company.searchSub")} icon={<Search className="h-5 w-5" />} />
        <FieldTable fields={p.search_profile} flagged={flagged} />
      </Card>
      <Card>
        <CardHeader title={t("company.locker")} sub={t("company.lockerSub")} icon={<Building2 className="h-5 w-5" />} />
        <FieldTable fields={p.capability_locker} flagged={flagged} />
      </Card>
      <Card>
        <CardHeader title={t("company.account")} sub={t("company.accountSub")} icon={<Lock className="h-5 w-5" />} />
        <FieldTable fields={p.account_and_baseline} flagged={flagged} />
      </Card>
      <p className="text-xs text-muted">{t("company.source", { src: p.source, model: p.data_model })} {L(p.firm, "name_note")}</p>
    </div>
  );
}
