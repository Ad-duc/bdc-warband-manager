/*
 * File:        tests/unit/rules/properties.test.ts
 * Role:        Property based tests of the rules engine with fast-check: the
 *              invariants that must hold for any dice roll, any fighter built
 *              from the real data of every faction and any warband, whatever
 *              the example. They complete the example based tests of the
 *              other files, which pin the figures of the book.
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type {
  FactionData,
  FighterProfile,
  StatDelta,
  Warband,
  WarbandFighter,
} from "../../../src/data/schema.ts";
import { STAT_KEYS } from "../../../src/data/constants.ts";
import {
  addToDice,
  battleGroupSizes,
  d6ToD3,
  effectiveStats,
  fighterKeywords,
  fighterSpent,
  fighterValue,
  fighterWargearCost,
  hasErrors,
  indexFaction,
  manualStartingExperience,
  recruitBlockers,
  recruitmentBudget,
  rollD6,
  rollD66,
  rollScatter,
  rollStartingExperience,
  SCATTER_DISTANCES,
  totalModifiers,
  underdog,
  validateWarband,
  warbandRating,
  wargearPrice,
  type FactionIndex,
} from "../../../src/rules/index.ts";
import { cloneData, data, warband } from "../../fixtures/warbands.ts";

/* ------------------------------------------------------------------------- */
/* Arbitraries                                                               */
/* ------------------------------------------------------------------------- */

/** A random source as Math.random: a double in [0, 1). */
const arbRandom = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

/** A random source that answers a fixed sequence of values. */
const sequence =
  (values: number[]): (() => number) =>
  () =>
    values.shift() ?? 0;

const arbDelta = fc.integer({ min: -3, max: 3 });
/** A partial delta, as advancements and injuries store them. */
const arbPartialDelta: fc.Arbitrary<Partial<StatDelta>> = fc.record(
  { mv: arbDelta, bl: arbDelta, bw: arbDelta, ar: arbDelta, in: arbDelta, wl: arbDelta, lf: arbDelta },
  { requiredKeys: [] },
);

const arbInjury: fc.Arbitrary<WarbandFighter["injuries"][number]> = fc.record({
  id: fc.uuid(),
  text: fc.string({ maxLength: 20 }),
  tableEntryId: fc.constant(null),
  statModifiers: arbPartialDelta,
});

const factions: { faction: FactionData; index: FactionIndex }[] = data.factions.map((faction) => ({
  faction,
  index: indexFaction(data.common, faction),
}));
const arbFaction = fc.constantFrom(...factions);

const profilesOf = (index: FactionIndex): FighterProfile[] => [...index.fighters.values()];

/**
 * A fighter of this faction: a real profile, any wargear of the faction
 * (allowed or not, the engine must cope), its own options, any modifiers.
 */
function arbFighter(index: FactionIndex): fc.Arbitrary<WarbandFighter> {
  const wargearIds = [...index.wargear.keys()];
  return fc
    .record({
      instanceId: fc.uuid(),
      profile: fc.constantFrom(...profilesOf(index)),
      wargearIds: fc.subarray(wargearIds, { maxLength: 6 }),
      experience: fc.nat({ max: 120 }),
      recruitCostPaid: fc.option(fc.nat({ max: 300 }), { nil: null }),
      injuries: fc.array(arbInjury, { maxLength: 3 }),
      statModifiers: arbPartialDelta,
      status: fc.constantFrom<WarbandFighter["status"]>("active", "dead", "retired"),
      promotedToLeader: fc.boolean(),
      optionCount: fc.nat({ max: 2 }),
    })
    .map(({ profile, optionCount, ...rest }) => {
      const choices = profile.options?.choices ?? [];
      return {
        ...rest,
        profileId: profile.id,
        customName: "",
        skillIds: [],
        spellIds: [],
        optionIds: choices.slice(0, optionCount).map((c) => c.id),
        startingExperienceRoll: null,
        blackRot: 0,
        history: [],
      };
    });
}

function arbWarband(faction: FactionData, index: FactionIndex): fc.Arbitrary<Warband> {
  const originIds = faction.origins.map((o) => o.id);
  return fc
    .record({
      fighters: fc.array(arbFighter(index), { maxLength: 18 }),
      originId: fc.option(fc.constantFrom(...originIds), { nil: null }),
      mode: fc.constantFrom<Warband["mode"]>("recruitment", "campaign"),
    })
    .map(({ fighters, originId, mode }) =>
      warband(fighters, { factionId: faction.id, originId, mode, strongholdId: null }),
    );
}

/** A faction with one of its fighters and one of its warbands. */
const arbFactionWarband = arbFaction.chain(({ faction, index }) =>
  fc.record({
    faction: fc.constant(faction),
    index: fc.constant(index),
    warband: arbWarband(faction, index),
    fighter: arbFighter(index),
  }),
);

const sumKeys = (deltas: Partial<StatDelta>[]): Record<string, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, deltas.reduce((s, d) => s + (d[k] ?? 0), 0)]));

/* ------------------------------------------------------------------------- */
/* Dice                                                                      */
/* ------------------------------------------------------------------------- */

describe("dice properties", () => {
  it("a D6 is an integer from 1 to 6 for any random value", () => {
    fc.assert(
      fc.property(arbRandom, (r) => {
        const d = rollD6(() => r);
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }),
    );
  });

  it("a D3 is the D6 halved and rounded up, from 1 to 3, never decreasing", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 6 }), (a, b) => {
        const d3 = d6ToD3(a);
        expect(d3).toBeGreaterThanOrEqual(1);
        expect(d3).toBeLessThanOrEqual(3);
        expect(d3 * 2).toBeGreaterThanOrEqual(a);
        if (a <= b) expect(d3).toBeLessThanOrEqual(d6ToD3(b));
      }),
    );
  });

  it("a D66 reads two dice from the source, tens then units", () => {
    fc.assert(
      fc.property(arbRandom, arbRandom, (a, b) => {
        expect(rollD66(sequence([a, b]))).toBe(`${rollD6(() => a)}${rollD6(() => b)}`);
      }),
    );
  });

  it("a scatter roll has a whole angle and a distance that follows its dice", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCATTER_DISTANCES),
        fc.array(arbRandom, { minLength: 4, maxLength: 4 }),
        (distance, values) => {
          const roll = rollScatter(distance, sequence([...values]));
          expect(Number.isInteger(roll.angle)).toBe(true);
          expect(roll.angle).toBeGreaterThanOrEqual(0);
          expect(roll.angle).toBeLessThan(360);
          expect(roll.distance).toBe(distance);
          expect(roll.dice).toHaveLength(distance === "3d6" ? 3 : distance === "none" ? 0 : 1);
          for (const d of roll.dice) expect(d).toBeGreaterThanOrEqual(1);
          for (const d of roll.dice) expect(d).toBeLessThanOrEqual(6);
          const sum = roll.dice.reduce((s, d) => s + d, 0);
          if (distance === "none") expect(roll.inches).toBeNull();
          else if (distance === "d6x2") expect(roll.inches).toBe(sum * 2);
          else expect(roll.inches).toBe(sum);
        },
      ),
    );
  });

  it("starting experience: total = base + one die of the profile's kind, for every profile", () => {
    const arbProfile = arbFaction.chain(({ index }) => fc.constantFrom(...profilesOf(index)));
    fc.assert(
      fc.property(arbProfile, arbRandom, (profile, r) => {
        const roll = rollStartingExperience(profile, () => r);
        const { base, dice } = profile.startingExperience;
        expect(roll.mode).toBe("rolled");
        expect(roll.base).toBe(base);
        expect(roll.total).toBe(base + roll.results.reduce((s, d) => s + d, 0));
        if (dice === null) expect(roll.results).toEqual([]);
        else {
          expect(roll.results).toHaveLength(1);
          const max = dice === "d3" ? 3 : 6;
          expect(roll.results[0]).toBeGreaterThanOrEqual(1);
          expect(roll.results[0]).toBeLessThanOrEqual(max);
        }
      }),
    );
  });

  it("a manual die is accepted exactly when it is an integer in the range of the die", () => {
    const arbProfile = arbFaction.chain(({ index }) => fc.constantFrom(...profilesOf(index)));
    const arbResult = fc.oneof(
      fc.integer({ min: -2, max: 9 }),
      fc.double({ min: -2, max: 9, noNaN: true }),
      fc.constant(null),
    );
    fc.assert(
      fc.property(arbProfile, arbResult, (profile, result) => {
        const { base, dice } = profile.startingExperience;
        if (dice === null) {
          expect(manualStartingExperience(profile, result)).toMatchObject({ total: base, results: [] });
          return;
        }
        const max = dice === "d3" ? 3 : 6;
        const valid = result !== null && Number.isInteger(result) && result >= 1 && result <= max;
        if (valid) {
          expect(manualStartingExperience(profile, result)).toMatchObject({
            mode: "manual",
            results: [result],
            total: base + result,
          });
        } else {
          expect(() => manualStartingExperience(profile, result)).toThrow(RangeError);
        }
      }),
    );
  });
});

/* ------------------------------------------------------------------------- */
/* Battle set-up                                                             */
/* ------------------------------------------------------------------------- */

describe("battle properties", () => {
  it("battle groups: right count, every fighter placed, sizes within one, smallest first", () => {
    fc.assert(
      fc.property(fc.nat({ max: 200 }), fc.integer({ min: 1, max: 20 }), (fighters, groups) => {
        const sizes = battleGroupSizes(fighters, groups);
        expect(sizes).toHaveLength(groups);
        expect(sizes.reduce((s, n) => s + n, 0)).toBe(fighters);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
      }),
    );
  });

  it("battle groups: nothing without a group or with a negative count", () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -5, max: 5 }), (fighters, groups) => {
        if (groups <= 0 || fighters < 0) expect(battleGroupSizes(fighters, groups)).toEqual([]);
      }),
    );
  });

  it("the underdog is the lower rating, and swapping the sides swaps the answer", () => {
    const rating = fc.nat({ max: 5000 });
    fc.assert(
      fc.property(rating, rating, (a, b) => {
        const side = underdog(a, b);
        const swapped = underdog(b, a);
        if (a === b) expect([side, swapped]).toEqual(["tie", "tie"]);
        else {
          expect(side).toBe(a < b ? "a" : "b");
          expect(swapped).toBe(side === "a" ? "b" : "a");
        }
      }),
    );
  });
});

/* ------------------------------------------------------------------------- */
/* Costs, rating, budget                                                     */
/* ------------------------------------------------------------------------- */

describe("cost properties", () => {
  it("wargear price: free when fixed, cheapest allowed list, else the reference price", () => {
    fc.assert(
      fc.property(
        arbFaction.chain(({ index }) =>
          fc.record({
            index: fc.constant(index),
            profile: fc.constantFrom(...profilesOf(index)),
            wargearId: fc.constantFrom(...index.wargear.keys()),
          }),
        ),
        ({ index, profile, wargearId }) => {
          const price = wargearPrice(index, profile, wargearId);
          expect(price).toBeGreaterThanOrEqual(0);
          if (profile.fixedWargearIds.includes(wargearId)) {
            expect(price).toBe(0);
            return;
          }
          const listed = profile.allowedWargearLists
            .map((l) => index.listPrices.get(wargearId)?.get(l))
            .filter((p): p is number => p !== undefined);
          if (listed.length > 0) expect(price).toBe(Math.min(...listed));
          else expect(price).toBe(index.wargear.get(wargearId)?.cost ?? 0);
        },
      ),
    );
  });

  it("wargear price: with several allowed lists selling the piece, the cheapest wins", () => {
    // The published lists never sell one piece at two prices, so this builds
    // a faction whose lists do, to make sure the engine really takes the
    // minimum (and not the first or the last list of the profile).
    const arbPrices = fc.array(fc.integer({ min: 1, max: 200 }), { minLength: 2, maxLength: 4 });
    fc.assert(
      fc.property(arbPrices, fc.integer({ min: 1, max: 200 }), (prices, reference) => {
        const local = cloneData();
        const faction = local.factions.find((f) => f.id === "guild-mercenaries");
        const profile = faction?.fighters.find((f) => f.id === "guild-mercenary");
        const piece = faction?.wargear.find((w) => w.id === "sword");
        if (faction === undefined || profile === undefined || piece === undefined) throw new Error("data");
        piece.cost = reference;
        faction.armouryLists = prices.map((cost, i) => ({
          ...(faction.armouryLists[0] as (typeof faction.armouryLists)[number]),
          id: `list-${i}`,
          entries: [{ wargearId: "sword", cost }],
        }));
        profile.allowedWargearLists = faction.armouryLists.map((l) => l.id);
        profile.fixedWargearIds = [];
        const index = indexFaction(local.common, faction);
        expect(wargearPrice(index, profile, "sword")).toBe(Math.min(...prices));
        // No list allowed: back to the reference price.
        expect(wargearPrice(index, { ...profile, allowedWargearLists: [] }, "sword")).toBe(reference);
      }),
    );
  });

  it("wargear cost is additive: one more piece adds exactly its price", () => {
    fc.assert(
      fc.property(
        arbFactionWarband.chain(({ index, fighter }) =>
          fc.record({
            index: fc.constant(index),
            fighter: fc.constant(fighter),
            extra: fc.constantFrom(...index.wargear.keys()),
          }),
        ),
        ({ index, fighter, extra }) => {
          const profile = index.fighters.get(fighter.profileId);
          if (profile === undefined) throw new Error("profile");
          const more = { ...fighter, wargearIds: [...fighter.wargearIds, extra] };
          expect(fighterWargearCost(index, more)).toBe(
            fighterWargearCost(index, fighter) + wargearPrice(index, profile, extra),
          );
        },
      ),
    );
  });

  it("value and silver spent differ only by the price paid for the recruit", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ index, fighter }) => {
        const profile = index.fighters.get(fighter.profileId);
        if (profile === undefined) throw new Error("profile");
        const value = fighterValue(index, fighter);
        expect(value).toBeGreaterThanOrEqual(profile.cost);
        const paid = fighter.recruitCostPaid ?? profile.cost;
        expect(fighterSpent(index, fighter)).toBe(value - profile.cost + paid);
      }),
    );
  });

  it("keywords: those of the profile, no duplicate, options only add", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ index, fighter }) => {
        const profile = index.fighters.get(fighter.profileId);
        if (profile === undefined) throw new Error("profile");
        const keywords = fighterKeywords(index, fighter);
        expect(new Set(keywords).size).toBe(keywords.length);
        for (const k of profile.keywords) expect(keywords).toContain(k);
        expect(keywords.length).toBeGreaterThanOrEqual(profile.keywords.length);
      }),
    );
  });

  it("rating: active fighters only, total = cost + experience, order does not matter", () => {
    fc.assert(
      fc.property(arbFactionWarband, fc.nat({ max: 1000 }), ({ index, warband: w }, seed) => {
        const rating = warbandRating(index, w);
        const active = w.fighters.filter((f) => f.status === "active");
        expect(rating.total).toBe(rating.cost + rating.experience);
        expect(rating.cost).toBe(active.reduce((s, f) => s + fighterValue(index, f), 0));
        expect(rating.experience).toBe(active.reduce((s, f) => s + f.experience, 0));

        // A deterministic reordering that depends on the seed: rotate then reverse.
        const rotated = [
          ...w.fighters.slice(seed % (w.fighters.length || 1)),
          ...w.fighters.slice(0, seed % (w.fighters.length || 1)),
        ];
        const shuffled = seed % 2 === 0 ? rotated : rotated.reverse();
        expect(warbandRating(index, { ...w, fighters: shuffled })).toEqual(rating);

        const onlyActive = { ...w, fighters: active };
        expect(warbandRating(index, onlyActive)).toEqual(rating);
      }),
    );
  });

  it("rating and budget: one more active fighter adds its value, its experience and its silver", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ index, warband: w, fighter }) => {
        const recruit = { ...fighter, status: "active" as const };
        const before = warbandRating(index, w);
        const after = warbandRating(index, { ...w, fighters: [...w.fighters, recruit] });
        expect(after.cost - before.cost).toBe(fighterValue(index, recruit));
        expect(after.experience - before.experience).toBe(recruit.experience);

        const b0 = recruitmentBudget(index, w);
        const b1 = recruitmentBudget(index, { ...w, fighters: [...w.fighters, recruit] });
        expect(b0.starting).toBe(index.common.recruitment.startingSilver);
        expect(b0.remaining).toBe(b0.starting - b0.spent);
        expect(b1.spent - b0.spent).toBe(fighterSpent(index, recruit));

        const gone = { ...fighter, status: "dead" as const };
        expect(warbandRating(index, { ...w, fighters: [...w.fighters, gone] })).toEqual(before);
        expect(recruitmentBudget(index, { ...w, fighters: [...w.fighters, gone] })).toEqual(b0);
      }),
    );
  });
});

/* ------------------------------------------------------------------------- */
/* Characteristics                                                           */
/* ------------------------------------------------------------------------- */

describe("characteristic properties", () => {
  it("total modifiers are the sum of the advancements and of every injury", () => {
    fc.assert(
      fc.property(arbPartialDelta, fc.array(arbInjury, { maxLength: 5 }), (statModifiers, injuries) => {
        const fighter = { ...arbFighterBase(), statModifiers, injuries };
        expect(totalModifiers(fighter)).toEqual(
          sumKeys([statModifiers, ...injuries.map((i) => i.statModifiers)]),
        );
      }),
    );
  });

  it("effective stats stay in the ranges of the book for any fighter of any faction", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ index, fighter }) => {
        const stats = effectiveStats(index, fighter);
        if (stats === null) throw new Error("profile");
        for (const key of ["bl", "bw", "ar"] as const) {
          const v = stats[key];
          if (v !== null) {
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(2);
            expect(v).toBeLessThanOrEqual(6);
          }
        }
        expect(stats.in).toBeGreaterThanOrEqual(0);
        expect(stats.wl).toBeGreaterThanOrEqual(0);
        expect(stats.lf).toBeGreaterThanOrEqual(1);
        if (typeof stats.mv === "number") expect(stats.mv).toBeGreaterThanOrEqual(0);
        else expect(stats.mv).toMatch(/^\d*d\d+([+-]\d+)?$/);
      }),
    );
  });

  it("a worse target number never beats a better one after the same modifiers", () => {
    // A positive delta (worse) on bl, bw or ar can never give a lower (better)
    // target than no delta at all.
    fc.assert(
      fc.property(arbFactionWarband, fc.integer({ min: 0, max: 3 }), ({ index, fighter }, worse) => {
        const base = effectiveStats(index, fighter);
        const penalised = effectiveStats(index, {
          ...fighter,
          statModifiers: {
            ...fighter.statModifiers,
            bl: (fighter.statModifiers.bl ?? 0) + worse,
            bw: (fighter.statModifiers.bw ?? 0) + worse,
            ar: (fighter.statModifiers.ar ?? 0) + worse,
          },
        });
        if (base === null || penalised === null) throw new Error("profile");
        for (const key of ["bl", "bw", "ar"] as const) {
          const b = base[key] ?? 7;
          const p = penalised[key] ?? 7;
          expect(p).toBeGreaterThanOrEqual(b);
        }
      }),
    );
  });

  it("addToDice: flat modifiers compose and cancel on a canonical expression", () => {
    const arbExpr = fc
      .record({
        count: fc.option(fc.integer({ min: 1, max: 9 }), { nil: null }),
        sides: fc.constantFrom(3, 6, 66),
        mod: fc.integer({ min: -9, max: 9 }),
      })
      .map(({ count, sides, mod }) => {
        const dice = `${count ?? ""}d${sides}`;
        return mod === 0 ? dice : `${dice}${mod > 0 ? "+" : ""}${mod}`;
      });
    fc.assert(
      fc.property(arbExpr, fc.integer({ min: -9, max: 9 }), fc.integer({ min: -9, max: 9 }), (expr, a, b) => {
        expect(addToDice(addToDice(expr, a), -a)).toBe(expr);
        expect(addToDice(addToDice(expr, a), b)).toBe(addToDice(expr, a + b));
        expect(addToDice(expr, 0)).toBe(expr);
      }),
    );
  });

  it("addToDice leaves anything that is not a dice expression untouched", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^\d*d\d+([+-]\d+)?$/.test(s)),
        fc.integer({ min: -9, max: 9 }),
        (expr, delta) => {
          expect(addToDice(expr, delta)).toBe(expr);
        },
      ),
    );
  });
});

/** Bare fighter fields for tests that do not need a profile. */
function arbFighterBase(): WarbandFighter {
  return {
    instanceId: "x",
    profileId: "guild-mercenary",
    customName: "",
    wargearIds: [],
    skillIds: [],
    spellIds: [],
    optionIds: [],
    experience: 0,
    startingExperienceRoll: null,
    recruitCostPaid: null,
    injuries: [],
    blackRot: 0,
    statModifiers: {},
    status: "active",
    promotedToLeader: false,
    history: [],
  };
}

/* ------------------------------------------------------------------------- */
/* Validation and recruitment                                                */
/* ------------------------------------------------------------------------- */

describe("validation properties", () => {
  it("never throws, keys follow the code, fighter diagnostics name an active fighter", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ warband: w }) => {
        const copy = structuredClone(w);
        const diagnostics = validateWarband(w, data, w.mode);
        expect(w).toEqual(copy);
        const activeIds = new Set(w.fighters.filter((f) => f.status === "active").map((f) => f.instanceId));
        for (const d of diagnostics) {
          expect(d.messageKey).toBe(`rules.${d.code}`);
          expect(["error", "warning", "info"]).toContain(d.severity);
          if (d.fighterInstanceId !== undefined) expect(activeIds.has(d.fighterInstanceId)).toBe(true);
        }
        expect(hasErrors(diagnostics)).toBe(diagnostics.some((d) => d.severity === "error"));
      }),
    );
  });

  it("budget rules only exist during recruitment", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ warband: w }) => {
        const codes = validateWarband(w, data, "campaign").map((d) => d.code);
        expect(codes.some((c) => c.startsWith("budget."))).toBe(false);
      }),
    );
  });

  it("dead and retired fighters are invisible to the validation", () => {
    fc.assert(
      fc.property(
        arbFactionWarband,
        fc.array(fc.nat({ max: 50 }), { maxLength: 4 }),
        ({ index, warband: w }, picks) => {
          const ghosts = picks.map((n, i) => {
            const source = [...index.fighters.values()][n % index.fighters.size];
            if (source === undefined) throw new Error("profile");
            return {
              ...arbFighterBase(),
              instanceId: `ghost-${i}`,
              profileId: source.id,
              status: "dead" as const,
            };
          });
          const base = validateWarband(w, data, w.mode);
          const haunted = validateWarband({ ...w, fighters: [...w.fighters, ...ghosts] }, data, w.mode);
          expect(haunted).toEqual(base);
        },
      ),
    );
  });

  it("the roster cap blocks every recruit once reached, and a second leader is refused", () => {
    fc.assert(
      fc.property(arbFactionWarband, ({ faction, index, warband: w }) => {
        const origin = faction.origins.find((o) => o.id === w.originId);
        const known = w.fighters.filter((f) => f.status === "active" && index.fighters.has(f.profileId));
        const hasLeader = known.some(
          (f) => f.promotedToLeader || index.fighters.get(f.profileId)?.category === "leader",
        );
        for (const profile of profilesOf(index)) {
          const blockers = recruitBlockers(index, w, profile, origin);
          const codes = blockers.map((b) => b.code);
          expect(known.length >= index.common.recruitment.maxFighters).toBe(codes.includes("maxFighters"));
          if (profile.category === "leader") expect(codes.includes("leaderTaken")).toBe(hasLeader);
          else expect(codes).not.toContain("leaderTaken");
        }
      }),
    );
  });
});
