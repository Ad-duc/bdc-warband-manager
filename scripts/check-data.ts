/*
 * File:        scripts/check-data.ts
 * Role:        Validates src/data/*.json against the zod schemas, checks cross
 *              references, list prices and forbidden characters, then compares
 *              names, costs, profiles and totals with the translated Markdown
 *              sources when they are available.
 * Usage:       npm run check:data -- [--sources "<folder with the .md files>"]
 *              The folder can also be given with the BDC_SOURCES variable.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { z } from "zod";
import {
  CommonDataSchema,
  FactionDataSchema,
  checkFactionIntegrity,
  type AttackProfile,
  type CommonData,
  type FactionData,
  type Wargear,
} from "../src/data/schema.ts";

/* ------------------------------------------------------------------------- */
/* Report helpers                                                            */
/* ------------------------------------------------------------------------- */

const ROOT = resolve(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "src", "data");

let errorCount = 0;
let warningCount = 0;

function ok(message: string): void {
  console.log(`  [OK]    ${message}`);
}
function fail(message: string): void {
  errorCount += 1;
  console.log(`  [ERROR] ${message}`);
}
function warn(message: string): void {
  warningCount += 1;
  console.log(`  [WARN]  ${message}`);
}
function title(text: string): void {
  console.log(`\n== ${text}`);
}

/** Compares two lists of labels and reports what is missing on each side. */
function compareSets(label: string, expected: string[], actual: string[]): void {
  const a = new Set(actual);
  const e = new Set(expected);
  const missing = expected.filter((x) => !a.has(x));
  const extra = actual.filter((x) => !e.has(x));
  if (missing.length === 0 && extra.length === 0) {
    ok(`${label}: ${actual.length} / ${expected.length}`);
    return;
  }
  fail(`${label}: JSON ${actual.length}, Markdown ${expected.length}`);
  for (const m of missing) console.log(`          missing in JSON: ${m}`);
  for (const x of extra) console.log(`          not in Markdown: ${x}`);
}

/* ------------------------------------------------------------------------- */
/* 1. Schemas and integrity                                                  */
/* ------------------------------------------------------------------------- */

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function parseOrReport<T>(schema: z.ZodType<T>, data: unknown, file: string): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    ok(`${file} matches its schema`);
    return result.data;
  }
  fail(`${file} does not match its schema`);
  console.log(z.prettifyError(result.error).replace(/^/gm, "          "));
  return null;
}

title("Schemas");
const common = parseOrReport(CommonDataSchema, loadJson(join(DATA_DIR, "common.json")), "common.json");
const factionFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && f !== "common.json");
const factions: FactionData[] = [];
for (const file of factionFiles) {
  const parsed = parseOrReport(FactionDataSchema, loadJson(join(DATA_DIR, file)), file);
  if (parsed) {
    if (`${parsed.id}.json` !== file) fail(`${file}: id "${parsed.id}" must match the file name`);
    factions.push(parsed);
  }
}

if (common === null) {
  console.log("\ncommon.json is invalid, stopping.");
  process.exit(1);
}

title("Cross references");
for (const f of factions) {
  const problems = checkFactionIntegrity(f, common);
  if (problems.length === 0) ok(`${f.id}: all references resolve`);
  for (const p of problems) fail(`${f.id}: ${p}`);
}

title("Armoury list prices");
for (const f of factions) {
  const byId = new Map(f.wargear.map((w) => [w.id, w]));
  let differences = 0;
  for (const l of f.armouryLists) {
    for (const e of l.entries) {
      const w = byId.get(e.wargearId);
      if (w && w.cost !== e.cost) {
        differences += 1;
        warn(`${f.id}: ${w.name.en} costs ${e.cost} in ${l.name.en} but ${w.cost} in its profile table`);
      }
    }
  }
  if (differences === 0) ok(`${f.id}: every list price equals the profile table price`);
  const listed = new Set(f.armouryLists.flatMap((l) => l.entries.map((e) => e.wargearId)));
  for (const w of f.wargear)
    if (w.purchasable && !listed.has(w.id)) warn(`${f.id}: ${w.name.en} is in no armoury list`);
}

/* ------------------------------------------------------------------------- */
/* 2. Forbidden characters and mentions                                      */
/* ------------------------------------------------------------------------- */

title("Forbidden characters");
const FORBIDDEN: [RegExp, string][] = [
  [/\u2014/, "em dash"],
  [/\u2013/, "en dash"],
  [/[\u2018\u2019\u201A\u201B]/, "typographic single quote"],
  [/[\u201C\u201D\u201E\u00AB\u00BB]/, "typographic double quote"],
  [/[\u00A0\u202F\u2007\u2009]/, "non-breaking or thin space"],
  [/\u200B|\u200C|\u200D|\u2060|\uFEFF/, "zero-width character"],
  [/\u2026/, "typographic ellipsis"],
  [/\u017F/, "long s"],
];
const MENTION = new RegExp(
  [
    "\\bcl" + "aude\\b",
    "\\bchat" + "gpt\\b",
    "g" + "enerated by",
    "g" + "énéré par",
    "\\bopen" + "ai\\b",
  ].join("|"),
  "i",
);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (
      ["node_modules", ".git", "dist", "dev-dist", "coverage", "test-results", "playwright-report"].includes(
        name,
      )
    )
      continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|js|json|md|css|html|yml|yaml)$/.test(name)) out.push(path);
  }
}
const files: string[] = [];
walk(ROOT, files);
let dirty = 0;
for (const path of files) {
  if (path.endsWith("package-lock.json")) continue;
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(line)) {
        dirty += 1;
        fail(`${relative(ROOT, path)}:${i + 1} contains a ${label}`);
      }
    }
    if (MENTION.test(line)) {
      dirty += 1;
      fail(`${relative(ROOT, path)}:${i + 1} mentions an AI tool`);
    }
  });
}
if (dirty === 0) ok(`${files.length} files scanned, none contains a forbidden character or mention`);

/* ------------------------------------------------------------------------- */
/* 3. Comparison with the Markdown sources                                   */
/* ------------------------------------------------------------------------- */

function sourcesDir(): string | null {
  const i = process.argv.indexOf("--sources");
  const fromArg = i > -1 ? process.argv[i + 1] : undefined;
  const dir = fromArg ?? process.env["BDC_SOURCES"];
  return dir !== undefined && existsSync(dir) ? dir : null;
}

/** Lines of the section opened by the first heading starting with `prefix`. */
function section(lines: string[], level: number, prefix: string): string[] {
  const mark = "#".repeat(level) + " ";
  const start = lines.findIndex((l) => l.startsWith(mark + prefix));
  if (start === -1) return [];
  const end = lines.findIndex(
    (l, i) => i > start && /^#{1,6} /.test(l) && (l.match(/^#+/)?.[0].length ?? 7) <= level,
  );
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

/** Splits "Hache (*Axe*)" into its French text and its original term. */
function splitTerm(cell: string): { fr: string; en: string | null } {
  const m = cell.match(/^(.*?)\s*\(\*(.+?)\*\)\s*$/);
  return m ? { fr: (m[1] ?? "").trim(), en: (m[2] ?? "").trim() } : { fr: cell.trim(), en: null };
}
const stripTerms = (s: string): string => s.replace(/\s*\(\*[^)]*?\*\)/g, "").trim();
const headings = (lines: string[], level: number): string[] =>
  lines.filter((l) => l.startsWith("#".repeat(level) + " ")).map((l) => l.slice(level + 1).trim());
const tableRows = (lines: string[]): string[][] =>
  lines
    .filter((l) => l.startsWith("|") && !/^\|[-| ]+\|$/.test(l))
    .map((l) =>
      l
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim()),
    );

/** Formats a JSON value the way the French Markdown prints it. */
function frValue(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return String(v).toUpperCase().replace(/^D/, "D");
}
function frRend(r: number): string {
  return r === 0 ? "-" : String(r);
}
function frTraits(w: Wargear, c: CommonData): string {
  const names = new Map(c.weaponTraits.map((t) => [t.key, t.name.fr]));
  const list = w.traits
    .map((t) => (t.key === "rare" ? `Rare 0-${w.rarity ?? "?"}` : (names.get(t.key) ?? t.key)))
    .join(", ");
  return list === "" ? "-" : list;
}
function frRange(p: AttackProfile): string {
  return p.range === "flame" ? "Flamme" : `${p.range ?? ""}"`;
}
/**
 * Fighter names are compared without the "0-x" prefix, hyphens, case and the
 * plural of the lists ("Rat Mutant", "Darkcloven Beastmen").
 */
const fighterKey = (s: string): string =>
  s
    .replace(/^0-\d+ /, "")
    .replace(/-/g, " ")
    .replace(/men$/, "man")
    .toLowerCase();

/** Where each part of a faction chapter lives in its translation file. */
interface FactionLayout {
  file: string;
  names: string;
  armouryStart: string;
  melee: string;
  /** null when the faction has no ranged weapon page (Death Covens). */
  ranged: string | null;
  armourItems: string;
  skillSections: string[];
  loreSections: string[];
  /** True when natural weapons (no price) are printed in the melee table. */
  naturalWeaponsInMeleeTable: boolean;
}

const LAYOUTS: Record<string, FactionLayout> = {
  "guild-mercenaries": {
    file: "06_guild-mercenaries.md",
    names: "Noms des Guild Mercenaries",
    armouryStart: "## Armurerie de la Guilde (*Guild Armoury*)",
    melee: "Armurerie de la Guilde - Armes de corps à corps",
    ranged: "Armurerie de la Guilde - Armes à distance",
    armourItems: "Armurerie de la Guilde - Armures et objets",
    skillSections: ["Vieux briscards", "Ruse de soldat"],
    loreSections: ["Domaine de la Magie autorisée", "Domaine des Saints"],
    naturalWeaponsInMeleeTable: false,
  },
  verminkin: {
    file: "07_verminkin.md",
    names: "Noms des Verminkin",
    armouryStart: "## Armurerie Verminkin (*Vermin Armoury*)",
    melee: "Armurerie Verminkin - Armes de corps à corps",
    ranged: "Armurerie Verminkin - Armes à distance",
    armourItems: "Armurerie Verminkin - Armures et objets",
    skillSections: ["Machinations magistrales", "Coureurs de tunnels"],
    loreSections: ["Domaine des Tunnels profonds", "Domaine des Véroles"],
    naturalWeaponsInMeleeTable: true,
  },
  "death-covens": {
    file: "08_death-covens.md",
    names: "Noms des Death Coven",
    armouryStart: "## Armurerie du Coven (*Coven Armoury*)",
    melee: "Armurerie du Coven - Armes de corps à corps",
    ranged: null,
    armourItems: "Armurerie du Coven - Armures et objets",
    skillSections: ["Sombre aristocratie", "Seigneurs immortels"],
    loreSections: ["Domaine de la Nécromancie", "Domaine du Sang"],
    naturalWeaponsInMeleeTable: false,
  },
  "the-blighted-cloister": {
    file: "09_the-blighted-cloister.md",
    names: "Noms du Blighted Cloister",
    armouryStart: "## Armurerie du Cloître (*Cloister Armoury*)",
    melee: "Armurerie du Cloître - Armes de corps à corps",
    ranged: "Armurerie du Cloître - Armes à distance",
    armourItems: "Armurerie du Cloître - Armures et objets",
    skillSections: ["Ordonnés du Cloître", "Bénédictions de Sainte Pourriture"],
    loreSections: ["Domaine des Asticots bénis", "Domaine démoniaque de la Pourriture"],
    naturalWeaponsInMeleeTable: true,
  },
};

function compareFaction(dir: string, f: FactionData, c: CommonData): void {
  const layout = LAYOUTS[f.id];
  if (layout === undefined) {
    warn(`${f.id}: no Markdown layout, comparison skipped`);
    return;
  }
  const path = join(dir, layout.file);
  if (!existsSync(path)) {
    warn(`${layout.file} not found in ${dir}`);
    return;
  }
  console.log(`  -- ${f.id} (${layout.file})`);
  const md = readFileSync(path, "utf8").split("\n");
  const byEn = new Map(f.wargear.map((w) => [w.name.en.toLowerCase(), w]));
  const byFr = new Map(f.wargear.map((w) => [w.name.fr.toLowerCase(), w]));
  const findWargear = (cell: string): Wargear | undefined => {
    const t = splitTerm(cell);
    return (t.en !== null ? byEn.get(t.en.toLowerCase()) : undefined) ?? byFr.get(t.fr.toLowerCase());
  };
  const cost = (cell: string): number => Number(cell.replace(/[^0-9]/g, ""));

  // Origins and strongholds
  compareSets(
    "Origins (FR names)",
    headings(section(md, 2, "Origines"), 3).map((h) => splitTerm(h).fr),
    f.origins.map((o) => o.name.fr),
  );
  compareSets(
    "Strongholds (FR names)",
    headings(section(md, 2, "Repaires"), 3).map((h) => splitTerm(h).fr),
    f.strongholds.map((s) => s.name.fr),
  );

  // D66 names
  const d66: string[] = [];
  for (const row of tableRows(section(md, 3, layout.names))) {
    if (!/^\d0$/.test(row[0] ?? "")) continue;
    row.slice(1).forEach((name, col) => d66.push(`${(row[0] ?? "")[0]}${col + 1}=${name}`));
  }
  compareSets(
    "D66 name table",
    d66,
    Object.entries(f.nameTable.entries).map(([k, v]) => `${k}=${v}`),
  );

  // Fighter list and scrolls
  const listRows = tableRows(section(md, 2, "Liste des combattants"))
    .filter((r) => r[0] !== "Combattant")
    .map((r) => `${fighterKey(r[0] ?? "")}=${cost(r[1] ?? "")}`);
  // Alternate forms (Lycanfell Beast) have no entry in the list and no starting experience.
  const recruitable = f.fighters.filter((x) => x.formOf === null);
  compareSets(
    "Fighters list (name=cost)",
    listRows,
    recruitable.map((x) => `${fighterKey(x.name.en)}=${x.cost}`),
  );

  // The scrolls chapter holds several "##" sub-headings, so it is cut by hand.
  const scrollStart = md.findIndex((l) => l.startsWith("## Parchemins de combattants"));
  const scrollEnd = md.findIndex((l) => l.startsWith("## Ajouts au glossaire"));
  const scrollLines = md.slice(scrollStart + 1, scrollEnd);
  const scrollNames = headings(scrollLines, 3);
  compareSets(
    "Fighter scrolls (name, 0-x limit)",
    scrollNames.map((n) => n.replace(/^0-(\d+) (.*)$/, "$2 [0-$1]")),
    f.fighters.map((x) => (x.limit === null ? x.name.en : `${x.name.en} [0-${x.limit}]`)),
  );
  const statRows: string[] = [];
  for (let i = 0; i < scrollLines.length; i += 1) {
    const line = scrollLines[i] ?? "";
    if (!line.startsWith("### ")) continue;
    const name = line.slice(4).replace(/^0-\d+ /, "");
    const rows = tableRows(scrollLines.slice(i, i + 8)).filter((r) => r[0] !== "Mouvement");
    const s = rows[0];
    if (s) statRows.push(`${name}: ${s.join(" ")}`);
  }
  const fmt = (n: number | null, plus: boolean): string => (n === null ? "-" : plus ? `${n}+` : String(n));
  compareSets(
    "Fighter profiles (7 characteristics)",
    statRows,
    f.fighters.map(
      (x) =>
        `${x.name.en}: ${frValue(x.stats.mv)}" ${fmt(x.stats.bl, true)} ${fmt(x.stats.bw, true)} ${fmt(x.stats.ar, true)} ${x.stats.in} ${x.stats.wl} ${x.stats.lf}`,
    ),
  );
  const xpRows = scrollLines
    .filter((l) => l.startsWith("**Expérience de départ :**"))
    .map((l) => l.replace("**Expérience de départ :**", "").trim().replace(/\.$/, "").toUpperCase());
  compareSets(
    "Starting experience (in scroll order)",
    xpRows.map((v, i) => `${i + 1}:${v}`),
    recruitable.map((x, i) => {
      const e = x.startingExperience;
      const v =
        e.dice === null
          ? String(e.base)
          : e.base === 0
            ? e.dice.toUpperCase()
            : `${e.base}+${e.dice.toUpperCase()}`;
      return `${i + 1}:${v}`;
    }),
  );

  // Armoury lists
  const armoury = md.slice(
    md.findIndex((l) => l.startsWith(layout.armouryStart)),
    md.findIndex((l) => l.startsWith(`## ${layout.melee}`)),
  );
  for (const list of f.armouryLists) {
    const rows = tableRows(section(armoury, 3, list.name.fr))
      .filter((r) => r[0] !== "Nom")
      .map((r) => {
        const w = findWargear(r[0] ?? "");
        return `${w?.id ?? "?" + (r[0] ?? "")}=${cost(r[1] ?? "")}`;
      });
    compareSets(
      `List "${list.name.fr}" (item=price)`,
      rows,
      list.entries.map((e) => `${e.wargearId}=${e.cost}`),
    );
  }

  // Weapon profiles
  const melee = tableRows(section(md, 2, layout.melee)).filter((r) => r.length === 7 && r[0] !== "Nom");
  compareSets(
    "Melee weapon profiles",
    melee.map(
      (r) =>
        `${findWargear(r[0] ?? "")?.id ?? "?" + (r[0] ?? "")}: ${r.slice(1, 5).join(" ")} | ${stripTerms(r[5] ?? "")} | ${cost(r[6] ?? "")}`,
    ),
    f.wargear
      .filter((w) => w.kind === "melee" && (w.purchasable || layout.naturalWeaponsInMeleeTable) && w.profile)
      .map((w) => {
        const p = w.profile as AttackProfile;
        return `${w.id}: ${frValue(p.attacks)} ${frRend(p.rend)} ${frValue(p.damage)} ${frValue(p.critDamage)} | ${frTraits(w, c)} | ${w.cost}`;
      }),
  );
  const ranged =
    layout.ranged === null
      ? []
      : tableRows(section(md, 2, layout.ranged)).filter((r) => r.length === 8 && r[0] !== "Nom");
  compareSets(
    "Ranged weapon profiles",
    ranged.map(
      (r) =>
        `${findWargear(r[0] ?? "")?.id ?? "?" + (r[0] ?? "")}: ${stripTerms(r[1] ?? "")} ${r.slice(2, 6).join(" ")} | ${stripTerms(r[6] ?? "")} | ${cost(r[7] ?? "")}`,
    ),
    f.wargear
      .filter((w) => w.kind === "ranged" && w.profile)
      .map((w) => {
        const p = w.profile as AttackProfile;
        return `${w.id}: ${frRange(p)} ${frValue(p.attacks)} ${frRend(p.rend)} ${frValue(p.damage)} ${frValue(p.critDamage)} | ${frTraits(w, c)} | ${w.cost}`;
      }),
  );

  // Armour and items
  const ai = headings(section(md, 2, layout.armourItems), 3).filter((h) => !h.startsWith("Objets tenus"));
  compareSets(
    "Armour and items (item=price)",
    ai.map((h) => {
      const [namePart, pricePart] = h.split(" - ");
      return `${findWargear(namePart ?? "")?.id ?? "?" + h}=${cost(pricePart ?? "")}`;
    }),
    f.wargear.filter((w) => w.kind === "armour" || w.kind === "item").map((w) => `${w.id}=${w.cost}`),
  );

  // Skills and spells
  compareSets(
    "Faction skills (FR names)",
    layout.skillSections.flatMap((s) => headings(section(md, 2, s), 3)).map((h) => splitTerm(h).fr),
    f.skillTables.flatMap((t) => t.skills.map((s) => s.name.fr)),
  );
  compareSets(
    "Spells (roll - FR name)",
    layout.loreSections.flatMap((s) => headings(section(md, 2, s), 3)).map((h) => splitTerm(h).fr),
    f.spellLores.flatMap((l) => l.spells.map((s) => `${s.roll} - ${s.name.fr}`)),
  );
}

function compareCommon(dir: string, c: CommonData): void {
  const general = join(dir, "05_bandes-regles-generales.md");
  if (existsSync(general)) {
    const md = readFileSync(general, "utf8").split("\n");
    const veteran = c.skillTables.find((t) => t.id === "veteran-skills");
    compareSets(
      "Veteran skills (FR names)",
      headings(section(md, 2, "Compétences de vétéran"), 3).map((h) => splitTerm(h).fr),
      veteran?.skills.map((s) => s.name.fr) ?? [],
    );
  } else warn(`05_bandes-regles-generales.md not found in ${dir}`);

  const reminder = join(dir, "10_aide-de-jeu.md");
  if (existsSync(reminder)) {
    const md = readFileSync(reminder, "utf8").split("\n");
    const start = md.findIndex((l) => l.startsWith("**Rappels des traits d'armes"));
    const rows = tableRows(md.slice(start, start + 26)).filter((r) => r[0] !== "Trait");
    compareSets(
      "Weapon traits (FR name: FR reminder)",
      rows.map((r) => `${splitTerm(r[0] ?? "").fr}: ${r[1] ?? ""}`),
      c.weaponTraits.map((t) => `${t.name.fr}: ${t.reminder.fr}`),
    );
  } else warn(`10_aide-de-jeu.md not found in ${dir}`);
}

/** Every `md` reference ("<file> > <heading>") of a data file. */
function mdRefs(value: unknown, out: string[]): string[] {
  if (Array.isArray(value)) for (const v of value) mdRefs(v, out);
  else if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o["md"] === "string" && typeof o["page"] === "number") out.push(o["md"]);
    for (const v of Object.values(o)) mdRefs(v, out);
  }
  return out;
}

/** Checks that each reference names an existing file and heading. */
function checkMdRefs(dir: string, label: string, value: unknown): void {
  const cache = new Map<string, Set<string>>();
  const missing = new Set<string>();
  const refs = mdRefs(value, []);
  for (const ref of refs) {
    const [file = "", heading = ""] = ref.split(" > ");
    if (!cache.has(file)) {
      const path = join(dir, file);
      const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
      cache.set(
        file,
        new Set(
          lines
            .filter((l) => /^#{1,6} /.test(l))
            .flatMap((l) => {
              const h = l.replace(/^#+ /, "").trim();
              const noPrice = h.replace(/ - (\d+ pa|D6|D3|2D6|D66)$/, "");
              return [h, noPrice, stripTerms(h), stripTerms(noPrice), stripTerms(h).replace(/^0-\d+ /, "")];
            }),
        ),
      );
    }
    if (!(cache.get(file)?.has(heading) ?? false)) missing.add(ref);
  }
  if (missing.size === 0) ok(`${label}: ${refs.length} source references point to existing headings`);
  for (const m of missing) fail(`${label}: no heading for source reference "${m}"`);
}

title("Comparison with the Markdown sources");
const dir = sourcesDir();
if (dir === null) {
  warn("No --sources folder given (or BDC_SOURCES unset): Markdown comparison skipped");
} else {
  console.log(`  Sources: ${dir}`);
  checkMdRefs(dir, "common", common);
  for (const f of factions) checkMdRefs(dir, f.id, f);
  compareCommon(dir, common);
  for (const f of factions) compareFaction(dir, f, common);
}

/* ------------------------------------------------------------------------- */
/* 4. Totals                                                                 */
/* ------------------------------------------------------------------------- */

title("Totals");
console.log(
  `  common: ${common.keywords.length} keywords, ${common.weaponTraits.length} weapon traits, ` +
    `${common.conditions.length} conditions, ${common.skillTables.flatMap((t) => t.skills).length} veteran skills`,
);
for (const f of factions) {
  const count = (k: Wargear["kind"]): number => f.wargear.filter((w) => w.kind === k).length;
  console.log(
    `  ${f.id}: ${f.origins.length} origins, ${f.strongholds.length} strongholds, ${f.fighters.length} fighters, ` +
      `${count("melee")} melee, ${count("ranged")} ranged, ${count("armour")} armour, ${count("item")} items, ` +
      `${f.armouryLists.length} armoury lists, ${f.skillTables.flatMap((t) => t.skills).length} skills, ` +
      `${f.spellLores.flatMap((l) => l.spells).length} spells, ${Object.keys(f.nameTable.entries).length} names`,
  );
}

console.log(`\nResult: ${errorCount} error(s), ${warningCount} warning(s)`);
process.exit(errorCount > 0 ? 1 : 0);
