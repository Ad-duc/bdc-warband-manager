/*
 * File:        tests/unit/rules/validate.test.ts
 * Role:        One test (at least) per validation rule: the reference warband is
 *              valid, then each mutation must raise exactly the expected code.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  hasErrors,
  validateWarband,
  type Diagnostic,
  type ValidationMode,
} from "../../../src/rules/index.ts";
import type { Warband } from "../../../src/data/schema.ts";
import {
  cloneData,
  data,
  fighter,
  mercenary,
  swordsForHire,
  warband,
  withFighter,
} from "../../fixtures/warbands.ts";

const run = (w: Warband, mode: ValidationMode = "recruitment", d = data): Diagnostic[] =>
  validateWarband(w, d, mode);
const codes = (w: Warband, mode: ValidationMode = "recruitment", d = data): string[] =>
  run(w, mode, d).map((x) => x.code);

/** Five valid henchmen, to keep composition errors out of unrelated tests. */
const fiveMercs = () => [1, 2, 3, 4, 5].map((i) => mercenary({ instanceId: `m${i}` }));
const captain = (o = {}) =>
  fighter("guild-captain", {
    instanceId: "captain",
    wargearIds: ["sword"],
    skillIds: ["crackshot", "feint"],
    ...o,
  });

describe("reference warband", () => {
  it("Swords for Hire is valid with no warning", () => {
    expect(run(swordsForHire())).toEqual([]);
    expect(hasErrors(run(swordsForHire()))).toBe(false);
  });

  it("dead and retired fighters are ignored", () => {
    const w = swordsForHire();
    w.fighters.push(mercenary({ status: "dead" }), mercenary({ status: "retired" }));
    expect(run(w)).toEqual([]);
  });
});

describe("data references", () => {
  it("unknown faction stops the validation", () => {
    expect(codes({ ...swordsForHire(), factionId: "nope" })).toEqual(["data.unknownFaction"]);
  });

  it("origin not chosen yet", () => {
    expect(codes({ ...swordsForHire(), originId: null })).toEqual(["origin.missing"]);
  });

  it("unknown origin", () => {
    expect(codes({ ...swordsForHire(), originId: "nope" })).toEqual(["data.unknownOrigin"]);
  });

  it("unknown fighter profile", () => {
    const w = swordsForHire();
    w.fighters.push(fighter("nope"));
    expect(codes(w)).toEqual(["data.unknownFighter"]);
  });

  it("unknown wargear, skill and spell", () => {
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["spear", "cuirass", "nope"] });
    expect(codes(w)).toEqual(["data.unknownWargear"]);
    const s = withFighter(swordsForHire(), "captain", { skillIds: ["crackshot", "nope"] });
    expect(codes(s)).toEqual(["data.unknownSkill"]);
    const p = withFighter(swordsForHire(), "m1", { spellIds: ["nope"] });
    expect(codes(p)).toContain("data.unknownSpell");
  });
});

describe("budget (recruitment only)", () => {
  it("more than 1000 silver is an error", () => {
    const w = withFighter(swordsForHire(), "doctor", { wargearIds: ["sword", "hand-crossbow"] });
    expect(codes(w)).toEqual(["budget.exceeded"]);
    expect(run(w)[0]?.params).toEqual({ spent: 1019, starting: 1000 });
  });

  it("more than 100 silver left is a warning", () => {
    const w = swordsForHire();
    w.fighters = w.fighters.filter((f) => f.instanceId !== "ogre");
    expect(run(w)).toMatchObject([
      { code: "budget.leftover", severity: "warning", params: { remaining: 155 } },
    ]);
  });

  it("the budget does not apply in campaign mode", () => {
    const w = withFighter(swordsForHire(), "doctor", { wargearIds: ["sword", "hand-crossbow"] });
    expect(codes(w, "campaign")).toEqual([]);
  });
});

describe("composition", () => {
  it("no more than 15 fighters", () => {
    const w = swordsForHire();
    for (let i = 0; i < 7; i += 1) w.fighters.push(fighter("guild-recruit", { wargearIds: ["dagger"] }));
    expect(codes(w, "campaign")).toEqual(["composition.maxFighters"]);
  });

  it("exactly one leader", () => {
    const none = warband(fiveMercs());
    expect(codes(none, "campaign")).toEqual(["composition.leaderCount"]);
    const two = warband([captain(), captain({ instanceId: "c2", skillIds: [] }), ...fiveMercs()]);
    expect(codes(two, "campaign")).toEqual(["composition.leaderCount"]);
  });

  it("the leader imposed by the origin, at recruitment only", () => {
    const w = warband([captain()], { originId: "disgraced-noble" });
    w.fighters.push(...fiveMercs());
    expect(codes(w)).toContain("composition.leaderOrigin");
    expect(codes(w, "campaign")).not.toContain("composition.leaderOrigin");
  });

  it("a promoted champion listed in the succession table can lead in campaign", () => {
    const w = warband([
      captain({ status: "dead" }),
      fighter("guild-champion", { wargearIds: ["sword"], promotedToLeader: true }),
      ...fiveMercs(),
    ]);
    expect(codes(w, "campaign")).toEqual([]);
  });

  it("a champion or henchman outside the succession table cannot be promoted", () => {
    const doctor = warband([
      fighter("plague-doctor", { wargearIds: ["dagger"], promotedToLeader: true }),
      ...fiveMercs(),
    ]);
    expect(codes(doctor, "campaign")).toEqual(["composition.promotedLeader"]);
    const merc = warband([mercenary({ promotedToLeader: true }), ...fiveMercs()]);
    expect(codes(merc, "campaign")).toEqual(["composition.promotedLeader"]);
  });

  it("0-3 champions, 5+ henchmen, 0-2 brutes, 0-3 beasts", () => {
    const champs = [1, 2, 3, 4].map(() => fighter("plague-doctor", { wargearIds: ["dagger"] }));
    expect(codes(warband([captain(), ...champs, ...fiveMercs()]), "campaign")).toEqual([
      "composition.categoryMax",
    ]);
    expect(codes(warband([captain(), ...fiveMercs().slice(1)]), "campaign")).toEqual([
      "composition.categoryMin",
    ]);
    const ogres = [1, 2, 3].map(() => fighter("mercenary-ogre", { wargearIds: ["ogre-mace"] }));
    expect(codes(warband([captain(), ...ogres, ...fiveMercs()]), "campaign")).toEqual([
      "composition.categoryMax",
    ]);
    const dogs = [1, 2, 3, 4].map(() => fighter("hunting-dog", { wargearIds: ["vicious-bite"] }));
    expect(run(warband([captain(), ...dogs, ...fiveMercs()]), "campaign")).toMatchObject([
      { code: "composition.categoryMax", params: { category: "beast", count: 4, max: 3 } },
    ]);
  });

  it("0-1 profiles", () => {
    const wiz = () => fighter("guild-wizard", { wargearIds: ["arcane-staff"], spellIds: ["silence"] });
    expect(codes(warband([captain(), wiz(), wiz(), ...fiveMercs()]), "campaign")).toEqual([
      "composition.profileLimit",
      "spell.sharedSignature",
    ]);
  });
});

describe("wargear", () => {
  it("only from the profile lists", () => {
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["spear", "full-plate"] });
    expect(codes(w, "campaign")).toEqual(["wargear.notAllowed", "henchman.championItem"]);
  });

  it("a purchasable item sold in no list is not allowed", () => {
    const d = cloneData();
    const gm = d.factions[0];
    if (gm === undefined) throw new Error("no faction");
    gm.armouryLists = gm.armouryLists.map((l) => ({
      ...l,
      entries: l.entries.filter((e) => e.wargearId !== "dagger"),
    }));
    const w = withFighter(swordsForHire(), "doctor", { wargearIds: ["dagger"] });
    expect(codes(w, "campaign", d)).toEqual(["wargear.notAllowed"]);
  });

  it("fixed wargear must stay and natural weapons cannot be bought", () => {
    const dogOk = fighter("hunting-dog", { wargearIds: ["vicious-bite"] });
    const dogBare = fighter("hunting-dog");
    expect(codes(warband([captain(), dogOk, ...fiveMercs()]), "campaign")).toEqual([]);
    expect(codes(warband([captain(), dogBare, ...fiveMercs()]), "campaign")).toEqual([
      "wargear.fixedMissing",
      "fighter.unarmed",
    ]);
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["spear", "vicious-bite"] });
    expect(codes(w, "campaign")).toEqual(["wargear.notPurchasable"]);
  });

  it("carrying limit: 2 melee (held items included), 1 ranged, 1 armour, 2 items", () => {
    const t = (ids: string[]) =>
      codes(withFighter(swordsForHire(), "captain", { wargearIds: ids }), "campaign");
    expect(t(["sword", "axe", "dagger"])).toEqual(["carry.melee"]);
    expect(t(["sword", "axe", "shield"])).toEqual(["carry.melee"]);
    expect(t(["sword", "hand-crossbow", "blackpowder-pistol"])).toEqual(["carry.ranged"]);
    expect(t(["sword", "cuirass", "full-plate"])).toEqual(["carry.armour"]);
    expect(t(["sword", "grappling-hook", "loyal-companion", "grappling-hook"])).toEqual(["carry.items"]);
  });

  it("one two-handed weapon per fighter, melee and ranged together (A03)", () => {
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["spear", "crossbow"] });
    expect(codes(w, "campaign")).toEqual(["twoHanded.multiple"]);
  });

  it("held item with two-handed weapons", () => {
    const ranged = withFighter(swordsForHire(), "m1", { wargearIds: ["dagger", "shield", "crossbow"] });
    expect(codes(ranged, "campaign")).toEqual(["twoHanded.heldItemRanged", "twoHanded.offHand"]);
    const melee = withFighter(swordsForHire(), "m1", { wargearIds: ["spear", "shield"] });
    expect(run(melee, "campaign")).toMatchObject([{ code: "twoHanded.heldItemMelee", severity: "info" }]);
  });

  it("off-hand weapon carried with a two-handed weapon is a warning (A04)", () => {
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["sword", "crossbow"] });
    expect(run(w, "campaign")).toMatchObject([{ code: "twoHanded.offHand", severity: "warning" }]);
  });

  it("Full-plate forbids two-handed ranged weapons except the Brace of Pistols", () => {
    const bad = withFighter(swordsForHire(), "captain", {
      wargearIds: ["sword", "full-plate", "long-rifle"],
    });
    expect(codes(bad, "campaign")).toEqual(["twoHanded.offHand", "wargear.restriction"]);
    const ok = withFighter(swordsForHire(), "captain", {
      wargearIds: ["sword", "full-plate", "brace-of-pistols"],
    });
    expect(codes(ok, "campaign")).toEqual(["twoHanded.offHand"]);
  });

  it("Bomb-bolt requires a Crossbow", () => {
    const bad = withFighter(swordsForHire(), "m1", { wargearIds: ["dagger", "bomb-bolt"] });
    expect(codes(bad, "campaign")).toEqual(["wargear.requires"]);
    const ok = withFighter(swordsForHire(), "m1", { wargearIds: ["dagger", "crossbow", "bomb-bolt"] });
    expect(codes(ok, "campaign")).toEqual(["twoHanded.offHand"]);
  });

  it("Rare 0-1 is counted per warband (A01, A02)", () => {
    let w = withFighter(swordsForHire(), "m1", { wargearIds: ["dagger", "fire-bombs"] });
    w = withFighter(w, "m2", { wargearIds: ["dagger", "fire-bombs"] });
    expect(run(w, "campaign").map((d) => d.code)).toEqual([
      "weapon.oneUse",
      "weapon.oneUse",
      "rarity.exceeded",
    ]);
    expect(run(w, "campaign").at(-1)?.params).toEqual({ wargear: "fire-bombs", count: 2, max: 1 });
  });

  it("fighter without melee weapon", () => {
    const w = withFighter(swordsForHire(), "m1", { wargearIds: ["cuirass"] });
    expect(run(w, "campaign")).toMatchObject([
      { code: "fighter.unarmed", severity: "warning", fighterInstanceId: "m1" },
    ]);
  });
});

describe("skills", () => {
  it("picked skills must match the recruitment grants", () => {
    const w = withFighter(swordsForHire(), "captain", { skillIds: ["crackshot"] });
    expect(run(w)).toMatchObject([{ code: "skill.recruitmentCount", params: { expected: 2, actual: 1 } }]);
    expect(codes(w, "campaign")).toEqual([]);
  });

  it("the Noble starts with Duellist plus 1 skill", () => {
    const ok = warband(
      [fighter("noble", { wargearIds: ["sword"], skillIds: ["duellist", "feint"] }), ...fiveMercs()],
      {
        originId: "disgraced-noble",
      },
    );
    expect(codes(ok)).toContain("budget.leftover");
    expect(codes(ok).filter((c) => c.startsWith("skill"))).toEqual([]);
    const missing = warband(
      [fighter("noble", { wargearIds: ["sword"], skillIds: ["feint"] }), ...fiveMercs()],
      {
        originId: "disgraced-noble",
      },
    );
    expect(codes(missing, "campaign")).toEqual(["skill.fixedMissing"]);
  });

  it("table eligibility: Old Dogs is for Mercenary Leaders and Champions", () => {
    const w = withFighter(swordsForHire(), "ogre", { skillIds: ["feint"] });
    expect(codes(w, "campaign")).toEqual(["skill.notEligible", "skill.duplicate"]);
    const ok = withFighter(swordsForHire(), "ogre", { skillIds: ["marksman"] });
    expect(codes(ok, "campaign")).toEqual([]);
  });

  it("a promoted henchman gains the Leader keyword for eligibility", () => {
    const d = cloneData();
    const gm = d.factions[0];
    if (gm === undefined) throw new Error("no faction");
    gm.leaderSuccession.push({ formerLeaderId: "guild-captain", eligibleChampionIds: ["guild-mercenary"] });
    const leader = mercenary({ promotedToLeader: true, skillIds: ["rallying-cry"] });
    expect(codes(warband([leader, ...fiveMercs()]), "campaign", d)).toEqual(["composition.promotedLeader"]);
    expect(codes(warband([leader, ...fiveMercs()]), "campaign", d)).not.toContain("skill.notEligible");
  });

  it("Veteran Skills are open to any fighter", () => {
    const w = withFighter(swordsForHire(), "m1", { skillIds: ["fast-learner"] });
    expect(codes(w, "campaign")).toEqual([]);
  });

  it("eligibility by explicit fighter list", () => {
    const d = cloneData();
    const gm = d.factions[0];
    const table = gm?.skillTables[0];
    if (table === undefined) throw new Error("no table");
    table.eligibility = { kind: "fighters", fighterIds: ["guild-captain"] };
    expect(codes(swordsForHire(), "campaign", d)).toEqual(["skill.notEligible"]);
  });

  it("no duplicate skill in the warband", () => {
    const w = withFighter(swordsForHire(), "champion", { skillIds: ["crackshot"] });
    expect(run(w)).toMatchObject([{ code: "skill.duplicate", fighterInstanceId: "champion" }]);
  });
});

describe("spells", () => {
  const wizardBand = (spellIds: string[], extra = []) =>
    warband(
      [
        fighter("high-wizard-of-the-guild", { wargearIds: ["arcane-staff"], spellIds }),
        ...fiveMercs(),
        ...extra,
      ],
      {
        originId: "wizards-retinue",
      },
    );

  it("the High Wizard picks 2 signature spells from Sanctioned Magic", () => {
    expect(codes(wizardBand(["arcane-missile", "silence"]), "campaign")).toEqual([]);
    expect(codes(wizardBand(["arcane-missile"]))).toContain("spell.recruitmentCount");
  });

  it("spells must come from a known lore", () => {
    expect(codes(wizardBand(["arcane-missile", "godspeed"]), "campaign")).toEqual(["spell.notKnownLore"]);
  });

  it("the same spell cannot be picked twice by one fighter", () => {
    expect(codes(wizardBand(["silence", "silence"]), "campaign")).toEqual(["spell.duplicateOnFighter"]);
  });

  it("two casters sharing a signature spell is only information (A09)", () => {
    const w = wizardBand(["arcane-missile", "silence"]);
    w.fighters.push(fighter("guild-wizard", { wargearIds: ["arcane-staff"], spellIds: ["silence"] }));
    expect(run(w, "campaign")).toMatchObject([
      { code: "spell.sharedSignature", severity: "info", params: { count: 2 } },
    ]);
  });
});

describe("campaign state", () => {
  it("Black Rot with 3 boxes is a warning", () => {
    const w = withFighter(swordsForHire(), "m1", { blackRot: 3 });
    expect(run(w)).toMatchObject([{ code: "blackRot.full", severity: "warning", fighterInstanceId: "m1" }]);
    expect(run(withFighter(swordsForHire(), "m1", { blackRot: 2 }))).toEqual([]);
  });
});

describe("hasErrors", () => {
  it("is true as soon as one diagnostic is an error", () => {
    const w = withFighter(swordsForHire(), "captain", { skillIds: ["crackshot"] });
    expect(hasErrors(run(w))).toBe(true);
    expect(hasErrors(run(withFighter(swordsForHire(), "m1", { blackRot: 3 })))).toBe(false);
  });
});
