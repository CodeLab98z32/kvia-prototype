import type { Model } from "./state";
import type { Report, ReportLot } from "./types";

/** Lots shown in a report: forwarded → only relevant lots (others "not relevant"); manual → all lots. */
export function shownLots(r: Report): ReportLot[] {
  if (r.state === "forwarded") {
    const rel = r.lots.filter((l) => l.relevant);
    return rel.length ? rel : r.lots;
  }
  return r.lots;
}

export interface VisibleReport { report: Report; via: "forwarded" | "manual_recorded" | "manual_local"; lots: ReportLot[] }

export function visibleReports(m: Model): VisibleReport[] {
  const out: VisibleReport[] = [];
  for (const r of Object.values(m.reports.reports)) {
    const v = m.visibility(r.notice_id);
    if (v === "forwarded" || v === "manual_recorded" || v === "manual_local") out.push({ report: r, via: v, lots: shownLots(r) });
  }
  return out.sort((a, b) => (m.rank[a.report.notice_id]?.rank ?? 99) - (m.rank[b.report.notice_id]?.rank ?? 99));
}

export const title = (m: Model, nid: string, lang: string) => {
  const o = m.notices[nid]?.original;
  if (!o) return nid;
  return lang === "en" && o.title_en ? o.title_en : o.title;
};
export const buyer = (m: Model, nid: string) => m.notices[nid]?.derived.buyer_name_list[0] ?? "";

/** Lots whose indication is shown for a notice in lists (empty when no report is visible). */
export function shownLotsFor(m: Model, nid: string): ReportLot[] {
  const r = m.reports.reports[nid];
  return r ? shownLots(r) : [];
}
