"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, FilterX, Search } from "lucide-react";
import { useMemo } from "react";
import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState,
} from "@tanstack/react-table";
import { Card, Field, Loading, PageTitle, inputCls } from "@/components/ui/ui";
import { FitBar, MockChip, StatusChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { useApp, useModel, type Model } from "@/lib/state";
import type { NoticeRecord } from "@/lib/types";

const STATUSES = ["active", "closed", "award", "advisory", "intent", "flagged"] as const;
const FILTER_KEYS = ["q", "status", "cpv", "trade", "ctype", "nuts", "dfrom", "dto", "vmin", "vmax", "vunknown", "fw", "dps", "lots"];

interface Row { rec: NoticeRecord; status: string; fit: number | null; route?: string; deadline: string | null; value: number | null }

function useFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => sp.get(k) ?? "";
  const set = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const clear = () => { const p = new URLSearchParams(sp.toString()); FILTER_KEYS.forEach((k) => p.delete(k)); router.replace(`${pathname}?${p.toString()}`, { scroll: false }); };
  return { get, set, clear, any: FILTER_KEYS.some((k) => sp.get(k)) };
}

function applyFilters(rows: Row[], g: (k: string) => string): Row[] {
  const q = g("q").toLowerCase();
  const statuses = g("status") ? g("status").split(",") : [];
  return rows.filter(({ rec, status, value, deadline }) => {
    const o = rec.original;
    const d = rec.derived;
    if (q && ![o.title, o.title_en, o.description, o.buyer_name, rec.doffin_id].join(" ").toLowerCase().includes(q)) return false;
    if (statuses.length && !statuses.includes(status)) return false;
    if (g("cpv") && !d.cpv_all.some((c) => c.startsWith(g("cpv")))) return false;
    if (g("trade") && o.trade !== g("trade")) return false;
    if (g("ctype") && o.contract_type !== g("ctype")) return false;
    if (g("nuts") && !(d.place_of_performance_nuts_list.includes(g("nuts")) || (g("nuts") !== "anyw" && d.place_anywhere))) return false;
    if (g("dfrom") && (!deadline || deadline.slice(0, 10) < g("dfrom"))) return false;
    if (g("dto") && (!deadline || deadline.slice(0, 10) > g("dto"))) return false;
    const unknownOnly = g("vunknown") === "only";
    if (unknownOnly && value !== null) return false;
    if ((g("vmin") || g("vmax")) && !unknownOnly) {
      if (value === null) return g("vunknown") === "include";
      if (g("vmin") && value < Number(g("vmin")) * 1e6) return false;
      if (g("vmax") && value > Number(g("vmax")) * 1e6) return false;
    }
    if (g("fw") && String(d.framework) !== (g("fw") === "yes" ? "true" : "false")) return false;
    if (g("dps") && String(d.dps) !== (g("dps") === "yes" ? "true" : "false")) return false;
    if (g("lots") === "multi" && (d.lot_count_int ?? 1) <= 1) return false;
    if (g("lots") === "single" && (d.lot_count_int ?? 1) > 1) return false;
    return true;
  });
}

const col = createColumnHelper<Row>();

function NoticeTable({ m, rows }: { m: Model; rows: Row[] }) {
  const t = useTranslations();
  const { href, lang } = useApp();
  const sp = useSearchParams();
  const sortParam = sp.get("sort") ?? "";
  const sorting: SortingState = sortParam ? [{ id: sortParam.replace(/^-/, ""), desc: sortParam.startsWith("-") }] : [];
  const router = useRouter();
  const pathname = usePathname();
  const setSorting = (s: SortingState) => {
    const p = new URLSearchParams(sp.toString());
    if (s[0]) p.set("sort", `${s[0].desc ? "-" : ""}${s[0].id}`); else p.delete("sort");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const columns = useMemo(() => [
    col.accessor((r) => (lang === "en" && r.rec.original.title_en ? r.rec.original.title_en : r.rec.original.title), {
      id: "title", header: () => t("notices.col.notice"),
      cell: (c) => (
        <div className="min-w-[240px]">
          <Link href={href(`/notices/${c.row.original.rec.doffin_id}`)} className="font-semibold hover:text-accent hover:underline">{c.getValue()}</Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="tnum">{c.row.original.rec.doffin_id}</span>·<span className="truncate">{c.row.original.rec.derived.buyer_name_list[0]}{c.row.original.rec.derived.buyer_name_list.length > 1 ? ` +${c.row.original.rec.derived.buyer_name_list.length - 1}` : ""}</span>
            {c.row.original.rec.mock && <MockChip />}
          </div>
        </div>
      ),
    }),
    col.accessor("status", { header: () => t("notices.col.status"), cell: (c) => <StatusChip v={c.getValue()} /> }),
    col.accessor((r) => r.rec.original.contract_type, { id: "ctype", header: () => t("notices.col.type"), cell: (c) => c.getValue() ? t(`ctype.${c.getValue()}`) : "—" }),
    col.accessor("deadline", {
      header: () => t("notices.col.deadline"), sortUndefined: "last",
      cell: (c) => {
        const v = c.getValue();
        const dl = daysLeft(v);
        return <div className="tnum whitespace-nowrap text-sm">{fmtDate(v, lang)}{v && c.row.original.rec.original.notice_type === "ANNOUNCEMENT_OF_COMPETITION" && <div className={cn("text-xs", dl !== null && dl < 0 ? "text-muted" : "text-accent")}>{dl !== null && dl >= 0 ? t("common.daysLeft", { n: dl }) : t("common.passed")}</div>}</div>;
      },
    }),
    col.accessor("value", { header: () => t("notices.col.value"), sortUndefined: "last", cell: (c) => <span className="tnum whitespace-nowrap text-sm">{c.getValue() === null ? <span className="text-muted">{t("common.unknown")}</span> : nok(c.getValue(), lang)}</span> }),
    col.accessor((r) => r.rec.original.cpv_main, { id: "cpv", header: () => "CPV", cell: (c) => <span className="tnum text-xs">{c.getValue() || "—"}</span> }),
    col.accessor((r) => r.rec.derived.place_of_performance_nuts_list.join(", "), { id: "nuts", header: () => t("notices.col.region"), cell: (c) => <span className="text-xs">{c.getValue().length > 18 ? `${c.row.original.rec.derived.place_of_performance_nuts_list.length} NUTS` : c.getValue() || "—"}</span> }),
    col.accessor("fit", {
      header: () => `${t("notices.col.fit")} (${m.profile.profile_id})`, sortUndefined: "last",
      cell: (c) => c.getValue() === null ? <span className="text-xs text-muted">{c.row.original.status === "flagged" ? t("notices.noFitFlagged") : t("notices.notScreened")}</span> : <FitBar value={c.getValue()} threshold={m.screening.threshold} compact />,
    }),
  ], [t, href, lang, m]);
  const table = useReactTable({
    data: rows, columns, state: { sorting }, onSortingChange: (u) => setSorting(typeof u === "function" ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>{hg.headers.map((h) => (
              <th key={h.id} className="px-3 py-2.5 font-semibold">
                <button className="inline-flex items-center gap-1 hover:text-fg" onClick={h.column.getToggleSortingHandler()}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  <ArrowDownUp className={cn("h-3 w-3", h.column.getIsSorted() ? "text-accent" : "opacity-40")} aria-hidden />
                </button>
              </th>))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
              {r.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-2.5 align-top">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="p-8 text-center text-sm text-muted">{t("notices.none")}</div>}
    </div>
  );
}

export default function NoticesPage() {
  const t = useTranslations();
  const m = useModel();
  const f = useFilters();
  const all: Row[] = useMemo(() => !m ? [] : m.store.records.map((rec) => ({
    rec, status: m.status(rec.doffin_id), fit: m.rank[rec.doffin_id]?.fit_score ?? null, route: m.rank[rec.doffin_id]?.route,
    deadline: rec.derived.tender_deadline, value: rec.derived.estimated_value_nok,
  })), [m]);
  if (!m) return <Loading />;
  const rows = applyFilters(all, f.get);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((r) => r.status === s).length]));
  const statuses = f.get("status") ? f.get("status").split(",") : [];
  const opts = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();
  const toggleStatus = (s: string) => {
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
    f.set({ status: next.join(",") });
  };
  const real = all.filter((r) => !r.rec.mock).length;
  return (
    <div className="animate-fadein">
      <PageTitle kicker={t("nav.groupA")} title={t("notices.title")} sub={t("notices.sub", { real, mock: all.length - real })} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("notices.statusFilter")}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => toggleStatus(s)} aria-pressed={statuses.includes(s)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", statuses.includes(s) ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface hover:bg-surface-2")}>
            {t(`status.${s}`)} <span className="tnum ml-1 text-xs text-muted">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4">
        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><Field label={t("notices.f.text")}>
            <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
              <input className={cn(inputCls, "pl-8")} value={f.get("q")} onChange={(e) => f.set({ q: e.target.value })} placeholder={t("notices.f.textPh")} /></div>
          </Field></div>
          <Field label={t("notices.f.cpv")}>
            <select className={inputCls} value={f.get("cpv")} onChange={(e) => f.set({ cpv: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {opts(all.flatMap((r) => r.rec.derived.cpv_all.map((c) => c.slice(0, 2)))).map((d) => <option key={d} value={d}>{t("notices.f.division")} {d}</option>)}
            </select>
          </Field>
          <Field label={t("notices.f.trade")}>
            <select className={inputCls} value={f.get("trade")} onChange={(e) => f.set({ trade: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {opts(all.map((r) => r.rec.original.trade)).map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("notices.f.ctype")}>
              <select className={inputCls} value={f.get("ctype")} onChange={(e) => f.set({ ctype: e.target.value })}>
                <option value="">{t("common.any")}</option>
                {["Works", "Supplies", "Services"].map((d) => <option key={d} value={d}>{t(`ctype.${d}`)}</option>)}
              </select>
            </Field>
            <Field label={t("notices.f.nuts")}>
              <select className={inputCls} value={f.get("nuts")} onChange={(e) => f.set({ nuts: e.target.value })}>
                <option value="">{t("common.any")}</option>
                {opts(all.flatMap((r) => r.rec.derived.place_of_performance_nuts_list)).map((d) => <option key={d} value={d}>{d === "anyw" ? t("notices.f.anyw") : d}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("notices.f.dfrom")}><input type="date" className={inputCls} value={f.get("dfrom")} onChange={(e) => f.set({ dfrom: e.target.value })} /></Field>
            <Field label={t("notices.f.dto")}><input type="date" className={inputCls} value={f.get("dto")} onChange={(e) => f.set({ dto: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("notices.f.vmin")}><input inputMode="decimal" className={inputCls} value={f.get("vmin")} onChange={(e) => f.set({ vmin: e.target.value })} placeholder="0" /></Field>
            <Field label={t("notices.f.vmax")}><input inputMode="decimal" className={inputCls} value={f.get("vmax")} onChange={(e) => f.set({ vmax: e.target.value })} placeholder="∞" /></Field>
          </div>
          <Field label={t("notices.f.vunknown")}>
            <select className={inputCls} value={f.get("vunknown")} onChange={(e) => f.set({ vunknown: e.target.value })}>
              <option value="">{t("notices.f.vunknownExclude")}</option>
              <option value="include">{t("notices.f.vunknownInclude")}</option>
              <option value="only">{t("notices.f.vunknownOnly")}</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {(["fw", "dps", "lots"] as const).map((k) => (
              <Field key={k} label={t(`notices.f.${k}`)}>
                <select className={cn(inputCls, "px-2")} value={f.get(k)} onChange={(e) => f.set({ [k]: e.target.value })}>
                  <option value="">{t("common.any")}</option>
                  {(k === "lots" ? ["single", "multi"] : ["yes", "no"]).map((v) => <option key={v} value={v}>{t(`notices.f.v_${v}`)}</option>)}
                </select>
              </Field>
            ))}
          </div>
          {f.any && <button onClick={f.clear} className="self-end justify-self-start inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><FilterX className="h-4 w-4" aria-hidden />{t("notices.f.clear")}</button>}
        </Card>
        <Card className="min-w-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
            <span><b className="tnum">{rows.length}</b> {t("notices.of")} {all.length}</span>
            <span className="text-xs text-muted">{t("notices.rule")}</span>
          </div>
          <NoticeTable m={m} rows={rows} />
        </Card>
      </div>
    </div>
  );
}
