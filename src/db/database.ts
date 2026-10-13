/*
 * File:        src/db/database.ts
 * Role:        Local persistence with Dexie (IndexedDB). Version 1 of the
 *              schema stores warbands, campaigns and settings. Every record is
 *              validated with zod before it is written.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import Dexie, { type EntityTable } from "dexie";
import type { Campaign, Warband } from "../data/schema.ts";

/** The zod schemas are loaded on the first save only, to keep the first screen light. */
const schemas = () => import("../data/schema.ts");

export interface SettingRecord {
  key: string;
  value: unknown;
}

export const DATABASE_NAME = "bdc-warband-manager";

export type BdcDatabase = Dexie & {
  warbands: EntityTable<Warband, "id">;
  campaigns: EntityTable<Campaign, "id">;
  settings: EntityTable<SettingRecord, "key">;
};

/**
 * Creates the database. Schema history:
 * - v1: warbands (by name, faction and last update), campaigns, settings.
 * A new version is added with db.version(n).stores(...).upgrade(tx => ...),
 * never by editing an existing version.
 */
export function createDatabase(name: string = DATABASE_NAME): BdcDatabase {
  const db = new Dexie(name) as BdcDatabase;
  db.version(1).stores({
    warbands: "id, name, factionId, updatedAt",
    campaigns: "id, updatedAt",
    settings: "key",
  });
  return db;
}

export const db = createDatabase();

/** Validates then stores a warband; returns its id. */
export async function saveWarband(target: BdcDatabase, warband: Warband): Promise<string> {
  const { WarbandSchema } = await schemas();
  const valid = WarbandSchema.parse(warband);
  return target.warbands.put(valid);
}

/** Warbands sorted by last update, most recent first. */
export async function listWarbands(target: BdcDatabase): Promise<Warband[]> {
  return target.warbands.orderBy("updatedAt").reverse().toArray();
}

export async function deleteWarband(target: BdcDatabase, id: string): Promise<void> {
  await target.warbands.delete(id);
}

/** Group campaigns sorted by last update, most recent first. */
export async function listCampaigns(target: BdcDatabase): Promise<Campaign[]> {
  return target.campaigns.orderBy("updatedAt").reverse().toArray();
}

export async function deleteCampaign(target: BdcDatabase, id: string): Promise<void> {
  await target.campaigns.delete(id);
}

export async function saveCampaign(target: BdcDatabase, campaign: Campaign): Promise<string> {
  const { CampaignSchema } = await schemas();
  return target.campaigns.put(CampaignSchema.parse(campaign));
}
