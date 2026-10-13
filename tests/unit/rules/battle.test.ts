/*
 * File:        tests/unit/rules/battle.test.ts
 * Role:        Battle set-up rules: underdog, battle group sizes and the
 *              spells prepared by a caster before the battle.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  battleGroupSizes,
  casters,
  findFaction,
  indexFaction,
  prepareSpells,
  underdog,
} from "../../../src/rules/index.ts";
import { data, fighter, sequence } from "../../fixtures/warbands.ts";

const faction = findFaction(data, "guild-mercenaries");
if (faction === undefined) throw new Error("Guild Mercenaries data missing");
const index = indexFaction(data.common, faction);

describe("underdog", () => {
  it("is the warband with the lower rating, a tie needs a roll-off", () => {
    expect(underdog(900, 1000)).toBe("a");
    expect(underdog(1200, 1000)).toBe("b");
    expect(underdog(1000, 1000)).toBe("tie");
  });
});

describe("battleGroupSizes", () => {
  it("splits as equally as possible, smallest groups first", () => {
    expect(battleGroupSizes(10, 3)).toEqual([3, 3, 4]);
    expect(battleGroupSizes(8, 2)).toEqual([4, 4]);
    expect(battleGroupSizes(2, 3)).toEqual([0, 1, 1]);
  });

  it("returns nothing for no group", () => {
    expect(battleGroupSizes(5, 0)).toEqual([]);
    expect(battleGroupSizes(-1, 2)).toEqual([]);
  });
});

describe("prepareSpells", () => {
  // Arcane Missile is roll 1, Silence roll 4 in the Lore of Sanctioned Magic.
  const wizard = fighter("guild-wizard", { instanceId: "w", spellIds: ["arcane-missile"] });

  it("keeps the signature spells and rolls once on each known lore", () => {
    // 0.5 gives a 4 on the D6.
    const prepared = prepareSpells(index, wizard, sequence(0.5));
    expect(prepared.signature.map((s) => s.id)).toEqual(["arcane-missile"]);
    expect(prepared.rolls).toEqual([
      expect.objectContaining({ loreId: "lore-of-sanctioned-magic", roll: 4, noEffect: false }),
    ]);
    expect(prepared.rolls[0]?.spell?.id).toBe("silence");
  });

  it("a roll on a signature spell has no effect", () => {
    const prepared = prepareSpells(index, wizard, sequence(0));
    expect(prepared.rolls[0]).toMatchObject({ roll: 1, noEffect: true });
  });

  it("a fighter without lore prepares nothing, unknown spells are ignored", () => {
    const captain = fighter("guild-captain", { instanceId: "c", spellIds: ["unknown"] });
    expect(prepareSpells(index, captain)).toEqual({ signature: [], rolls: [] });
    const ghost = fighter("missing-profile", { instanceId: "g" });
    expect(prepareSpells(index, ghost).rolls).toEqual([]);
  });

  it("lists the active casters only", () => {
    const dead = fighter("guild-cleric", { instanceId: "d", status: "dead" });
    const captain = fighter("guild-captain", { instanceId: "c" });
    const ghost = fighter("missing-profile", { instanceId: "g" });
    expect(casters(index, [wizard, dead, captain, ghost]).map((f) => f.instanceId)).toEqual(["w"]);
  });
});
