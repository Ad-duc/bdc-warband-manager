/*
 * File:        tests/unit/rules/calc.test.ts
 * Role:        Costs, budget, warband rating (regression value), effective
 *              characteristics, weapon lines and battle log totals.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  battleLogTotals,
  effectiveStats,
  fighterSpent,
  fighterValue,
  fighterWargearCost,
  indexFaction,
  recruitmentBudget,
  totalModifiers,
  wargearPrice,
  warbandRating,
  weaponLines,
} from "../../../src/rules/index.ts";
import type { BattleLogEntry } from "../../../src/data/schema.ts";
import { cloneData, data, fighter, guild, mercenary, swordsForHire } from "../../fixtures/warbands.ts";

const index = indexFaction(data.common, guild());
const profile = (id: string) => {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(id);
  return p;
};

describe("costs", () => {
  it("prices come from the profile lists, fixed wargear is free", () => {
    expect(wargearPrice(index, profile("guild-mercenary"), "spear")).toBe(16);
    expect(wargearPrice(index, profile("hunting-dog"), "vicious-bite")).toBe(0);
    expect(wargearPrice(index, profile("guild-mercenary"), "full-plate")).toBe(40);
    expect(wargearPrice(index, profile("guild-mercenary"), "nope")).toBe(0);
  });

  it("the cheapest list price wins when a list differs", () => {
    const d = cloneData();
    const gm = d.factions.find((x) => x.id === "guild-mercenaries");
    const ogre = gm?.armouryLists.find((l) => l.id === "ogre");
    const entry = ogre?.entries.find((e) => e.wargearId === "shield");
    if (gm === undefined || entry === undefined) throw new Error("data");
    entry.cost = 8;
    const i = indexFaction(d.common, gm);
    expect(wargearPrice(i, profile("mercenary-ogre"), "shield")).toBe(8);
  });

  it("fighter value and silver spent", () => {
    const m = mercenary();
    expect(fighterWargearCost(index, m)).toBe(36);
    expect(fighterValue(index, m)).toBe(86);
    expect(fighterSpent(index, m)).toBe(86);
    const free = fighter("guild-recruit", { wargearIds: ["dagger"], recruitCostPaid: 0 });
    expect(fighterSpent(index, free)).toBe(10);
    expect(fighterValue(index, free)).toBe(40);
  });

  it("unknown profiles cost nothing", () => {
    const ghost = fighter("nope", { wargearIds: ["spear"] });
    expect(fighterWargearCost(index, ghost)).toBe(0);
    expect(fighterValue(index, ghost)).toBe(0);
    expect(fighterSpent(index, ghost)).toBe(0);
  });
});

describe("budget and rating", () => {
  it("reference warband: 995 spent, 5 left", () => {
    expect(recruitmentBudget(index, swordsForHire())).toEqual({ starting: 1000, spent: 995, remaining: 5 });
  });

  it("warband rating regression: 995 + 282 = 1277, stash and dead fighters excluded", () => {
    const w = swordsForHire();
    w.stash.silver = 5;
    w.fighters.push(mercenary({ status: "dead", experience: 30 }));
    expect(warbandRating(index, w)).toEqual({ cost: 995, experience: 282, total: 1277 });
  });
});

describe("effective characteristics", () => {
  it("armour replaces the Armour value and the shield improves it", () => {
    const c = fighter("guild-captain", { wargearIds: ["sword", "cuirass", "shield"] });
    expect(effectiveStats(index, c)).toEqual({ mv: 5, bl: 3, bw: 4, ar: 4, in: 4, wl: 4, lf: 6 });
  });

  it("injuries and advancements add up and are bounded", () => {
    const m = mercenary({
      statModifiers: { bl: -1, wl: 1 },
      injuries: [
        { id: "i1", text: "Old wound", tableEntryId: null, statModifiers: { mv: -10, lf: -10, in: -5 } },
      ],
    });
    expect(totalModifiers(m)).toEqual({ mv: -10, bl: -1, bw: 0, ar: 0, in: -5, wl: 1, lf: -10 });
    expect(effectiveStats(index, m)).toEqual({ mv: 0, bl: 3, bw: 4, ar: 5, in: 0, wl: 4, lf: 1 });
  });

  it("target values stay between 2+ and 6+, '-' beyond 6+", () => {
    const strong = mercenary({ wargearIds: ["dagger", "shield"], statModifiers: { ar: -9 } });
    expect(effectiveStats(index, strong)?.ar).toBe(2);
    const weak = mercenary({ wargearIds: ["dagger"], statModifiers: { ar: 1 } });
    expect(effectiveStats(index, weak)?.ar).toBeNull();
  });

  it("a '-' value stays '-' unless improved", () => {
    expect(effectiveStats(index, fighter("hunting-dog"))?.bw).toBeNull();
    expect(effectiveStats(index, fighter("hunting-dog", { statModifiers: { bw: -1 } }))?.bw).toBe(6);
  });

  it("unknown profile gives no characteristics", () => {
    expect(effectiveStats(index, fighter("nope"))).toBeNull();
  });
});

describe("weapon lines", () => {
  it("unarmed strike when there is no melee weapon", () => {
    const lines = weaponLines(index, mercenary({ wargearIds: ["crossbow", "nope"] }));
    expect(lines.map((l) => l.id)).toEqual(["unarmed-strike", "crossbow"]);
  });

  it("two-handed melee weapon with a held item loses 1 Attack", () => {
    const [spear] = weaponLines(index, mercenary({ wargearIds: ["spear", "shield"] }));
    expect(spear).toMatchObject({ id: "spear", attacksReduced: true, profile: { attacks: 2 } });
  });

  it("a dice Attacks value is not reduced", () => {
    const d = cloneData();
    const gm = d.factions.find((x) => x.id === "guild-mercenaries");
    const spear = gm?.wargear.find((w) => w.id === "spear");
    if (gm === undefined || spear?.profile === null || spear === undefined) throw new Error("data");
    spear.profile.attacks = "d3";
    const i = indexFaction(d.common, gm);
    const [line] = weaponLines(i, mercenary({ wargearIds: ["spear", "shield"] }));
    expect(line).toMatchObject({ attacksReduced: false, profile: { attacks: "d3" } });
  });

  it("Loyal Companion adds its own attack line", () => {
    const lines = weaponLines(index, fighter("guild-captain", { wargearIds: ["sword", "loyal-companion"] }));
    expect(lines.map((l) => [l.id, l.kind])).toEqual([
      ["sword", "melee"],
      ["loyal-companion", "melee"],
    ]);
  });

  it("Bomb-bolt adds a ranged attack line with its own profile (v1.03)", () => {
    const lines = weaponLines(index, mercenary({ wargearIds: ["dagger", "crossbow", "bomb-bolt"] }));
    expect(lines.map((l) => [l.id, l.kind])).toEqual([
      ["dagger", "melee"],
      ["crossbow", "ranged"],
      ["bomb-bolt", "ranged"],
    ]);
    expect(lines[2]?.profile).toMatchObject({ range: 20, rend: -1, damage: "d3+1" });
    expect(lines[2]?.profile.critDamage).toBeUndefined();
  });
});

describe("battle log totals", () => {
  const entry = (result: BattleLogEntry["result"], lost: string[]): BattleLogEntry => ({
    id: result,
    date: "2026-10-12T20:00:00.000Z",
    scenario: "",
    opponent: "",
    result,
    notes: "",
    deltas: { experience: {}, silver: 40, leechJars: 1, fightersLost: lost, holdingsRansacked: 1 },
  });

  it("counts battles, victories, losses and gains", () => {
    expect(battleLogTotals([entry("victory", []), entry("defeat", ["m1", "m2"]), entry("draw", [])])).toEqual(
      {
        battlesFought: 3,
        victories: 1,
        holdingsRansacked: 3,
        fightersLost: 2,
        silver: 120,
        leechJars: 3,
      },
    );
  });
});
