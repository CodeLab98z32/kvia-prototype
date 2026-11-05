"use client";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { PdfViewer, type HL } from "./PdfViewer";

/** Full-screen document reader for phones: opens at the cited page with the passage highlighted. */
export function DocReader({ url, title, page, highlights, activeId, onClose, caption }: {
  url: string; title: string; page: number; highlights: HL[]; activeId: string | null; onClose: () => void; caption?: string;
}) {
  const t = useTranslations();
  const [p, setP] = useState(page);
  useEffect(() => setP(page), [page]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="anim-modal fixed inset-0 z-50 flex flex-col bg-surface" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{caption ?? title}</div>
          <div className="truncate text-meta text-muted">{title}</div>
        </div>
        <button type="button" onClick={onClose} className="t-fast grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={t("common.close")}><X className="h-5 w-5" aria-hidden /></button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <PdfViewer url={url} title={title} page={p} onPageChange={setP} highlights={highlights} activeId={activeId} bare />
      </div>
    </div>
  );
}
