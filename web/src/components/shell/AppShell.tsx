"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Beaker, BookOpenCheck, Building2, CalendarDays, ClipboardCheck, ClipboardList, Cpu, Database, FileSearch,
  FileText, FlaskConical, LayoutDashboard, ListOrdered, Menu, Monitor, Moon, ShieldCheck, Sun, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BASE, useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { useApp, useModel } from "@/lib/state";
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
  { path: "/prototype/adviser", key: "adviser", icon: ShieldCheck },
  { path: "/prototype/tests", key: "tests", icon: BookOpenCheck },
  { path: "/prototype/test-log", key: "testlog", icon: ClipboardList },
  { path: "/prototype/run", key: "run", icon: Database },
];

function Mark({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}/brand/kvia_mark.svg`} width={size} height={size} alt="" aria-hidden className="shrink-0" />;
}

function NavLink({ path, label, icon: Icon, proto, onClick }: { path: string; label: string; icon: typeof Cpu; proto?: boolean; onClick?: () => void }) {
  const pathname = usePathname();
  const { href } = useApp();
  const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
  return (
    <Link href={href(path)} onClick={onClick} aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? (proto ? "bg-proto-soft text-proto" : "bg-accent-soft text-accent") : "text-muted hover:bg-surface-2 hover:text-fg")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  return (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("nav.groupA")}</div>
      {NAV_A.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} onClick={onNavigate} />)}
      <div className="my-3 border-t border-dashed border-border" role="separator" />
      <div className="proto-band -mx-1 rounded-lg border border-proto/30 px-1 pb-1">
        <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-proto">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("nav.groupB")}
        </div>
        {NAV_B.map((n) => <NavLink key={n.path} path={n.path} label={t(`nav.${n.key}`)} icon={n.icon} proto onClick={onNavigate} />)}
      </div>
    </nav>
  );
}

function ViewingAs() {
  const t = useTranslations();
  const { firm, setFirm, lang } = useApp();
  const idx = useJson<[IndexFile]>(["index.json"]);
  return (
    <div className="proto-band no-print border-b border-proto/30">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-proto px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-surface">
          <Beaker className="h-3 w-3" aria-hidden />{t("proto.badge")}
        </span>
        <span id="viewing-as" className="text-xs font-medium text-proto sm:text-sm">{t("proto.viewingAs")}</span>
        <div role="radiogroup" aria-labelledby="viewing-as" className="flex flex-wrap gap-1">
          {idx?.[0].profiles.map((p) => (
            <button key={p.id} role="radio" aria-checked={firm === p.id} onClick={() => setFirm(p.id)}
              title={lang === "nb" ? p.sector_nb : p.sector_en}
              className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold transition",
                firm === p.id ? "border-proto bg-proto text-surface" : "border-proto/40 bg-surface text-proto hover:bg-proto-soft")}>
              {p.id}<span className="hidden sm:inline"> · {p.name}</span>
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-muted lg:inline">{t("proto.viewingAsHint")}</span>
      </div>
    </div>
  );
}

function ThemeSwitch() {
  const t = useTranslations();
  const { theme, setTheme } = useApp();
  const opts = [{ id: "light", icon: Sun }, { id: "dark", icon: Moon }, { id: "system", icon: Monitor }] as const;
  return (
    <div role="radiogroup" aria-label={t("header.theme")} className="flex rounded-lg border border-border bg-surface p-0.5">
      {opts.map(({ id, icon: Icon }) => (
        <button key={id} role="radio" aria-checked={theme === id} title={t(`header.theme_${id}`)} onClick={() => setTheme(id)}
          className={cn("rounded-md p-1.5", theme === id ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}>
          <Icon className="h-4 w-4" aria-hidden /><span className="sr-only">{t(`header.theme_${id}`)}</span>
        </button>
      ))}
    </div>
  );
}

function LangSwitch() {
  const t = useTranslations();
  const { lang, setLang } = useApp();
  return (
    <div role="radiogroup" aria-label={t("header.language")} className="flex rounded-lg border border-border bg-surface p-0.5 text-xs font-semibold">
      {(["en", "nb"] as const).map((l) => (
        <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={cn("rounded-md px-2 py-1", lang === l ? "bg-accent-soft text-accent" : "text-muted hover:text-fg")}>
          {l === "en" ? "English" : "Norsk"}
        </button>
      ))}
    </div>
  );
}

function Header({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const t = useTranslations();
  const m = useModel();
  const { lang } = useApp();
  const run = useJson<[RunInfo]>(["run/run_info.json"])?.[0];
  const coord = m?.profile.account_and_baseline.find((f) => f.id === "bid_coordinator")?.value.split(";")[0];
  return (
    <header className="no-print border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <button className="rounded-lg p-2 hover:bg-surface-2 lg:hidden" onClick={onMenu} aria-expanded={menuOpen} aria-controls="mobile-nav">
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{t("nav.menu")}</span>
        </button>
        <Link href={`/?as=${m?.profile.profile_id ?? "P1"}`} className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-none">
            <div className="text-[26px] font-extrabold tracking-[-0.03em]">kvia</div>
            <div className="mt-0.5 hidden text-[11px] font-medium text-muted sm:block">{t("brand.tagline")}</div>
          </div>
        </Link>
        {m && (
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-2.5 py-1.5">
            <div className="brand-gradient grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" aria-hidden>
              {m.profile.firm.initials}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{m.profile.firm.name} <span className="font-normal text-muted">({t("common.synthetic")})</span></div>
              <div className="truncate text-xs text-muted">{t("header.coordinator")}: {coord}</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-accent" aria-hidden /><span className="hidden sm:inline">{t("header.today")}: </span>2026-11-04
          </span>
          {run && (
            <Link href={`/prototype/run/?as=${m?.profile.profile_id ?? "P1"}${lang === "nb" ? "&lang=nb" : ""}`}
              className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium", run.mock ? "mock-stripes border-border" : "border-border")}>
              <Database className="h-3.5 w-3.5" aria-hidden /><span className="hidden sm:inline">{t("header.run")}: {run.run_id}</span>{run.mock && <b className="ml-1">MOCK</b>}
            </Link>
          )}
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
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-2 px-4 py-1.5 text-xs">
        <FlaskConical className="h-4 w-4" aria-hidden />
        <b className="rounded bg-surface px-1.5 py-0.5">{t("mock.banner")}</b>
        <span className="hidden rounded bg-surface/80 px-1.5 py-0.5 md:inline">{t("mock.bannerSub")}</span>
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
      <ViewingAs />
      <Header onMenu={() => setOpen(!open)} menuOpen={open} />
      <MockBanner />
      {open && (
        <div id="mobile-nav" className="no-print border-b border-border bg-surface p-3 lg:hidden"><Sidebar onNavigate={() => setOpen(false)} /></div>
      )}
      <div className="mx-auto flex max-w-[1560px] gap-6 px-4">
        <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto py-6 lg:block"><Sidebar /></aside>
        <main id="main" className="print-full min-w-0 max-w-content flex-1 py-6">{children}</main>
      </div>
      <footer className="no-print mt-10 border-t border-border">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-3 px-4 py-5 text-xs text-muted">
          <Mark size={18} />
          <span>{t("footer.attribution")}</span>
        </div>
      </footer>
    </div>
  );
}

/** Wrapper for group-B pages: visibly different band and "Prototype" badge (SPEC §8.2). */
export function ProtoPage({ title, sub, children, right }: { title: string; sub?: ReactNode; children: ReactNode; right?: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="animate-fadein">
      <div className="proto-band mb-6 rounded-xl border border-proto/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-proto px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-surface">
              <Beaker className="h-3 w-3" aria-hidden />{t("proto.badge")}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
            {sub && <p className="mt-1 max-w-3xl text-[15px] text-muted">{sub}</p>}
          </div>
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}
