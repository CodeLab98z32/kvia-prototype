"use client";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BASE } from "@/lib/data";
import { cn } from "@/lib/format";

export interface HL { id: string; page: number; rects: number[][]; label?: string }

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => void };
type Viewport = { width: number; height: number; convertToViewportRectangle: (r: number[]) => number[] };
type PdfPage = {
  getViewport: (o: { scale: number }) => Viewport;
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: Viewport; transform?: number[] }) => { promise: Promise<void>; cancel: () => void };
};

/** Embedded PDF.js viewer. Highlights are drawn as overlays from stored PDF coordinates (SPEC §7 highlight, §8.4). */
export function PdfViewer({ url, page, onPageChange, highlights = [], activeId, onSelect, title, bare }: {
  url: string; page: number; onPageChange: (p: number) => void; highlights?: HL[]; activeId?: string | null;
  onSelect?: (id: string) => void; title?: string; bare?: boolean;
}) {
  const t = useTranslations();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [vp, setVp] = useState<Viewport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let alive = true;
    let loaded: PdfDoc | null = null;
    setDoc(null); setErr(null);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;
        loaded = (await pdfjs.getDocument(url).promise) as unknown as PdfDoc;
        if (alive) setDoc(loaded);
      } catch (e) { if (alive) setErr(String(e)); }
    })();
    return () => { alive = false; loaded?.destroy(); };
  }, [url]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvas.current) return;
    let task: { cancel: () => void } | null = null;
    let alive = true;
    (async () => {
      const p = await doc.getPage(Math.min(Math.max(page, 1), doc.numPages));
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: width / base.width });
      const dpr = window.devicePixelRatio || 1;
      const c = canvas.current!;
      c.width = Math.floor(viewport.width * dpr);
      c.height = Math.floor(viewport.height * dpr);
      c.style.width = `${viewport.width}px`;
      c.style.height = `${viewport.height}px`;
      const r = p.render({ canvasContext: c.getContext("2d")!, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
      task = r;
      await r.promise.catch(() => undefined);
      if (alive) setVp(viewport);
    })();
    return () => { alive = false; task?.cancel(); };
  }, [doc, page, width]);

  const onPage = highlights.filter((h) => h.page === page);
  useEffect(() => {
    if (!activeId) return;
    // scroll only the viewer's own scroll area, never the page
    const el = wrap.current?.querySelector<HTMLElement>(`[data-hl="${activeId}"]`);
    const box = wrap.current?.parentElement;
    if (el && box) box.scrollTo({ top: Math.max(0, el.offsetTop - box.clientHeight / 2), behavior: "smooth" });
  }, [activeId, vp]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-surface", !bare && "rounded-xl border border-border")}>
      <div className="flex h-11 items-center justify-between gap-2 border-b border-border px-3 text-[13px]">
        <div className="min-w-0 truncate font-medium text-muted" title={title}>{title}</div>
        <div className="flex shrink-0 items-center gap-1">
          <button className="t-fast grid h-8 w-8 place-items-center rounded-md hover:bg-surface-2 disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("pdf.prev")}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="tnum text-xs">{t("pdf.page")} {page} / {doc?.numPages ?? "…"}</span>
          <button className="t-fast grid h-8 w-8 place-items-center rounded-md hover:bg-surface-2 disabled:opacity-40" disabled={!doc || page >= doc.numPages} onClick={() => onPageChange(page + 1)} aria-label={t("pdf.next")}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <a className="t-fast grid h-8 w-8 place-items-center rounded-md hover:bg-surface-2" href={`${url}#page=${page}`} target="_blank" rel="noreferrer" aria-label={t("pdf.open")}>
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto bg-surface-2/70 p-3">
        <div ref={wrap} className="relative mx-auto w-full">
          {!doc && !err && <div className="grid h-64 place-items-center text-muted"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /></div>}
          {err && <div className="p-4 text-sm text-nogo">{t("pdf.error")}: {err}</div>}
          <canvas ref={canvas} className={cn("block bg-white shadow-hair ring-1 ring-border", !doc && "hidden")} />
          {vp && onPage.map((h) => h.rects.map((r, i) => {
            const [a, b, c, d] = vp.convertToViewportRectangle(r);
            return (
              <button key={`${h.id}-${i}`} data-hl={i === 0 ? h.id : undefined} type="button"
                className={cn("hl-rect", activeId === h.id && "active")}
                style={{ left: Math.min(a, c) - 2, top: Math.min(b, d) - 1, width: Math.abs(c - a) + 4, height: Math.abs(d - b) + 2 }}
                title={h.label ?? h.id} aria-label={`${t("pdf.highlight")} ${h.id}`} onClick={() => onSelect?.(h.id)} />
            );
          }))}
        </div>
      </div>
    </div>
  );
}
