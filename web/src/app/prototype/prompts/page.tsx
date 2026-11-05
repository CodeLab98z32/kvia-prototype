"use client";
import { useTranslations } from "next-intl";
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ProtoPage } from "@/components/shell/AppShell";
import { CopyButton, EmptyState, Field, JsonView, Loading, Segmented, Tabs, inputCls } from "@/components/ui/ui";
import { useJson } from "@/lib/data";
import { cn } from "@/lib/format";
import { title } from "@/lib/reports";
import { useApp, useModel } from "@/lib/state";
import { useQueryState } from "@/lib/url-state";

type Task = "extraction" | "screening" | "matching";
type View = "prompt" | "input" | "raw" | "validated" | "checks";
interface IO { prompt_version: string; model: string; input: unknown; raw_output: unknown; schema_ok: boolean; schema_errors: string[]; validated_output: unknown }
interface Extraction {
  prompt_version: string; model: string; prompt_input: unknown; raw_output_pass1: string; raw_output_pass2: unknown; schema_ok: boolean;
  schema_errors: string[]; validated: unknown; citation_checks: { req_id: string; citation_ok: boolean; highlighted: boolean; error: string | null }[];
  anomaly_note_en?: string | null; anomaly_note_nb?: string | null;
}

function Ok({ ok, label }: { ok: boolean; label: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", ok ? "text-go" : "text-nogo")}>
      {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}{label}
    </span>
  );
}

export default function PromptsPage() {
  const t = useTranslations();
  const m = useModel();
  const { firm, lang } = useApp();
  const [taskQ, setTask] = useQueryState("task", "extraction");
  const [noticeQ, setNotice] = useQueryState("notice");
  const [lotQ, setLot] = useQueryState("lot");
  const [reqQ, setReq] = useQueryState("req");
  const [viewQ, setView] = useQueryState("view", "input");
  const task = taskQ as Task;
  const view = viewQ as View;
  const prompts = useJson<[Record<string, string>]>(["prompts.json"])?.[0];
  const extractedIds = m ? Object.keys(m.gate).filter((n) => m.gate[n].documents_status !== "missing") : [];
  const screenedIds = m ? m.screening.ranked.map((r) => r.notice_id) : [];
  const ids = task === "extraction" ? extractedIds : screenedIds;
  const notice = noticeQ && ids.includes(noticeQ) ? noticeQ : ids[0];
  const ext = useJson<[Extraction]>([task === "extraction" && notice ? `run/1b_extraction/${notice}.json` : null])?.[0];
  const scr = useJson<[Record<string, IO>]>([task === "screening" ? `run/io/screening-${firm}.json` : null])?.[0];
  const rep = useJson<[Record<string, IO>]>([task === "matching" ? `run/io/reports-${firm}.json` : null])?.[0];
  if (!m || !prompts) return <Loading />;
  const lotKeys = rep ? Object.keys(rep).filter((k) => k.split("#")[0] === notice) : [];
  const lotKey = lotQ && lotKeys.includes(`${notice}#lot${lotQ}`) ? `${notice}#lot${lotQ}` : lotKeys[0];
  const filterReq = (v: unknown): unknown => {
    if (!reqQ || !v || typeof v !== "object") return v;
    const o = v as Record<string, unknown>;
    const key = Array.isArray(o.requirements) ? "requirements" : Array.isArray(o.items) ? "items" : null;
    return key ? { ...o, [key]: (o[key] as { req_id: string }[]).filter((x) => x.req_id === reqQ) } : v;
  };

  let promptText = "", input: unknown, raw: unknown, validated: unknown, schemaOk = true, schemaErrors: string[] = [], version = "", model = "";
  let checks: ReactNode = null, loading = false, note: string | null = null;
  if (task === "extraction") {
    if (!ext) loading = true; else {
      promptText = prompts.extraction_v1; input = ext.prompt_input; raw = { pass_1_with_citations: ext.raw_output_pass1, pass_2_json: filterReq(ext.raw_output_pass2) };
      validated = filterReq(ext.validated); schemaOk = ext.schema_ok; schemaErrors = ext.schema_errors; version = ext.prompt_version; model = ext.model;
      note = (lang === "nb" ? ext.anomaly_note_nb : ext.anomaly_note_en) ?? null;
      const cc = ext.citation_checks.filter((c) => !reqQ || c.req_id === reqQ);
      checks = (
        <ul className="overflow-hidden rounded-xl border border-border">
          {cc.map((c) => (
            <li key={c.req_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border px-4 py-2.5 first:border-0">
              <b className="tnum w-10">{c.req_id}</b><Ok ok={c.citation_ok} label={t("prompts.citationOk")} /><Ok ok={c.highlighted} label={t("prompts.highlighted")} />
              {c.error && <span className="text-meta text-muted">{c.error}</span>}
            </li>
          ))}
        </ul>
      );
    }
  } else {
    const io = task === "screening" ? scr?.[notice] : rep?.[lotKey];
    if (!(task === "screening" ? scr : rep)) loading = true;
    else if (io) {
      promptText = task === "screening" ? prompts.screening_v1 : prompts.matching_classification_v1;
      input = filterReq(io.input); raw = filterReq(io.raw_output); validated = filterReq(io.validated_output);
      schemaOk = io.schema_ok; schemaErrors = io.schema_errors; version = io.prompt_version; model = io.model;
    }
  }
  return (
    <ProtoPage title={t("prompts.title")} sub={t("prompts.sub")}>
      <div className="mb-6 flex flex-wrap items-end gap-3 [&>*]:min-w-0 [&>*]:max-w-full">
        <Segmented<Task> label={t("prompts.task")} value={task} onChange={(v) => { setTask(v, "push"); setLot(null); setReq(null); }}
          options={[{ id: "extraction", label: t("prompts.t.extraction") }, { id: "screening", label: t("prompts.t.screening") }, { id: "matching", label: t("prompts.t.matching") }]} />
        <Field label={t("prompts.notice")}>
          <select className={cn(inputCls, "sm:w-[340px]")} value={notice} onChange={(e) => { setNotice(e.target.value); setLot(null); setReq(null); }}>
            {ids.map((n) => <option key={n} value={n}>{n} — {title(m, n, lang).slice(0, 48)}</option>)}
          </select>
        </Field>
        {task === "matching" && lotKeys.length > 1 && (
          <Field label={t("report.lot")}><select className={cn(inputCls, "w-28")} value={lotKey} onChange={(e) => setLot(e.target.value.split("#lot")[1])}>{lotKeys.map((k) => <option key={k} value={k}>{k.split("#lot")[1]}</option>)}</select></Field>
        )}
        {task !== "screening" && <Field label={t("prompts.req")}><input className={cn(inputCls, "w-28")} placeholder="R01" value={reqQ} onChange={(e) => setReq(e.target.value.toUpperCase() || null)} /></Field>}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border px-4 py-3 text-[13px]">
        {m.run.mock && <span className="mock-stripes inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-semibold"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("prompts.mockEvidence")}</span>}
        <span className="text-muted">{t("prompts.version")}: <b className="font-medium text-fg">{version || "—"}</b></span>
        <span className="text-muted">{t("prompts.model")}: <b className="font-medium text-fg">{model || "—"}</b></span>
        {task !== "extraction" && <span className="text-muted">{t("prompts.firmNote", { firm })}</span>}
        {!loading && <Ok ok={schemaOk} label={t("prompts.schema")} />}
      </div>
      {m.run.mock && <p className="-mt-3 mb-6 text-[13px] text-muted">{t("prompts.mockNote")}</p>}
      {note && <p className="mb-6 rounded-lg bg-flag-soft/60 px-4 py-3 text-[13px] text-flag">{note}</p>}
      <Tabs<View> className="mb-5" value={view} onChange={(v) => setView(v, "push")}
        tabs={[{ id: "prompt", label: t("prompts.prompt") }, { id: "input", label: t("prompts.input") }, { id: "raw", label: t("prompts.raw") }, { id: "validated", label: t("prompts.validated") }, { id: "checks", label: t("prompts.checks") }]} />
      {loading ? <Loading /> : input === undefined && task !== "extraction" ? <EmptyState title={t("common.notFound")} /> : (
        <div className="min-w-0">
          {view === "prompt" && <div className="relative"><CopyButton text={promptText} className="absolute right-2 top-2" /><pre className="json max-h-[640px] overflow-auto rounded-xl border border-border bg-surface-2/50 p-4 pr-16">{promptText}</pre></div>}
          {view === "input" && <><p className="mb-3 text-[13px] text-muted">{t("prompts.inputSub")}</p><JsonView data={input} max={640} /></>}
          {view === "raw" && <JsonView data={raw} max={640} />}
          {view === "validated" && <JsonView data={validated} max={640} />}
          {view === "checks" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border px-4 py-3"><Ok ok={schemaOk} label={schemaOk ? t("prompts.schemaPassed") : t("prompts.schemaFailed")} />
                {schemaErrors.length > 0 && <ul className="mt-2 list-disc pl-5 text-[13px] text-nogo">{schemaErrors.map((e) => <li key={e}>{e}</li>)}</ul>}</div>
              {checks ?? <p className="text-[13px] text-muted">{t("prompts.noCitationChecks")}</p>}
            </div>
          )}
        </div>
      )}
    </ProtoPage>
  );
}
