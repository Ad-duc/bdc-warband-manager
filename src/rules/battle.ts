/*
 * File:        src/rules/battle.ts
 * Role:        Rules of the battle set-up (Chapter 2 "Setting Up the Battle"
 *              and Chapter 3): the underdog, the split of a warband into battle
 *              groups as equal as possible, and the spells a Wizard or Priest
 *              prepares before the battle (1 random spell of each known lore,
 *              signature spells always prepared, a roll on a signature spell
 *              has no effect and is not re-rolled).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import type { Spell, WarbandFighter } from "../data/schema.ts";
import { rollD6, type RandomSource } from "./dice.ts";
import type { FactionIndex } from "./lookup.ts";

export type Side = "a" | "b";

/** The warband with the lower rating is the underdog; a tie is settled by a roll-off. */
export function underdog(ratingA: number, ratingB: number): Side | "tie" {
  if (ratingA === ratingB) return "tie";
  return ratingA < ratingB ? "a" : "b";
}

/**
 * Sizes of the battle groups, as equal as possible, smallest first:
 * 10 fighters in 3 groups -> [3, 3, 4].
 */
export function battleGroupSizes(fighters: number, groups: number): number[] {
  if (groups <= 0 || fighters < 0) return [];
  const base = Math.floor(fighters / groups);
  const extra = fighters % groups;
  return Array.from({ length: groups }, (_, i) => (i < groups - extra ? base : base + 1));
}

export interface PreparedRoll {
  loreId: string;
  roll: number;
  spell: Spell | undefined;
  /** The roll gave a signature spell: no effect, not re-rolled. */
  noEffect: boolean;
}

export interface PreparedSpells {
  signature: Spell[];
  rolls: PreparedRoll[];
}

/** Prepared spells of a fighter; an empty result for a fighter who knows no lore. */
export function prepareSpells(
  index: FactionIndex,
  fighter: WarbandFighter,
  random: RandomSource = Math.random,
): PreparedSpells {
  const profile = index.fighters.get(fighter.profileId);
  const signature = fighter.spellIds
    .map((id) => index.spells.get(id)?.spell)
    .filter((s): s is Spell => s !== undefined);
  const loreIds: string[] = profile?.knownSpellLoreIds ?? [];
  const rolls = loreIds.map((loreId): PreparedRoll => {
    const lore = index.faction.spellLores.find((l) => l.id === loreId);
    const roll = rollD6(random);
    const spell = lore?.spells.find((s) => s.roll === roll);
    return { loreId, roll, spell, noEffect: spell !== undefined && fighter.spellIds.includes(spell.id) };
  });
  return { signature, rolls };
}

/** Active fighters who know at least one spell lore (the casters of the warband). */
export function casters(index: FactionIndex, fighters: WarbandFighter[]): WarbandFighter[] {
  return fighters.filter(
    (f) => f.status === "active" && (index.fighters.get(f.profileId)?.knownSpellLoreIds.length ?? 0) > 0,
  );
}
