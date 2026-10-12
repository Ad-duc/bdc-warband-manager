/*
 * File:        src/rules/lookup.ts
 * Role:        Indexes of one faction (fighters, wargear, list prices, skills,
 *              spells) built once and reused by the validators and calculators.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type {
  Category,
  CommonData,
  FactionData,
  FighterProfile,
  Skill,
  SkillTable,
  Spell,
  Wargear,
  WarbandFighter,
} from "../data/schema.ts";
import type { RulesData } from "./types.ts";

export interface FactionIndex {
  common: CommonData;
  faction: FactionData;
  fighters: Map<string, FighterProfile>;
  wargear: Map<string, Wargear>;
  /** Wargear id > list id > price. */
  listPrices: Map<string, Map<string, number>>;
  skills: Map<string, { skill: Skill; table: SkillTable }>;
  spells: Map<string, { spell: Spell; loreId: string }>;
}

const cache = new WeakMap<FactionData, FactionIndex>();

export function findFaction(data: RulesData, factionId: string): FactionData | undefined {
  return data.factions.find((f) => f.id === factionId);
}

export function indexFaction(common: CommonData, faction: FactionData): FactionIndex {
  const cached = cache.get(faction);
  if (cached !== undefined && cached.common === common) return cached;

  const listPrices = new Map<string, Map<string, number>>();
  for (const list of faction.armouryLists) {
    for (const entry of list.entries) {
      const byList = listPrices.get(entry.wargearId) ?? new Map<string, number>();
      byList.set(list.id, entry.cost);
      listPrices.set(entry.wargearId, byList);
    }
  }

  const skills = new Map<string, { skill: Skill; table: SkillTable }>();
  for (const table of [...common.skillTables, ...faction.skillTables])
    for (const skill of table.skills) skills.set(skill.id, { skill, table });

  const spells = new Map<string, { spell: Spell; loreId: string }>();
  for (const lore of faction.spellLores)
    for (const spell of lore.spells) spells.set(spell.id, { spell, loreId: lore.id });

  const index: FactionIndex = {
    common,
    faction,
    fighters: new Map(faction.fighters.map((f) => [f.id, f])),
    wargear: new Map(faction.wargear.map((w) => [w.id, w])),
    listPrices,
    skills,
    spells,
  };
  cache.set(faction, index);
  return index;
}

/** Category used for the composition limits: a promoted champion counts as the leader. */
export function effectiveCategory(fighter: WarbandFighter, profile: FighterProfile): Category {
  return fighter.promotedToLeader ? "leader" : profile.category;
}

export function hasTrait(wargear: Wargear, key: string): boolean {
  return wargear.traits.some((t) => t.key === key);
}

export function isHeldItem(wargear: Wargear): boolean {
  return wargear.kind === "item" && wargear.itemKeywords.includes("held-item");
}
