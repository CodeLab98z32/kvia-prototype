"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, FileText, Flag, Info, Layers } from "lucide-react";
import { useState } from "react";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { Card, CardHeader, LinkButton, Loading } from "@/components/ui/ui";
import { ConfidenceChip, FitBar, FlagChip, MockChip, RouteChip, StatusChip } from "@/components/ui/chips";
import { CreateReportButton } from "./CreateReportButton";
import { docUrl } from "@/lib/data";
import { daysLeft, fmtDate, nok } from "@/lib/format";
import { useApp, useL, useModel } from "@/lib/state";

const CONTACT = new Set(["contact_name", "contact_email", "contact_phone"]);

export function NoticeDetail({ id }: { id: string }) {
  const t = useTranslations();
  const m = useModel();
  const { href, lang } = useApp();
  const L = useL();
  const router = useRouter();
  const sp = useSearchParams();
  const [page, setPage] = useState(Number(sp.get("page") ?? 1));
  const [active, setActive] = useState<string | null>(sp.get("req"));
  if (!m) return <Loading />;
  const rec = m.notices[id];
  if (!rec) return <p>{t("common.notFound")}</p>;
  const o = rec.original;
  const d = rec.derived;
  const status = m.status(id);
  const act = m.act[id];
  const gate = m.gate[id];
  const sr = m.rank[id];
  const vis = m.visibility(id);
  const docs = m.index.docs[id];
  const reqs = m.effective[id]?.length ? m.effective[id] : [];
  const dl = daysLeft(d.tender_deadline);
  const derivedNote: Record<string, string> = {};
  if (d.legislation_normalised && d.legislation_normalised !== o.legislation) derivedNote.legislation = `→ ${d.legislation_normalised}`;
  if (d.estimated_value_status !== "present") derivedNote.estimated_value = t(`notice.value_${d.estimated_value_status}`);
  if (d.place_anywhere) derivedNote.place_of_performance_nuts = t("notice.anyw");
  if (!o.status && o.notice_type === "ANNOUNCEMENT_OF_COMPETITION") derivedNote.status = t("notice.statusIgnored");

  return (
    <div className="animate-fadein space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />{t("common.back")}</button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted"><span className="tnum">{id}</span><StatusChip v={status} />{rec.mock && <MockChip />}{o.contract_type && <span>· {t(`ctype.${o.contract_type}`)}</span>}</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{o.title}</h1>
          {o.title_en && <p className="mt-1 text-muted">{o.title_en}</p>}
          <p className="mt-2 text-sm">{d.buyer_name_list.join(", ")}</p>
        </div>
        {o.doffin_url && <a href={o.doffin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2"><ExternalLink className="h-4 w-4" aria-hidden />{t("notice.doffin")}</a>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("notice.facts")} icon={<Info className="h-5 w-5" />} />
          <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted">{t("notices.col.deadline")}</dt><dd className="tnum font-semibold">{fmtDate(d.tender_deadline, lang, true)}{dl !== null && dl >= 0 && o.notice_type === "ANNOUNCEMENT_OF_COMPETITION" ? ` · ${t("common.daysLeft", { n: dl })}` : ""}</dd></div>
            <div><dt className="text-xs text-muted">{t("notices.col.value")}</dt><dd className="tnum font-semibold">{d.estimated_value_nok === null ? t("common.unknown") : nok(d.estimated_value_nok, lang)}</dd></div>
            <div><dt className="text-xs text-muted">CPV</dt><dd className="tnum font-semibold">{o.cpv_main || "—"}{d.cpv_additional_list.length ? ` +${d.cpv_additional_list.length}` : ""}</dd></div>
            <div><dt className="text-xs text-muted">{t("notices.col.region")}</dt><dd className="font-semibold">{d.place_of_performance_nuts_list.join(", ") || "—"}</dd></div>
            <div><dt className="text-xs text-muted">{t("notice.lots")}</dt><dd className="font-semibold">{d.lot_count_int ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">{t("notice.fwdps")}</dt><dd className="font-semibold">{d.framework ? t("notice.framework") : ""}{d.framework && d.dps ? " · " : ""}{d.dps ? "DPS" : ""}{!d.framework && !d.dps ? "—" : ""}</dd></div>
          </dl>
          <div className="border-t border-border px-5 py-4 text-sm">
            <div className="mb-1 text-xs font-semibold text-muted">{t("notice.description")}</div>
            <p className="whitespace-pre-line">{o.description}</p>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title={t("notice.forFirm", { firm: m.profile.firm.name })} icon={<Layers className="h-5 w-5" />} />
          <div className="space-y-3 p-5 text-sm">
            {status === "flagged" ? (
              <>
                <FlagChip label={t("status.flagged")} />
                <p>{t("notice.flaggedText")}</p>
                <ul className="list-disc pl-5 text-muted">{gate?.reasons.map((r) => <li key={r.code}>{L(r, "label")}</li>)}</ul>
                <LinkButton href={href("/prototype/adviser", { notice: id })}><Flag className="h-4 w-4" aria-hidden />{t("notice.toAdviser")}</LinkButton>
              </>
            ) : sr ? (
              <>
                <div className="flex items-center justify-between"><span className="text-muted">{t("screening.fit")}</span><span className="text-xs text-muted">#{sr.rank} / {m.screening.ranked.length}</span></div>
                <FitBar value={sr.fit_score} threshold={m.screening.threshold} />
                <div className="flex flex-wrap gap-2"><RouteChip v={sr.route} /><ConfidenceChip v={sr.confidence} prefix /></div>
                {(vis === "forwarded" || vis === "manual_recorded" || vis === "manual_local")
                  ? <LinkButton variant="primary" href={href(`/reports/${id}`)}><FileText className="h-4 w-4" aria-hidden />{t("report.open")}</LinkButton>
                  : <CreateReportButton noticeId={id} via="notice_browser" />}
                <Link className="block text-accent hover:underline" href={href("/screening", { open: id })}>{t("notice.inList")}</Link>
              </>
            ) : (
              <>
                <p className="font-medium">{t("notice.notScreened")}</p>
                <p className="text-muted">{L(act, "reason")}</p>
              </>
            )}
            <div className="border-t border-border pt-3 text-xs text-muted">
              <div><b>{t("notice.activeness")}:</b> {L(act, "reason")}</div>
              {gate && <div className="mt-1"><b>{t("notice.gate")}:</b> {t(`gate.${gate.final_status}`)}</div>}
            </div>
          </div>
        </Card>
      </div>

      {docs && (
        <Card>
          <CardHeader title={t("notice.documents")} sub={docs.source === "placeholder" ? t("notice.placeholderDocs") : t("notice.originalDocs")} icon={<FileText className="h-5 w-5" />} />
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="max-h-[640px] space-y-2 overflow-auto">
              <div className="text-xs text-muted">{t("notice.extractedNote", { n: reqs.length })}</div>
              {reqs.length === 0 && <p className="text-sm text-muted">{t("notice.noExtraction")}</p>}
              {reqs.map((r) => (
                <button key={r.req_id} onClick={() => { setActive(r.req_id); if (r.source) setPage(r.source.page_start); }}
                  className={`block w-full rounded-lg border p-2.5 text-left text-sm transition ${active === r.req_id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted"><span className="font-semibold text-fg">{r.req_id}{r.lot_id ? ` · ${t("report.lot")} ${r.lot_id}` : ""}</span><span>{r.source ? `${t("pdf.page")} ${r.source.page_start}` : t("report.noCitation")}</span></div>
                  <div className="mt-0.5">{L(r, "text_summary")}</div>
                </button>
              ))}
            </div>
            <div className="h-[640px]">
              <PdfViewer url={docUrl(id, docs.files[0])} title={docs.files[0]} page={page} onPageChange={setPage} activeId={active}
                onSelect={setActive} highlights={reqs.filter((r) => r.highlight).map((r) => ({ id: r.req_id, page: r.highlight!.page, rects: r.highlight!.rects }))} />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={t("notice.allFields")} sub={t("notice.allFieldsSub", { n: m.store.columns.length })} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {m.store.columns.map((c) => (
                <tr key={c} className="border-b border-border last:border-0">
                  <th scope="row" className="w-56 bg-surface-2/50 px-4 py-2 text-left align-top font-mono text-xs font-medium text-muted">{c}{CONTACT.has(c) && <span className="block font-sans text-[10px]">{t("notice.contactNote")}</span>}</th>
                  <td className="whitespace-pre-line break-words px-4 py-2 align-top">{o[c] === "" ? <span className="text-muted">{t("notice.empty")}</span> : o[c]}{derivedNote[c] && <div className="mt-1 text-xs text-accent">{t("notice.derived")}: {derivedNote[c]}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted">{t("notice.versionHash")}: <span className="font-mono">{rec.version_hash.slice(0, 16)}…</span> · {rec.source}</div>
      </Card>
    </div>
  );
}
