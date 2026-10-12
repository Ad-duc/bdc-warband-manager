/*
 * File:        tests/unit/data.test.ts
 * Role:        The bundled game data loads, validates and resolves its
 *              references the same way the app does at start-up.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/index.ts";

describe("game data", () => {
  const data = loadGameData();

  it("loads common data from playtest 1.03", () => {
    expect(data.common.sourceVersion).toBe("playtest-1.03");
    expect(data.common.recruitment.startingSilver).toBe(1000);
  });

  it("loads the Guild Mercenaries faction", () => {
    const gm = data.factions.find((f) => f.id === "guild-mercenaries");
    expect(gm?.fighters).toHaveLength(13);
    expect(gm?.origins.map((o) => o.requiredLeaderId)).toEqual([
      "guild-captain",
      "noble",
      "witch-hunter",
      "high-wizard-of-the-guild",
    ]);
  });

  it("carries the v1.03 weapon changes", () => {
    const gm = data.factions.find((f) => f.id === "guild-mercenaries");
    const w = (id: string) => gm?.wargear.find((x) => x.id === id);
    // Blackpowder weapons deal 2 damage.
    expect(w("blackpowder-pistol")?.profile).toMatchObject({ damage: 2, critDamage: "d6+1" });
    // Blast weapons no longer score critical hits.
    expect(w("ogre-cannon")?.profile?.critDamage).toBeUndefined();
    // No ranged weapon has both Heavy and Reload, none is Unwieldy.
    for (const x of gm?.wargear.filter((y) => y.kind === "ranged") ?? []) {
      const keys = x.traits.map((t) => t.key);
      expect(keys.includes("heavy") && keys.includes("reload"), x.id).toBe(false);
      expect(keys.includes("unwieldy"), x.id).toBe(false);
    }
    // The Ogre List has its own Arbalest; the Grimoire is Rare 0-1.
    const ogre = gm?.armouryLists.find((l) => l.id === "ogre");
    expect(ogre?.entries.map((e) => e.wargearId)).toContain("ogre-arbalest");
    expect(w("grimoire")?.rarity).toBe(1);
  });
});
