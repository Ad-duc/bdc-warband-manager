/*
 * File:        tests/unit/rules/blighted-cloister.test.ts
 * Role:        The Blighted Cloister specific rules: limits lifted by an origin
 *              (any number of Cloister Knights or Rot Demons), wargear included
 *              in the recruit cost (Full-Plate, Demonic Rot Blade), the
 *              Darkcloven Shaman's two lores without signature spells, the
 *              Practitioner Item List price of the Demonic Familiar, the
 *              epithet table and the Secluded Scriptorium tally.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  findFaction,
  fighterValue,
  indexFaction,
  profileLimit,
  randomEpithet,
  validateWarband,
  wargearPrice,
  warbandRating,
  type Diagnostic,
  type ValidationMode,
} from "../../../src/rules/index.ts";
import type { FighterProfile, Warband, WarbandFighter } from "../../../src/data/schema.ts";
import { applyOrigin, createWarband } from "../../../src/features/warbands/factory.ts";
import { data, fighter, sequence, warband, withFighter } from "../../fixtures/warbands.ts";

const faction = findFaction(data, "the-blighted-cloister");
if (faction === undefined) throw new Error("Blighted Cloister data missing");
const index = indexFaction(data.common, faction);

function profile(id: string): FighterProfile {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(`Unknown profile ${id}`);
  return p;
}

const run = (w: Warband, mode: ValidationMode = "recruitment"): Diagnostic[] =>
  validateWarband(w, data, mode);
const codes = (w: Warband, mode: ValidationMode = "recruitment"): string[] => run(w, mode).map((d) => d.code);

const knight = (i: number): WarbandFighter =>
  fighter("cloister-knight", { instanceId: `k${i}`, wargearIds: ["full-plate", "sword"], experience: 33 });

/** Knights-Militant reference warband: 907 silver spent, 4 Cloister Knights. */
function knightsMilitant(): Warband {
  return warband(
    [
      fighter("knight-abbot", {
        instanceId: "abbot",
        wargearIds: ["full-plate", "sword"],
        skillIds: ["unholy-sermon", "shroud-of-flies"],
        experience: 64,
      }),
      fighter("cloister-champion", {
        instanceId: "champion",
        wargearIds: ["full-plate", "great-club"],
        skillIds: ["black-blood"],
        experience: 42,
      }),
      ...[1, 2, 3, 4].map(knight),
      fighter("dreg-cultist", {
        instanceId: "dreg",
        wargearIds: ["dagger", "shield", "sling"],
        experience: 2,
      }),
    ],
    { factionId: "the-blighted-cloister", originId: "knights-militant", strongholdId: "fortified-keep" },
  );
}

describe("Blighted Cloister data", () => {
  it("has 14 profiles and two leaders for four origins", () => {
    expect(faction.fighters).toHaveLength(14);
    expect(faction.origins.map((o) => o.requiredLeaderId)).toEqual([
      "knight-abbot",
      "high-sorcerer",
      "knight-abbot",
      "high-sorcerer",
    ]);
  });

  it("the Darkcloven Shaman knows both lores and picks no signature spell", () => {
    const shaman = profile("darkcloven-shaman");
    expect(shaman.knownSpellLoreIds).toEqual(["lore-of-blessed-maggots", "demonic-lore-of-rot"]);
    expect(shaman.recruitmentGrants.spells).toBe(0);
  });
});

describe("Blighted Cloister reference warband", () => {
  it("is valid with no message", () => {
    expect(run(knightsMilitant())).toEqual([]);
  });

  it("costs 907 silver: the Full-Plate of the knights is included in their cost", () => {
    expect(warbandRating(index, knightsMilitant()).cost).toBe(907);
    expect(fighterValue(index, knight(9))).toBe(95 + 18);
  });
});

describe("origin limits", () => {
  it("any number of Cloister Knights for the Knights-Militant only", () => {
    const militant = faction.origins.find((o) => o.id === "knights-militant");
    expect(profileLimit(profile("cloister-knight"), militant)).toBeNull();
    expect(profileLimit(profile("cloister-knight"), undefined)).toBe(3);
    const rabble: Warband = {
      ...knightsMilitant(),
      originId: "blessed-rabble",
      strongholdId: "street-pulpit",
    };
    expect(codes(rabble)).toContain("composition.profileLimit");
  });

  it("any number of Rot Demons for The Anointed One, 0-2 Cloister Sorcerers for the Priesthood", () => {
    const anointed = faction.origins.find((o) => o.id === "the-anointed-one");
    const priesthood = faction.origins.find((o) => o.id === "priesthood-of-sorcerers");
    expect(profileLimit(profile("rot-demon"), anointed)).toBeNull();
    expect(profileLimit(profile("cloister-sorcerer"), priesthood)).toBe(2);
  });
});

describe("wargear", () => {
  it("a Rot Demon keeps its Demonic Rot Blade, included in its cost", () => {
    const demon = fighter("rot-demon", {
      instanceId: "d1",
      wargearIds: ["demonic-rot-blade"],
      experience: 33,
    });
    expect(fighterValue(index, demon)).toBe(120);
    const w = withFighter(knightsMilitant(), "k4", { ...demon, instanceId: "k4", wargearIds: [] });
    expect(codes(w)).toContain("wargear.fixedMissing");
  });

  it("the Demonic Familiar costs its Practitioner Item List price (30, not 20)", () => {
    expect(index.wargear.get("demonic-familiar")?.cost).toBe(20);
    expect(wargearPrice(index, profile("high-sorcerer"), "demonic-familiar")).toBe(30);
  });

  it("a Shaman picking a signature spell is reported", () => {
    const w = withFighter(knightsMilitant(), "champion", {
      profileId: "darkcloven-shaman",
      wargearIds: ["arcane-staff"],
      skillIds: [],
      spellIds: ["swollen-form"],
    });
    expect(codes(w)).toContain("spell.recruitmentCount");
  });
});

describe("epithets and trackers", () => {
  it("draws a translated epithet on a D66", () => {
    // 0 then 0 gives 11 on the D66.
    expect(randomEpithet(faction.epithetTable?.entries, sequence(0, 0))).toEqual({
      en: "Acolyte of the Black Breath",
      fr: "Acolyte du Souffle noir",
    });
    expect(randomEpithet(undefined)).toBeUndefined();
  });

  it("the Secluded Scriptorium tally starts at 0", () => {
    const w = applyOrigin(createWarband("fr", faction.id), faction, "priesthood-of-sorcerers");
    expect(w.strongholdTrackers).toEqual({ "ancient-scrolls-tally": 0 });
    expect(w.fighters.map((f) => f.profileId)).toEqual(["high-sorcerer"]);
  });
});
