/*
 * File:        tests/unit/campaign-preview.test.ts
 * Role:        Unit tests of the Campaign chapter preview data (Curiosities,
 *              Explore the City): D66 helpers, coverage of both tables,
 *              integrity checks and the values read on the preview pages.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { gameData } from "../../src/data/index.ts";
import raw from "../../src/data/campaign/preview.json";
import { campaignPreview as preview, loadCampaignPreview } from "../../src/data/campaign/index.ts";
import {
  checkPreviewIntegrity,
  D66_VALUES,
  expandD66,
  type CampaignPreview,
} from "../../src/data/campaign/schema.ts";

const traits = new Set(gameData.common.weaponTraits.map((t) => t.key));
const factionIds = new Set(gameData.factions.map((f) => f.id));
const clone = (): CampaignPreview => structuredClone(preview);
const resultAt = (roll: string): string | undefined =>
  preview.exploration.results.find((r) => r.ranges.some((x) => expandD66(x).includes(roll)))?.id;
const itemAt = (roll: string): string | undefined =>
  preview.curiosities.items.find((i) => expandD66(i.roll).includes(roll))?.id;

describe("D66 helpers", () => {
  it("lists the 36 results from 11 to 66", () => {
    expect(D66_VALUES).toHaveLength(36);
    expect(D66_VALUES[0]).toBe("11");
    expect(D66_VALUES[35]).toBe("66");
    expect(D66_VALUES).not.toContain("17");
  });

  it("expands single rolls and ranges across tens", () => {
    expect(expandD66("52")).toEqual(["52"]);
    expect(expandD66("41-42")).toEqual(["41", "42"]);
    expect(expandD66("21-36")).toEqual([...expandD66("21-26"), ...expandD66("31-36")]);
    expect(expandD66("21-36")).toHaveLength(12);
  });
});

describe("campaign preview data", () => {
  it("is marked as a preview, apart from the playtest version", () => {
    expect(preview.status).toBe("preview");
    expect(preview.source.kind).toBe("discord-preview");
    expect(preview.source.basedOn).toBe("playtest-1.03");
  });

  it("passes its integrity checks", () => {
    expect(checkPreviewIntegrity(preview, traits, factionIds)).toEqual([]);
    expect(() => loadCampaignPreview(raw, gameData)).not.toThrow();
  });

  it("maps the exploration table as printed (p. 153)", () => {
    expect(resultAt("11")).toBe("shadows-lie-ahead");
    expect(resultAt("34")).toBe("quiet-night");
    expect(resultAt("52")).toBe("quiet-night");
    expect(resultAt("53")).toBe("leech-pools");
    expect(resultAt("55")).toBe("a-hidden-stash");
    expect(resultAt("63")).toBe("a-treasure-horde");
    expect(resultAt("66")).toBe("into-the-catacombs");
  });

  it("numbers the last two wondrous tonics 45 and 46 (typo 15 and 16 on p. 137)", () => {
    expect(itemAt("45")).toBe("tonic-of-mind");
    expect(itemAt("46")).toBe("tonic-of-levitation");
    expect(itemAt("15")).toBe("silver-locket");
  });

  it("finds a number of jars and tonics equal to the units", () => {
    const counted = preview.curiosities.groups.filter((g) => g.countFromUnits).map((g) => g.id);
    expect(counted).toEqual(["jar-of-canal-leeches", "healing-tonic"]);
  });

  it("gives a sell value to stash items only", () => {
    const sold = preview.curiosities.items.filter((i) => i.sellValue !== null).map((i) => i.id);
    expect(sold).toHaveLength(10);
    expect(preview.curiosities.items.find((i) => i.id === "gilded-brass-pocket-watch")?.sellValue).toBe(
      "3d6x5",
    );
  });

  it("keeps the scouting party limits of p. 153", () => {
    const party = preview.exploration.scoutingParty;
    expect(party.leaderOrChampion).toEqual({ min: 1, max: 1 });
    expect(party.henchman).toEqual({ min: 1, max: 3 });
    expect(party.beast).toEqual({ min: 0, max: 1 });
    expect(party.brute).toEqual({ min: 0, max: 0 });
  });

  it("keeps the Dwarven Bomb profile as printed, critical damage included (A44)", () => {
    const bomb = preview.curiosities.items.find((i) => i.id === "dwarven-bomb");
    expect(bomb?.weapon).toMatchObject({ range: 8, rend: -1, damage: 2, critDamage: "d3+1" });
  });
});

describe("preview integrity checks", () => {
  it("reports a D66 value covered twice or not at all", () => {
    const p = clone();
    const last = p.exploration.results.at(-1);
    if (last) last.ranges = ["65"];
    expect(checkPreviewIntegrity(p, traits, factionIds)).toEqual(
      expect.arrayContaining([
        "Exploration table: D66 65 is covered 2 times",
        "Exploration table: D66 66 is covered 0 times",
      ]),
    );
  });

  it("reports an item outside its group, an unknown group and duplicate ids", () => {
    const p = clone();
    const [first, second, third] = p.curiosities.items;
    if (!first || !second || !third) throw new Error("missing items");
    first.group = "prized-finds";
    second.group = "nowhere";
    third.id = first.id;
    const problems = checkPreviewIntegrity(p, traits, factionIds);
    expect(problems).toContain("blackened-silver-spoon: roll 11 is outside group 61-66");
    expect(problems).toContain('bronze-saint-statuette: unknown group "nowhere"');
    expect(problems).toContain('Duplicate curiosity id "blackened-silver-spoon"');
  });

  it("reports a stash item without sell value and an unknown trait", () => {
    const p = clone();
    const spoon = p.curiosities.items.find((i) => i.id === "blackened-silver-spoon");
    const fire = p.curiosities.items.find((i) => i.id === "alchemists-fire");
    if (!spoon || !fire?.weapon) throw new Error("missing items");
    spoon.sellValue = null;
    fire.weapon.traits = [{ key: "sparkly" }];
    const problems = checkPreviewIntegrity(p, traits, factionIds);
    expect(problems).toContain(
      "blackened-silver-spoon: a stash item needs a sell value, and only a stash item",
    );
    expect(problems).toContain('alchemists-fire: unknown weapon trait "sparkly"');
  });

  it("reports an unknown faction and a duplicate result id", () => {
    const p = clone();
    const hallowed = p.exploration.results.find((r) => r.id === "hallowed-ground");
    const first = p.exploration.results[0];
    if (!hallowed?.options[0] || !first) throw new Error("missing result");
    hallowed.options[0].factionId = "dwarves";
    first.id = "quiet-night";
    const problems = checkPreviewIntegrity(p, traits, factionIds);
    expect(problems).toContain('hallowed-ground: unknown faction "dwarves"');
    expect(problems).toContain('Duplicate exploration result id "quiet-night"');
  });

  it("refuses a file that breaks its integrity", () => {
    const bad = { ...structuredClone(raw), exploration: { ...raw.exploration, results: [] } };
    expect(() => loadCampaignPreview(bad, gameData)).toThrow();
  });
});
