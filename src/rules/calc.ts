/*
 * File:        src/rules/calc.ts
 * Role:        Calculations: wargear and fighter costs, silver spent and left,
 *              warband rating (p. 48), effective characteristics with injury
 *              and advancement modifiers, weapon lines for the roster and
 *              campaign counter totals from the battle log.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type {
  AttackProfile,
  BattleLogEntry,
  FighterOption,
  FighterProfile,
  StatKey,
  Stats,
  Wargear,
  Warband,
  WarbandFighter,
} from "../data/schema.ts";
import { STAT_KEYS } from "../data/constants.ts";
import { hasTrait, isHeldItem, type FactionIndex } from "./lookup.ts";

/* ------------------------------------------------------------------------- */
/* Costs                                                                     */
/* ------------------------------------------------------------------------- */

/**
 * Price paid for one piece of wargear by this profile: the cheapest price among
 * the profile's lists that sell it, else the reference price. Fixed wargear
 * (eg. Vicious Bite) is free.
 */
export function wargearPrice(index: FactionIndex, profile: FighterProfile, wargearId: string): number {
  if (profile.fixedWargearIds.includes(wargearId)) return 0;
  const byList = index.listPrices.get(wargearId);
  const prices = profile.allowedWargearLists
    .map((listId) => byList?.get(listId))
    .filter((p): p is number => p !== undefined);
  if (prices.length > 0) return Math.min(...prices);
  return index.wargear.get(wargearId)?.cost ?? 0;
}

export function fighterWargearCost(index: FactionIndex, fighter: WarbandFighter): number {
  const profile = index.fighters.get(fighter.profileId);
  if (profile === undefined) return 0;
  return fighter.wargearIds.reduce((sum, id) => sum + wargearPrice(index, profile, id), 0);
}

/** Options of the profile picked for this fighter (Misbegotten mutations); unknown ids are skipped. */
export function fighterOptions(index: FactionIndex, fighter: WarbandFighter): FighterOption[] {
  const choices = index.fighters.get(fighter.profileId)?.options?.choices ?? [];
  return fighter.optionIds
    .map((id) => choices.find((c) => c.id === id))
    .filter((o): o is FighterOption => o !== undefined);
}

function optionsCost(index: FactionIndex, fighter: WarbandFighter): number {
  return fighterOptions(index, fighter).reduce((s, o) => s + o.cost, 0);
}

/** Value of a fighter for the warband rating: profile cost + options + wargear (assumption A11). */
export function fighterValue(index: FactionIndex, fighter: WarbandFighter): number {
  const profile = index.fighters.get(fighter.profileId);
  return (profile?.cost ?? 0) + optionsCost(index, fighter) + fighterWargearCost(index, fighter);
}

/** Silver actually spent on a fighter: price paid (Eager to Prove: 0) + options + wargear. */
export function fighterSpent(index: FactionIndex, fighter: WarbandFighter): number {
  const profile = index.fighters.get(fighter.profileId);
  const recruit = fighter.recruitCostPaid ?? profile?.cost ?? 0;
  return recruit + optionsCost(index, fighter) + fighterWargearCost(index, fighter);
}

/** Keywords of the profile plus those granted by its options (Bat Wings: Fly). */
export function fighterKeywords(index: FactionIndex, fighter: WarbandFighter): string[] {
  const base = index.fighters.get(fighter.profileId)?.keywords ?? [];
  const extra = fighterOptions(index, fighter).flatMap((o) => o.addKeywords);
  return [...new Set([...base, ...extra])];
}

export function activeFighters(warband: Warband): WarbandFighter[] {
  return warband.fighters.filter((f) => f.status === "active");
}

export interface Budget {
  starting: number;
  spent: number;
  remaining: number;
}

/** Recruitment budget: 1000 silver minus what the active fighters cost. */
export function recruitmentBudget(index: FactionIndex, warband: Warband): Budget {
  const starting = index.common.recruitment.startingSilver;
  const spent = activeFighters(warband).reduce((s, f) => s + fighterSpent(index, f), 0);
  return { starting, spent, remaining: starting - spent };
}

export interface Rating {
  cost: number;
  experience: number;
  total: number;
}

/** Warband rating = cost of every fighter and wargear + total experience; stash excluded (p. 48). */
export function warbandRating(index: FactionIndex, warband: Warband): Rating {
  const fighters = activeFighters(warband);
  const cost = fighters.reduce((s, f) => s + fighterValue(index, f), 0);
  const experience = fighters.reduce((s, f) => s + f.experience, 0);
  return { cost, experience, total: cost + experience };
}

/* ------------------------------------------------------------------------- */
/* Characteristics                                                           */
/* ------------------------------------------------------------------------- */

/** Sum of every modifier: advancements plus each injury. */
export function totalModifiers(fighter: WarbandFighter): Record<StatKey, number> {
  const total: Record<StatKey, number> = { mv: 0, bl: 0, bw: 0, ar: 0, in: 0, wl: 0, lf: 0 };
  for (const delta of [fighter.statModifiers, ...fighter.injuries.map((i) => i.statModifiers)])
    for (const key of STAT_KEYS) total[key] += delta[key] ?? 0;
  return total;
}

/**
 * Adds a flat modifier to a dice expression: ("2d6", -1) gives "2d6-1",
 * ("2d6+1", -1) gives "2d6". Used for a Move value rolled for each move.
 */
export function addToDice(expr: string, delta: number): string {
  const m = /^(\d*d\d+)([+-]\d+)?$/.exec(expr);
  if (m === null || delta === 0) return expr;
  // Group 1 always matches; group 2 is the optional "+n" / "-n".
  const dice = m[1] as string;
  const total = Number(m[2] ?? 0) + delta;
  if (total === 0) return dice;
  return `${dice}${total > 0 ? "+" : ""}${total}`;
}

/**
 * Characteristics after wargear and modifiers.
 * - Armour: worn armour replaces the value, then improvements (Shield) apply.
 * - Bl, Bw, Ar are target numbers: a delta of -1 improves them (4+ becomes 3+).
 *   They stay between 2+ and 6+; above 6+ they become "-" (null), p. 11.
 * - Wargear can change characteristics (Heavy Plating: Move -1).
 * - Mv, In, Wl never go below 0, Lf never below 1. A dice Move (2d6") keeps
 *   its dice and carries the modifier ("2d6-1").
 */
export function effectiveStats(index: FactionIndex, fighter: WarbandFighter): Stats | null {
  const profile = index.fighters.get(fighter.profileId);
  if (profile === undefined) return null;
  const gear = fighter.wargearIds
    .map((id) => index.wargear.get(id))
    .filter((w): w is Wargear => w !== undefined);
  const mods = totalModifiers(fighter);
  // Options replace characteristics before any modifier (Wulfen Legs: Move 7").
  const base: Stats = { ...profile.stats };
  for (const o of fighterOptions(index, fighter)) {
    if (o.statSet.mv !== undefined) base.mv = o.statSet.mv;
    if (o.statSet.lf !== undefined) base.lf = o.statSet.lf;
  }
  for (const w of gear) for (const key of STAT_KEYS) mods[key] += w.statModifiers[key] ?? 0;

  let armour = base.ar;
  const worn = gear.find((w) => w.kind === "armour");
  if (worn !== undefined) armour = worn.armourValue;
  const improvement = gear.reduce((s, w) => s + w.armourImprovement, 0);

  const target = (value: number | null, delta: number): number | null => {
    if (value === null && delta >= 0) return null;
    const v = (value ?? 7) + delta;
    if (v > 6) return null;
    return Math.max(2, v);
  };

  const stats: Stats = {
    mv: typeof base.mv === "number" ? Math.max(0, base.mv + mods.mv) : addToDice(base.mv, mods.mv),
    bl: target(base.bl, mods.bl),
    bw: target(base.bw, mods.bw),
    ar: target(armour, mods.ar - improvement),
    in: Math.max(0, base.in + mods.in),
    wl: Math.max(0, base.wl + mods.wl),
    lf: Math.max(1, base.lf + mods.lf),
  };
  return stats;
}

/* ------------------------------------------------------------------------- */
/* Weapon lines                                                              */
/* ------------------------------------------------------------------------- */

export interface WeaponLine {
  /** Wargear id, or "unarmed-strike". */
  id: string;
  kind: "melee" | "ranged";
  profile: AttackProfile;
  /** True when the Attacks value was reduced (two-handed melee weapon with a held item, p. 60). */
  attacksReduced: boolean;
}

/** Lines of the roster weapon table, in wargear order, with improvements applied. */
export function weaponLines(index: FactionIndex, fighter: WarbandFighter): WeaponLine[] {
  const gear = fighter.wargearIds
    .map((id) => index.wargear.get(id))
    .filter((w): w is Wargear => w !== undefined);
  const holdsItem = gear.some(isHeldItem);
  const lines: WeaponLine[] = [];

  for (const w of gear) {
    if ((w.kind === "melee" || w.kind === "ranged") && w.profile !== null) {
      const base = w.profile.attacks;
      const reduce = w.kind === "melee" && holdsItem && hasTrait(w, "two-handed") && typeof base === "number";
      const profile: AttackProfile = { ...w.profile, traits: w.traits };
      if (reduce) profile.attacks = base - 1;
      // Rend improvements from other wargear (Wheel-Spikes on Crushing Bulk).
      for (const other of gear)
        for (const imp of other.weaponImprovements)
          if (imp.wargearIds.includes(w.id)) profile.rend -= imp.rend;
      lines.push({ id: w.id, kind: w.kind, profile, attacksReduced: reduce });
    }
    if (w.grantsAttack !== null)
      lines.push({
        id: w.id,
        kind: w.grantsAttack.range === undefined ? "melee" : "ranged",
        profile: w.grantsAttack,
        attacksReduced: false,
      });
  }

  if (!gear.some((w) => w.kind === "melee"))
    lines.unshift({
      id: "unarmed-strike",
      kind: "melee",
      profile: index.common.unarmedStrike.profile,
      attacksReduced: false,
    });
  return lines;
}

/* ------------------------------------------------------------------------- */
/* Campaign counters                                                         */
/* ------------------------------------------------------------------------- */

export interface CounterTotals {
  battlesFought: number;
  victories: number;
  holdingsRansacked: number;
  fightersLost: number;
  silver: number;
  leechJars: number;
}

/** Totals derived from the battle log, to compare with or fill the roster counters. */
export function battleLogTotals(log: BattleLogEntry[]): CounterTotals {
  return log.reduce<CounterTotals>(
    (t, e) => ({
      battlesFought: t.battlesFought + 1,
      victories: t.victories + (e.result === "victory" ? 1 : 0),
      holdingsRansacked: t.holdingsRansacked + e.deltas.holdingsRansacked,
      fightersLost: t.fightersLost + e.deltas.fightersLost.length,
      silver: t.silver + e.deltas.silver,
      leechJars: t.leechJars + e.deltas.leechJars,
    }),
    { battlesFought: 0, victories: 0, holdingsRansacked: 0, fightersLost: 0, silver: 0, leechJars: 0 },
  );
}
