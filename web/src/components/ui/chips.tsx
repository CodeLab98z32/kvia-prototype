"use client";
import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import type { Indication, Level, MatchStatus, Readiness } from "@/lib/types";

type Tone = "go" | "warn" | "nogo" | "flag" | "accent" | "muted" | "info" | "proto";
const SOFT: Record<Tone, string> = {
  go: "bg-go-soft text-go", warn: "bg-warn-soft text-warn", nogo: "bg-nogo-soft text-nogo", flag: "bg-flag-soft text-flag",
  accent: "bg-accent-soft text-accent", info: "bg-info-soft text-info", proto: "bg-proto-soft text-proto", muted: "bg-surface-2 text-muted",
};
const DOT: Record<Tone, string> = {
  go: "bg-go", warn: "bg-warn", nogo: "bg-nogo", flag: "bg-flag", accent: "bg-accent", info: "bg-info", proto: "bg-proto", muted: "bg-muted/60",
};

/** Tinted label. Text is always present, so meaning never depends on colour alone (WCAG 1.4.1). */
export function Chip({ tone = "muted", icon, children, className, title, dot }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string; title?: string; dot?: boolean }) {
  return (
    <span title={title} className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 [overflow-wrap:normal] text-[12px] font-medium", SOFT[tone], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />}
      {icon}{children}
    </span>
  );
}
/** Plain text status with a dot — for dense tables. */
export function Dot({ tone = "muted", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] [overflow-wrap:normal]", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[tone])} aria-hidden />{children}
    </span>
  );
}

const IND: Record<Indication, Tone> = { go: "go", borderline: "warn", "no-go": "nogo" };
export function IndicationChip({ v, large }: { v: Indication; large?: boolean }) {
  const t = useTranslations();
  return <Chip tone={IND[v]} dot className={cn("font-semibold", large && "h-7 px-2.5 text-[13px]")}>{t(`indication.${v}`)}</Chip>;
}
export const indicationTone = (v: Indication) => IND[v];

const MATCH: Record<MatchStatus, Tone> = { met: "go", partly_met: "warn", not_met: "nogo", lacks_data: "flag" };
export function MatchChip({ v }: { v: MatchStatus }) {
  const t = useTranslations();
  return <Chip tone={MATCH[v]} dot>{t(`match.${v}`)}</Chip>;
}
const READY: Record<Readiness, Tone> = { documented: "go", self_declared_proof_needed: "warn", expired: "nogo", no_proof_on_file: "nogo", not_demanded: "muted" };
export function ReadinessChip({ v }: { v: Readiness }) {
  const t = useTranslations();
  return <Dot tone={READY[v]}>{t(`readiness.${v}`)}</Dot>;
}

/** Three-step confidence meter + label. */
export function ConfidenceChip({ v, prefix }: { v: Level; prefix?: boolean }) {
  const t = useTranslations();
  const n = { high: 3, medium: 2, low: 1 }[v];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]" title={`${t("common.confidence")}: ${t(`level.${v}`)}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => <span key={i} className={cn("w-[3px] rounded-sm", i <= n ? (v === "low" ? "bg-warn" : "bg-fg/70") : "bg-border-strong")} style={{ height: 4 + i * 3 }} />)}
      </span>
      <span className={cn(v === "low" && "text-warn")}>{prefix ? `${t("common.confidence")} ` : ""}{t(`level.${v}`).toLowerCase()}</span>
    </span>
  );
}
export function RouteChip({ v }: { v: string }) {
  const t = useTranslations();
  return v === "forwarded" ? <Chip tone="accent">{t("route.forwarded")}</Chip> : <span className="whitespace-nowrap text-[13px] text-muted">{t("route.below_threshold")}</span>;
}
export function FlagChip({ label }: { label?: string }) {
  const t = useTranslations();
  return <Chip tone="flag" dot>{label ?? t("status.flagged")}</Chip>;
}
export function ExpiringChip({ date }: { date?: string | null }) {
  const t = useTranslations();
  return <Chip tone="warn">{t("readiness.expiring_soon")}{date ? ` · ${date}` : ""}</Chip>;
}
export function MockChip() {
  return <span className="mock-stripes inline-flex h-[20px] shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 text-[11px] font-semibold text-fg [overflow-wrap:normal]"><FlaskConical className="h-3 w-3" aria-hidden />MOCK</span>;
}
const STATUS: Record<string, Tone> = { active: "go", closed: "muted", award: "info", advisory: "muted", intent: "muted", flagged: "flag", other: "muted" };
export function StatusChip({ v }: { v: string }) {
  const t = useTranslations();
  return <Dot tone={STATUS[v] ?? "muted"} title={t(`statusHint.${v}`)}>{t(`status.${v}`)}</Dot>;
}

/** Compact fit bar with threshold tick and tabular score. */
export function FitBar({ value, threshold = 60, compact }: { value: number | null; threshold?: number; compact?: boolean }) {
  const v = value ?? 0;
  return (
    <div className={cn("flex items-center gap-2.5", compact ? "w-[100px] sm:w-[132px]" : "w-[180px]")}>
      <span className="tnum w-7 text-right text-[14px] font-semibold">{value ?? "—"}</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-surface-2" role="img" aria-label={`fit ${value ?? "—"} / 100, threshold ${threshold}`}>
        <div className={cn("h-full rounded-full", value === null ? "" : v >= threshold ? "bg-accent" : "bg-muted/45")} style={{ width: `${v}%` }} />
        <div className="absolute -top-1 h-3.5 w-px bg-fg/40" style={{ left: `${threshold}%` }} aria-hidden />
      </div>
    </div>
  );
}
