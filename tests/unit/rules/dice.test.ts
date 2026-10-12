/*
 * File:        tests/unit/rules/dice.test.ts
 * Role:        Dice helpers, starting experience rolls (simulated, manual) and
 *              direction dice scatter rolls.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  d6ToD3,
  indexFaction,
  manualStartingExperience,
  randomName,
  rollD6,
  rollD66,
  rollScatter,
  rollStartingExperience,
  SCATTER_DISTANCES,
} from "../../../src/rules/index.ts";
import type { FighterProfile } from "../../../src/data/schema.ts";
import { data, guild, sequence } from "../../fixtures/warbands.ts";

const index = indexFaction(data.common, guild());
const profile = (id: string): FighterProfile => {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(id);
  return p;
};
const d3Profile: FighterProfile = {
  ...profile("guild-recruit"),
  startingExperience: { base: 10, dice: "d3" },
};

describe("dice", () => {
  it("D6 from the random source, default Math.random", () => {
    expect(rollD6(sequence(0))).toBe(1);
    expect(rollD6(sequence(0.999))).toBe(6);
    const r = rollD6();
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(6);
  });

  it("D3 from a D6", () => {
    expect([1, 2, 3, 4, 5, 6].map(d6ToD3)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("D66 and random names", () => {
    expect(rollD66(sequence(0.4, 0.7))).toBe("35");
    expect(randomName(guild().nameTable.entries, sequence(0.4, 0.7))).toBe("Hieronymus");
    expect(randomName({}, sequence(0))).toBe("");
    expect(rollD66()).toMatch(/^[1-6][1-6]$/);
    expect(typeof randomName(guild().nameTable.entries)).toBe("string");
  });
});

describe("starting experience", () => {
  it("rolled: Guild Captain 60+D6, detail kept", () => {
    expect(rollStartingExperience(profile("guild-captain"), sequence(0.5))).toEqual({
      base: 60,
      dice: "d6",
      results: [4],
      total: 64,
      mode: "rolled",
    });
    expect(rollStartingExperience(profile("guild-captain")).total).toBeGreaterThan(60);
  });

  it("rolled: fixed value and D3", () => {
    expect(rollStartingExperience(profile("hunting-dog"))).toEqual({
      base: 0,
      dice: null,
      results: [],
      total: 0,
      mode: "rolled",
    });
    expect(rollStartingExperience(d3Profile, sequence(0.99)).total).toBe(13);
  });

  it("manual: value read on a real die", () => {
    expect(manualStartingExperience(profile("guild-recruit"), 5)).toMatchObject({
      total: 5,
      mode: "manual",
      results: [5],
    });
    expect(manualStartingExperience(profile("hunting-dog"), null)).toMatchObject({
      total: 0,
      mode: "manual",
    });
    expect(manualStartingExperience(d3Profile, 3).total).toBe(13);
  });

  it("manual: refuses impossible values", () => {
    expect(() => manualStartingExperience(profile("guild-recruit"), 7)).toThrow(RangeError);
    expect(() => manualStartingExperience(profile("guild-recruit"), 0)).toThrow(RangeError);
    expect(() => manualStartingExperience(profile("guild-recruit"), 2.5)).toThrow(RangeError);
    expect(() => manualStartingExperience(profile("guild-recruit"), null)).toThrow(RangeError);
    expect(() => manualStartingExperience(d3Profile, 4)).toThrow(RangeError);
  });
});

describe("direction dice", () => {
  it("any direction from 0 to 359 degrees, clockwise from the top", () => {
    expect(rollScatter("none", sequence(0)).angle).toBe(0);
    expect(rollScatter("none", sequence(0.5)).angle).toBe(180);
    expect(rollScatter("none", sequence(0.9999)).angle).toBe(359);
  });

  it("direction only: no dice, no distance", () => {
    expect(rollScatter("none", sequence(0.25))).toEqual({
      angle: 90,
      distance: "none",
      dice: [],
      inches: null,
    });
  });

  it('D6", D6x2" and 3D6" distances of the rules', () => {
    expect(rollScatter("d6", sequence(0.1, 0.5))).toMatchObject({ dice: [4], inches: 4 });
    expect(rollScatter("d6x2", sequence(0.1, 0.5))).toMatchObject({ dice: [4], inches: 8 });
    expect(rollScatter("3d6", sequence(0.1, 0, 0.5, 0.99))).toMatchObject({ dice: [1, 4, 6], inches: 11 });
  });

  it("every distance rolls with the default random source", () => {
    for (const d of SCATTER_DISTANCES) {
      const r = rollScatter(d);
      expect(r.angle).toBeGreaterThanOrEqual(0);
      expect(r.angle).toBeLessThan(360);
      expect(r.distance).toBe(d);
    }
  });
});
