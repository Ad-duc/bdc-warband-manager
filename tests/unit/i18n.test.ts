/*
 * File:        tests/unit/i18n.test.ts
 * Role:        Fails when a key exists in one language file only, or is empty.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import en from "../../src/i18n/locales/en.json";
import fr from "../../src/i18n/locales/fr.json";
import glossary from "../../src/i18n/glossary.json";
import { baseKey, flattenKeys } from "../../src/i18n/keys.ts";

describe("locale files", () => {
  const enKeys = flattenKeys(en);
  const frKeys = flattenKeys(fr);

  it("have exactly the same keys", () => {
    expect([...frKeys.keys()].sort()).toEqual([...enKeys.keys()].sort());
  });

  it("have no empty value", () => {
    for (const map of [enKeys, frKeys]) for (const v of map.values()) expect(v.trim()).not.toBe("");
  });

  it("ignore the header block", () => {
    expect([...enKeys.keys()].some((k) => k.startsWith("_header"))).toBe(false);
  });

  it("normalise plural keys", () => {
    expect(baseKey("home.savedCount_other")).toBe("home.savedCount");
    expect(baseKey("home.heading")).toBe("home.heading");
  });
});

describe("glossary", () => {
  it("contains the 27 categories and the imposed core terms", () => {
    expect(glossary.categories).toHaveLength(27);
    const vf = new Map(glossary.entries.map((e) => [e.vo, e.vf]));
    expect(vf.get("warband")).toBe("bande");
    expect(vf.get("Bloodied") ?? vf.get("bloodied")).toMatch(/nsanglant/);
  });
});
