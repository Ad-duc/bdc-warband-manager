/*
 * File:        scripts/check-i18n.ts
 * Role:        Checks the interface strings: same keys in en.json and fr.json,
 *              no empty value, every t("...") key used in src exists, and no
 *              key is left unused. A key counts as used when its name appears
 *              as a string in src, or when it starts with the static prefix of
 *              a template literal (t(`rules.${code}`)).
 * Usage:       npm run check:i18n
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { baseKey, flattenKeys } from "../src/i18n/keys.ts";

const ROOT = resolve(import.meta.dirname, "..");
const LOCALES = join(ROOT, "src", "i18n", "locales");
let errors = 0;
const fail = (m: string): void => {
  errors += 1;
  console.log(`  [ERROR] ${m}`);
};

const load = (lng: string): Map<string, string> =>
  flattenKeys(JSON.parse(readFileSync(join(LOCALES, `${lng}.json`), "utf8")) as unknown);
const en = load("en");
const fr = load("fr");

console.log("== Key parity");
for (const k of en.keys()) if (!fr.has(k)) fail(`fr.json is missing "${k}"`);
for (const k of fr.keys()) if (!en.has(k)) fail(`en.json is missing "${k}"`);
for (const [lng, map] of [
  ["en", en],
  ["fr", fr],
] as const)
  for (const [k, v] of map) if (v.trim() === "") fail(`${lng}.json: "${k}" is empty`);
console.log(`  ${en.size} keys in en.json, ${fr.size} keys in fr.json`);

console.log("== Keys used in src");
const known = new Set([...en.keys()].map(baseKey));
const files: string[] = [];
const walk = (dir: string): void => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
};
walk(join(ROOT, "src"));
let used = 0;
const literal = /\bt\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g;
const template = /\bt\(\s*`([a-zA-Z0-9_.]*)\$\{/g;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(literal)) {
    used += 1;
    const key = m[1] ?? "";
    if (!known.has(key)) fail(`${relative(ROOT, f)} uses unknown key "${key}"`);
  }
  for (const m of src.matchAll(template)) {
    used += 1;
    const prefix = m[1] ?? "";
    if (![...known].some((k) => k.startsWith(prefix)))
      fail(`${relative(ROOT, f)} uses unknown key prefix "${prefix}"`);
  }
}
console.log(`  ${used} t() calls checked in ${files.length} files`);

console.log("== Unused keys");
// Every quoted name and every static prefix of a template literal found in src.
const strings = new Set<string>();
const prefixes = new Set<string>();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`]([a-zA-Z0-9_.]+)["'`]/g)) strings.add(m[1] ?? "");
  for (const m of src.matchAll(/`([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]*)\$\{/g)) prefixes.add(m[1] ?? "");
}
let unused = 0;
for (const key of known) {
  if (strings.has(key) || [...prefixes].some((p) => key.startsWith(p))) continue;
  unused += 1;
  fail(`"${key}" is never used in src`);
}
console.log(`  ${known.size - unused} of ${known.size} keys used`);

console.log(`\nResult: ${errors} error(s)`);
process.exit(errors > 0 ? 1 : 0);
