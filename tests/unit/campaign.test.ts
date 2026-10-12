/*
 * File:        tests/unit/campaign.test.ts
 * Role:        Campaign operations: battle applied at once and undone, stat
 *              modifier helpers, injuries, holdings and stash, and the effect on
 *              the warband rating.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  MAX_HOLDINGS,
  addHolding,
  addInjury,
  addStashItem,
  adjustDelta,
  applyBattle,
  emptyBattle,
  improvementSteps,
  patchFighter,
  removeHolding,
  removeInjury,
  removeStashItem,
  toLogEntry,
  undoLastBattle,
  updateHolding,
  updateInjury,
} from "../../src/features/campaign/campaign.ts";
import { effectiveStats, indexFaction, validateWarband, warbandRating } from "../../src/rules/index.ts";
import { data, guild, swordsForHire } from "../fixtures/warbands.ts";

const index = indexFaction(data.common, guild());

const battle = () =>
  toLogEntry(
    {
      ...emptyBattle(new Date("2026-10-12T00:00:00Z")),
      scenario: "Into the Pits",
      opponent: "Verminkin",
      result: "victory",
      experience: { captain: 6, m1: 0, champion: -2 },
      fightersLost: ["m2", "m2"],
      silver: 40,
      leechJars: 1,
      holdingsRansacked: 1,
    },
    "b1",
  );

describe("battle log", () => {
  it("a log entry drops zero gains and duplicate losses", () => {
    const e = battle();
    expect(e.deltas.experience).toEqual({ captain: 6, champion: -2 });
    expect(e.deltas.fightersLost).toEqual(["m2"]);
    expect(e.date).toBe("2026-10-12T12:00:00.000Z");
  });

  it("applies a battle at once and switches to campaign mode", () => {
    const before = swordsForHire();
    const after = applyBattle(before, battle(), () => "Into the Pits");
    expect(after.mode).toBe("campaign");
    expect(after.counters).toEqual({ battlesFought: 1, victories: 1, holdingsRansacked: 1, fightersLost: 1 });
    expect(after.stash).toMatchObject({ silver: 40, leechJars: 1 });
    expect(after.fighters.find((f) => f.instanceId === "captain")?.experience).toBe(69);
    expect(after.fighters.find((f) => f.instanceId === "m2")?.status).toBe("dead");
    expect(after.fighters.find((f) => f.instanceId === "m1")?.history).toEqual([]);
    expect(after.fighters.find((f) => f.instanceId === "captain")?.history[0]).toMatchObject({
      battleId: "b1",
    });
    // Rating: dead Mercenary removed (86 + 22), experience +4.
    expect(warbandRating(index, after).total).toBe(1277 - 108 + 4);
    expect(validateWarband(after, data, "campaign").map((d) => d.code)).toEqual(["composition.categoryMin"]);
  });

  it("defeats and draws do not count as victories", () => {
    const e = { ...battle(), result: "defeat" as const };
    expect(applyBattle(swordsForHire(), e, () => "").counters.victories).toBe(0);
  });

  it("undo restores the warband as it was", () => {
    const before = swordsForHire();
    const restored = undoLastBattle(applyBattle(before, battle(), () => "x"));
    expect(restored.mode).toBe("recruitment");
    expect(restored.fighters).toEqual(before.fighters);
    expect(restored.counters).toEqual(before.counters);
    expect(restored.stash).toEqual(before.stash);
    expect(restored.battleLog).toEqual([]);
    expect(undoLastBattle(before)).toBe(before);
  });

  it("undo of the second battle keeps campaign mode", () => {
    const one = applyBattle(swordsForHire(), battle(), () => "1");
    const two = applyBattle(
      one,
      { ...battle(), id: "b2", deltas: { ...battle().deltas, fightersLost: [] } },
      () => "2",
    );
    expect(undoLastBattle(two).mode).toBe("campaign");
    expect(undoLastBattle(two).battleLog).toHaveLength(1);
  });
});

describe("stat modifiers", () => {
  it("improving Blade lowers the target number, improving Life raises it", () => {
    expect(adjustDelta({}, "bl", 1)).toEqual({ bl: -1 });
    expect(adjustDelta({}, "lf", 1)).toEqual({ lf: 1 });
    expect(adjustDelta({ bl: -1, wl: 1 }, "bl", -1)).toEqual({ wl: 1 });
    expect(improvementSteps({ ar: -2 }, "ar")).toBe(2);
    expect(improvementSteps({ mv: -1 }, "mv")).toBe(-1);
    expect(improvementSteps({}, "in")).toBe(0);
  });

  it("injuries are free text with optional effects on the characteristics", () => {
    const w = swordsForHire();
    const captain = w.fighters[0];
    if (captain === undefined) throw new Error("fighter");
    let c = addInjury(captain);
    const injury = c.injuries[0];
    if (injury === undefined) throw new Error("injury");
    c = updateInjury(c, injury.id, { text: "Old leg wound", statModifiers: adjustDelta({}, "mv", -1) });
    expect(effectiveStats(index, c)?.mv).toBe(4);
    expect(removeInjury(c, injury.id).injuries).toEqual([]);
    expect(patchFighter(w, "captain", c).fighters[0]?.injuries[0]?.text).toBe("Old leg wound");
  });
});

describe("holdings and stash", () => {
  it("at most 5 holdings", () => {
    let w = swordsForHire();
    for (let i = 0; i < 7; i += 1) w = addHolding(w);
    expect(w.holdings).toHaveLength(MAX_HOLDINGS);
    w = updateHolding(w, 0, { label: "Old mill" });
    expect(w.holdings[0]?.label).toBe("Old mill");
    expect(removeHolding(w, 0).holdings).toHaveLength(4);
  });

  it("stash items stack and unstack", () => {
    let w = addStashItem(swordsForHire(), "sword", "");
    w = addStashItem(w, "sword", "");
    w = addStashItem(w, null, "Relic");
    expect(w.stash.items).toEqual([
      { wargearId: "sword", label: "", quantity: 2 },
      { wargearId: null, label: "Relic", quantity: 1 },
    ]);
    w = removeStashItem(removeStashItem(w, 0), 1);
    expect(w.stash.items).toEqual([{ wargearId: "sword", label: "", quantity: 1 }]);
  });
});
