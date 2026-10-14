/*
 * File:        tests/unit/print.test.ts
 * Role:        Print model (fighter blocks, weapon lines, notes, blank blocks,
 *              pagination, duplex card back cells, reminder sheet markup) and
 *              share link encoding.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  buildPrintFighter,
  buildPrintFighters,
  duplexBackCells,
  paginate,
  type PrintLabels,
} from "../../src/print/model.ts";
import { decodeWarband, encodeWarband, shareUrl, SHARE_PREFIX } from "../../src/features/share/share.ts";
import { parseHash } from "../../src/app/router.ts";
import { tokenize } from "../../src/print/richText.ts";
import reminder from "../../src/print/reminder-fr.json";
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
  options: "Options :",
  formOf: (name) => `Forme de ${name}`,
};

describe("print model", () => {
  it("a fighter block holds the roster values in French", () => {
    const captain = swordsForHire().fighters[0];
    if (captain === undefined) throw new Error("fighter");
    const p = buildPrintFighter(index, { ...captain, customName: "Konrad" }, "fr", labels);
    expect(p).toMatchObject({
      name: "Konrad",
      type: "Capitaine de la Guilde",
      category: "leader",
      cost: 188,
      experience: 63,
    });
    expect(p.stats).toEqual({ mv: 5, bl: 3, bw: 4, ar: 4, in: 4, wl: 4, lf: 6 });
    expect(p.weapons).toEqual([
      { name: "Épée", rng: "-", atk: "3", rnd: "-", dmg: "1", crit: "1D3", traits: "Garde, Main secondaire" },
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

describe("duplex card backs", () => {
  it("the stand-alone generator has its own route", () => {
    expect(parseHash("#/card-backs")).toEqual({ name: "cardBacks" });
  });

  it("a full page gets 9 backs", () => {
    expect(duplexBackCells(9)).toEqual(Array.from({ length: 9 }, () => true));
  });

  it("columns are mirrored on a long-edge flip, rows are kept", () => {
    // 1 card in column 1: its back sits in column 3 of the same row
    expect(duplexBackCells(1)).toEqual([false, false, true]);
    // 4 cards: full first row, then column 1 of row 2 mirrored to column 3
    expect(duplexBackCells(4)).toEqual([true, true, true, false, false, true]);
    // 8 cards: last row has columns 1 and 2, mirrored to 3 and 2
    expect(duplexBackCells(8).slice(6)).toEqual([false, true, true]);
  });

  it("no card, no back; more than a page is capped", () => {
    expect(duplexBackCells(0)).toEqual([]);
    expect(duplexBackCells(12)).toHaveLength(9);
  });
});

describe("reminder sheet", () => {
  it("has its own route", () => {
    expect(parseHash("#/reminder")).toEqual({ name: "reminder" });
  });

  it("splits bold, italic, separators and line breaks", () => {
    expect(tokenize("**1 dé** = *1 naturel*{br}a {sep} b")).toEqual([
      "**1 dé**",
      " = ",
      "*1 naturel*",
      "{br}",
      "a ",
      "{sep}",
      " b",
    ]);
  });

  it("keeps the 19 weapon traits and the real page numbers of v1.03", () => {
    expect(reminder.traits.rows).toHaveLength(19);
    expect(reminder.traits.note).toContain("p. 29-30");
    expect(reminder.setup.steps.join(" ")).toContain("p. 35");
    expect(reminder.setup.steps.join(" ")).toContain("p. 34");
    expect(JSON.stringify(reminder)).not.toContain("xx");
  });
});
