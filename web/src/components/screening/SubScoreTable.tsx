"use client";
import { useTranslations } from "next-intl";
import { SUBSCORE_KEYS } from "@/lib/format";
import { useL, type Model } from "@/lib/state";
import type { ScreenResult } from "@/lib/types";

/** Sub-scores per data point with weight, value and the model's reason. Missing data points are shown as excluded. */
export function SubScoreTable({ m, r }: { m: Model; r: ScreenResult }) {
  const t = useTranslations();
  const L = useL();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {SUBSCORE_KEYS.map((k) => {
        const s = r.sub_scores[k];
        const w = m.screening.weights[k];
        const missing = !s || s.value === null;
        return (
          <div key={k} className="grid gap-x-6 gap-y-1.5 border-t border-border px-4 py-3 first:border-0 sm:grid-cols-[170px_150px_1fr]">
            <div className="text-[13px] font-medium">{t(`sub.${k}`)} <span className="tnum font-normal text-muted">· w {w.toFixed(2)}</span></div>
            <div className="flex items-center gap-2.5">
              {missing ? <span className="text-meta font-medium text-flag">{t("screening.excluded")}</span> : (
                <><span className="tnum w-7 text-right text-[14px] font-semibold">{s.value}</span>
                  <span className="h-1.5 w-20 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent/80" style={{ width: `${s.value}%` }} /></span></>
              )}
            </div>
            <div className="min-w-0 text-[13px] text-muted">{L(s, "reason")} <span className="text-meta opacity-80">({s?.data_points.join(", ")})</span></div>
          </div>
        );
      })}
    </div>
  );
}
