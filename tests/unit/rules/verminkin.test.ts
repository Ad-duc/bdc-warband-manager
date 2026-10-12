/*
 * File:        tests/unit/rules/verminkin.test.ts
 * Role:        Verminkin specific rules: origin profile limits (0-2 Rolling
 *              Contraptions, 0-2 Pox Priest's Apprentices), dice Move value of
 *              the Rolling-Contraption, Heavy Plating Move penalty, Wheel-Spikes
 *              Rend improvement, fixed natural weapons, Full-plate restriction
 *              without the Brace of Pistols, signature spells and skills.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  addToDice,
  effectiveStats,
  findFaction,
  indexFaction,
  profileLimit,
  validateWarband,
  warbandRating,
  weaponLines,
  type Diagnostic,
  type ValidationMode,
} from "../../../src/rules/index.ts";
import type { FighterProfile, Warband, WarbandFighter } from "../../../src/data/schema.ts";
import { formatStat } from "../../../src/i18n/text.ts";
import { data, fighter, warband, withFighter } from "../../fixtures/warbands.ts";

const faction = findFaction(data, "verminkin");
if (faction === undefined) throw new Error("Verminkin data missing");
const index = indexFaction(data.common, faction);

/** Profile by id; throws so that tests never run on missing data. */
function profile(id: string): FighterProfile {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(`Unknown profile ${id}`);
  return p;
}

const run = (w: Warband, mode: ValidationMode = "recruitment"): Diagnostic[] =>
  validateWarband(w, data, mode);
const codes = (w: Warband, mode: ValidationMode = "recruitment"): string[] => run(w, mode).map((d) => d.code);

const warrior = (i: number): WarbandFighter =>
  fighter("verminkin-warrior", { instanceId: `w${i}`, wargearIds: ["spear"], experience: 3 });

/** Merciless Tyrant reference warband: 927 silver spent, rating 927 + experience. */
function mercilessTyrant(): Warband {
  return warband(
    [
      fighter("ironfang-warlord", {
        instanceId: "warlord",
        wargearIds: ["sword", "full-plate"],
        skillIds: ["dirty-fighter", "ambush"],
        experience: 62,
      }),
      fighter("verminkin-champion", {
        instanceId: "champion",
        wargearIds: ["poison-blade"],
        skillIds: ["impetuous"],
        experience: 41,
      }),
      fighter("assassins-apprentice", { instanceId: "apprentice", wargearIds: ["sword"], experience: 44 }),
      ...[1, 2, 3, 4, 5].map(warrior),
      fighter("rat-mutant", {
        instanceId: "mutant",
        wargearIds: ["oversized-claw", "rat-mutant-blade", "heavy-plating"],
        experience: 24,
      }),
      ...[1, 2, 3].map((i) => fighter("giant-rat", { instanceId: `rat${i}`, wargearIds: ["nasty-bite"] })),
    ],
    {
      factionId: "verminkin",
      originId: "merciless-tyrant",
      strongholdId: "fortified-warren",
    },
  );
}

describe("Verminkin data", () => {
  it("has 13 profiles and the four leaders imposed by the origins", () => {
    expect(faction.fighters).toHaveLength(13);
    expect(faction.origins.map((o) => o.requiredLeaderId)).toEqual([
      "pox-priest",
      "nightfang-assassin",
      "sparkseer",
      "ironfang-warlord",
    ]);
  });

  it("gives the casters their lore and signature spells", () => {
    const priest = index.fighters.get("pox-priest");
    expect(priest?.recruitmentGrants).toMatchObject({ spells: 2, spellLoreId: "lore-of-poxes" });
    expect(index.fighters.get("verminkin-warlock")?.knownSpellLoreIds).toEqual(["lore-of-the-under-tunnels"]);
  });
});

describe("Verminkin reference warband", () => {
  it("is valid with no message", () => {
    expect(run(mercilessTyrant())).toEqual([]);
  });

  it("costs 927 silver and rates cost plus experience", () => {
    const rating = warbandRating(index, mercilessTyrant());
    expect(rating.cost).toBe(927);
    expect(rating.total).toBe(927 + 62 + 41 + 44 + 15 + 24);
  });
});

describe("origin profile limits", () => {
  const contraption = (id: string): WarbandFighter =>
    fighter("rolling-contraption", { instanceId: id, wargearIds: ["crushing-bulk"] });
  const twoContraptions = (originId: string): Warband => {
    const base = mercilessTyrant();
    const others = base.fighters.filter((f) => f.instanceId !== "mutant");
    return { ...base, originId, fighters: [...others, contraption("c1"), contraption("c2")] };
  };

  it("0-1 Rolling-Contraption by default", () => {
    expect(profileLimit(profile("rolling-contraption"), undefined)).toBe(1);
    expect(codes(twoContraptions("merciless-tyrant"))).toContain("composition.profileLimit");
  });

  it("0-2 Rolling Contraptions in a Sparkseer Coven", () => {
    const coven = faction.origins.find((o) => o.id === "sparkseer-coven");
    expect(profileLimit(profile("rolling-contraption"), coven)).toBe(2);
    const w = twoContraptions("sparkseer-coven");
    // Only the leader required by the origin is reported, not the limit.
    expect(codes(w)).not.toContain("composition.profileLimit");
    expect(codes(w)).toContain("composition.leaderOrigin");
  });

  it("0-2 Pox Priest's Apprentices for the Acolytes of Plague only", () => {
    const acolytes = faction.origins.find((o) => o.id === "acolytes-of-plague");
    const apprentice = profile("pox-priests-apprentice");
    expect(profileLimit(apprentice, acolytes)).toBe(2);
    expect(profileLimit(apprentice, faction.origins[1])).toBe(1);
  });
});

describe("characteristics", () => {
  it("Heavy Plating gives 5+ armour and -1 Move", () => {
    const stats = effectiveStats(
      index,
      fighter("rat-mutant", { wargearIds: ["oversized-claw", "heavy-plating"] }),
    );
    expect(stats).toMatchObject({ mv: 4, ar: 5 });
  });

  it("the Rolling-Contraption keeps its dice Move and carries modifiers", () => {
    expect(effectiveStats(index, fighter("rolling-contraption"))?.mv).toBe("2d6");
    const slowed = fighter("rolling-contraption", { statModifiers: { mv: -1 } });
    expect(effectiveStats(index, slowed)?.mv).toBe("2d6-1");
    expect(formatStat("mv", "2d6", "fr")).toBe('2D6"');
    expect(formatStat("mv", 6, "en")).toBe('6"');
  });

  it("adds flat modifiers to dice expressions", () => {
    expect(addToDice("2d6", 0)).toBe("2d6");
    expect(addToDice("2d6", 2)).toBe("2d6+2");
    expect(addToDice("2d6+1", -1)).toBe("2d6");
    expect(addToDice("d3+1", -3)).toBe("d3-2");
    expect(addToDice("3d6x5", 1)).toBe("3d6x5");
  });
});

describe("weapons", () => {
  it("Wheel-Spikes improve the Rend of the Crushing Bulk", () => {
    const plain = weaponLines(index, fighter("rolling-contraption", { wargearIds: ["crushing-bulk"] }));
    expect(plain[0]?.profile.rend).toBe(-1);
    const spiked = weaponLines(
      index,
      fighter("rolling-contraption", { wargearIds: ["crushing-bulk", "dagger", "wheel-spikes"] }),
    );
    expect(spiked.map((l) => [l.id, l.profile.rend])).toEqual([
      ["crushing-bulk", -2],
      ["dagger", 0],
    ]);
  });

  it("the Giant Rat must keep its Nasty Bite", () => {
    const w = withFighter(mercilessTyrant(), "rat1", { wargearIds: [] });
    expect(codes(w)).toContain("wargear.fixedMissing");
  });

  it("Full-plate forbids every two-handed ranged weapon", () => {
    const w = withFighter(mercilessTyrant(), "warlord", {
      profileId: "sparkseer",
      wargearIds: ["sword", "full-plate", "long-rifle"],
      skillIds: ["dirty-fighter"],
    });
    const found = run({ ...w, originId: "sparkseer-coven", strongholdId: "rickety-workshop" });
    // The sword also gets the off-hand warning of A04; the error is the restriction.
    expect(found.filter((d) => d.severity === "error").map((d) => d.code)).toEqual(["wargear.restriction"]);
  });

  it("Gas Masks are Rare 0-6", () => {
    expect(index.wargear.get("gas-mask")?.rarity).toBe(6);
  });
});

describe("skills and spells", () => {
  it("Masterful Schemes are for Verminkin leaders and champions only", () => {
    const w = withFighter(mercilessTyrant(), "w1", { skillIds: ["dirty-fighter"] });
    expect(codes(w, "campaign")).toContain("skill.notEligible");
    const runner = withFighter(mercilessTyrant(), "w1", { skillIds: ["impetuous"] });
    expect(codes(runner, "campaign")).not.toContain("skill.notEligible");
  });

  it("the Pox Priest picks 2 signature spells from the Lore of Poxes", () => {
    const base = mercilessTyrant();
    const priest = fighter("pox-priest", { instanceId: "priest", spellIds: ["fetid-blades"] });
    const w: Warband = {
      ...base,
      originId: "acolytes-of-plague",
      strongholdId: "desecrated-chapel",
      fighters: [priest, ...base.fighters.filter((f) => f.instanceId !== "warlord")],
    };
    expect(codes(w)).toContain("spell.recruitmentCount");
    const two = withFighter(w, "priest", { spellIds: ["fetid-blades", "dark-vitality"] });
    expect(codes(two)).not.toContain("spell.recruitmentCount");
    const wrongLore = withFighter(w, "priest", { spellIds: ["fetid-blades", "doom"] });
    expect(codes(wrongLore)).toContain("spell.notKnownLore");
  });
});
