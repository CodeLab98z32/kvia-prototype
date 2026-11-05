import fs from "node:fs";
import path from "node:path";

/** Build-time only: notice IDs of the configured run (read from the synced public/data). */
export function noticeIds(): string[] {
  const p = path.join(process.cwd(), "public/data/run/notices.json");
  const store = JSON.parse(fs.readFileSync(p, "utf8")) as { records: { doffin_id: string }[] };
  return store.records.map((r) => r.doffin_id);
}
