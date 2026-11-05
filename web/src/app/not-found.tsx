"use client";
import { useTranslations } from "next-intl";
import { EmptyState, LinkButton } from "@/components/ui/ui";

export default function NotFound() {
  const t = useTranslations();
  return <EmptyState title={t("common.notFoundTitle")} text={t("common.notFound")} action={<LinkButton href="/">{t("nav.overview")}</LinkButton>} />;
}
