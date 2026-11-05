/** Builds deep links from test evidence / mode-coverage examples (keeps the firm in the URL). */
export function evidenceHref(e: Record<string, string | null | undefined>, href: (p: string, q?: Record<string, string | undefined>) => string, firm: string) {
  const f = e.firm ?? e.firm_id ?? firm;
  const n = e.notice ?? e.notice_id ?? undefined;
  const req = e.req ?? e.req_id ?? undefined;
  const lot = e.lot ?? e.lot_id ?? undefined;
  const withFirm = (p: string, q: Record<string, string | undefined> = {}) => href(p, q).replace(/as=[^&]+/, `as=${f}`);
  switch (e.page) {
    case "screening": return withFirm("/screening", { open: n ?? undefined });
    case "report": return withFirm(`/reports/${n}`, { req: req ?? undefined, lot: lot ?? undefined });
    case "notices": return n ? withFirm(`/notices/${n}`) : withFirm("/notices");
    case "adviser": return withFirm("/prototype/adviser");
    case "prompts": return withFirm("/prototype/prompts");
    case "logic": return withFirm("/prototype/logic");
    case "run": return withFirm("/prototype/run");
    default:
      if (n && req) return withFirm(`/reports/${n}`, { req, lot: lot ?? undefined });
      if (n && e.firm_id) return withFirm(`/screening`, { open: n });
      if (n) return withFirm(`/notices/${n}`);
      if (e.firm_id) return withFirm("/company");
      return withFirm("/prototype/run");
  }
}
