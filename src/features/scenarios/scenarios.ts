/*
 * File:        src/features/scenarios/scenarios.ts
 * Role:        Reads Chapter 3 "Scenarios" of the French translation
 *              (sources/fr/04_scenarios.md) into a structure the scenario
 *              pages can use: the scenario table, the shared rules (battle
 *              groups, reserve, treasure) and, for each scenario, its sections
 *              before / during the battle and for the campaign, its map legend,
 *              its twist table, the number of battle groups and the rounds the
 *              reinforcements arrive. The text stays the translation's: nothing
 *              is rewritten, the sections are only cut out.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT (code). The rules text belongs to its author, see README.
 */

import chapter from "../../../sources/fr/04_scenarios.md?raw";
import { plainHeading } from "../reader/markdown.ts";

export type Phase = "before" | "during" | "campaign";

export interface Section {
  title: string;
  markdown: string;
}

export interface Twist {
  roll: number;
  title: string;
  markdown: string;
}

export interface Scenario {
  /** Scenario number, also its result on the scenario table (1 to 6). */
  number: number;
  /** French title without the original term, eg. "Une rencontre mortelle". */
  title: string;
  /** Original title, eg. "A Deadly Encounter". */
  originalTitle: string;
  intro: string;
  phases: Record<Phase, Section[]>;
  /** Description and legend of the battlefield map of the book. */
  map: string;
  /** Die of the twist table ("1D6" or "1D3"). */
  twistDie: string;
  twists: Twist[];
  /** Battle groups of each warband when the scenario gives one number for both. */
  battleGroups: number | null;
  /** Rounds from which reinforcements arrive (two values when the sides differ). */
  reinforcementRounds: number[];
}

export interface ScenarioChapter {
  title: string;
  intro: string;
  /** Scenario table: roll -> scenario number. */
  table: { roll: number; label: string }[];
  /** Rules shared by the scenarios: battle groups, reserve, treasure. */
  shared: Section[];
  scenarios: Scenario[];
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
const PHASES: [Phase, RegExp][] = [
  ["before", /^Avant la bataille/],
  ["during", /^Pendant la bataille/],
  ["campaign", /^Campagne/],
];
/** Translator sections that are not rules. */
const EXTRA = /^(Ajouts au glossaire|Notes du traducteur)/;

interface Block {
  level: number;
  heading: string;
  lines: string[];
}

/** Cuts the Markdown into blocks, one per heading, keeping the text under each. */
function blocks(markdown: string): { preamble: string[]; list: Block[] } {
  const list: Block[] = [];
  const preamble: string[] = [];
  for (const line of markdown.split("\n")) {
    const m = /^(#{1,6}) (.*)$/.exec(line);
    if (m !== null) list.push({ level: (m[1] ?? "").length, heading: (m[2] ?? "").trim(), lines: [] });
    else (list.at(-1)?.lines ?? preamble).push(line);
  }
  return { preamble, list };
}

const text = (lines: string[]): string => lines.join("\n").trim();

/** "Scénario I - Une rencontre mortelle (*Scenario I - A Deadly Encounter*)" */
function parseTitle(heading: string): { number: number; title: string; originalTitle: string } | null {
  const m = /^Scénario ([IVX]+) - (.*?)\s*\(\*Scenario [IVX]+ - (.*?)\*\)\s*$/.exec(heading);
  if (m === null) return null;
  return { number: ROMAN[m[1] ?? ""] ?? 0, title: (m[2] ?? "").trim(), originalTitle: (m[3] ?? "").trim() };
}

/** Moves the "[Schéma : ...]" paragraph and its legend list out of the section text. */
function splitMap(markdown: string): { rest: string; map: string } {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.startsWith("[Schéma"));
  if (start < 0) return { rest: markdown, map: "" };
  let end = start + 1;
  while (end < lines.length && ((lines[end] ?? "").startsWith("- ") || (lines[end] ?? "").trim() === ""))
    end += 1;
  return {
    rest: text([...lines.slice(0, start), ...lines.slice(end)]),
    map: text(lines.slice(start, end)),
  };
}

export function parseScenarios(markdown: string): ScenarioChapter {
  const { preamble, list } = blocks(markdown);
  const top = list[0];
  const result: ScenarioChapter = {
    title: top === undefined ? "" : plainHeading(top.heading),
    intro: text(top?.lines ?? preamble),
    table: [],
    shared: [],
    scenarios: [],
  };

  let scenario: Scenario | null = null;
  let phase: Phase | null = null;
  let inTwists = false;
  let shared: Section | null = null;

  for (const block of list.slice(1)) {
    if (block.level === 2) {
      shared = null;
      phase = null;
      inTwists = false;
      const title = parseTitle(block.heading);
      if (title !== null) {
        scenario = {
          ...title,
          intro: text(block.lines),
          phases: { before: [], during: [], campaign: [] },
          map: "",
          twistDie: "",
          twists: [],
          battleGroups: null,
          reinforcementRounds: [],
        };
        result.scenarios.push(scenario);
        continue;
      }
      scenario = null;
      if (EXTRA.test(block.heading)) continue;
      if (/^Déterminer le scénario/.test(block.heading)) {
        for (const line of block.lines) {
          const row = /^\|\s*(\d)\s*\|\s*(.*?)\s*\|$/.exec(line);
          if (row !== null) result.table.push({ roll: Number(row[1]), label: (row[2] ?? "").trim() });
        }
        continue;
      }
      shared = { title: plainHeading(block.heading), markdown: text(block.lines) };
      result.shared.push(shared);
      continue;
    }

    if (scenario === null) {
      // Sub-heading of a shared rule: kept inside its section.
      if (shared !== null)
        shared.markdown = text([
          shared.markdown,
          "",
          `${"#".repeat(block.level)} ${block.heading}`,
          ...block.lines,
        ]);
      continue;
    }

    if (block.level === 3) {
      const twistHeading = /^Rebondissements .*? - (\d*D\d+)\s*$/.exec(block.heading);
      if (twistHeading !== null) {
        inTwists = true;
        phase = null;
        scenario.twistDie = twistHeading[1] ?? "";
        continue;
      }
      inTwists = false;
      phase = PHASES.find(([, re]) => re.test(block.heading))?.[0] ?? null;
      continue;
    }

    if (inTwists) {
      const m = /^(\d+) - (.*)$/.exec(block.heading);
      if (m !== null)
        scenario.twists.push({
          roll: Number(m[1]),
          title: plainHeading(m[2] ?? ""),
          markdown: text(block.lines),
        });
      else {
        const last = scenario.twists.at(-1);
        if (last !== undefined)
          last.markdown = text([last.markdown, "", `**${plainHeading(block.heading)}**`, ...block.lines]);
      }
      continue;
    }

    if (phase !== null) {
      const { rest, map } = splitMap(text(block.lines));
      if (map !== "") scenario.map = map;
      scenario.phases[phase].push({ title: plainHeading(block.heading), markdown: rest });
    }
  }

  for (const s of result.scenarios) {
    const all = [...s.phases.before, ...s.phases.during].map((x) => x.markdown).join("\n");
    const groups = /Chaque bande \(\*warband\*\) est divisée en \*\*(\d+) groupes? de combat\*\*/.exec(all);
    s.battleGroups = groups === null ? null : Number(groups[1]);
    const reinforcements = s.phases.during.find((x) => x.title.startsWith("Arrivée des renforts"));
    s.reinforcementRounds = [...(reinforcements?.markdown ?? "").matchAll(/\*\*(\d+)e round\*\*/g)].map((m) =>
      Number(m[1]),
    );
  }
  return result;
}

let cached: ScenarioChapter | null = null;

/** Scenarios of the translation bundled with the app. */
export function scenarioChapter(): ScenarioChapter {
  cached ??= parseScenarios(chapter);
  return cached;
}

export function findScenario(number: number): Scenario | undefined {
  return scenarioChapter().scenarios.find((s) => s.number === number);
}

/** Largest result of a twist table: 6 for "1D6", 3 for "1D3". */
export function twistDieSides(scenario: Scenario): number {
  return Number(/D(\d+)$/.exec(scenario.twistDie)?.[1] ?? scenario.twists.length);
}
