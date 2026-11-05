"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpenCheck, Building2, Check, ChevronRight, ChevronsUpDown, ClipboardCheck, ClipboardList, Cpu, Database, FileSearch,
  FileText, FlaskConical, Gauge, LayoutGrid, ListOrdered, Menu, Monitor, Moon, ShieldCheck, Sun, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BASE, useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { useApp, useL, useModel } from "@/lib/state";
import type { IndexFile, RunInfo } from "@/lib/types";

const NAV_A = [
  { path: "/", key: "overview", icon: LayoutGrid },
  { path: "/notices", key: "notices", icon: FileSearch },
  { path: "/screening", key: "screening", icon: ListOrdered },
  { path: "/reports", key: "reports", icon: ClipboardCheck },
  { path: "/company", key: "company", icon: Building2 },
];
const NAV_B = [
  { path: "/prototype/logic", key: "logic", icon: Cpu },
  { path: "/prototype/prompts", key: "prompts", icon: FileText },
  { path: "/prototype/adviser", key: "adviser", icon: ShieldCheck },
  { path: "/prototype/tests", key: "tests", icon: BookOpenCheck },
  { path: "/prototype/test-log", key: "testlog", icon: ClipboardList },
  { path: "/prototype/run", key: "run", icon: Database },
];

function Mark({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}/brand/kvia_mark.svg`} width={size} height={size} alt="" aria-hidden className="shrink-0" />;
}

function NavLink({ path, label, icon: Icon, proto, onClick }: { path: string; label: string; icon: typeof Cpu; proto?: boolean; onClick?: () => void }) {
  const pathname = usePathname();
  const { href } = useApp();
  const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
  return (
    <Link href={href(path)} onClick={onClick} aria-current={active ? "page" : undefined}
      className={cn("t-fast flex h-10 items-center gap-3 rounded-lg px-3 text-[14px]",
        active ? "border border-border bg-surface font-medium text-fg shadow-hair" : "border border-transparent text-muted hover:bg-surface/70 hover:text-fg")}>
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && (proto ? "text-proto" : "text-accent"))} strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}

function FirmSwitcher({ up = true }: { up?: boolean }) {
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
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const coord = m?.profile.account_and_baseline.find((f) => f.id === "bid_coordinator")?.value
    .split(";")[0].replace(/\s*\(fictional\)/i, "").split(",")[0];
  const Avatar = ({ initials }: { initials: string }) => (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[10.5px] font-semibold text-accent" aria-hidden>{initials}</span>
  );
  return (
    <div ref={ref} className="relative">
      <span className="pointer-events-none absolute -top-[7px] left-3 z-10 bg-bg px-1 text-[10px] font-semibold uppercase leading-none tracking-wider text-proto">{t("proto.demoControl")}</span>
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className="t-fast flex w-full items-center gap-2 rounded-xl border border-proto/40 bg-surface px-2 py-2.5 text-left hover:border-proto/70" title={m ? `${m.profile.firm.name} · ${coord ?? ""}` : undefined}>
        {m && <Avatar initials={m.profile.firm.initials} />}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block whitespace-nowrap text-[12.5px] font-semibold">{m?.profile.firm.name ?? "…"}</span>
          <span className="block truncate text-meta text-muted">{coord ?? ""}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-proto" aria-hidden />
      </button>
      {open && idx && (
        <div className={cn("anim-dropdown absolute left-0 z-50 w-[min(300px,85vw)] rounded-xl border border-border bg-surface p-1.5 shadow-pop", up ? "bottom-full mb-2" : "top-full mt-2")}>
          <ul role="listbox" aria-label={t("proto.demoControl")}>
            {idx.profiles.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected={firm === p.id} onClick={() => { setFirm(p.id); setOpen(false); }}
                  className={cn("t-fast flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2", firm === p.id && "bg-surface-2")}>
                  <Avatar initials={p.initials} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                    <span className="block truncate text-meta text-muted">{L(p, "sector")}</span>
                  </span>
                  {firm === p.id && <Check className="h-4 w-4 text-proto" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 border-t border-border px-2.5 pb-1 pt-2 text-meta text-muted">{t("proto.demoControlHint")}</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const { href } = useApp();
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link href={href("/")} onClick={onNavigate} className="mb-7 flex items-center gap-2.5 px-3">
        <Mark />
        <span className="leading-none">
          <span className="block text-[22px] font-extrabold tracking-[-0.03em]">kvia</span>
          <span className="mt-0.5 block text-[10.5px] font-medium text-muted">{t("brand.tagline")}</span>
        </span>
      </Link>
      <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
        {NAV_A.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} onClick={onNavigate} />)}
        <div className="mb-1 mt-6 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-proto">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("nav.groupB")}
        </div>
        {NAV_B.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} proto onClick={onNavigate} />)}
      </nav>
      <div className="mt-auto pt-6">
        <Link href={href("/internal/dev-stats")} onClick={onNavigate}
          className={cn("t-fast mb-4 flex items-center gap-2 rounded-md px-3 py-1.5 text-meta", pathname.startsWith("/internal") ? "text-fg" : "text-muted hover:text-fg")}>
          <Gauge className="h-3.5 w-3.5" aria-hidden />{t("nav.groupInternal")} · {t("nav.devstats")}
        </Link>
        <FirmSwitcher />
      </div>
    </div>
  );
}

function Breadcrumb() {
  const t = useTranslations();
  const { href } = useApp();
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path?: string }[] = [];
  if (parts[0] === "prototype") {
    crumbs.push({ label: t("nav.groupB") });
    const k = { logic: "logic", prompts: "prompts", adviser: "adviser", tests: "tests", "test-log": "testlog", run: "run" }[parts[1] ?? ""];
    if (k) crumbs.push({ label: t(`nav.${k}`) });
  } else if (parts[0] === "internal") {
    crumbs.push({ label: t("nav.groupInternal") }, { label: t("nav.devstats") });
  } else {
    crumbs.push({ label: t("nav.groupA") });
    const k = { notices: "notices", screening: "screening", reports: "reports", company: "company" }[parts[0] ?? ""];
    if (!parts.length) crumbs.push({ label: t("nav.overview") });
    if (k) crumbs.push({ label: t(`nav.${k}`), path: parts[1] ? `/${parts[0]}` : undefined });
    if (parts[1]) crumbs.push({ label: decodeURIComponent(parts[1]) });
  }
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {crumbs.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted/70" aria-hidden />}
            {c.path ? <Link href={href(c.path)} className="t-fast truncate text-muted hover:text-fg">{c.label}</Link>
              : <span className={cn("truncate", i === crumbs.length - 1 ? "font-medium text-fg" : "text-muted")}>{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StatusDot() {
  const t = useTranslations();
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-meta text-muted" title={t("header.statusHint")}>
      <span className="h-2 w-2 rounded-full bg-[#D9900F]" aria-hidden />{t("header.statusDemo")}
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
  const b = "t-fast grid h-8 w-8 place-items-center rounded-md";
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5">
      <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? t("header.theme_light") : t("header.theme_dark")} title={dark ? t("header.theme_light") : t("header.theme_dark")}
        className={cn(b, theme !== "system" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
        {dark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      </button>
      <button type="button" onClick={() => setTheme("system")} aria-pressed={theme === "system"} aria-label={t("header.theme_system")} title={t("header.theme_system")}
        className={cn(b, theme === "system" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
        <Monitor className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function LangSwitch() {
  const t = useTranslations();
  const { lang, setLang } = useApp();
  return (
    <div role="radiogroup" aria-label={t("header.language")} className="flex items-center rounded-lg border border-border p-0.5 text-[12px] font-semibold">
      {(["en", "nb"] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} title={l === "en" ? "English" : "Norsk bokmål"}
          className={cn("t-fast h-8 rounded-md px-2", lang === l ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
          {l === "en" ? "EN" : "NO"}
        </button>
      ))}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations();
  const { href } = useApp();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  return (
    <div className="no-print flex h-14 items-center gap-3 border-b border-border px-4 sm:px-6 lg:px-8">
      <button type="button" className="t-fast -ml-1.5 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg xl:hidden" onClick={onMenu} aria-label={t("nav.menu")}>
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <Link href={href("/")} className="flex items-center gap-2 xl:hidden" aria-label="kvia">
        <Mark size={24} /><span className="text-[19px] font-extrabold tracking-[-0.03em]">kvia</span>
      </Link>
      <div className="hidden min-w-0 border-l border-border pl-3 lg:block xl:border-0 xl:pl-0"><Breadcrumb /></div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden xl:inline"><StatusDot /></span>
        <span className="hidden whitespace-nowrap text-meta text-muted md:inline">{t("header.today")} <span className="tnum font-medium text-fg">2026-11-04</span></span>
        {run && <Link href={href("/prototype/run")} className="t-fast hidden whitespace-nowrap text-meta text-muted hover:text-fg md:inline">{t("header.run")} <span className="tnum font-medium text-fg">{run.run_id}</span></Link>}
        <LangSwitch />
        <ThemeSwitch />
      </div>
    </div>
  );
}

function MockBanner() {
  const t = useTranslations();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  if (!run?.mock) return null;
  return (
    <div className="mock-stripes border-b border-border" role="note">
      <div className="flex items-center gap-3 px-4 py-1.5 text-meta sm:px-6 lg:px-8">
        <b className="inline-flex shrink-0 items-center gap-1.5 rounded bg-surface px-1.5"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("mock.banner")}</b>
        <span className="hidden min-w-0 flex-1 truncate md:block"><span className="rounded bg-surface/85 px-1.5">{t("mock.bannerSub")}</span></span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">{t("nav.skip")}</a>
      <aside className="no-print fixed inset-y-0 left-0 hidden w-[232px] overflow-y-auto px-3 pb-4 pt-5 xl:block"><SidebarContent /></aside>
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={t("nav.menu")}>
          <button type="button" aria-label={t("common.close")} className="anim-page absolute inset-0 bg-fg/30" onClick={() => setOpen(false)} />
          <div className="anim-drawer absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-bg px-3 pb-4 pt-5 shadow-pop">
            <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="t-fast absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2"><X className="h-5 w-5" aria-hidden /></button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="xl:py-3 xl:pl-[232px] xl:pr-3">
        <div className="print-full flex min-h-screen flex-col bg-surface xl:min-h-[calc(100vh-24px)] xl:rounded-2xl xl:border xl:border-border">
          <TopBar onMenu={() => setOpen(true)} />
          <MockBanner />
          <main id="main" className="min-w-0 flex-1 px-4 py-6 [overflow-wrap:anywhere] sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-content">{children}</div>
          </main>
          <footer className="no-print border-t border-border px-4 py-4 text-meta text-muted sm:px-6 lg:px-8">{t("footer.attribution")}</footer>
        </div>
      </div>
    </div>
  );
}

/** Group-B / internal pages: same layout, marked with the prototype colour and label (SPEC §8.2). */
export function ProtoPage({ title, sub, children, right, internal }: { title: string; sub?: ReactNode; children: ReactNode; right?: ReactNode; internal?: boolean }) {
  const t = useTranslations();
  return (
    <div className="anim-page">
      <header className="mb-8">
        <div className={cn("mb-2 inline-flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wider", internal ? "text-muted" : "text-proto")}>
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />{internal ? t("nav.groupInternal") : t("nav.groupB")}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] sm:text-title">{title}</h1>
            {sub && <p className="mt-2 text-body text-muted">{sub}</p>}
          </div>
          {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}
