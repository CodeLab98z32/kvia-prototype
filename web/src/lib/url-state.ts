"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Page-level UI state mirrored in the URL (deep links), without a Next router navigation.
 * - `replace` (default) for high-frequency state (filters, expanded row); `push` adds a history entry so Back/Forward
 *   steps through it (tabs, selected requirement).
 * - Re-reads the URL on popstate so Back/Forward restores the state.
 */
export function useQueryState(key: string, fallback = ""): [string, (v: string | null, mode?: "replace" | "push") => void] {
  const sp = useSearchParams();
  const [value, setValue] = useState<string>(sp.get(key) ?? fallback);
  useEffect(() => {
    const onPop = () => setValue(new URLSearchParams(window.location.search).get(key) ?? fallback);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key, fallback]);
  // follow external changes of the search string (e.g. firm switch through the router)
  const external = sp.get(key);
  useEffect(() => { setValue(external ?? fallback); }, [external, fallback]);
  const set = useCallback((v: string | null, mode: "replace" | "push" = "replace") => {
    const p = new URLSearchParams(window.location.search);
    if (v === null || v === "" || v === fallback) p.delete(key); else p.set(key, v);
    const url = `${window.location.pathname}${p.toString() ? `?${p.toString()}` : ""}`;
    if (mode === "push") window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
    setValue(v ?? fallback);
  }, [key, fallback]);
  return [value, set];
}
