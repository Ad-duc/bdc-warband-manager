/*
 * File:        tests/unit/print.test.ts
 * Role:        Print model (fighter blocks, weapon lines, notes, blank blocks,
 *              pagination) and share link encoding.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { buildPrintFighter, buildPrintFighters, paginate, type PrintLabels } from "../../src/print/model.ts";
import { decodeWarband, encodeWarband, shareUrl, SHARE_PREFIX } from "../../src/features/share/share.ts";
import { parseHash } from "../../src/app/router.ts";
import { indexFaction } from "../../src/rules/index.ts";
import { data, fighter, guild, swordsForHire } from "../fixtures/warbands.ts";

const index = indexFaction(data.common, guild());
const labels: PrintLabels = {
  flame: "Flamme",
  unarmed: "Frappe à mains nues",
  wargear: "Équipement :",
  skills: "Compétences :",
  spells: "Sorts :",
  injuries: "Blessures :",
  promoted: "Chef promu.",
  moreWeapons: "Autres armes :",
};

describe("print model", () => {
  it("a fighter block holds the roster values in French", () => {
    const captain = swordsForHire().fighters[0];
    if (captain === undefined) throw new Error("fighter");
    const p = buildPrintFighter(index, { ...captain, customName: "Konrad" }, "fr", labels);
    expect(p).toMatchObject({
      name: "Konrad",
      type: "Guild Captain",
      category: "leader",
      cost: 188,
      experience: 63,
    });
    expect(p.stats).toEqual({ mv: 5, bl: 3, bw: 4, ar: 4, in: 4, wl: 4, lf: 6 });
    expect(p.weapons).toEqual([
      { name: "Épée", rng: "-", atk: "3", rnd: "-", dmg: "1", crit: "D3", traits: "Garde, Main secondaire" },
    ]);
    expect(p.notes).toEqual([
      "Équipement : Cuirasse, Bouclier",
      "Compétences : Cri de ralliement, Fine gâchette",
    ]);
  });

  it("ranged weapons, rare traits, granted attacks, overflow, spells and injuries", () => {
    const f = fighter("guild-captain", {
      wargearIds: ["sword", "dagger", "loyal-companion", "long-rifle"],
      injuries: [{ id: "i", text: "Old wound", tableEntryId: null, statModifiers: {} }],
      promotedToLeader: true,
    });
    const p = buildPrintFighter(index, f, "en", {
      ...labels,
      wargear: "Wargear:",
      moreWeapons: "Other weapons:",
    });
    expect(p.weapons.map((w) => w.name)).toEqual(["Sword", "Dagger", "Loyal Companion (+1)"]);
    expect(p.notes).toContain("Other weapons: Long Rifle");
    expect(p.notes).toContain("Blessures : Old wound");
    expect(p.notes[0]).toBe("Chef promu.");
    const merc = buildPrintFighter(
      index,
      fighter("guild-mercenary", { wargearIds: ["fire-bombs"] }),
      "en",
      labels,
    );
    expect(merc.weapons[0]).toMatchObject({ name: "Frappe à mains nues", atk: "2", crit: "1" });
    expect(merc.weapons[1]).toMatchObject({ rng: '8"', traits: "Blast, One-use, Rare 0-1, Scare" });
    const wiz = buildPrintFighter(index, fighter("guild-wizard", { spellIds: ["silence"] }), "fr", labels);
    expect(wiz.notes).toEqual(["Sorts : Silence"]);
    const flamer = buildPrintFighter(
      index,
      fighter("guild-mercenary", { wargearIds: ["flamethrower"] }),
      "fr",
      labels,
    );
    expect(flamer.weapons[1]?.rng).toBe("Flamme");
  });

  it("dead fighters are not printed, blank blocks complete the roster to 15", () => {
    const w = swordsForHire();
    w.fighters.push(fighter("guild-mercenary", { status: "dead" }));
    expect(buildPrintFighters(index, w, "fr", labels, false)).toHaveLength(9);
    const blank = buildPrintFighters(index, w, "fr", labels, true);
    expect(blank).toHaveLength(15);
    expect(blank.filter((x) => x === null)).toHaveLength(6);
  });

  it("5 fighters per roster page, 9 cards per page", () => {
    expect(paginate([1, 2, 3, 4, 5, 6, 7, 8, 9], 5)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9],
    ]);
    expect(paginate([], 9)).toEqual([]);
  });
});

describe("share links", () => {
  it("round trip through the URL fragment", () => {
    const w = swordsForHire();
    const url = shareUrl(w, { origin: "https://example.org", pathname: "/bdc-warband-manager/" });
    expect(url.startsWith(`https://example.org/bdc-warband-manager/${SHARE_PREFIX}`)).toBe(true);
    const route = parseHash(url.slice(url.indexOf("#")));
    expect(route.name).toBe("shared");
    const decoded = decodeWarband(encodeWarband(w));
    expect(decoded.ok && decoded.warbands[0]).toEqual(w);
  });

  it("a damaged link is refused", () => {
    expect(decodeWarband("")).toEqual({ ok: false, error: "invalid-json" });
    expect(decodeWarband("%%%").ok).toBe(false);
  });
});
