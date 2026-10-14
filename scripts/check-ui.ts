/*
 * File:        scripts/check-ui.ts
 * Role:        Checks the type scale of the screens: every literal heading
 *              (<h1> to <h6>) in src/features and src/app uses the title
 *              class of its level (h1 title-page, h2 title-section, h3 to h6
 *              title-sub) and sets no size, weight or font of its own, so a
 *              level looks the same on every screen. Only font-gothic is
 *              allowed on top of a title class (fighter names, style guide).
 * Usage:       npm run check:ui
 * Author:      Adrien Duclaud
 * Created:     2026-10-14
 * License:     MIT
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIRS = [join(ROOT, "src", "features"), join(ROOT, "src", "app")];

const EXPECTED: Record<string, string> = {
  h1: "title-page",
  h2: "title-section",
  h3: "title-sub",
  h4: "title-sub",
  h5: "title-sub",
  h6: "title-sub",
};
const TITLE_CLASS = /\btitle-(page|section|sub)\b/g;
// Utilities that would override the scale on a heading
const FORBIDDEN =
  /(?:^|[\s"'`:])(text-(?:xs|sm|base|lg|[0-9]?xl|\[[^\]]+\])|font-(?:thin|light|normal|medium|semibold|bold|extrabold|black|hand|body))(?=[\s"'`]|$)/g;

let errors = 0;
let headings = 0;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".tsx") ? [path] : [];
  });

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

for (const dir of DIRS) {
  let files: string[];
  try {
    files = walk(dir);
  } catch {
    continue;
  }
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const where = relative(ROOT, file);
    for (const match of text.matchAll(/<(h[1-6])\b([^>]*)>/g)) {
      headings += 1;
      const tag = match[1] ?? "";
      const attributes = match[2] ?? "";
      const line = lineOf(text, match.index);
      const fail = (message: string): void => {
        errors += 1;
        console.log(`  [ERROR] ${where}:${line} <${tag}> ${message}`);
      };
      const titles = [...attributes.matchAll(TITLE_CLASS)].map((m) => m[0]);
      const expected = EXPECTED[tag] ?? "title-sub";
      if (titles.length === 0) fail(`has no title class, expected ${expected}`);
      else if (titles.length > 1 || titles[0] !== expected)
        fail(`uses ${titles.join(", ")}, expected ${expected}`);
      for (const bad of attributes.matchAll(FORBIDDEN)) fail(`sets its own "${bad[1] ?? ""}"`);
    }
  }
}

console.log(`== Type scale: ${headings} headings checked`);
if (errors > 0) {
  console.log(`${errors} error(s)`);
  process.exit(1);
}
console.log("OK");
