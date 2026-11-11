/**
 * File:        src/rules/stronghold.ts
 * Role:        Stronghold level and income from the number of campaign battles (rules v1.10, p. 137)
 * Author:      Adrien Duclaud
 * Created:     2026-11-10
 * License:     MIT
 */

import type { CommonData } from "../data/schema.ts";

export type StrongholdLevel = CommonData["campaign"]["strongholdLevels"][number];

/**
 * Level reached by a stronghold after a number of campaign battles.
 * The table is read from common.json, sorted by its first battle count.
 */
export function strongholdLevel(common: CommonData, battlesFought: number): StrongholdLevel {
  const levels = [...common.campaign.strongholdLevels].sort((a, b) => a.fromBattles - b.fromBattles);
  let current = levels[0];
  if (current === undefined) throw new Error("common.json has no stronghold level");
  for (const level of levels) if (battlesFought >= level.fromBattles) current = level;
  return current;
}
