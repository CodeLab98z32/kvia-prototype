"use client";
import {
  AlertTriangle, Ban, CheckCircle2, CircleDashed, CircleHelp, Clock, FileCheck2, FileClock, FileQuestion, FileWarning,
  FileX2, Flag, FlaskConical, MinusCircle, Send, SignalHigh, SignalLow, SignalMedium, XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import type { Indication, Level, MatchStatus, Readiness } from "@/lib/types";

type Tone = "go" | "warn" | "nogo" | "flag" | "accent" | "muted" | "info" | "proto";
const TONE: Record<Tone, string> = {
  go: "bg-go-soft text-go border-go/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  nogo: "bg-nogo-soft text-nogo border-nogo/30",
  flag: "bg-flag-soft text-flag border-flag/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  info: "bg-info-soft text-info border-info/30",
  proto: "bg-proto-soft text-proto border-proto/30",
  muted: "bg-surface-2 text-muted border-border",
};

/** A chip always carries an icon AND text, never colour alone (SPEC §8.4 accessibility). */
export function Chip({ tone = "muted", icon, children, className, title }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold", TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
const I = "h-3.5 w-3.5";

export function IndicationChip({ v, large }: { v: Indication; large?: boolean }) {
  const t = useTranslations();
  const m = { go: ["go", <CheckCircle2 key="i" className={I} aria-hidden />], borderline: ["warn", <AlertTriangle key="i" className={I} aria-hidden />], "no-go": ["nogo", <Ban key="i" className={I} aria-hidden />] } as const;
  return <Chip tone={m[v][0]} icon={m[v][1]} className={large ? "px-3 py-1 text-sm" : ""}>{t(`indication.${v}`)}</Chip>;
}
export function MatchChip({ v }: { v: MatchStatus }) {
  const t = useTranslations();
  const m = {
    met: ["go", <CheckCircle2 key="i" className={I} aria-hidden />], partly_met: ["warn", <MinusCircle key="i" className={I} aria-hidden />],
    not_met: ["nogo", <XCircle key="i" className={I} aria-hidden />], lacks_data: ["flag", <CircleHelp key="i" className={I} aria-hidden />],
  } as const;
  return <Chip tone={m[v][0]} icon={m[v][1]}>{t(`match.${v}`)}</Chip>;
}
export function ReadinessChip({ v }: { v: Readiness }) {
  const t = useTranslations();
  const m = {
    documented: ["go", <FileCheck2 key="i" className={I} aria-hidden />], self_declared_proof_needed: ["warn", <FileQuestion key="i" className={I} aria-hidden />],
    expired: ["nogo", <FileX2 key="i" className={I} aria-hidden />], no_proof_on_file: ["nogo", <FileWarning key="i" className={I} aria-hidden />],
    not_demanded: ["muted", <CircleDashed key="i" className={I} aria-hidden />],
  } as const;
  return <Chip tone={m[v][0]} icon={m[v][1]}>{t(`readiness.${v}`)}</Chip>;
}
export function ConfidenceChip({ v, prefix }: { v: Level; prefix?: boolean }) {
  const t = useTranslations();
  const m = { high: ["info", <SignalHigh key="i" className={I} aria-hidden />], medium: ["muted", <SignalMedium key="i" className={I} aria-hidden />], low: ["warn", <SignalLow key="i" className={I} aria-hidden />] } as const;
  return <Chip tone={m[v][0]} icon={m[v][1]}>{prefix ? `${t("common.confidence")}: ` : ""}{t(`level.${v}`)}</Chip>;
}
export function RouteChip({ v }: { v: string }) {
  const t = useTranslations();
  return v === "forwarded"
    ? <Chip tone="accent" icon={<Send className={I} aria-hidden />}>{t("route.forwarded")}</Chip>
    : <Chip tone="muted" icon={<MinusCircle className={I} aria-hidden />}>{t("route.below_threshold")}</Chip>;
}
export function FlagChip({ label }: { label?: string }) {
  const t = useTranslations();
  return <Chip tone="flag" icon={<Flag className={I} aria-hidden />}>{label ?? t("status.flagged")}</Chip>;
}
export function ExpiringChip({ date }: { date?: string | null }) {
  const t = useTranslations();
  return <Chip tone="warn" icon={<FileClock className={I} aria-hidden />}>{t("readiness.expiring_soon")}{date ? ` (${date})` : ""}</Chip>;
}
export function MockChip() {
  return <Chip tone="muted" className="mock-stripes text-fg" icon={<FlaskConical className={I} aria-hidden />}>MOCK</Chip>;
}
export function StatusChip({ v }: { v: string }) {
  const t = useTranslations();
  const tones: Record<string, Tone> = { active: "go", closed: "muted", award: "info", advisory: "muted", intent: "muted", flagged: "flag", other: "muted" };
  const icon = v === "flagged" ? <Flag className={I} aria-hidden /> : v === "active" ? <Clock className={I} aria-hidden /> : undefined;
  return <Chip tone={tones[v] ?? "muted"} icon={icon}>{t(`status.${v}`)}</Chip>;
}

export function FitBar({ value, threshold = 60, compact }: { value: number | null; threshold?: number; compact?: boolean }) {
  const v = value ?? 0;
  const color = value === null ? "bg-border" : v >= threshold ? "bg-accent" : "bg-muted/60";
  return (
    <div className={cn("flex items-center gap-2", compact ? "min-w-[110px]" : "min-w-[150px]")}>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`fit ${value ?? "—"} / 100`}>
        <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-fg/50" style={{ left: `${threshold}%` }} aria-hidden />
      </div>
      <span className="tnum w-8 text-right text-sm font-bold">{value ?? "—"}</span>
    </div>
  );
}
