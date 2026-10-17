/*
 * File:        tests/unit/db.test.ts
 * Role:        Dexie persistence: validated save, ordered listing, deletion,
 *              refusal of an invalid warband or campaign, campaigns, schema
 *              snapshot of the current version and reopening of a database
 *              written by the same version.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  DATABASE_NAME,
  createDatabase,
  db as appDb,
  deleteCampaign,
  deleteWarband,
  listCampaigns,
  listWarbands,
  saveCampaign,
  saveWarband,
} from "../../src/db/database.ts";
import type { Campaign, Warband } from "../../src/data/schema.ts";
import { createCampaign } from "../../src/features/groups/groups.ts";

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

describe("campaigns", () => {
  const db = createDatabase("bdc-test-campaigns");
  afterEach(async () => {
    await db.campaigns.clear();
  });

  const campaign = (name: string, updatedAt: string): Campaign => ({
    ...createCampaign(name, "2026-10-13T08:00:00.000Z"),
    updatedAt,
  });

  it("saves and lists campaigns, most recent first", async () => {
    const old = campaign("Hiver", "2026-10-13T08:00:00.000Z");
    const recent = campaign("Printemps", "2026-10-14T08:00:00.000Z");
    expect(await saveCampaign(db, old)).toBe(old.id);
    await saveCampaign(db, recent);
    expect((await listCampaigns(db)).map((c) => c.name)).toEqual(["Printemps", "Hiver"]);
  });

  it("deletes a campaign", async () => {
    const c = campaign("Hiver", "2026-10-13T08:00:00.000Z");
    await saveCampaign(db, c);
    await deleteCampaign(db, c.id);
    expect(await db.campaigns.count()).toBe(0);
  });

  it("refuses an invalid campaign", async () => {
    const bad = { ...campaign("Hiver", "2026-10-13T08:00:00.000Z"), participants: "none" };
    await expect(saveCampaign(db, bad as unknown as Campaign)).rejects.toThrow();
    expect(await db.campaigns.count()).toBe(0);
  });
});

describe("schema", () => {
  it("is at version 1 with the three stores and their indexes", async () => {
    // A change here means a new db.version(n) was added (or, wrongly, an
    // existing one edited): update this snapshot in the same change.
    const db = createDatabase("bdc-test-schema");
    await db.open();
    expect(db.verno).toBe(1);
    const stores = db.tables
      .map((t) => ({
        name: t.name,
        primaryKey: t.schema.primKey.keyPath,
        indexes: t.schema.indexes.map((i) => i.keyPath).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(stores).toEqual([
      { name: "campaigns", primaryKey: "id", indexes: ["updatedAt"] },
      { name: "settings", primaryKey: "key", indexes: [] },
      { name: "warbands", primaryKey: "id", indexes: ["factionId", "name", "updatedAt"] },
    ]);
    db.close();
  });

  it("the application database uses the public name", () => {
    expect(DATABASE_NAME).toBe("bdc-warband-manager");
    expect(appDb.name).toBe(DATABASE_NAME);
  });

  it("reopens a database written earlier and reads the same records", async () => {
    const first = createDatabase("bdc-test-reopen");
    await saveWarband(first, warband("kept", "2026-10-12T10:00:00.000Z"));
    await first.settings.put({ key: "lang", value: "fr" });
    first.close();

    const second = createDatabase("bdc-test-reopen");
    expect((await second.warbands.get("kept"))?.name).toBe("Band kept");
    expect((await second.settings.get("lang"))?.value).toBe("fr");
    await second.delete();
  });
});
