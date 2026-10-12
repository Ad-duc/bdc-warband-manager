/*
 * File:        tests/unit/rules/death-covens.test.ts
 * Role:        Death Covens specific rules: the Lycanfell Beast alternate form
 *              (never recruited, printed after its Noble), Misbegotten bloodline
 *              mutations (cost, Move, Life, Fly keyword), Dire Wolves out of the
 *              Beasts limit for The Hunt Descends, Thralls without experience,
 *              Kingsguard for Champions only, 0-3 Bloodcursed Knights.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  effectiveStats,
  fighterKeywords,
  fighterSpent,
  fighterValue,
  findFaction,
  formsOf,
  gainsNoExperience,
  indexFaction,
  profileLimit,
  validateWarband,
  warbandRating,
  weaponLines,
  type Diagnostic,
  type ValidationMode,
} from "../../../src/rules/index.ts";
import type { FighterProfile, Warband, WarbandFighter } from "../../../src/data/schema.ts";
import { buildPrintFighters, type PrintLabels } from "../../../src/print/model.ts";
import { data, fighter, warband, withFighter } from "../../fixtures/warbands.ts";

const faction = findFaction(data, "death-covens");
if (faction === undefined) throw new Error("Death Covens data missing");
const index = indexFaction(data.common, faction);

function profile(id: string): FighterProfile {
  const p = index.fighters.get(id);
  if (p === undefined) throw new Error(`Unknown profile ${id}`);
  return p;
}

const run = (w: Warband, mode: ValidationMode = "recruitment"): Diagnostic[] =>
  validateWarband(w, data, mode);
const codes = (w: Warband, mode: ValidationMode = "recruitment"): string[] => run(w, mode).map((d) => d.code);

const skeleton = (i: number): WarbandFighter =>
  fighter("skeleton-warrior", { instanceId: `s${i}`, wargearIds: ["spear", "cuirass"] });
const wolf = (i: number): WarbandFighter =>
  fighter("dire-wolf", { instanceId: `wolf${i}`, wargearIds: ["necrotic-bite"] });

/** Awakened Lord reference warband: 912 silver spent. */
function awakenedLord(): Warband {
  return warband(
    [
      fighter("barrow-lord", {
        instanceId: "lord",
        wargearIds: ["sword", "cuirass"],
        skillIds: ["death-march", "chill-touch"],
        experience: 61,
      }),
      fighter("barrow-champion", {
        instanceId: "champion",
        wargearIds: ["halberd"],
        skillIds: ["kingsguard"],
        experience: 42,
      }),
      ...[1, 2, 3, 4, 5].map(skeleton),
      fighter("zombie-ogre", { instanceId: "ogre", wargearIds: ["ogre-great-weapon"] }),
      wolf(1),
      wolf(2),
    ],
    { factionId: "death-covens", originId: "awakened-lord", strongholdId: "ancient-barrows" },
  );
}

describe("Death Covens data", () => {
  it("has 16 profiles, the Lycanfell Beast being a form of the Lycanfell Noble", () => {
    expect(faction.fighters).toHaveLength(16);
    expect(profile("lycanfell-beast").formOf).toBe("lycanfell-noble");
    expect(formsOf(index, "lycanfell-noble").map((p) => p.id)).toEqual(["lycanfell-beast"]);
    expect(formsOf(index, "barrow-lord")).toEqual([]);
  });

  it("Thralls never gain experience, other undead do", () => {
    expect(gainsNoExperience(index, profile("zombie"))).toBe(true);
    expect(gainsNoExperience(index, profile("gargoyle"))).toBe(true);
    expect(gainsNoExperience(index, profile("dire-wolf"))).toBe(false);
  });

  it("the Gargoyle's Stone Talons deal d3+1 critical damage (v1.03)", () => {
    const lines = weaponLines(index, fighter("gargoyle", { wargearIds: ["stone-talons"] }));
    expect(lines[0]?.profile).toMatchObject({ rend: -1, damage: 2, critDamage: "d3+1" });
  });
});

describe("Death Covens reference warband", () => {
  it("is valid with no message", () => {
    expect(run(awakenedLord())).toEqual([]);
  });

  it("costs 912 silver", () => {
    expect(warbandRating(index, awakenedLord())).toEqual({ cost: 912, experience: 103, total: 1015 });
  });
});

describe("Lycanfell Beast", () => {
  it("cannot be recruited", () => {
    const w = withFighter(awakenedLord(), "wolf2", {
      profileId: "lycanfell-beast",
      wargearIds: ["wulfen-claws"],
    });
    expect(codes(w)).toContain("composition.notRecruitable");
  });

  const labels: PrintLabels = {
    flame: "Flamme",
    unarmed: "Frappe à mains nues",
    wargear: "Équipement :",
    skills: "Compétences :",
    spells: "Sorts :",
    injuries: "Blessures :",
    promoted: "Chef promu.",
    moreWeapons: "Autres armes :",
    options: "Options :",
    formOf: (name) => `Forme de ${name}`,
  };

  it("is printed right after the Lycanfell Noble, without cost, experience or wargear", () => {
    const noble = fighter("lycanfell-noble", {
      instanceId: "noble",
      customName: "Vargoi",
      wargearIds: ["sword", "cuirass"],
      skillIds: ["cloud-of-bats"],
      experience: 63,
    });
    const blocks = buildPrintFighters(
      index,
      warband([noble], { factionId: "death-covens" }),
      "fr",
      labels,
      false,
    );
    expect(blocks.map((b) => b?.type)).toEqual(["Lycanfell Noble", "Lycanfell Beast"]);
    const beast = blocks[1];
    expect(beast).toMatchObject({ id: "noble-lycanfell-beast", cost: null, experience: null });
    expect(beast?.notes).toEqual(["Forme de Vargoi"]);
    expect(beast?.weapons.map((w) => w.name)).toEqual(["Griffes de loup"]);
    expect(beast?.stats).toMatchObject({ bl: 2, ar: 5, lf: 8 });
  });

  it("an unnamed Noble gives its profile name to the form", () => {
    const noble = fighter("lycanfell-noble", { instanceId: "n2" });
    const blocks = buildPrintFighters(
      index,
      warband([noble], { factionId: "death-covens" }),
      "en",
      labels,
      false,
    );
    expect(blocks[1]?.notes).toEqual(["Forme de Lycanfell Noble"]);
  });
});

describe("Misbegotten bloodline mutations", () => {
  const misbegotten = (optionIds: string[]): WarbandFighter =>
    fighter("misbegotten", { instanceId: "mis", wargearIds: ["sword"], optionIds, experience: 33 });

  it("each mutation adds its cost to the fighter", () => {
    expect(fighterValue(index, misbegotten([]))).toBe(65 + 18);
    expect(fighterValue(index, misbegotten(["hulking-form"]))).toBe(65 + 30 + 18);
    expect(fighterSpent(index, misbegotten(["bat-wings"]))).toBe(65 + 15 + 18);
  });

  it("Wulfen Legs set Move to 7, Hulking Form sets Life to 8, Bat Wings give Fly", () => {
    expect(effectiveStats(index, misbegotten(["wulfen-legs"]))).toMatchObject({ mv: 7, lf: 4 });
    expect(effectiveStats(index, misbegotten(["hulking-form"]))).toMatchObject({ mv: 5, lf: 8 });
    expect(fighterKeywords(index, misbegotten(["bat-wings"]))).toContain("fly");
    expect(fighterKeywords(index, misbegotten([]))).not.toContain("fly");
    expect(fighterKeywords(index, fighter("unknown-profile"))).toEqual([]);
  });

  it("only 1 mutation, and only mutations of the profile", () => {
    const base = awakenedLord();
    const two = withFighter(base, "champion", {
      profileId: "misbegotten",
      wargearIds: ["sword"],
      skillIds: [],
      optionIds: ["bat-wings", "wulfen-legs"],
    });
    expect(codes(two)).toContain("fighter.optionCount");
    const unknown = withFighter(two, "champion", { optionIds: ["dragon-wings"] });
    expect(codes(unknown)).toContain("data.unknownOption");
    expect(fighterValue(index, { ...misbegotten([]), optionIds: ["dragon-wings"] })).toBe(65 + 18);
    const onSkeleton = withFighter(base, "s1", { optionIds: ["bat-wings"] });
    expect(codes(onSkeleton)).toEqual(expect.arrayContaining(["data.unknownOption", "fighter.optionCount"]));
  });
});

describe("origin rules", () => {
  it("Dire Wolves do not count towards the Beasts limit for The Hunt Descends", () => {
    const lord = awakenedLord();
    const pack = { ...lord, fighters: [...lord.fighters, wolf(3), wolf(4)] };
    expect(codes(pack)).toContain("composition.categoryMax");
    const hunt: Warband = {
      ...pack,
      originId: "the-hunt-descends",
      strongholdId: "grand-pavilion",
      fighters: pack.fighters.map((f) =>
        f.instanceId === "lord"
          ? { ...f, profileId: "lycanfell-noble", skillIds: ["cloud-of-bats"], wargearIds: ["sword"] }
          : f,
      ),
    };
    expect(codes(hunt)).not.toContain("composition.categoryMax");
  });

  it("0-3 Bloodcursed Knights for the Aristocrats of Blood", () => {
    const aristocrats = faction.origins.find((o) => o.id === "aristocrats-of-blood");
    expect(profileLimit(profile("bloodcursed-knight"), aristocrats)).toBe(3);
    expect(profileLimit(profile("bloodcursed-knight"), undefined)).toBe(1);
  });
});

describe("skills and experience", () => {
  it("Kingsguard can only be picked for a Champion", () => {
    const w = withFighter(awakenedLord(), "lord", { skillIds: ["death-march", "kingsguard"] });
    expect(codes(w)).toContain("skill.categoryOnly");
    const d = run(w).find((x) => x.code === "skill.categoryOnly");
    expect(d?.params).toEqual({ skill: "kingsguard", category: "champion" });
  });

  it("Dark Aristocracy is for undead aristocrats, Undying Lords for undead skeletons", () => {
    const w = withFighter(awakenedLord(), "champion", { skillIds: ["cloud-of-bats"] });
    expect(codes(w)).toContain("skill.notEligible");
  });

  it("a Thrall with experience is reported", () => {
    const w = withFighter(awakenedLord(), "s1", { experience: 5 });
    expect(codes(w, "campaign")).toContain("experience.notGained");
  });
});
