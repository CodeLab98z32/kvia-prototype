"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, ChevronDown, Copy, Inbox } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/format";

/* ----------------------------------------------------------------------------------------------------------------
   Surfaces and headings
   ---------------------------------------------------------------------------------------------------------------- */
export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border bg-surface", className)} {...p} />;
}
export function CardHeader({ title, sub, right, icon }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-muted">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-6">{title}</h3>
          {sub && <p className="mt-0.5 text-meta text-muted">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** Page header: 30px title, one-line description, actions on the right. */
export function PageTitle({ title, sub, right, kicker, back }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; kicker?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-8">
      {back && <div className="mb-4">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {kicker && <div className="mb-2 text-meta font-medium text-muted">{kicker}</div>}
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] sm:text-title">{title}</h1>
          {sub && <p className="mt-2 text-body text-muted">{sub}</p>}
        </div>
        {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}

/** Section header: 18px title, optional description and actions. */
export function Section({ title, sub, right, children, className, id }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section font-semibold tracking-[-0.01em]">{title}</h2>
          {sub && <p className="mt-0.5 text-body text-muted">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="t-fast inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-fg">
      <span aria-hidden>←</span>{children}
    </Link>
  );
}

/* ----------------------------------------------------------------------------------------------------------------
   Buttons
   ---------------------------------------------------------------------------------------------------------------- */
const btn = {
  primary: "bg-accent text-accent-fg hover:bg-accent/90",
  secondary: "border border-border bg-surface text-fg hover:bg-surface-2 hover:border-border-strong",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
} as const;
const size = { md: "h-10 px-4 text-[14px]", sm: "h-8 px-3 text-[13px]" } as const;
export function Button({ variant = "secondary", size: s = "md", className, ...p }: ComponentProps<"button"> & { variant?: keyof typeof btn; size?: keyof typeof size }) {
  return (
    <button type="button"
      className={cn("t-fast inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-not-allowed disabled:opacity-50", size[s], btn[variant], className)}
      {...p} />
  );
}
export function LinkButton({ variant = "secondary", size: s = "md", className, ...p }: ComponentProps<typeof Link> & { variant?: keyof typeof btn; size?: keyof typeof size }) {
  return <Link className={cn("t-fast inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium", size[s], btn[variant], className)} {...p} />;
}

/* ----------------------------------------------------------------------------------------------------------------
   Data presentation
   ---------------------------------------------------------------------------------------------------------------- */
/** Horizontal strip of compact statistics separated by hairlines. */
export function StatStrip({ items, className }: { items: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "go" | "warn" | "nogo" | "flag" }[]; className?: string }) {
  const tone = { go: "text-go", warn: "text-warn", nogo: "text-nogo", flag: "text-flag" };
  return (
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("border-border px-5 py-4", i % 2 === 1 && "border-l", i >= 2 && "border-t sm:border-t-0", i > 0 && "sm:border-l")}>
          <dt className="text-meta text-muted">{it.label}</dt>
          <dd className={cn("tnum mt-1 text-[26px] font-semibold leading-8 tracking-[-0.01em]", it.tone && tone[it.tone])}>{it.value}</dd>
          {it.sub && <dd className="mt-0.5 text-meta text-muted">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
/** Kept for compatibility with older pages. */
export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: string }) {
  return <StatStrip items={[{ label, value, sub }]} />;
}

/** Definition list in rows (label left, value right). */
export function KV({ items, className, cols = 1 }: { items: [ReactNode, ReactNode][]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-8", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:[&:nth-last-child(-n+1)]:border-0">
          <dt className="text-meta text-muted">{k}</dt>
          <dd className="text-body">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Table container in the style of the reference: toolbar on top, light header row, hairline dividers. */
export function TableCard({ toolbar, children, footer, className }: { toolbar?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-surface", className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">{toolbar}</div>}
      {children}
      {footer && <div className="border-t border-border px-4 py-2.5 text-meta text-muted">{footer}</div>}
    </div>
  );
}
export const th = "h-11 whitespace-nowrap px-4 text-left text-meta font-medium text-muted";
export const td = "px-4 py-3.5 align-middle text-body";
export const tr = "t-fast border-t border-border hover:bg-surface-2/60";

export function Disclosure({ summary, children, defaultOpen = false, className }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="t-fast flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-[14px] font-medium hover:bg-surface-2/60">
        <span>{summary}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-150", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="anim-dropdown border-t border-border p-4">{children}</div>}
    </div>
  );
}

/** Readable JSON with light syntax colouring and a copy button. */
export function JsonView({ data, max = 520 }: { data: unknown; max?: number }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = typeof data === "string" ? esc(text) : esc(text)
    .replace(/(&quot;|")((?:\\.|[^"\\])*)"(?=\s*:)/g, '<span class="k">"$2"</span>')
    .replace(/: "((?:\\.|[^"\\])*)"/g, ': <span class="s">"$1"</span>')
    .replace(/: (-?\d+(?:\.\d+)?)/g, ': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="b">$1</span>');
  return (
    <div className="relative">
      <CopyButton text={text} className="absolute right-2 top-2 z-10" />
      <pre className="json overflow-auto rounded-lg border border-border bg-surface-2/60 p-3 pr-12" style={{ maxHeight: max }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const t = useTranslations();
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(text); } catch {
        const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } finally { ta.remove(); }
      }
      setDone(true); setTimeout(() => setDone(false), 1400);
    }} className={cn("t-fast inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-meta text-muted hover:text-fg", className)}>
      {done ? <Check className="h-3.5 w-3.5 text-go" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}{done ? t("common.copied") : t("common.copy")}
    </button>
  );
}

/** Tabs with an animated underline (150ms). */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, tabs.length]);
  return (
    <div className={cn("relative border-b border-border", className)}>
      <div ref={ref} role="tablist" className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} data-tab={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
            className={cn("t-fast flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap text-[14px] font-medium", value === t.id ? "text-fg" : "text-muted hover:text-fg")}>
            {t.label}
          </button>
        ))}
      </div>
      <span aria-hidden className="absolute bottom-0 h-0.5 rounded-full bg-accent transition-all duration-150" style={{ left: bar.left, width: bar.width }} />
    </div>
  );
}

/** Small segmented control (e.g. All / Forwarded / Manual). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-2/60 p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={cn("t-fast min-h-8 rounded-md px-3 py-1 text-[13px] font-medium leading-tight", value === o.id ? "bg-surface text-fg shadow-hair" : "text-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Dropdown filter button ("Status: All") with a multi- or single-select menu. */
export function FilterMenu({ label, options, value, onChange, multi = true, allLabel }: {
  label: string; options: { id: string; label: ReactNode; count?: number }[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; allLabel: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const summary = value.length === 0 ? allLabel : value.length === 1 ? String(options.find((o) => o.id === value[0])?.label ?? value[0]) : t("common.nSelected", { n: value.length });
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}
        className={cn("t-fast inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px]", value.length ? "border-accent/50 bg-accent-soft/60 text-fg" : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg")}>
        <span className="text-muted">{label}:</span><span className="max-w-[140px] truncate font-medium text-fg">{summary}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
      </button>
      {open && (
        <div className="anim-dropdown absolute left-0 top-full z-40 mt-1.5 min-w-[220px] rounded-lg border border-border bg-surface p-1 shadow-pop">
          <ul role="listbox" aria-multiselectable={multi} aria-label={label} className="max-h-[320px] overflow-auto">
            {options.map((o) => {
              const sel = value.includes(o.id);
              return (
                <li key={o.id}>
                  <button type="button" role="option" aria-selected={sel}
                    onClick={() => { if (multi) onChange(sel ? value.filter((x) => x !== o.id) : [...value, o.id]); else { onChange(sel ? [] : [o.id]); setOpen(false); } }}
                    className="t-fast flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-2">
                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center border", multi ? "rounded" : "rounded-full", sel ? "border-accent bg-accent text-accent-fg" : "border-border-strong")}>
                      {sel && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                    <span className="flex-1">{o.label}</span>
                    {o.count !== undefined && <span className="tnum text-meta text-muted">{o.count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="t-fast mt-1 w-full rounded-md border-t border-border px-2.5 py-2 text-left text-[13px] text-muted hover:text-fg">{t("common.reset")}</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------------
   States
   ---------------------------------------------------------------------------------------------------------------- */
export function Loading({ rows = 3 }: { rows?: number }) {
  const t = useTranslations();
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("common.loading")}</span>
      <div className="h-8 w-64 animate-pulse rounded-md bg-surface-2" />
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />)}
    </div>
  );
}
export function EmptyState({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Inbox className="h-6 w-6 text-muted" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-body text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-nogo/30 bg-nogo-soft/40 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-nogo" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
      {text && <p className="mt-1 max-w-md break-words text-body text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------------
   Forms
   ---------------------------------------------------------------------------------------------------------------- */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-meta font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
export const inputCls = "t-fast h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] placeholder:text-muted hover:border-border-strong focus:border-accent";
