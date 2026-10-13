/*
 * File:        tests/unit/names.test.ts
 * Role:        Unit tests of the house name generators: female fighter names
 *              (house tables, Death Covens book rule) and warband names.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { gameData } from "../../src/data/index.ts";
import {
  FEMALE_NAME_TABLES,
  WARBAND_NAME_TABLES,
  feminine,
  randomFighterName,
  randomWarbandName,
} from "../../src/features/names/houseNames.ts";

/** Random source returning the given values in a loop. */
const fixed =
  (...values: number[]) =>
  () => {
    const value = values.shift() ?? 0;
    values.push(value);
    return value;
  };

const book = (id: string): Record<string, string> => {
  const faction = gameData.factions.find((f) => f.id === id);
  if (faction === undefined) throw new Error(id);
  return faction.nameTable.entries;
};

describe("female name tables", () => {
  it("has a full D66 table without duplicates for each faction that needs one", () => {
    for (const [id, table] of Object.entries(FEMALE_NAME_TABLES)) {
      const keys = Object.keys(table);
      expect(keys, id).toHaveLength(36);
      expect(keys[0]).toBe("11");
      expect(keys[35]).toBe("66");
      expect(new Set(Object.values(table)).size, id).toBe(36);
      expect(Object.values(table).every((n) => n.length > 0)).toBe(true);
    }
    expect(Object.keys(FEMALE_NAME_TABLES).sort()).toEqual(
      ["guild-mercenaries", "the-blighted-cloister", "verminkin"].sort(),
    );
  });
});

describe("feminine (Death Covens, p. 96)", () => {
  it("adds -a to a name ending in a consonant", () => {
    expect(feminine("Barovyr")).toBe("Barovyra");
    expect(feminine("Dragul")).toBe("Dragula");
  });
  it("keeps a name ending in a vowel", () => {
    expect(feminine("Vasile")).toBe("Vasile");
    expect(feminine("Mircea")).toBe("Mircea");
  });
});

describe("randomFighterName", () => {
  it("draws male names from the book table", () => {
    expect(randomFighterName("guild-mercenaries", book("guild-mercenaries"), "male", fixed(0, 0))).toBe(
      "Adalbert",
    );
  });
  it("draws female names from the house table", () => {
    expect(randomFighterName("guild-mercenaries", book("guild-mercenaries"), "female", fixed(0, 0))).toBe(
      "Adelheid",
    );
    expect(randomFighterName("verminkin", book("verminkin"), "female", fixed(0.99, 0.99))).toBe("Zizzra");
  });
  it("applies the book rule to the Death Covens", () => {
    expect(randomFighterName("death-covens", book("death-covens"), "female", fixed(0, 0.2))).toBe("Barovyra");
  });
  it("falls back to the book table for an unknown faction", () => {
    expect(randomFighterName("other", { "11": "Solo" }, "female", fixed(0, 0))).toBe("Solo");
  });
});

describe("randomWarbandName", () => {
  it("combines a head and a complement of the faction tables", () => {
    expect(randomWarbandName("guild-mercenaries", fixed(0, 0))).toBe("Les Lames de la Porte Noire");
    expect(randomWarbandName("verminkin", fixed(0, 0))).toBe("Le Clan des Crocs-Rouille");
  });
  it("has a table for every faction of the game data", () => {
    for (const faction of gameData.factions) {
      const table = WARBAND_NAME_TABLES[faction.id];
      expect(table, faction.id).toBeDefined();
      expect(randomWarbandName(faction.id, fixed(0.5, 0.5))).toMatch(/^\S.+ (de|du|des) .+$/);
    }
  });
  it("returns null for a faction without a table", () => {
    expect(randomWarbandName("other")).toBeNull();
  });
});
