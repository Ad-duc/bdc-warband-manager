/*
 * File:        tests/unit/warbands.test.ts
 * Role:        Warband factory (origin, leader, trackers, fighters), JSON
 *              transfer (file name, migration, import errors) and hash routes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  applyOrigin,
  createFighter,
  createWarband,
  duplicateWarband,
  fighterLabel,
  rollTracker,
} from "../../src/features/warbands/factory.ts";
import {
  buildExport,
  exportFileName,
  migrateWarband,
  parseImport,
  slugify,
} from "../../src/features/warbands/transfer.ts";
import { hrefFor, parseHash } from "../../src/app/router.ts";
import { validateWarband } from "../../src/rules/index.ts";
import { data, guild, sequence, swordsForHire } from "../fixtures/warbands.ts";

describe("factory", () => {
  it("a new warband is valid against the schema and has no origin yet", () => {
    const w = createWarband("fr", "guild-mercenaries");
    expect(w.originId).toBeNull();
    expect(validateWarband(w, data, "recruitment").map((d) => d.code)).toContain("origin.missing");
  });

  it("picking an origin recruits the imposed leader and sets the stronghold", () => {
    const w = applyOrigin(
      createWarband("fr", "guild-mercenaries"),
      guild(),
      "disgraced-noble",
      sequence(0.5),
    );
    expect(w.strongholdId).toBe("dilapidated-manor");
    expect(w.strongholdTrackers["vintage-wine"]).toBe(8);
    expect(w.fighters.map((f) => f.profileId)).toEqual(["noble"]);
    expect(w.fighters[0]?.skillIds).toEqual(["duellist"]);
  });

  it("changing origin replaces the leader and keeps the others", () => {
    let w = applyOrigin(createWarband("fr", "guild-mercenaries"), guild(), "swords-for-hire");
    const merc = guild().fighters.find((f) => f.id === "guild-mercenary");
    if (merc === undefined) throw new Error("profile");
    w = { ...w, fighters: [...w.fighters, createFighter(merc)] };
    w = applyOrigin(w, guild(), "witch-hunters-guild");
    expect(w.fighters.map((f) => f.profileId)).toEqual(["witch-hunter", "guild-mercenary"]);
    expect(applyOrigin(w, guild(), "nope")).toBe(w);
  });

  it("a new fighter carries its fixed wargear and rolled experience", () => {
    const dog = guild().fighters.find((f) => f.id === "hunting-dog");
    const ogre = guild().fighters.find((f) => f.id === "mercenary-ogre");
    if (dog === undefined || ogre === undefined) throw new Error("profile");
    expect(createFighter(dog).wargearIds).toEqual(["vicious-bite"]);
    expect(createFighter(ogre, sequence(0)).experience).toBe(21);
  });

  it("tracker formulas", () => {
    expect(rollTracker("2d6", sequence(0))).toBe(2);
    expect(rollTracker("d6+1", sequence(0.99))).toBe(7);
    expect(rollTracker("3")).toBe(3);
    expect(rollTracker("x")).toBe(0);
  });

  it("duplicate gets a new id and a suffix; labels fall back to the profile", () => {
    const w = { ...swordsForHire(), name: "Lames" };
    const copy = duplicateWarband(w, "(copie)");
    expect(copy.id).not.toBe(w.id);
    expect(copy.name).toBe("Lames (copie)");
    const f = w.fighters[0];
    if (f === undefined) throw new Error("fighter");
    expect(fighterLabel(f, "Guild Captain")).toBe("Guild Captain");
    expect(fighterLabel({ ...f, customName: "Konrad" }, "Guild Captain")).toBe("Konrad");
  });
});

describe("transfer", () => {
  it("file names follow bdc_<name>_<date>.json", () => {
    const date = new Date("2026-10-12T10:00:00Z");
    expect(slugify("Épées & Cie !")).toBe("epees-cie");
    expect(slugify("***")).toBe("warband");
    expect(exportFileName([{ ...swordsForHire(), name: "Les Lames" }], date)).toBe(
      "bdc_les-lames_2026-10-12.json",
    );
    expect(exportFileName([swordsForHire(), swordsForHire()], date)).toBe("bdc_all_2026-10-12.json");
  });

  it("round trip of an export file", () => {
    const file = buildExport([swordsForHire()]);
    const result = parseImport(JSON.stringify(file));
    expect(result.ok && result.warbands[0]?.fighters).toHaveLength(9);
    expect(parseImport(JSON.stringify(swordsForHire())).ok).toBe(true);
    expect(parseImport(JSON.stringify([swordsForHire()])).ok).toBe(true);
  });

  it("migrates documents written before step 2", () => {
    const old = JSON.parse(JSON.stringify(swordsForHire())) as Record<string, unknown>;
    delete old["schemaVersion"];
    for (const f of old["fighters"] as Record<string, unknown>[]) delete f["promotedToLeader"];
    expect(parseImport(JSON.stringify(old)).ok).toBe(true);
    expect(migrateWarband(null)).toBeNull();
  });

  it("readable errors", () => {
    expect(parseImport("{")).toEqual({ ok: false, error: "invalid-json" });
    expect(parseImport("[]")).toEqual({ ok: false, error: "empty" });
    expect(parseImport(JSON.stringify({ ...swordsForHire(), schemaVersion: 9 }))).toEqual({
      ok: false,
      error: "newer-version",
    });
    const bad = parseImport(JSON.stringify({ ...swordsForHire(), name: 3 }));
    expect(!bad.ok && bad.error).toContain("name");
  });
});

describe("router", () => {
  it("parses and builds hash routes", () => {
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/warband/abc-1")).toEqual({ name: "wizard", id: "abc-1" });
    expect(parseHash("#/other")).toEqual({ name: "home" });
    expect(hrefFor({ name: "wizard", id: "x" })).toBe("#/warband/x");
    expect(hrefFor({ name: "home" })).toBe("#/");
  });

  it("has a route for the compendium", () => {
    expect(parseHash("#/compendium")).toEqual({ name: "compendium" });
    expect(hrefFor({ name: "compendium" })).toBe("#/compendium");
  });
});
