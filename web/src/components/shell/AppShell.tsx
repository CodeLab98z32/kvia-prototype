"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Beaker, BookOpenCheck, Building2, CalendarDays, Check, ChevronsUpDown, ClipboardCheck, ClipboardList, Cpu, Database,
  FileSearch, FileText, FlaskConical, Gauge, LayoutDashboard, ListOrdered, Menu, Monitor, Moon, ShieldCheck, Sun, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BASE, useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { useApp, useL, useModel } from "@/lib/state";
import type { IndexFile, RunInfo } from "@/lib/types";

const NAV_A = [
  { path: "/", key: "overview", icon: LayoutDashboard },
  { path: "/notices", key: "notices", icon: FileSearch },
  { path: "/screening", key: "screening", icon: ListOrdered },
  { path: "/reports", key: "reports", icon: ClipboardCheck },
  { path: "/company", key: "company", icon: Building2 },
];
const NAV_B = [
  { path: "/prototype/logic", key: "logic", icon: Cpu },
  { path: "/prototype/prompts", key: "prompts", icon: FileText },
  { path: "/prototype/tests", key: "tests", icon: BookOpenCheck },
  { path: "/prototype/test-log", key: "testlog", icon: ClipboardList },
  { path: "/prototype/run", key: "run", icon: Database },
  { path: "/prototype/adviser", key: "adviser", icon: ShieldCheck },
];
const NAV_INTERNAL = [{ path: "/internal/dev-stats", key: "devstats", icon: Gauge }];

/** Shared column grid so header, sidebar and content line up (team feedback). */
const COLS = "mx-auto w-full max-w-[1560px] px-4 lg:px-6";
const SIDEBAR_W = "lg:w-52";

function Mark({ size = 30 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}/brand/kvia_mark.svg`} width={size} height={size} alt="" aria-hidden className="shrink-0" />;
}

function NavLink({ path, label, icon: Icon, tone = "accent", onClick }: { path: string; label: string; icon: typeof Cpu; tone?: "accent" | "proto" | "muted"; onClick?: () => void }) {
  const pathname = usePathname();
  const { href } = useApp();
  const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
  const act = { accent: "bg-accent-soft text-accent", proto: "bg-proto-soft text-proto", muted: "bg-surface-2 text-fg" }[tone];
  return (
    <Link href={href(path)} onClick={onClick} aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] font-medium transition",
        active ? act : "text-muted hover:bg-surface-2 hover:text-fg")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  return (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-0.5">
      {NAV_A.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} onClick={onNavigate} />)}
      <div className="mt-5 border-t border-proto/30 pt-3">
        <div className="mb-1 flex items-center gap-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-proto">
          <FlaskConical className="h-3 w-3" aria-hidden />{t("nav.groupB")}
        </div>
        {NAV_B.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} tone="proto" onClick={onNavigate} />)}
      </div>
      <div className="mt-5 border-t border-dashed border-border pt-3">
        <div className="mb-1 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{t("nav.groupInternal")}</div>
        {NAV_INTERNAL.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} tone="muted" onClick={onNavigate} />)}
      </div>
    </nav>
  );
}

/** Company switch for the demo, integrated into the firm card (green = prototype control). */
function FirmSwitcher() {
  const t = useTranslations();
  const L = useL();
  const m = useModel();
  const { firm, setFirm } = useApp();
  const idx = useJson<[IndexFile]>(["index.json"])?.[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const coord = m?.profile.account_and_baseline.find((f) => f.id === "bid_coordinator")?.value
    .split(";")[0].replace(/\s*\(fictional\)/i, "").split(",")[0];
  const Avatar = ({ initials }: { initials: string }) => (
    <span className="brand-gradient grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" aria-hidden>{initials}</span>
  );
  return (
    <div ref={ref} className="relative">
      <span className="pointer-events-none absolute -top-[7px] left-2.5 z-10 bg-surface px-1 text-[9.5px] font-semibold uppercase leading-none tracking-wider text-proto">
        {t("proto.demoControl")}
      </span>
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className="flex min-w-0 items-center gap-2.5 rounded-lg border border-proto/50 bg-surface py-1.5 pl-2 pr-2.5 text-left hover:bg-proto-soft/40">
        {m && <Avatar initials={m.profile.firm.initials} />}
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold">{m?.profile.firm.name ?? "…"}</span>
          <span className="block truncate text-[11.5px] text-muted">{t("header.coordinator")}: {coord}</span>
        </span>
        <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 text-proto" aria-hidden />
      </button>
      {open && idx && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(340px,90vw)] rounded-lg border border-proto/50 bg-surface p-1.5 shadow-lg">
          <ul role="listbox" aria-label={t("proto.demoControl")}>
            {idx.profiles.map((p) => (
              <li key={p.id}>
                <button role="option" aria-selected={firm === p.id} onClick={() => { setFirm(p.id); setOpen(false); }}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-2", firm === p.id && "bg-proto-soft/50")}>
                  <Avatar initials={p.initials} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{L(p, "sector")}</span>
                  </span>
                  {firm === p.id && <Check className="h-4 w-4 text-proto" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 border-t border-border px-2 pb-1 pt-2 text-[11.5px] text-muted">{t("proto.demoControlHint")}</p>
        </div>
      )}
    </div>
  );
}

function StatusDot() {
  const t = useTranslations();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  // green = live, red = offline, amber = prototype / demo operation (this site is always demo)
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted" title={t("header.statusHint")}>
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      {t("header.statusDemo")}{run?.mock ? " · MOCK" : ""}
    </span>
  );
}

function ThemeSwitch() {
  const t = useTranslations();
  const { theme, setTheme } = useApp();
  const [sysDark, setSysDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSysDark(mq.matches);
    const f = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const dark = theme === "dark" || (theme === "system" && sysDark);
  return (
    <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
      <button onClick={() => setTheme(dark ? "light" : "dark")} title={dark ? t("header.theme_light") : t("header.theme_dark")}
        className={cn("rounded p-1.5", theme !== "system" ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}>
        {dark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        <span className="sr-only">{dark ? t("header.theme_light") : t("header.theme_dark")}</span>
      </button>
      <button onClick={() => setTheme("system")} aria-pressed={theme === "system"} title={t("header.theme_system")}
        className={cn("rounded p-1.5", theme === "system" ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}>
        <Monitor className="h-4 w-4" aria-hidden /><span className="sr-only">{t("header.theme_system")}</span>
      </button>
    </div>
  );
}

function LangSwitch() {
  const t = useTranslations();
  const { lang, setLang } = useApp();
  return (
    <div role="radiogroup" aria-label={t("header.language")} className="flex rounded-md border border-border bg-surface p-0.5 text-[11.5px] font-semibold">
      {(["en", "nb"] as const).map((l) => (
        <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)} title={l === "en" ? "English" : "Norsk bokmål"}
          className={cn("rounded px-1.5 py-1", lang === l ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}>
          {l === "en" ? "EN" : "NO"}
        </button>
      ))}
    </div>
  );
}

function Header({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const t = useTranslations();
  const { href } = useApp();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  return (
    <header className="no-print border-b border-border bg-surface">
      <div className={cn(COLS, "flex flex-wrap items-center gap-x-6 gap-y-3 py-3.5")}>
        <div className={cn("flex items-center gap-2", SIDEBAR_W)}>
          <button className="-ml-1 rounded-md p-1.5 hover:bg-surface-2 lg:hidden" onClick={onMenu} aria-expanded={menuOpen} aria-controls="mobile-nav">
            {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{t("nav.menu")}</span>
          </button>
          <Link href={href("/")} className="flex items-center gap-2 lg:pl-2">
            <Mark />
            <span className="leading-none">
              <span className="block text-[23px] font-extrabold tracking-[-0.03em]">kvia</span>
              <span className="mt-0.5 hidden text-[10.5px] font-medium text-muted sm:block">{t("brand.tagline")}</span>
            </span>
          </Link>
        </div>
        <FirmSwitcher />
        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          <span className="hidden items-center gap-1 text-[11.5px] text-muted sm:inline-flex"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{t("header.today")} 2026-11-04</span>
          {run && (
            <Link href={href("/prototype/run")} className="hidden items-center gap-1 text-[11.5px] text-muted hover:text-fg md:inline-flex">
              <Database className="h-3.5 w-3.5" aria-hidden />{run.run_id}
            </Link>
          )}
          <StatusDot />
          <LangSwitch />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}

function MockBanner() {
  const t = useTranslations();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  if (!run?.mock) return null;
  return (
    <div className="mock-stripes border-b border-border" role="note">
      <div className={cn(COLS, "flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1 text-[11.5px]")}>
        <b className="inline-flex items-center gap-1.5 rounded bg-surface px-1.5"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("mock.banner")}</b>
        <span className="hidden rounded bg-surface/80 px-1.5 md:inline">{t("mock.bannerSub")}</span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">{t("nav.skip")}</a>
      <Header onMenu={() => setOpen(!open)} menuOpen={open} />
      <MockBanner />
      {open && <div id="mobile-nav" className="no-print border-b border-border bg-surface px-4 py-3 lg:hidden"><Sidebar onNavigate={() => setOpen(false)} /></div>}
      <div className={cn(COLS, "flex gap-6")}>
        <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 overflow-y-auto py-8 lg:block", SIDEBAR_W)}><Sidebar /></aside>
        <main id="main" className="print-full min-w-0 max-w-content flex-1 py-8">{children}</main>
      </div>
      <footer className="no-print mt-16 border-t border-border">
        <div className={cn(COLS, "flex flex-wrap items-center gap-3 py-5 text-xs text-muted")}>
          <Mark size={16} /><span>{t("footer.attribution")}</span>
        </div>
      </footer>
    </div>
  );
}

/** Wrapper for group-B pages: visibly different accent line and "Prototype" badge (SPEC §8.2). */
export function ProtoPage({ title, sub, children, right, internal }: { title: string; sub?: ReactNode; children: ReactNode; right?: ReactNode; internal?: boolean }) {
  const t = useTranslations();
  return (
    <div className="animate-fadein">
      <div className={cn("mb-8 border-l-2 pl-4", internal ? "border-muted" : "border-proto")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider", internal ? "text-muted" : "text-proto")}>
              <Beaker className="h-3 w-3" aria-hidden />{internal ? t("nav.groupInternal") : t("proto.badge")}
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            {sub && <p className="mt-1 max-w-3xl text-[14.5px] text-muted">{sub}</p>}
          </div>
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}
