import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

export const REFERENCE_DATE = "2026-11-04";

export function nok(v: number | null | undefined, lang: string): string {
  if (v === null || v === undefined) return "—";
  const m = v / 1_000_000;
  const s = m.toLocaleString(lang === "nb" ? "nb-NO" : "en-GB", { maximumFractionDigits: 2 });
  return lang === "nb" ? `NOK ${s} mill.` : `NOK ${s}m`;
}

export function fmtDate(iso: string | null | undefined, lang: string, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleString(lang === "nb" ? "nb-NO" : "en-GB", {
    year: "numeric", month: "short", day: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Whole days from the fixed reference date to the deadline (negative = passed). */
export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ref = new Date(`${REFERENCE_DATE}T00:00:00`).getTime();
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime();
  return Math.floor((d - ref) / 86_400_000);
}

export const SUBSCORE_KEYS = ["subject_relevance", "region", "contract_subject", "size", "contract_form", "framework_dps", "lots"] as const;
