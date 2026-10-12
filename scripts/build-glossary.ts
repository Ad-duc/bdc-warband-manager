/*
 * File:        scripts/build-glossary.ts
 * Role:        Generates src/i18n/glossary.json (VO > VF terms) from the
 *              translation glossary 00_glossaire.md. Only the numbered
 *              categories are kept; decisions, notes and annexes are skipped.
 * Usage:       npm run build:glossary [-- --sources "<folder with 00_glossaire.md>"]
 *              The folder defaults to sources/fr; BDC_SOURCES overrides it.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "src", "i18n", "glossary.json");

const i = process.argv.indexOf("--sources");
const dir =
  (i > -1 ? process.argv[i + 1] : undefined) ?? process.env["BDC_SOURCES"] ?? join(ROOT, "sources", "fr");
if (!existsSync(join(dir, "00_glossaire.md"))) {
  console.error(`00_glossaire.md not found in ${dir}: pass --sources <folder> or set BDC_SOURCES`);
  process.exit(1);
}

interface Entry {
  vo: string;
  vf: string;
  category: string;
}

const lines = readFileSync(join(dir, "00_glossaire.md"), "utf8").split("\n");
const categories: { id: string; name: string }[] = [];
const entries: Entry[] = [];
let current: string | null = null;

for (const line of lines) {
  const heading = line.match(/^## (\d{2})\. (.+)$/);
  if (heading) {
    current = heading[1] ?? null;
    categories.push({ id: heading[1] ?? "", name: (heading[2] ?? "").trim() });
    continue;
  }
  if (line.startsWith("## ")) {
    current = null;
    continue;
  }
  if (current === null || !line.startsWith("|") || /^\|[-| ]+\|$/.test(line)) continue;
  const cells = line
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
  const [vo, vf] = cells;
  if (vo === undefined || vf === undefined || vo === "VO" || vo === "") continue;
  entries.push({ vo, vf, category: current });
}

const glossary = {
  _header: {
    file: "src/i18n/glossary.json",
    role: "VO > VF game terms generated from 00_glossaire.md by scripts/build-glossary.ts. Do not edit by hand.",
    author: "Adrien Duclaud",
    created: "2026-10-12",
    license: "MIT for the file structure. Terms belong to the translation project.",
  },
  categories,
  entries,
};

writeFileSync(OUT, JSON.stringify(glossary, null, 2) + "\n", "utf8");
console.log(`Glossary written: ${categories.length} categories, ${entries.length} entries -> ${OUT}`);
