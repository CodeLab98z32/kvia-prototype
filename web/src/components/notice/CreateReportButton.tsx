"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/ui";
import { useApp } from "@/lib/state";

/** "Create diagnostic report" = manual addition. Reveals the PRECOMPUTED report; never starts an AI run (SPEC §8.3). */
export function CreateReportButton({ noticeId, via, className }: { noticeId: string; via: "ranked_list" | "notice_browser"; className?: string }) {
  const t = useTranslations();
  const { addLocal, href } = useApp();
  const router = useRouter();
  return (
    <Button variant="primary" className={className} onClick={() => { addLocal(noticeId); router.push(href(`/reports/${noticeId}`, { added: via })); }}>
      <FilePlus2 className="h-4 w-4" aria-hidden />{t("report.create")}
    </Button>
  );
}
