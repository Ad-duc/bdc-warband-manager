/*
 * File:        src/tutorial/model.ts
 * Role:        Pure helpers of the tutorial: result of an attack roll from the
 *              Blade value, fighters of a lesson resolved against the game data
 *              (profile, wargear with the short names of the lesson,
 *              characteristics after wargear), first step with dice, and
 *              splitting of the step texts into plain and bold runs. No React, so the lessons can be checked in unit tests.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import type { GameData } from "../data/index.ts";
import type { FighterProfile, LocalizedText, Stats, Wargear } from "../data/schema.ts";
import { effectiveStats } from "../rules/calc.ts";
import { findFaction, indexFaction } from "../rules/lookup.ts";
import { createFighter } from "../features/warbands/factory.ts";
import type { Lesson, LessonFighter } from "./schema.ts";

export type DieResult = "miss" | "hit" | "crit";

/** A natural 6 is a critical hit; a roll equal to or above the Blade value is a hit (p. 24). */
export function dieResult(value: number, blade: number | null): DieResult {
  if (value === 6) return "crit";
  if (blade !== null && value >= blade) return "hit";
  return "miss";
}

export interface ResolvedFighter {
  lesson: LessonFighter;
  profile: FighterProfile;
  name: LocalizedText;
  /** Characteristics with the wargear of the lesson (Shield and Cuirass included). */
  stats: Stats;
  wargear: Wargear[];
  weapons: Wargear[];
}

/** Every fighter of the lesson with its data, or the list of references that do not exist. */
export function resolveFighters(
  lesson: Lesson,
  data: GameData,
): { fighters: ResolvedFighter[]; problems: string[] } {
  const fighters: ResolvedFighter[] = [];
  const problems: string[] = [];
  for (const f of lesson.fighters) {
    const faction = findFaction(data, f.faction);
    if (faction === undefined) {
      problems.push(`${f.id}: unknown faction "${f.faction}"`);
      continue;
    }
    const index = indexFaction(data.common, faction);
    const profile = index.fighters.get(f.profile);
    if (profile === undefined) {
      problems.push(`${f.id}: unknown fighter "${f.profile}" in ${f.faction}`);
      continue;
    }
    const wargear: Wargear[] = [];
    for (const id of f.wargear) {
      const item = index.wargear.get(id);
      if (item === undefined) problems.push(`${f.id}: unknown wargear "${id}" in ${f.faction}`);
      else {
        // A lesson label replaces the French armoury name; the English name stays for the tooltip.
        const label = f.wargearLabels[id];
        wargear.push(label === undefined ? item : { ...item, name: { ...item.name, fr: label } });
      }
    }
    for (const id of Object.keys(f.wargearLabels))
      if (!f.wargear.includes(id)) problems.push(`${f.id}: label for wargear "${id}" not carried`);
    const instance = { ...createFighter(profile, () => 0), wargearIds: f.wargear };
    const stats = effectiveStats(index, instance) ?? profile.stats;
    fighters.push({
      lesson: f,
      profile,
      name: profile.name,
      stats,
      wargear,
      weapons: wargear.filter((w) => w.kind === "melee" || w.kind === "ranged"),
    });
  }
  return { fighters, problems };
}

/** 0-based index of the first step showing dice, or -1. */
export function firstDiceStep(lesson: Lesson): number {
  return lesson.steps.findIndex((s) => s.dice !== null);
}

/** Step number taken from the address (1-based), kept inside the lesson. */
export function clampStep(step: number | null, count: number): number {
  if (step === null || !Number.isFinite(step)) return 1;
  return Math.min(Math.max(1, Math.trunc(step)), count);
}

export interface TextRun {
  text: string;
  bold: boolean;
}

/** "a **b** c" -> plain "a ", bold "b", plain " c". */
export function textRuns(text: string): TextRun[] {
  return text
    .split("**")
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((run) => run.text !== "");
}
