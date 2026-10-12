/*
 * File:        tests/unit/db.test.ts
 * Role:        Dexie persistence: validated save, ordered listing, deletion,
 *              and refusal of an invalid warband.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { afterEach, describe, expect, it } from "vitest";
import { createDatabase, deleteWarband, listWarbands, saveWarband } from "../../src/db/database.ts";
import type { Warband } from "../../src/data/schema.ts";

function warband(id: string, updatedAt: string): Warband {
  return {
    schemaVersion: 1,
    id,
    name: `Band ${id}`,
    factionId: "guild-mercenaries",
    originId: "swords-for-hire",
    creationLanguage: "fr",
    mode: "recruitment",
    createdAt: "2026-10-12T09:00:00.000Z",
    updatedAt,
    stash: { silver: 0, leechJars: 0, items: [] },
    strongholdId: "guild-barracks",
    strongholdTrackers: {},
    holdings: [],
    counters: { battlesFought: 0, victories: 0, holdingsRansacked: 0, fightersLost: 0 },
    notes: "",
    fighters: [],
    battleLog: [],
  };
}

describe("database", () => {
  const db = createDatabase("bdc-test");
  afterEach(async () => {
    await db.warbands.clear();
  });

  it("saves and lists warbands, most recent first", async () => {
    await saveWarband(db, warband("a", "2026-10-12T10:00:00.000Z"));
    await saveWarband(db, warband("b", "2026-10-12T11:00:00.000Z"));
    const list = await listWarbands(db);
    expect(list.map((w) => w.id)).toEqual(["b", "a"]);
  });

  it("deletes a warband", async () => {
    await saveWarband(db, warband("a", "2026-10-12T10:00:00.000Z"));
    await deleteWarband(db, "a");
    expect(await db.warbands.count()).toBe(0);
  });

  it("refuses an invalid warband", async () => {
    const bad = { ...warband("x", "2026-10-12T10:00:00.000Z"), factionId: "Guild Mercenaries" };
    await expect(saveWarband(db, bad)).rejects.toThrow();
    expect(await db.warbands.count()).toBe(0);
  });
});
