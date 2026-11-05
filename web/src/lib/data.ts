"use client";
import { useEffect, useState } from "react";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE}/data/${path}`;
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    }));
  }
  return cache.get(url) as Promise<T>;
}

/** Load several JSON files; returns undefined until all are loaded. */
export function useJson<T extends unknown[]>(paths: (string | null)[]): T | undefined {
  const key = paths.join("|");
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  useEffect(() => {
    let alive = true;
    if (paths.some((p) => p === null)) return;
    Promise.all(paths.map((p) => fetchJson(p as string)))
      .then((d) => alive && setState({ key, data: d as T }))
      .catch((e) => alive && setState({ key, error: String(e) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (state.error) throw new Error(state.error);
  return state.key === key ? state.data : undefined;
}

export const docUrl = (noticeId: string, file: string) => `${BASE}/docs/${noticeId}/${file}`;
