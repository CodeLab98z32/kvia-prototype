"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type Row as TRow, type SortingState,
} from "@tanstack/react-table";
import { Card, Field, Loading, PageTitle, inputCls } from "@/components/ui/ui";
import { FitBar, MockChip, StatusChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { useApp, useModel, type Model } from "@/lib/state";
import type { NoticeRecord } from "@/lib/types";

const STATUSES = ["active", "closed", "award", "advisory", "intent", "flagged"] as const;
const FILTER_KEYS = ["q", "status", "cpv", "trade", "ctype", "nuts", "dfrom", "dto", "vmin", "vmax", "vunknown", "fw", "dps", "lots"] as const;
const PANEL_KEYS = FILTER_KEYS.filter((k) => k !== "q" && k !== "status");
type Filters = Record<(typeof FILTER_KEYS)[number], string>;

interface Row { rec: NoticeRecord; status: string; fit: number | null; deadline: string | null; value: number | null }

/** Filter state lives in React and is mirrored to the URL without a router navigation (deep links keep working). */
function useFilterState() {
  const sp = useSearchParams();
  const init = () => Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) ?? ""])) as Filters;
  const [f, setF] = useState<Filters>(init);
  const [sorting, setSorting] = useState<SortingState>(() => {
    const s = sp.get("sort");
    return s ? [{ id: s.replace(/^-/, ""), desc: s.startsWith("-") }] : [];
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    FILTER_KEYS.forEach((k) => (f[k] ? p.set(k, f[k]) : p.delete(k)));
    if (sorting[0]) p.set("sort", `${sorting[0].desc ? "-" : ""}${sorting[0].id}`); else p.delete("sort");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${p.toString()}`);
  }, [f, sorting]);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  const clear = () => setF(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) as Filters);
  return { f, set, clear, sorting, setSorting };
}

function applyFilters(rows: Row[], g: Filters): Row[] {
  const q = g.q.toLowerCase().trim();
  const statuses = g.status ? g.status.split(",") : [];
  return rows.filter(({ rec, status, value, deadline }) => {
    const o = rec.original;
    const d = rec.derived;
    if (q && ![o.title, o.title_en, o.description, o.buyer_name, rec.doffin_id].join(" ").toLowerCase().includes(q)) return false;
    if (statuses.length && !statuses.includes(status)) return false;
    if (g.cpv && !d.cpv_all.some((c) => c.startsWith(g.cpv))) return false;
    if (g.trade && o.trade !== g.trade) return false;
    if (g.ctype && o.contract_type !== g.ctype) return false;
    if (g.nuts && !(d.place_of_performance_nuts_list.includes(g.nuts) || (g.nuts !== "anyw" && d.place_anywhere))) return false;
    if (g.dfrom && (!deadline || deadline.slice(0, 10) < g.dfrom)) return false;
    if (g.dto && (!deadline || deadline.slice(0, 10) > g.dto)) return false;
    const unknownOnly = g.vunknown === "only";
    if (unknownOnly && value !== null) return false;
    if ((g.vmin || g.vmax) && !unknownOnly) {
      if (value === null) return g.vunknown === "include";
      if (g.vmin && value < Number(g.vmin.replace(",", ".")) * 1e6) return false;
      if (g.vmax && value > Number(g.vmax.replace(",", ".")) * 1e6) return false;
    }
    if (g.fw && d.framework !== (g.fw === "yes")) return false;
    if (g.dps && d.dps !== (g.dps === "yes")) return false;
    if (g.lots === "multi" && (d.lot_count_int ?? 1) <= 1) return false;
    if (g.lots === "single" && (d.lot_count_int ?? 1) > 1) return false;
    return true;
  });
}

/** Null-safe comparator: missing values always sort last, whatever the direction. */
function nullsLast(a: TRow<Row>, b: TRow<Row>, id: string): number {
  const x = a.getValue(id) as string | number | null;
  const y = b.getValue(id) as string | number | null;
  if (x === null || x === "" || x === undefined) return y === null || y === "" || y === undefined ? 0 : 1;
  if (y === null || y === "" || y === undefined) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), "nb");
}

const col = createColumnHelper<Row>();

function NoticeTable({ m, rows, sorting, setSorting }: { m: Model; rows: Row[]; sorting: SortingState; setSorting: (s: SortingState) => void }) {
  const t = useTranslations();
  const { href, lang } = useApp();
  const columns = useMemo(() => [
    col.accessor((r) => (lang === "en" && r.rec.original.title_en ? r.rec.original.title_en : r.rec.original.title), {
      id: "title", header: () => t("notices.col.notice"), sortingFn: nullsLast, sortDescFirst: false,
      cell: (c) => (
        <div className="min-w-[240px]">
          <Link href={href(`/notices/${c.row.original.rec.doffin_id}`)} className="font-medium hover:text-accent hover:underline">{c.getValue()}</Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="tnum">{c.row.original.rec.doffin_id}</span>·<span className="truncate">{c.row.original.rec.derived.buyer_name_list[0]}{c.row.original.rec.derived.buyer_name_list.length > 1 ? ` +${c.row.original.rec.derived.buyer_name_list.length - 1}` : ""}</span>
            {c.row.original.rec.mock && <MockChip />}
          </div>
        </div>
      ),
    }),
    col.accessor("status", { header: () => t("notices.col.status"), sortingFn: nullsLast, sortDescFirst: false, cell: (c) => <StatusChip v={c.getValue()} /> }),
    col.accessor((r) => r.rec.original.contract_type || undefined, { id: "ctype", header: () => t("notices.col.type"), sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: false, cell: (c) => <span className="text-sm">{c.getValue() ? t(`ctype.${c.getValue()}`) : "—"}</span> }),
    col.accessor((r) => r.deadline ?? undefined, {
      id: "deadline", header: () => t("notices.col.deadline"), sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: false,
      cell: (c) => {
        const v = c.getValue();
        const dl = daysLeft(v);
        const comp = c.row.original.rec.original.notice_type === "ANNOUNCEMENT_OF_COMPETITION";
        return <div className="tnum whitespace-nowrap text-sm">{fmtDate(v, lang)}{v && comp && <div className="text-xs text-muted">{dl !== null && dl >= 0 ? t("common.daysLeft", { n: dl }) : t("common.passed")}</div>}</div>;
      },
    }),
    col.accessor((r) => r.value ?? undefined, { id: "value", header: () => t("notices.col.value"), sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: false, cell: (c) => <span className="tnum whitespace-nowrap text-sm">{c.getValue() == null ? <span className="text-muted">{t("common.unknown")}</span> : nok(c.getValue() ?? null, lang)}</span> }),
    col.accessor((r) => r.rec.original.cpv_main || undefined, { id: "cpv", header: () => "CPV", sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: false, cell: (c) => <span className="tnum text-xs">{c.getValue() || "—"}</span> }),
    col.accessor((r) => r.rec.derived.place_of_performance_nuts_list.join(", ") || undefined, { id: "nuts", header: () => t("notices.col.region"), sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: false, cell: (c) => <span className="text-xs">{(c.getValue() ?? "").length > 18 ? `${c.row.original.rec.derived.place_of_performance_nuts_list.length} NUTS` : c.getValue() || "—"}</span> }),
    col.accessor((r) => r.fit ?? undefined, {
      id: "fit", header: () => `${t("notices.col.fit")} (${m.profile.profile_id})`, sortingFn: nullsLast, sortUndefined: "last", sortDescFirst: true,
      cell: (c) => c.getValue() == null ? <span className="text-xs text-muted">{c.row.original.status === "flagged" ? t("notices.noFitFlagged") : t("notices.notScreened")}</span> : <FitBar value={c.getValue() ?? null} threshold={m.screening.threshold} compact />,
    }),
  ], [t, href, lang, m]);
  const table = useReactTable({
    data: rows, columns, state: { sorting },
    onSortingChange: (u) => setSorting(typeof u === "function" ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), enableSortingRemoval: true,
  });
  const sortOpts = ["deadline", "fit", "value", "title", "status"];
  const cur = sorting[0] ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}` : "";
  return (
    <>
    {/* Phones: one card per notice, sorting via a menu (same TanStack row model). */}
    <div className="md:hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[13px]">
        <label htmlFor="msort" className="text-muted">{t("notices.sortBy")}</label>
        <select id="msort" className={`${inputCls} w-auto flex-1 py-1.5`} value={cur}
          onChange={(e) => { const v = e.target.value; setSorting(v ? [{ id: v.replace(/^-/, ""), desc: v.startsWith("-") }] : []); }}>
          <option value="">{t("notices.sortDefault")}</option>
          {sortOpts.flatMap((id) => [
            <option key={id} value={id}>{t(`notices.sort.${id}`)} ↑</option>,
            <option key={`-${id}`} value={`-${id}`}>{t(`notices.sort.${id}`)} ↓</option>])}
        </select>
      </div>
      <ul className="divide-y divide-border">
        {table.getRowModel().rows.map(({ original: r }) => {
          const o = r.rec.original;
          const dl = daysLeft(r.deadline);
          return (
            <li key={r.rec.doffin_id}>
              <Link href={href(`/notices/${r.rec.doffin_id}`)} className="block px-4 py-3 active:bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{lang === "en" && o.title_en ? o.title_en : o.title}</span>
                  <StatusChip v={r.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span className="tnum">{r.rec.doffin_id}</span><span>·</span><span>{r.rec.derived.buyer_name_list[0]}</span>
                  {r.rec.mock && <MockChip />}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {r.deadline && <span className="tnum">{fmtDate(r.deadline, lang)}{dl !== null && dl >= 0 && o.notice_type === "ANNOUNCEMENT_OF_COMPETITION" ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</span>}
                  <span className="tnum">{r.value === null ? t("common.unknown") : nok(r.value, lang)}</span>
                  {o.contract_type && <span>{t(`ctype.${o.contract_type}`)}</span>}
                </div>
                {r.fit !== null && <div className="mt-2 max-w-[220px]"><FitBar value={r.fit} threshold={m.screening.threshold} compact /></div>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm [overflow-wrap:normal]">
        <thead className="border-b border-border text-xs text-muted">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>{hg.headers.map((h) => {
              const s = h.column.getIsSorted();
              const Icon = s === "asc" ? ArrowUp : s === "desc" ? ArrowDown : ArrowUpDown;
              return (
                <th key={h.id} className="px-3 py-2.5 font-medium" aria-sort={s === "asc" ? "ascending" : s === "desc" ? "descending" : "none"}>
                  <button type="button" className={cn("inline-flex items-center gap-1 hover:text-fg", s && "text-fg")} onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <Icon className={cn("h-3 w-3", s ? "text-accent" : "opacity-40")} aria-hidden />
                  </button>
                </th>
              );
            })}</tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              {r.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-3 align-top">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!rows.length && <div className="p-8 text-center text-sm text-muted">{t("notices.none")}</div>}
    </>
  );
}

export default function NoticesPage() {
  const t = useTranslations();
  const m = useModel();
  const { f, set, clear, sorting, setSorting } = useFilterState();
  const panelCount = PANEL_KEYS.filter((k) => f[k]).length;
  const [panel, setPanel] = useState(panelCount > 0);
  const all: Row[] = useMemo(() => !m ? [] : m.store.records.map((rec) => ({
    rec, status: m.status(rec.doffin_id), fit: m.rank[rec.doffin_id]?.fit_score ?? null,
    deadline: rec.derived.tender_deadline, value: rec.derived.estimated_value_nok,
  })), [m]);
  const rows = useMemo(() => applyFilters(all, f), [all, f]);
  if (!m) return <Loading />;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((r) => r.status === s).length]));
  const statuses = f.status ? f.status.split(",") : [];
  const opts = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();
  const toggleStatus = (s: string) => set({ status: (statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s]).join(",") });
  const real = all.filter((r) => !r.rec.mock).length;
  const anyFilter = FILTER_KEYS.some((k) => f[k]);
  return (
    <div className="animate-fadein">
      <PageTitle title={t("notices.title")} sub={t("notices.sub", { real, mock: all.length - real })} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <input aria-label={t("notices.f.text")} className={cn(inputCls, "pl-8")} value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("notices.f.textPh")} />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("notices.statusFilter")}>
          {STATUSES.map((s) => (
            <button key={s} type="button" onClick={() => toggleStatus(s)} aria-pressed={statuses.includes(s)}
              className={cn("rounded-md border px-2.5 py-1.5 text-[13px] transition", statuses.includes(s) ? "border-accent bg-accent-soft font-medium text-accent" : "border-border bg-surface text-muted hover:text-fg")}>
              {t(`status.${s}`)} <span className="tnum ml-0.5 text-[11px] opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPanel(!panel)} aria-expanded={panel}
          className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px]", panel || panelCount ? "border-accent text-accent" : "border-border text-muted hover:text-fg")}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />{t("notices.f.more")}{panelCount ? ` (${panelCount})` : ""}
        </button>
        {anyFilter && <button type="button" onClick={clear} className="inline-flex items-center gap-1 px-1 text-[13px] text-muted hover:text-fg"><X className="h-3.5 w-3.5" aria-hidden />{t("notices.f.clear")}</button>}
      </div>
      {panel && (
        <Card className="mb-3 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("notices.f.cpv")}>
            <select className={inputCls} value={f.cpv} onChange={(e) => set({ cpv: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {opts(all.flatMap((r) => r.rec.derived.cpv_all.map((c) => c.slice(0, 2)))).map((d) => <option key={d} value={d}>{t("notices.f.division")} {d}</option>)}
            </select>
          </Field>
          <Field label={t("notices.f.trade")}>
            <select className={inputCls} value={f.trade} onChange={(e) => set({ trade: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {opts(all.map((r) => r.rec.original.trade)).map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label={t("notices.f.ctype")}>
            <select className={inputCls} value={f.ctype} onChange={(e) => set({ ctype: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {["Works", "Supplies", "Services"].map((d) => <option key={d} value={d}>{t(`ctype.${d}`)}</option>)}
            </select>
          </Field>
          <Field label={t("notices.f.nuts")}>
            <select className={inputCls} value={f.nuts} onChange={(e) => set({ nuts: e.target.value })}>
              <option value="">{t("common.any")}</option>
              {opts(all.flatMap((r) => r.rec.derived.place_of_performance_nuts_list)).map((d) => <option key={d} value={d}>{d === "anyw" ? t("notices.f.anyw") : d}</option>)}
            </select>
          </Field>
          <Field label={t("notices.f.dfrom")}><input type="date" className={inputCls} value={f.dfrom} onChange={(e) => set({ dfrom: e.target.value })} /></Field>
          <Field label={t("notices.f.dto")}><input type="date" className={inputCls} value={f.dto} onChange={(e) => set({ dto: e.target.value })} /></Field>
          <Field label={t("notices.f.vmin")}><input inputMode="decimal" className={inputCls} value={f.vmin} onChange={(e) => set({ vmin: e.target.value })} placeholder="0" /></Field>
          <Field label={t("notices.f.vmax")}><input inputMode="decimal" className={inputCls} value={f.vmax} onChange={(e) => set({ vmax: e.target.value })} placeholder="∞" /></Field>
          <Field label={t("notices.f.vunknown")}>
            <select className={inputCls} value={f.vunknown} onChange={(e) => set({ vunknown: e.target.value })}>
              <option value="">{t("notices.f.vunknownExclude")}</option>
              <option value="include">{t("notices.f.vunknownInclude")}</option>
              <option value="only">{t("notices.f.vunknownOnly")}</option>
            </select>
          </Field>
          {(["fw", "dps", "lots"] as const).map((k) => (
            <Field key={k} label={t(`notices.f.${k}`)}>
              <select className={inputCls} value={f[k]} onChange={(e) => set({ [k]: e.target.value })}>
                <option value="">{t("common.any")}</option>
                {(k === "lots" ? ["single", "multi"] : ["yes", "no"]).map((v) => <option key={v} value={v}>{t(`notices.f.v_${v}`)}</option>)}
              </select>
            </Field>
          ))}
        </Card>
      )}
      <Card className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-[13px] text-muted">
          <span><b className="tnum text-fg">{rows.length}</b> {t("notices.of")} {all.length}</span>
          <span className="text-xs">{t("notices.rule")}</span>
        </div>
        <NoticeTable m={m} rows={rows} sorting={sorting} setSorting={setSorting} />
      </Card>
    </div>
  );
}
