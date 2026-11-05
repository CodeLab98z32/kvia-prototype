"use client";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/chips";
import { SUBSCORE_KEYS } from "@/lib/format";
import { useL, type Model } from "@/lib/state";
import type { ScreenResult } from "@/lib/types";

export function SubScoreTable({ m, r }: { m: Model; r: ScreenResult }) {
  const t = useTranslations();
  const L = useL();
  return (
    <div className="space-y-2">
      {SUBSCORE_KEYS.map((k) => {
        const s = r.sub_scores[k];
        const w = m.screening.weights[k];
        return (
          <div key={k} className="grid items-start gap-2 rounded-lg bg-surface p-2.5 sm:grid-cols-[180px_160px_1fr]">
            <div className="text-sm font-semibold">{t(`sub.${k}`)} <span className="tnum text-xs font-normal text-muted">w {w.toFixed(2)}</span></div>
            <div className="flex items-center gap-2">
              {s?.value === null || !s ? <Chip tone="flag">{t("screening.excluded")}</Chip> : (
                <><div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${s.value}%` }} /></div><span className="tnum text-sm font-bold">{s.value}</span></>
              )}
            </div>
            <div className="text-sm text-muted">{L(s, "reason")}<span className="ml-1 text-xs">({s?.data_points.join(", ")})</span></div>
          </div>
        );
      })}
    </div>
  );
}

