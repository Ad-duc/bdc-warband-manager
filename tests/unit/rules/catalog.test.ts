/*
 * File:        tests/unit/rules/catalog.test.ts
 * Role:        Every rule code has a message in both languages, a page and a
 *              Markdown reference; index helpers behave as documented.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import en from "../../../src/i18n/locales/en.json";
import fr from "../../../src/i18n/locales/fr.json";
import { flattenKeys } from "../../../src/i18n/keys.ts";
import { RULE_CODES, RULES, effectiveCategory, findFaction, indexFaction } from "../../../src/rules/index.ts";
import { cloneData, data, fighter, guild } from "../../fixtures/warbands.ts";

describe("rule catalogue", () => {
  const enKeys = flattenKeys(en);
  const frKeys = flattenKeys(fr);

  it.each(RULE_CODES)("%s has an EN and FR message and a source", (code) => {
    expect(enKeys.get(`rules.${code}`)).toBeTruthy();
    expect(frKeys.get(`rules.${code}`)).toBeTruthy();
    expect(RULES[code].ref.page).toBeGreaterThan(0);
    expect(RULES[code].ref.md).toMatch(/\.md > /);
  });

  it("severity labels exist in both languages", () => {
    for (const s of ["error", "warning", "info"]) {
      expect(enKeys.has(`severity.${s}`)).toBe(true);
      expect(frKeys.has(`severity.${s}`)).toBe(true);
    }
  });
});

describe("lookup", () => {
  it("finds factions and caches the index per common data", () => {
    expect(findFaction(data, "guild-mercenaries")?.id).toBe("guild-mercenaries");
    expect(findFaction(data, "nope")).toBeUndefined();
    const a = indexFaction(data.common, guild());
    expect(indexFaction(data.common, guild())).toBe(a);
    const other = cloneData();
    expect(indexFaction(other.common, guild())).not.toBe(a);
  });

  it("a promoted fighter counts as the leader", () => {
    const p = indexFaction(data.common, guild()).fighters.get("guild-champion");
    if (p === undefined) throw new Error("profile");
    expect(effectiveCategory(fighter("guild-champion"), p)).toBe("champion");
    expect(effectiveCategory(fighter("guild-champion", { promotedToLeader: true }), p)).toBe("leader");
  });
});
