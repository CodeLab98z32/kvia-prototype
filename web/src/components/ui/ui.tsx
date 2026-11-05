"use client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-border bg-surface", className)} {...p} />;
}
export function CardHeader({ title, sub, right, icon }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-accent">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold leading-6">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

const btn = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-border bg-surface hover:bg-surface-2",
  ghost: "hover:bg-surface-2",
} as const;
export function Button({ variant = "secondary", className, ...p }: ComponentProps<"button"> & { variant?: keyof typeof btn }) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50", btn[variant], className)}
      {...p}
    />
  );
}
export function LinkButton({ variant = "secondary", className, ...p }: ComponentProps<typeof Link> & { variant?: keyof typeof btn }) {
  return <Link className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition", btn[variant], className)} {...p} />;
}

export function PageTitle({ title, sub, right, kicker }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{kicker}</div>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-[14.5px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, icon, tone = "accent" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "accent" | "go" | "warn" | "nogo" | "flag" }) {
  const tones = { accent: "bg-accent-soft text-accent", go: "bg-go-soft text-go", warn: "bg-warn-soft text-warn", nogo: "bg-nogo-soft text-nogo", flag: "bg-flag-soft text-flag" };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {icon && <div className={cn("grid h-9 w-9 place-items-center rounded-lg", tones[tone])}>{icon}</div>}
        <div className="text-sm text-muted">{label}</div>
      </div>
      <div className="tnum mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Disclosure({ summary, children, defaultOpen = false, className }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-surface-2">
        <span>{summary}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

export function JsonView({ data, max = 520 }: { data: unknown; max?: number }) {
  return (
    <pre className="json-view overflow-auto rounded-lg bg-surface-2 p-3" style={{ maxHeight: max }}>
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1", className)}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", value === t.id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />)}
    </div>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
export const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted";
