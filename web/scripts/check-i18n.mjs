// Fails if en.json and nb.json differ in keys, or a static t("key") used in the code is missing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(WEB, "..");
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const en = new Set(flat(JSON.parse(fs.readFileSync(path.join(ROOT, "i18n/en.json"), "utf8"))));
const nb = new Set(flat(JSON.parse(fs.readFileSync(path.join(ROOT, "i18n/nb.json"), "utf8"))));
const errors = [];
for (const k of en) if (!nb.has(k)) errors.push(`missing in nb: ${k}`);
for (const k of nb) if (!en.has(k)) errors.push(`missing in en: ${k}`);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(WEB, "src")).filter((f) => /\.tsx?$/.test(f))) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/\bt\(\s*"([^"]+)"/g)) if (!en.has(m[1])) errors.push(`${path.relative(WEB, f)}: unknown key ${m[1]}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`i18n ok: ${en.size} keys in en and nb`);
