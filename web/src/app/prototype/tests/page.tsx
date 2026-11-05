"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { ProtoPage } from "@/components/shell/AppShell";
import { Loading, StatStrip, TableCard } from "@/components/ui/ui";
import { Dot } from "@/components/ui/chips";
import { useJson } from "@/lib/data";
import { evidenceHref } from "@/lib/evidence";
import { cn } from "@/lib/format";
import { useApp, useL } from "@/lib/state";
import type { TestCase } from "@/lib/types";
import { useQueryState } from "@/lib/url-state";

const kind = (s: string) => (s.startsWith("passed") ? "passed" : s.startsWith("failed") ? "failed" : s.startsWith("ready") ? "ready" : "notobserved");
const TONE = { passed: "go", failed: "nogo", ready: "info", notobserved: "muted" } as const;

export default function TestsPage() {
  const t = useTranslations();
  const { href, firm } = useApp();
  const L = useL();
  const [open, setOpen] = useQueryState("test");
  const d = useJson<[TestCase[]]>(["run/tests.json"]);
  if (!d) return <Loading />;
  const [tests] = d;
  const c = (k: string) => tests.filter((x) => kind(x.status) === k).length;
  return (
    <ProtoPage title={t("tests.title")} sub={t("tests.sub2")}>
      <StatStrip className="mb-8" items={[
        { label: t("tests.kPassed"), value: c("passed"), tone: c("passed") ? "go" : undefined },
        { label: t("tests.kFailed"), value: c("failed"), tone: c("failed") ? "nogo" : undefined },
        { label: t("tests.kNotObserved"), value: c("notobserved") },
        { label: t("tests.kReady"), value: c("ready") },
      ]} />
      <TableCard footer={t("tests.mockWarning")}>
        <div className="hidden h-11 grid-cols-[56px_120px_minmax(0,1fr)_200px_20px] items-center gap-4 bg-surface-2/50 px-4 text-meta font-medium text-muted md:grid">
          <span>ID</span><span>{t("tests.type")}</span><span>{t("tests.scenario")}</span><span>{t("tests.status")}</span><span />
        </div>
        <ul>
          {tests.map((x) => {
            const isOpen = open === x.id;
            return (
              <li key={x.id} className="border-t border-border">
                <button type="button" onClick={() => setOpen(isOpen ? null : x.id)} aria-expanded={isOpen}
                  className={cn("t-fast grid w-full grid-cols-[48px_minmax(0,1fr)_20px] gap-x-4 gap-y-1.5 px-4 py-3.5 text-left md:grid-cols-[56px_120px_minmax(0,1fr)_200px_20px] md:items-center", isOpen ? "bg-surface-2/40" : "hover:bg-surface-2/50")}>
                  <span className="tnum font-semibold">{x.id}</span>
                  <span className="hidden text-[13px] text-muted md:block">{t(`tests.types.${x.type}`)}</span>
                  <span className="min-w-0 font-medium md:font-normal">{x.scenario}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted transition-transform duration-150 md:order-last", isOpen && "rotate-180")} aria-hidden />
                  <span className="col-span-3 pl-[64px] md:col-span-1 md:pl-0"><Dot tone={TONE[kind(x.status)]}>{x.status}</Dot></span>
                </button>
                {isOpen && (
                  <div className="anim-dropdown grid gap-5 border-t border-border bg-surface-2/40 px-4 py-5 text-[13.5px] md:grid-cols-3">
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("tests.expected")}</div><p>{x.expected}</p></div>
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("tests.observed")}</div><p>{L(x, "observed")}</p></div>
                    <div><div className="mb-1 text-meta font-medium text-muted">{t("tests.evidence")}</div>
                      <ul className="space-y-1">{x.evidence.map((e, i) => <li key={i}><Link href={evidenceHref(e, href, firm)} className="text-accent hover:underline">{t(`tests.ev.${e.page}`)}{e.notice ? ` · ${e.notice}` : ""}{e.req ? ` · ${e.req}` : ""}</Link></li>)}</ul></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </TableCard>
    </ProtoPage>
  );
}
