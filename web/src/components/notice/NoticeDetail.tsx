"use client";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { DocReader } from "@/components/pdf/DocReader";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { BackLink, Button, EmptyState, KV, LinkButton, Loading, Tabs } from "@/components/ui/ui";
import { ConfidenceChip, FitBar, FlagChip, MockChip, RouteChip, StatusChip } from "@/components/ui/chips";
import { CreateReportButton } from "./CreateReportButton";
import { docUrl } from "@/lib/data";
import { cn, daysLeft, fmtDate, nok } from "@/lib/format";
import { useApp, useL, useModel } from "@/lib/state";
import { useQueryState } from "@/lib/url-state";
import { useMedia } from "@/lib/use-media";

const CONTACT = new Set(["contact_name", "contact_email", "contact_phone"]);
type Tab = "overview" | "documents" | "fields";

/** A2 detail: document-inspection layout — title, metadata, tabs, firm-specific screening summary. */
export function NoticeDetail({ id }: { id: string }) {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  const [tab, setTab] = useQueryState("tab", "overview");
  const [reqParam, setReq] = useQueryState("req");
  const [page, setPage] = useState(1);
  const [reader, setReader] = useState(false);
  const desktop = useMedia("(min-width: 1024px)");
  if (!m) return <Loading />;
  const rec = m.notices[id];
  if (!rec) return <EmptyState title={t("common.notFoundTitle")} text={t("common.notFound")} />;
  const o = rec.original, d = rec.derived;
  const status = m.status(id), act = m.act[id], gate = m.gate[id], sr = m.rank[id], vis = m.visibility(id);
  const docs = m.index.docs[id];
  const reqs = m.effective[id] ?? [];
  const dl = daysLeft(d.tender_deadline);
  const isComp = o.notice_type === "ANNOUNCEMENT_OF_COMPETITION";
  const visible = vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local";
  const eligible = vis === "hidden"; // active, released, screened, below threshold, not yet added
  const derivedNote: Record<string, string> = {};
  if (d.legislation_normalised && d.legislation_normalised !== o.legislation) derivedNote.legislation = `→ ${d.legislation_normalised}`;
  if (d.estimated_value_status !== "present") derivedNote.estimated_value = t(`notice.value_${d.estimated_value_status}`);
  if (d.place_anywhere) derivedNote.place_of_performance_nuts = t("notice.anyw");
  if (!o.status && isComp) derivedNote.status = t("notice.statusIgnored");
  const highlights = reqs.filter((r) => r.highlight).map((r) => ({ id: r.req_id, page: r.highlight!.page, rects: r.highlight!.rects }));
  const pick = (rid: string) => {
    setReq(rid);
    const r = reqs.find((x) => x.req_id === rid);
    if (r?.source) setPage(r.source.page_start);
    if (!desktop && docs) setReader(true);
  };
  const action = visible
    ? <LinkButton variant="primary" href={href(`/reports/${id}`)}><FileText className="h-4 w-4" aria-hidden />{t("report.open")}</LinkButton>
    : eligible ? <CreateReportButton noticeId={id} via="notice_browser" /> : null;

  return (
    <div className="anim-page">
      <header className="mb-8">
        <div className="mb-4"><BackLink href={href("/notices")}>{t("nav.notices")}</BackLink></div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          <span className="tnum">{id}</span><StatusChip v={status} />{o.contract_type && <span>{t(`ctype.${o.contract_type}`)}</span>}{rec.mock && <MockChip />}
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] sm:text-title">{o.title}</h1>
            {o.title_en && <p className="mt-1.5 text-body text-muted">{o.title_en}</p>}
            <p className="mt-2 text-body">{d.buyer_name_list.join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.doffin_url && <a href={o.doffin_url} target="_blank" rel="noreferrer" className="t-fast inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-surface-2"><ExternalLink className="h-4 w-4" aria-hidden />{t("notice.doffin")}</a>}
            {action}
          </div>
        </div>
      </header>

      <div className="grid gap-8 [&>*]:min-w-0 lg:grid-cols-[1fr_300px]">
        <div>
          <Tabs<Tab> value={tab as Tab} onChange={(v) => setTab(v, "push")} className="mb-6"
            tabs={[{ id: "overview", label: t("notice.tabOverview") }, { id: "documents", label: <>{t("notice.documents")}{docs ? <span className="tnum text-meta text-muted">{reqs.length}</span> : null}</> }, { id: "fields", label: t("notice.allFields") }]} />

          {tab === "overview" && (
            <div className="space-y-8">
              <KV cols={3} items={[
                [t("notices.col.deadline"), <span key="d" className="tnum">{fmtDate(d.tender_deadline, lang, true)}{dl !== null && dl >= 0 && isComp ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</span>],
                [t("notices.col.value"), d.estimated_value_nok === null ? <span key="v" className="text-muted">{t("common.unknown")}</span> : <span key="v" className="tnum">{nok(d.estimated_value_nok, lang)}</span>],
                ["CPV", <span key="c" className="tnum">{o.cpv_main || "—"}{d.cpv_additional_list.length ? <span className="text-muted"> +{d.cpv_additional_list.length}</span> : null}</span>],
                [t("notices.col.region"), d.place_of_performance_nuts_list.join(", ") || "—"],
                [t("notice.lots"), d.lot_count_int ?? "—"],
                [t("notice.fwdps"), [d.framework && t("notice.framework"), d.dps && "DPS"].filter(Boolean).join(" · ") || "—"],
                [t("notice.procedure"), o.procedure || "—"],
                [t("notice.published"), fmtDate(o.publication_date, lang)],
                [t("notice.legislation"), d.legislation_normalised || "—"],
              ]} />
              <div>
                <h2 className="mb-2 text-[15px] font-semibold">{t("notice.description")}</h2>
                <p className="max-w-3xl whitespace-pre-line text-body leading-relaxed">{o.description}</p>
              </div>
              <div className="rounded-xl bg-surface-2/60 p-4 text-[13px] text-muted">
                <div><span className="font-medium text-fg">{t("notice.activeness")}:</span> {L(act, "reason")}</div>
                {gate && <div className="mt-1"><span className="font-medium text-fg">{t("notice.gate")}:</span> {t(`gate.${gate.final_status}`)}</div>}
              </div>
            </div>
          )}

          {tab === "documents" && (docs ? (
            <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div>
                <p className="mb-3 text-meta text-muted">{docs.source === "placeholder" ? t("notice.placeholderDocs") : t("notice.originalDocs")} {t("notice.extractedNote", { n: reqs.length })}</p>
                {reqs.length === 0 && <p className="text-body text-muted">{t("notice.noExtraction")}</p>}
                <ul className="overflow-hidden rounded-xl border border-border">
                  {reqs.map((r) => (
                    <li key={r.req_id} className="border-t border-border first:border-0">
                      <button type="button" onClick={() => pick(r.req_id)} aria-pressed={reqParam === r.req_id}
                        className={cn("t-fast block w-full px-4 py-3 text-left", reqParam === r.req_id ? "bg-accent-soft/60" : "hover:bg-surface-2/60")}>
                        <div className="flex items-center justify-between gap-2 text-meta text-muted"><span className="font-semibold text-fg">{r.req_id}{r.lot_id ? ` · ${t("report.lot")} ${r.lot_id}` : ""}</span><span>{r.source ? `${t("pdf.page")} ${r.source.page_start}` : t("report.noCitation")}</span></div>
                        <div className="mt-0.5 text-body">{L(r, "text_summary")}</div>
                      </button>
                    </li>
                  ))}
                </ul>
                {!desktop && <Button className="mt-3 w-full" onClick={() => setReader(true)}><FileText className="h-4 w-4" aria-hidden />{t("report.openDocument")}</Button>}
              </div>
              {desktop && (
                <div className="h-[680px] xl:sticky xl:top-4">
                  <PdfViewer url={docUrl(id, docs.files[0])} title={docs.files[0]} page={page} onPageChange={setPage} activeId={reqParam || null} onSelect={(rid) => setReq(rid)} highlights={highlights} />
                </div>
              )}
              {reader && <DocReader url={docUrl(id, docs.files[0])} title={docs.files[0]} page={page} highlights={highlights} activeId={reqParam || null} onClose={() => setReader(false)} caption={reqParam || undefined} />}
            </div>
          ) : <EmptyState title={t("notice.noDocs")} text={gate?.reasons.map((r) => L(r, "label")).join("; ") || t("notice.noDocsText")} />)}

          {tab === "fields" && (
            <div className="overflow-hidden rounded-xl border border-border">
              <p className="border-b border-border bg-surface-2/50 px-4 py-2.5 text-meta text-muted">{t("notice.allFieldsSub", { n: m.store.columns.length })}</p>
              <table className="w-full">
                <tbody>
                  {m.store.columns.map((c) => (
                    <tr key={c} className="block border-t border-border first:border-0 sm:table-row">
                      <th scope="row" className="block px-4 pb-0 pt-2.5 text-left align-top font-mono text-[12px] font-medium text-muted sm:table-cell sm:w-56 sm:pb-2.5">
                        {c}{CONTACT.has(c) && <span className="block font-sans text-[11px] font-normal">{t("notice.contactNote")}</span>}
                      </th>
                      <td className="block whitespace-pre-line px-4 py-2.5 align-top text-body sm:table-cell">
                        {o[c] === "" ? <span className="text-muted">{t("notice.empty")}</span> : c === "doffin_url" ? <a href={o[c]} target="_blank" rel="noreferrer" className="text-accent hover:underline">{o[c]}</a> : o[c]}
                        {derivedNote[c] && <div className="mt-1 text-meta text-accent">{t("notice.derived")}: {derivedNote[c]}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border px-4 py-2.5 text-meta text-muted">{t("notice.versionHash")}: <span className="font-mono">{rec.version_hash.slice(0, 16)}…</span> · {rec.source}</p>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border p-5">
            <div className="text-meta font-medium text-muted">{t("notice.forFirm", { firm: m.profile.firm.name })}</div>
            {status === "flagged" ? (
              <div className="mt-3 space-y-3 text-body">
                <FlagChip label={t("status.flagged")} />
                <p className="text-muted">{t("notice.flaggedText")}</p>
                <ul className="list-disc pl-5 text-[13px]">{gate?.reasons.map((r) => <li key={r.code}>{L(r, "label")}</li>)}</ul>
                <LinkButton size="sm" href={href("/prototype/adviser", { notice: id })}>{t("notice.toAdviser")}</LinkButton>
              </div>
            ) : sr ? (
              <div className="mt-3 space-y-4">
                <div className="flex items-baseline justify-between"><span className="tnum text-metric font-semibold">{sr.fit_score}</span><span className="tnum text-meta text-muted">{t("notice.rank", { r: sr.rank, n: m.screening.ranked.length })}</span></div>
                <FitBar value={sr.fit_score} threshold={m.screening.threshold} />
                <div className="flex flex-wrap items-center gap-3"><RouteChip v={sr.route} /><ConfidenceChip v={sr.confidence} prefix /></div>
                <div className="flex flex-col gap-2">
                  {action}
                  <LinkButton size="sm" variant="ghost" href={href("/screening", { open: id })}>{t("notice.inList")}</LinkButton>
                </div>
                {eligible && <p className="text-meta text-muted">{t("notice.manualHint")}</p>}
              </div>
            ) : (
              <div className="mt-3 text-body">
                <p className="font-medium">{t("notice.notScreened")}</p>
                <p className="mt-1 text-[13px] text-muted">{L(act, "reason")}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
