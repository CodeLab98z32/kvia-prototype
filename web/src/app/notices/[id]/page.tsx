import { NoticeDetail } from "@/components/notice/NoticeDetail";
import { noticeIds } from "@/lib/static-ids";

export const dynamicParams = false;
export function generateStaticParams() {
  return noticeIds().map((id) => ({ id }));
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoticeDetail id={id} />;
}
