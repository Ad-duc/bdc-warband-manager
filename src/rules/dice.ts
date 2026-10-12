/*
 * File:        src/rules/dice.ts
 * Role:        Dice helpers: injectable random source, D3/D6/D66 rolls, the
 *              starting experience roll (simulated or entered by hand), whose
 *              detail is kept in the warband document, and the direction dice
 *              used to scatter (free direction and the distances of the rules).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { FighterProfile, LocalizedText } from "../data/schema.ts";

/** Returns a number in [0, 1). Math.random by default, seeded in tests. */
export type RandomSource = () => number;

export interface ExperienceRoll {
  base: number;
  dice: "d3" | "d6" | null;
  results: number[];
  total: number;
  mode: "rolled" | "manual";
}

export function rollD6(random: RandomSource = Math.random): number {
  return Math.floor(random() * 6) + 1;
}

/** A D3 is a D6 halved and rounded up (1-2 = 1, 3-4 = 2, 5-6 = 3). */
export function d6ToD3(d6: number): number {
  return Math.ceil(d6 / 2);
}

/** D66: tens then units, eg. "35". */
export function rollD66(random: RandomSource = Math.random): string {
  return `${rollD6(random)}${rollD6(random)}`;
}

/** Simulated roll of a profile's starting experience (eg. 60+D6). */
export function rollStartingExperience(
  profile: FighterProfile,
  random: RandomSource = Math.random,
): ExperienceRoll {
  const { base, dice } = profile.startingExperience;
  if (dice === null) return { base, dice, results: [], total: base, mode: "rolled" };
  const d6 = rollD6(random);
  const value = dice === "d3" ? d6ToD3(d6) : d6;
  return { base, dice, results: [value], total: base + value, mode: "rolled" };
}

/**
 * Records a roll made with real dice. `dieResult` is the value read on the die
 * (1 to 6 for a D6, 1 to 3 for a D3). Throws when out of range.
 */
export function manualStartingExperience(profile: FighterProfile, dieResult: number | null): ExperienceRoll {
  const { base, dice } = profile.startingExperience;
  if (dice === null) return { base, dice, results: [], total: base, mode: "manual" };
  const max = dice === "d3" ? 3 : 6;
  if (dieResult === null || !Number.isInteger(dieResult) || dieResult < 1 || dieResult > max)
    throw new RangeError(`Die result must be an integer from 1 to ${max}`);
  return { base, dice, results: [dieResult], total: base + dieResult, mode: "manual" };
}

/** Epithet from the faction D66 table (Blighted Cloister), or undefined without a table. */
export function randomEpithet(
  entries: Record<string, LocalizedText> | undefined,
  random: RandomSource = Math.random,
): LocalizedText | undefined {
  return entries === undefined ? undefined : entries[rollD66(random)];
}

/** Name from the faction D66 table. */
export function randomName(entries: Record<string, string>, random: RandomSource = Math.random): string {
  return entries[rollD66(random)] ?? "";
}

/**
 * Scatter distances found in the rules: direction only, D6" (Scare trait,
 * most template spells, drunk Hit), D6x2" (missed blast template) and 3D6"
 * (treasure token placed from the centre).
 */
export const SCATTER_DISTANCES = ["none", "d6", "d6x2", "3d6"] as const;
export type ScatterDistance = (typeof SCATTER_DISTANCES)[number];

export interface ScatterRoll {
  /** Direction in whole degrees, 0 = top of the screen, clockwise, 0 to 359. */
  angle: number;
  distance: ScatterDistance;
  /** D6 results read for the distance (empty for direction only). */
  dice: number[];
  /** Distance in inches, or null for direction only. */
  inches: number | null;
}

/** Direction dice roll (any direction, as a dice with arrows) and its distance. */
export function rollScatter(distance: ScatterDistance, random: RandomSource = Math.random): ScatterRoll {
  const angle = Math.floor(random() * 360);
  const count = distance === "3d6" ? 3 : distance === "none" ? 0 : 1;
  const dice = Array.from({ length: count }, () => rollD6(random));
  const sum = dice.reduce((a, b) => a + b, 0);
  const inches = distance === "none" ? null : distance === "d6x2" ? sum * 2 : sum;
  return { angle, distance, dice, inches };
}
