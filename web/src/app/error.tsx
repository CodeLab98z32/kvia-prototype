"use client";
import { useTranslations } from "next-intl";
import { Button, ErrorState } from "@/components/ui/ui";

/** Route-level error boundary: a failed data load shows a message and a retry instead of a blank page. */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations();
  return (
    <ErrorState title={t("common.errorTitle")} text={`${t("common.errorText")} (${error.message})`}
      action={<Button onClick={() => { reset(); window.location.reload(); }}>{t("common.retry")}</Button>} />
  );
}
