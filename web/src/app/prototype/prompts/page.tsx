"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Card, CardHeader, Field, JsonView, Loading, Tabs, inputCls } from "@/components/ui/ui";
import { Chip } from "@/components/ui/chips";
import { useJson } from "@/lib/data";
import { title } from "@/lib/reports";
import { useApp, useModel } from "@/lib/state";

type Task = "extraction" | "screening" | "matching";
interface IO { prompt_version: string; model: string; input: unknown; raw_output: unknown; schema_ok: boolean; schema_errors: string[]; validated_output: unknown }
interface Extraction {
  prompt_version: string; model: string; prompt_input: unknown; raw_output_pass1: string; raw_output_pass2: unknown; schema_ok: boolean;
  schema_errors: string[]; validated: unknown; citation_checks: { req_id: string; citation_ok: boolean; highlighted: boolean; error: string | null }[];
  anomaly_note_en?: string | null; anomaly_note_nb?: string | null;
}

const Ok = ({ ok, label }: { ok: boolean; label: string }) => ok
  ? <Chip tone="go" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}>{label}</Chip>
  : <Chip tone="nogo" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />}>{label}</Chip>;

function Panes({ prompt, input, raw, validated, checks }: { prompt: string; input: unknown; raw: unknown; validated: unknown; checks: React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
      <Card><CardHeader title={t("prompts.prompt")} /><div className="p-3"><JsonView data={prompt} max={420} /></div></Card>
      <Card><CardHeader title={t("prompts.input")} sub={t("prompts.inputSub")} /><div className="p-3"><JsonView data={input} max={420} /></div></Card>
      <Card><CardHeader title={t("prompts.raw")} /><div className="p-3"><JsonView data={raw} max={420} /></div></Card>
      <Card><CardHeader title={t("prompts.validated")} right={checks} /><div className="p-3"><JsonView data={validated} max={420} /></div></Card>
    </div>
  );
}

export default function PromptsPage() {
  const t = useTranslations();
  const m = useModel();
  const { firm, lang } = useApp();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const task = (sp.get("task") as Task) || "extraction";
  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const prompts = useJson<[Record<string, string>]>(["prompts.json"])?.[0];
  const extractedIds = m ? Object.keys(m.gate).filter((n) => m.gate[n].documents_status !== "missing") : [];
  const screenedIds = m ? m.screening.ranked.map((r) => r.notice_id) : [];
  const ids = task === "extraction" ? extractedIds : screenedIds;
  const notice = sp.get("notice") && ids.includes(sp.get("notice")!) ? sp.get("notice")! : ids[0];
  const ext = useJson<[Extraction]>([task === "extraction" && notice ? `run/1b_extraction/${notice}.json` : null])?.[0];
  const scr = useJson<[Record<string, IO>]>([task === "screening" ? `run/io/screening-${firm}.json` : null])?.[0];
  const rep = useJson<[Record<string, IO>]>([task === "matching" ? `run/io/reports-${firm}.json` : null])?.[0];
  if (!m || !prompts) return <Loading />;
  const lotKeys = rep ? Object.keys(rep).filter((k) => k.split("#")[0] === notice) : [];
  const lotKey = sp.get("lot") && lotKeys.includes(`${notice}#lot${sp.get("lot")}`) ? `${notice}#lot${sp.get("lot")}` : lotKeys[0];
  const reqFilter = sp.get("req");
  const filterReq = (v: unknown): unknown => {
    if (!reqFilter || !v || typeof v !== "object") return v;
    const o = v as Record<string, unknown>;
    const key = Array.isArray(o.requirements) ? "requirements" : Array.isArray(o.items) ? "items" : null;
    return key ? { ...o, [key]: (o[key] as { req_id: string }[]).filter((x) => x.req_id === reqFilter) } : v;
  };

  return (
    <ProtoPage title={t("prompts.title")} sub={t("prompts.sub")}>
      <div className="mb-4 flex flex-wrap items-end gap-3 [&>*]:min-w-0 [&>*]:max-w-full">
        <Tabs tabs={[{ id: "extraction", label: t("prompts.t.extraction") }, { id: "screening", label: t("prompts.t.screening") }, { id: "matching", label: t("prompts.t.matching") }]}
          value={task} onChange={(v) => set({ task: v, lot: null, req: null })} />
        <Field label={t("prompts.notice")}>
          <select className={`${inputCls} max-w-full sm:w-auto`} value={notice} onChange={(e) => set({ notice: e.target.value, lot: null, req: null })}>
            {ids.map((n) => <option key={n} value={n}>{n} — {title(m, n, lang).slice(0, 60)}</option>)}
          </select>
        </Field>
        {task === "matching" && lotKeys.length > 1 && (
          <Field label={t("report.lot")}><select className={inputCls} value={lotKey} onChange={(e) => set({ lot: e.target.value.split("#lot")[1] })}>{lotKeys.map((k) => <option key={k} value={k}>{k.split("#lot")[1]}</option>)}</select></Field>
        )}
        {task !== "screening" && (
          <Field label={t("prompts.req")}><input className={inputCls} placeholder="R01" value={reqFilter ?? ""} onChange={(e) => set({ req: e.target.value.toUpperCase() || null })} /></Field>
        )}
        {task !== "extraction" && <span className="pb-2 text-sm text-muted">{t("prompts.firmNote", { firm })}</span>}
      </div>
      {m.run.mock && <p className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm"><Chip className="mock-stripes text-fg">MOCK</Chip> {t("prompts.mockNote")}</p>}
      {task === "extraction" && (ext ? (
        <>
          {ext.anomaly_note_en && <p className="mb-3 rounded-lg bg-flag-soft p-3 text-sm text-flag">{lang === "nb" ? ext.anomaly_note_nb : ext.anomaly_note_en}</p>}
          <Panes prompt={prompts.extraction_v1} input={ext.prompt_input} raw={{ pass_1_with_citations: ext.raw_output_pass1, pass_2_json: filterReq(ext.raw_output_pass2) }} validated={filterReq(ext.validated)}
            checks={<div className="flex flex-wrap gap-1"><Ok ok={ext.schema_ok} label={t("prompts.schema")} /><Ok ok={ext.citation_checks.every((c) => c.citation_ok)} label={t("prompts.citations", { ok: ext.citation_checks.filter((c) => c.citation_ok).length, n: ext.citation_checks.length })} /></div>} />
          <Card className="mt-4"><CardHeader title={t("prompts.citationTable")} />
            <ul className="divide-y divide-border text-sm">{ext.citation_checks.filter((c) => !reqFilter || c.req_id === reqFilter).map((c) => (
              <li key={c.req_id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2"><span className="w-9 font-semibold">{c.req_id}</span><Ok ok={c.citation_ok} label={t("prompts.citationOk")} /><Ok ok={c.highlighted} label={t("prompts.highlighted")} />{c.error && <span className="text-xs text-muted">{c.error}</span>}</li>))}</ul>
          </Card>
        </>
      ) : <Loading />)}
      {task === "screening" && (scr ? (() => { const io = scr[notice]; return io ? <Panes prompt={prompts.screening_v1} input={io.input} raw={io.raw_output} validated={io.validated_output} checks={<Ok ok={io.schema_ok} label={t("prompts.schema")} />} /> : <p>{t("common.notFound")}</p>; })() : <Loading />)}
      {task === "matching" && (rep ? (() => { const io = rep[lotKey]; return io ? <Panes prompt={prompts.matching_classification_v1} input={filterReq(io.input)} raw={filterReq(io.raw_output)} validated={filterReq(io.validated_output)} checks={<Ok ok={io.schema_ok} label={t("prompts.schema")} />} /> : <p>{t("common.notFound")}</p>; })() : <Loading />)}
    </ProtoPage>
  );
}
