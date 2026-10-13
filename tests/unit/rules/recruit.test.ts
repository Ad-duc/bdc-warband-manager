/*
 * File:        tests/unit/rules/recruit.test.ts
 * Role:        recruitBlockers(): each rule that greys out the "Recruit"
 *              button of the wizard, and the cases where recruiting is allowed.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import type { Origin, Warband } from "../../../src/data/schema.ts";
import { indexFaction, recruitBlockers } from "../../../src/rules/index.ts";
import { data, fighter, guild, mercenary, swordsForHire, warband } from "../../fixtures/warbands.ts";

const guildIndex = indexFaction(data.common, guild());
const coven = data.factions.find((f) => f.id === "death-covens");
if (coven === undefined) throw new Error("Death Covens data missing");
const covenIndex = indexFaction(data.common, coven);

const originOf = (id: string, faction = guild()): Origin => {
  const o = faction.origins.find((x) => x.id === id);
  if (o === undefined) throw new Error(id);
  return o;
};
const profile = (id: string, index = guildIndex) => {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(id);
  return p;
};
const codes = (
  w: Warband,
  id: string,
  origin: Origin | undefined = originOf("swords-for-hire"),
  index = guildIndex,
) => recruitBlockers(index, w, profile(id, index), origin).map((b) => b.code);

describe("recruitBlockers", () => {
  it("allows a recruit within every limit", () => {
    expect(codes(warband([]), "guild-captain")).toEqual([]);
    expect(codes(warband([fighter("guild-captain")]), "guild-mercenary")).toEqual([]);
  });

  it("blocks a second leader and a leader the origin does not impose", () => {
    const w = warband([fighter("guild-captain")]);
    expect(codes(w, "guild-captain")).toEqual(["leaderTaken"]);
    expect(codes(w, "noble")).toEqual(["leaderTaken", "leaderOrigin"]);
    expect(recruitBlockers(guildIndex, warband([]), profile("noble"), originOf("swords-for-hire"))).toEqual([
      { code: "leaderOrigin", expected: "guild-captain" },
    ]);
    // Without an origin, any leader profile can be recruited.
    expect(recruitBlockers(guildIndex, warband([]), profile("noble"), undefined)).toEqual([]);
  });

  it("counts a promoted champion as the leader", () => {
    const w = warband([fighter("guild-champion", { promotedToLeader: true })]);
    expect(codes(w, "guild-captain")).toEqual(["leaderTaken"]);
  });

  it("blocks a full category and a full profile", () => {
    const champions = warband([
      fighter("guild-champion"),
      fighter("guild-champion"),
      fighter("plague-doctor"),
    ]);
    expect(recruitBlockers(guildIndex, champions, profile("guild-champion"), undefined)).toEqual([
      { code: "categoryMax", category: "champion", max: 3 },
    ]);
    expect(codes(warband([fighter("guild-wizard")]), "guild-wizard")).toEqual(["profileLimit"]);
  });

  it("follows the origin limits and uncapped profiles", () => {
    const knights = warband([fighter("bloodcursed-knight")], { factionId: "death-covens" });
    const aristocrats = originOf("aristocrats-of-blood", coven);
    expect(codes(knights, "bloodcursed-knight", aristocrats, covenIndex)).toEqual([]);
    expect(codes(knights, "bloodcursed-knight", originOf("rogue-necromancer", coven), covenIndex)).toEqual([
      "profileLimit",
    ]);
    const wolves = warband(
      [1, 2, 3].map(() => fighter("dire-wolf")),
      { factionId: "death-covens" },
    );
    expect(codes(wolves, "dire-wolf", originOf("the-hunt-descends", coven), covenIndex)).toEqual([]);
    expect(codes(wolves, "dire-bat", originOf("the-hunt-descends", coven), covenIndex)).toEqual([]);
    expect(codes(wolves, "dire-bat", originOf("rogue-necromancer", coven), covenIndex)).toEqual([
      "categoryMax",
    ]);
  });

  it("blocks a full warband and a profile the silver left cannot pay", () => {
    const full = warband(Array.from({ length: 15 }, () => mercenary()));
    expect(codes(full, "guild-recruit")).toContain("maxFighters");
    // The reference warband has 5 silver left.
    expect(recruitBlockers(guildIndex, swordsForHire(), profile("guild-recruit"), undefined)).toEqual([
      { code: "budget", cost: 30, remaining: 5 },
    ]);
  });

  it("ignores fighters whose profile is unknown", () => {
    expect(codes(warband([fighter("unknown-profile")]), "guild-captain")).toEqual([]);
  });
});
