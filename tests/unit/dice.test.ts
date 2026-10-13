/*
 * File:        tests/unit/dice.test.ts
 * Role:        Dice notation shown to players: every die states its number of
 *              dice (1D6), in interface strings, data texts, dice expressions
 *              and characteristics; D66 tables and other words are untouched.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import i18n from "../../src/i18n/index.ts";
import { hasBareDie, withDiceCount } from "../../src/i18n/dice.ts";
import { formatDice, formatStat, pick } from "../../src/i18n/text.ts";

describe("withDiceCount", () => {
  it("adds the missing count and writes D in upper case", () => {
    expect(withDiceCount("Roll a D6.")).toBe("Roll a 1D6.");
    expect(withDiceCount("suffer d3 damage")).toBe("suffer 1D3 damage");
    expect(withDiceCount('60+D6, Move + D6"')).toBe('60+1D6, Move + 1D6"');
    expect(withDiceCount("scatter D6x2, D6x10 silver")).toBe("scatter 1D6x2, 1D6x10 silver");
    expect(withDiceCount("(D12)")).toBe("(1D12)");
  });

  it("keeps counted dice, D66 tables and other words", () => {
    expect(withDiceCount("2D6, 3D6x5, 2d6")).toBe("2D6, 3D6x5, 2D6");
    expect(withDiceCount("D66 table, D03, AD6, D60, D6s")).toBe("D66 table, D03, AD6, D60, D6s");
  });

  it("detects a die without its count", () => {
    expect(hasBareDie("roll 1D6")).toBe(false);
    expect(hasBareDie("roll D6")).toBe(true);
    expect(hasBareDie("roll D6")).toBe(true);
  });
});

describe("display", () => {
  it("formats dice expressions and characteristics", () => {
    expect(formatDice("d3")).toBe("1D3");
    expect(formatDice("d3+1")).toBe("1D3+1");
    expect(formatDice("2d6")).toBe("2D6");
    expect(formatDice(4)).toBe("4");
    expect(formatDice(null)).toBe("-");
    expect(formatStat("mv", "d6")).toBe('1D6"');
  });

  it("applies the rule to data texts and interface strings", () => {
    expect(pick({ en: "heals d3 life", fr: "soigne D3 Vie" }, "fr")).toBe("soigne 1D3 Vie");
    i18n.addResource("en", "translation", "test.dice", "Roll D6 then {{n}}");
    expect(i18n.t("test.dice", { lng: "en", n: "d3" })).toBe("Roll 1D6 then 1D3");
  });
});
