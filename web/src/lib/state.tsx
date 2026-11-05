"use client";
import { NextIntlClientProvider } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import nb from "@/messages/nb.json";
import { useJson } from "./data";
import type {
  Activeness, GateRecord, HealthFlag, IndexFile, NoticeRecord, Profile, Reports, RunInfo, Screening, ScreenResult, Store,
} from "./types";

export type Lang = "en" | "nb";
type Theme = "light" | "dark" | "system";

interface Ctx {
  firm: string;
  lang: Lang;
  theme: Theme;
  setFirm: (f: string) => void;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  href: (path: string, params?: Record<string, string | undefined>) => string;
  localAdds: string[];
  addLocal: (noticeId: string) => void;
  resetDemo: () => void;
}
const AppCtx = createContext<Ctx | null>(null);

const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};
export const LOCAL_ADDS_KEY = (firm: string) => `kvia.manual.${firm}`;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firm = sp.get("as") || "P1";
  const urlLang = sp.get("lang");
  const [storedLang, setStoredLang] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Theme>("system");
  const [localAdds, setLocalAdds] = useState<string[]>([]);

  useEffect(() => {
    const l = lsGet("kvia.lang");
    if (l === "nb" || l === "en") setStoredLang(l);
    const t = lsGet("kvia.theme");
    if (t === "light" || t === "dark") setThemeState(t);
  }, []);
  useEffect(() => {
    try { setLocalAdds(JSON.parse(lsGet(LOCAL_ADDS_KEY(firm)) || "[]")); } catch { setLocalAdds([]); }
  }, [firm]);

  const lang: Lang = urlLang === "nb" || urlLang === "en" ? urlLang : storedLang;
  useEffect(() => { document.documentElement.lang = lang === "nb" ? "nb" : "en"; }, [lang]);

  const replaceParams = useCallback((patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); }
    const q = p.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
  }, [sp, router, pathname]);

  const setFirm = useCallback((f: string) => replaceParams({ as: f }), [replaceParams]);
  const setLang = useCallback((l: Lang) => {
    setStoredLang(l); lsSet("kvia.lang", l);
    replaceParams({ lang: l === "en" ? null : l });
  }, [replaceParams]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    lsSet("kvia.theme", t === "system" ? null : t);
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, []);
  const href = useCallback((path: string, params: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    p.set("as", firm);
    if (lang === "nb") p.set("lang", "nb");
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, v);
    return `${path}?${p.toString()}`;
  }, [firm, lang]);
  const addLocal = useCallback((nid: string) => {
    setLocalAdds((prev) => {
      const next = prev.includes(nid) ? prev : [...prev, nid];
      lsSet(LOCAL_ADDS_KEY(firm), JSON.stringify(next));
      return next;
    });
  }, [firm]);
  const resetDemo = useCallback(() => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("kvia.manual.")).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    setLocalAdds([]);
  }, []);

  const value = useMemo(() => ({ firm, lang, theme, setFirm, setLang, setTheme, href, localAdds, addLocal, resetDemo }),
    [firm, lang, theme, setFirm, setLang, setTheme, href, localAdds, addLocal, resetDemo]);
  return (
    <AppCtx.Provider value={value}>
      <NextIntlClientProvider locale={lang} messages={lang === "nb" ? nb : en} timeZone="Europe/Oslo">
        {children}
      </NextIntlClientProvider>
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppStateProvider missing");
  return c;
}

/** Pick the _en / _nb variant of a generated string. */
export function useL() {
  const { lang } = useApp();
  return useCallback(<T extends object>(obj: T | null | undefined, key: string): string => {
    if (!obj) return "";
    const o = obj as Record<string, unknown>;
    return String(o[`${key}_${lang}`] ?? o[`${key}_en`] ?? o[key] ?? "");
  }, [lang]);
}

export type NoticeStatus = "active" | "closed" | "award" | "advisory" | "intent" | "flagged" | "other";
export type ReportVisibility = "forwarded" | "manual_recorded" | "manual_local" | "hidden" | "pending" | "not_screened";

export interface Model {
  index: IndexFile; run: RunInfo; store: Store; notices: Record<string, NoticeRecord>; act: Record<string, Activeness>;
  gate: Record<string, GateRecord>; effective: Record<string, import("./types").Requirement[]>;
  profile: Profile; screening: Screening; reports: Reports; health: HealthFlag[]; rank: Record<string, ScreenResult>;
  status: (nid: string) => NoticeStatus; visibility: (nid: string) => ReportVisibility;
  pending: string[];
}

/** Core data of the configured frozen run + the selected firm's results. */
export function useModel(): Model | undefined {
  const { firm, localAdds } = useApp();
  const d = useJson<[IndexFile, RunInfo, Store, Record<string, Activeness>, { gate: Record<string, GateRecord>; effective_requirements: Record<string, import("./types").Requirement[]> }]>(
    ["index.json", "run/run_info.json", "run/notices.json", "run/0b_activeness.json", "run/1c_release_gate.json"]);
  const known = d ? d[0].profiles.some((p) => p.id === firm) : true;
  const f = useJson<[Profile, Screening, Reports, HealthFlag[]]>(
    d && known ? [`profiles/${firm}.json`, `run/screening/${firm}.json`, `run/reports/${firm}.json`, `run/health/${firm}.json`]
      : [null]);
  return useMemo(() => {
    if (!d || !f) return undefined;
    const [index, run, store, act, gateFile] = d;
    const [profile, screening, reports, health] = f;
    const notices = Object.fromEntries(store.records.map((r) => [r.doffin_id, r]));
    const rank = Object.fromEntries(screening.ranked.map((r) => [r.notice_id, r]));
    const gate = gateFile.gate;
    const status = (nid: string): NoticeStatus => {
      const a = act[nid];
      if (gate[nid]?.final_status === "flagged_pending") return "flagged";
      if (!a) return "other";
      if (a.active) return "active";
      return (["closed", "award", "advisory", "intent"].includes(a.category) ? a.category : "other") as NoticeStatus;
    };
    const visibility = (nid: string): ReportVisibility => {
      if (gate[nid]?.final_status === "flagged_pending") return "pending";
      const r = reports.reports[nid];
      if (!r) return "not_screened";
      if (r.state === "forwarded") return "forwarded";
      if (r.state === "manually_added") return "manual_recorded";
      if (localAdds.includes(nid)) return "manual_local";
      return "hidden";
    };
    const pending = Object.values(gate).filter((g) => g.final_status === "flagged_pending").map((g) => g.notice_id);
    return { index, run, store, notices, act, gate, effective: gateFile.effective_requirements, profile, screening,
      reports, health, rank, status, visibility, pending };
  }, [d, f, localAdds]);
}
