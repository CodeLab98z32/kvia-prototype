"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type Row as TRow, type SortingState,
} from "@tanstack/react-table";
import { Button, EmptyState, Field, FilterMenu, Loading, PageTitle, TableCard, inputCls, td, th, tr } from "@/components/ui/ui";
import { FitBar, MockChip, StatusChip } from "@/components/ui/chips";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { useApp, useModel, type Model } from "@/lib/state";
import type { NoticeRecord } from "@/lib/types";

const STATUSES = ["active", "closed", "award", "advisory", "intent", "flagged"] as const;
const VALUE_BUCKETS = ["lt1", "1to10", "gt10", "unknown"] as const;
const KEYS = ["q", "status", "ctype", "nuts", "vb", "cpv", "trade", "dfrom", "dto", "fw", "dps", "lots"] as const;
const ADVANCED = ["cpv", "trade", "dfrom", "dto", "fw", "dps", "lots"] as const;
type Filters = Record<(typeof KEYS)[number], string>;
interface Row { rec: NoticeRecord; status: string; fit: number | null; deadline: string | null; value: number | null }

const list = (s: string) => (s ? s.split(",") : []);
const bucket = (v: number | null) => (v === null ? "unknown" : v < 1e6 ? "lt1" : v <= 10e6 ? "1to10" : "gt10");

/** Filters and sort live in React state, mirrored to the URL (deep links; Back/Forward restore on remount). */
function useFilterState() {
  const sp = useSearchParams();
  const [f, setF] = useState<Filters>(() => Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ""])) as Filters);
  const [sorting, setSorting] = useState<SortingState>(() => {
    const s = sp.get("sort");
    return s ? [{ id: s.replace(/^-/, ""), desc: s.startsWith("-") }] : [];
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    KEYS.forEach((k) => (f[k] ? p.set(k, f[k]) : p.delete(k)));
    if (sorting[0]) p.set("sort", `${sorting[0].desc ? "-" : ""}${sorting[0].id}`); else p.delete("sort");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${p.toString()}`);
  }, [f, sorting]);
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setF(Object.fromEntries(KEYS.map((k) => [k, p.get(k) ?? ""])) as Filters);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  const clear = () => setF(Object.fromEntries(KEYS.map((k) => [k, ""])) as Filters);
  return { f, set, clear, sorting, setSorting };
}

function applyFilters(rows: Row[], g: Filters): Row[] {
  const q = g.q.toLowerCase().trim();
  const st = list(g.status), ct = list(g.ctype), nuts = list(g.nuts), vb = list(g.vb);
  return rows.filter(({ rec, status, value, deadline }) => {
    const o = rec.original, d = rec.derived;
    if (q && ![o.title, o.title_en, o.description, o.buyer_name, rec.doffin_id].join(" ").toLowerCase().includes(q)) return false;
    if (st.length && !st.includes(status)) return false;
    if (ct.length && !ct.includes(o.contract_type)) return false;
    if (nuts.length && !nuts.some((n) => d.place_of_performance_nuts_list.includes(n) || (n !== "anyw" && d.place_anywhere))) return false;
    if (vb.length && !vb.includes(bucket(value))) return false;
    if (g.cpv && !d.cpv_all.some((c) => c.startsWith(g.cpv))) return false;
    if (g.trade && o.trade !== g.trade) return false;
    if (g.dfrom && (!deadline || deadline.slice(0, 10) < g.dfrom)) return false;
    if (g.dto && (!deadline || deadline.slice(0, 10) > g.dto)) return false;
    if (g.fw && d.framework !== (g.fw === "yes")) return false;
    if (g.dps && d.dps !== (g.dps === "yes")) return false;
    if (g.lots === "multi" && (d.lot_count_int ?? 1) <= 1) return false;
    if (g.lots === "single" && (d.lot_count_int ?? 1) > 1) return false;
    return true;
  });
}

/** Null-safe comparator; with sortUndefined "last" missing values stay at the end in both directions. */
function cmp(a: TRow<Row>, b: TRow<Row>, id: string): number {
  const x = a.getValue(id) as string | number, y = b.getValue(id) as string | number;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), "nb");
}
const col = createColumnHelper<Row>();

function NoticeTable({ m, rows, sorting, setSorting, empty }: { m: Model; rows: Row[]; sorting: SortingState; setSorting: (s: SortingState) => void; empty: React.ReactNode }) {
  const t = useTranslations();
  const { href, lang } = useApp();
  const base = { sortingFn: cmp, sortUndefined: "last" as const, sortDescFirst: false };
  const columns = useMemo(() => [
    col.accessor((r) => (lang === "en" && r.rec.original.title_en ? r.rec.original.title_en : r.rec.original.title), {
      id: "title", ...base, header: () => t("notices.col.notice"),
      cell: (c) => (
        <div className="min-w-[220px] max-w-[440px]">
          <Link href={href(`/notices/${c.row.original.rec.doffin_id}`)} className="t-fast font-medium hover:text-accent">{c.getValue()}</Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-muted">
            <span className="tnum">{c.row.original.rec.doffin_id}</span><span aria-hidden>·</span>
            <span className="truncate">{c.row.original.rec.derived.buyer_name_list[0]}{c.row.original.rec.derived.buyer_name_list.length > 1 ? ` +${c.row.original.rec.derived.buyer_name_list.length - 1}` : ""}</span>
            {c.row.original.rec.mock && <MockChip />}
          </div>
        </div>
      ),
    }),
    col.accessor("status", { ...base, header: () => t("notices.col.status"), cell: (c) => <StatusChip v={c.getValue()} /> }),
    col.accessor((r) => r.rec.original.contract_type || undefined, { id: "ctype", ...base, header: () => t("notices.col.type"), cell: (c) => <span className="whitespace-nowrap">{c.getValue() ? t(`ctype.${c.getValue()}`) : "—"}</span> }),
    col.accessor((r) => r.deadline ?? undefined, {
      id: "deadline", ...base, header: () => t("notices.col.deadline"),
      cell: (c) => {
        const v = c.getValue(); const dl = daysLeft(v ?? null);
        const comp = c.row.original.rec.original.notice_type === "ANNOUNCEMENT_OF_COMPETITION";
        return v ? <div className="tnum whitespace-nowrap">{fmtDate(v, lang)}{comp && <div className="text-meta text-muted">{dl !== null && dl >= 0 ? t("common.daysLeft", { n: dl }) : t("common.passed")}</div>}</div> : <span className="text-muted">—</span>;
      },
    }),
    col.accessor((r) => r.value ?? undefined, { id: "value", ...base, header: () => t("notices.col.value"), cell: (c) => <span className="tnum whitespace-nowrap">{c.getValue() == null ? <span className="text-muted">{t("common.unknown")}</span> : nok(c.getValue() ?? null, lang)}</span> }),
    col.accessor((r) => r.rec.original.cpv_main || undefined, { id: "cpv", ...base, header: () => "CPV", cell: (c) => <span className="tnum text-[13px] text-muted">{c.getValue() || "—"}</span> }),
    col.accessor((r) => r.rec.derived.place_of_performance_nuts_list.join(", ") || undefined, { id: "nuts", ...base, header: () => t("notices.col.region"), cell: (c) => <span className="text-[13px] text-muted">{(c.getValue() ?? "").length > 18 ? `${c.row.original.rec.derived.place_of_performance_nuts_list.length} NUTS` : c.getValue() || "—"}</span> }),
    col.accessor((r) => r.fit ?? undefined, {
      id: "fit", ...base, sortDescFirst: true, header: () => `${t("notices.col.fit")} · ${m.profile.profile_id}`,
      cell: (c) => c.getValue() == null ? <span className="text-meta text-muted">{c.row.original.status === "flagged" ? t("notices.noFitFlagged") : t("notices.notScreened")}</span> : <FitBar value={c.getValue() ?? null} threshold={m.screening.threshold} compact />,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, href, lang, m]);
  const table = useReactTable({ data: rows, columns, state: { sorting }, onSortingChange: (u) => setSorting(typeof u === "function" ? u(sorting) : u), getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  const wide = new Set(["cpv", "nuts"]);
  const cur = sorting[0] ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}` : "";
  if (!rows.length) return <>{empty}</>;
  return (
    <>
      <div className="md:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <label htmlFor="msort" className="text-meta text-muted">{t("notices.sortBy")}</label>
          <select id="msort" className={cn(inputCls, "h-9 flex-1")} value={cur} onChange={(e) => { const v = e.target.value; setSorting(v ? [{ id: v.replace(/^-/, ""), desc: v.startsWith("-") }] : []); }}>
            <option value="">{t("notices.sortDefault")}</option>
            {["deadline", "fit", "value", "title", "status"].flatMap((id) => [<option key={id} value={id}>{t(`notices.sort.${id}`)} ↑</option>, <option key={`-${id}`} value={`-${id}`}>{t(`notices.sort.${id}`)} ↓</option>])}
          </select>
        </div>
        <ul>
          {table.getRowModel().rows.map(({ original: r }) => {
            const o = r.rec.original; const dl = daysLeft(r.deadline);
            return (
              <li key={r.rec.doffin_id} className="border-t border-border">
                <Link href={href(`/notices/${r.rec.doffin_id}`)} className="t-fast block px-4 py-3.5 active:bg-surface-2">
                  <div className="font-medium">{lang === "en" && o.title_en ? o.title_en : o.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted"><span className="tnum">{r.rec.doffin_id}</span><span>·</span><span>{r.rec.derived.buyer_name_list[0]}</span>{r.rec.mock && <MockChip />}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                    <StatusChip v={r.status} />
                    {r.deadline && <span className="tnum">{fmtDate(r.deadline, lang)}{dl !== null && dl >= 0 && o.notice_type === "ANNOUNCEMENT_OF_COMPETITION" ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</span>}
                    <span className="tnum">{r.value === null ? t("common.unknown") : nok(r.value, lang)}</span>
                  </div>
                  {r.fit !== null && <div className="mt-2.5"><FitBar value={r.fit} threshold={m.screening.threshold} compact /></div>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full [overflow-wrap:normal]">
          <thead className="bg-surface-2/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>{hg.headers.map((h) => {
                const s = h.column.getIsSorted();
                const Icon = s === "asc" ? ArrowUp : s === "desc" ? ArrowDown : ArrowUpDown;
                return (
                  <th key={h.id} className={cn(th, wide.has(h.id) && "hidden 2xl:table-cell")} aria-sort={s === "asc" ? "ascending" : s === "desc" ? "descending" : "none"}>
                    <button type="button" className={cn("t-fast inline-flex items-center gap-1 hover:text-fg", s && "text-fg")} onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}<Icon className={cn("h-3 w-3", s ? "text-accent" : "opacity-40")} aria-hidden />
                    </button>
                  </th>
                );
              })}</tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className={tr}>
                {r.getVisibleCells().map((c) => <td key={c.id} className={cn(td, wide.has(c.column.id) && "hidden 2xl:table-cell")}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function NoticesPage() {
  const t = useTranslations();
  const m = useModel();
  const { f, set, clear, sorting, setSorting } = useFilterState();
  const advCount = ADVANCED.filter((k) => f[k]).length;
  const [adv, setAdv] = useState(advCount > 0);
  const all: Row[] = useMemo(() => !m ? [] : m.store.records.map((rec) => ({
    rec, status: m.status(rec.doffin_id), fit: m.rank[rec.doffin_id]?.fit_score ?? null, deadline: rec.derived.tender_deadline, value: rec.derived.estimated_value_nok,
  })), [m]);
  const rows = useMemo(() => applyFilters(all, f), [all, f]);
  if (!m) return <Loading />;
  const count = (pred: (r: Row) => boolean) => all.filter(pred).length;
  const uniq = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();
  const real = all.filter((r) => !r.rec.mock).length;
  const any = KEYS.some((k) => f[k]);
  const clearBtn = <Button onClick={clear}><X className="h-4 w-4" aria-hidden />{t("notices.f.clear")}</Button>;
  return (
    <div className="anim-page">
      <PageTitle title={t("notices.title")} sub={t("notices.sub", { real, mock: all.length - real })} />
      <TableCard
        toolbar={<>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
            <input type="search" aria-label={t("notices.f.text")} className={cn(inputCls, "pl-9")} value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("notices.f.textPh")} />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <FilterMenu label={t("notices.col.status")} allLabel={t("common.all")} value={list(f.status)} onChange={(v) => set({ status: v.join(",") })}
              options={STATUSES.map((s) => ({ id: s, label: t(`status.${s}`), count: count((r) => r.status === s) }))} />
            <FilterMenu label={t("notices.col.type")} allLabel={t("common.all")} value={list(f.ctype)} onChange={(v) => set({ ctype: v.join(",") })}
              options={["Works", "Supplies", "Services"].map((c) => ({ id: c, label: t(`ctype.${c}`), count: count((r) => r.rec.original.contract_type === c) }))} />
            <FilterMenu label={t("notices.f.nuts")} allLabel={t("common.all")} value={list(f.nuts)} onChange={(v) => set({ nuts: v.join(",") })}
              options={uniq(all.flatMap((r) => r.rec.derived.place_of_performance_nuts_list)).map((n) => ({ id: n, label: n === "anyw" ? t("notices.f.anyw") : n }))} />
            <FilterMenu label={t("notices.col.value")} allLabel={t("common.all")} value={list(f.vb)} onChange={(v) => set({ vb: v.join(",") })}
              options={VALUE_BUCKETS.map((b) => ({ id: b, label: t(`notices.f.vb_${b}`), count: count((r) => bucket(r.value) === b) }))} />
            <Button onClick={() => setAdv(!adv)} aria-expanded={adv} className={cn((adv || advCount) && "border-accent/50 text-fg")}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />{t("notices.f.more")}{advCount ? ` · ${advCount}` : ""}
            </Button>
            {any && <Button variant="ghost" onClick={clear}>{t("notices.f.clearShort")}</Button>}
          </div>
          {adv && (
            <div className="anim-dropdown grid w-full gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("notices.f.cpv")}>
                <select className={inputCls} value={f.cpv} onChange={(e) => set({ cpv: e.target.value })}>
                  <option value="">{t("common.any")}</option>
                  {uniq(all.flatMap((r) => r.rec.derived.cpv_all.map((c) => c.slice(0, 2)))).map((d) => <option key={d} value={d}>{t("notices.f.division")} {d}</option>)}
                </select>
              </Field>
              <Field label={t("notices.f.trade")}>
                <select className={inputCls} value={f.trade} onChange={(e) => set({ trade: e.target.value })}>
                  <option value="">{t("common.any")}</option>
                  {uniq(all.map((r) => r.rec.original.trade)).map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label={t("notices.f.dfrom")}><input type="date" className={inputCls} value={f.dfrom} onChange={(e) => set({ dfrom: e.target.value })} /></Field>
              <Field label={t("notices.f.dto")}><input type="date" className={inputCls} value={f.dto} onChange={(e) => set({ dto: e.target.value })} /></Field>
              {(["fw", "dps", "lots"] as const).map((k) => (
                <Field key={k} label={t(`notices.f.${k}`)}>
                  <select className={inputCls} value={f[k]} onChange={(e) => set({ [k]: e.target.value })}>
                    <option value="">{t("common.any")}</option>
                    {(k === "lots" ? ["single", "multi"] : ["yes", "no"]).map((v) => <option key={v} value={v}>{t(`notices.f.v_${v}`)}</option>)}
                  </select>
                </Field>
              ))}
            </div>
          )}
        </>}
        footer={<span><b className="tnum text-fg">{rows.length}</b> {t("notices.of")} {all.length} · {t("notices.rule")}</span>}>
        <NoticeTable m={m} rows={rows} sorting={sorting} setSorting={setSorting}
          empty={<EmptyState title={t("notices.none")} text={t("notices.noneText")} action={clearBtn} />} />
      </TableCard>
    </div>
  );
}
