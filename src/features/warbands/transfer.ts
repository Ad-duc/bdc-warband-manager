/*
 * File:        src/features/warbands/transfer.ts
 * Role:        JSON import of warbands: migration of older schemaVersion
 *              documents, zod validation with readable errors. Re-exports the
 *              export helpers of export.ts. Exports hold ids and numbers only,
 *              so they do not depend on the interface language.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { z } from "zod";
import { WarbandSchema, WARBAND_SCHEMA_VERSION, type Warband } from "../../data/schema.ts";

export {
  EXPORT_FORMAT,
  buildExport,
  downloadExport,
  exportFileName,
  slugify,
  type ExportFile,
} from "./export.ts";

/**
 * Brings an older document to the current schema.
 * - no schemaVersion: treated as version 1.
 * - fighters without promotedToLeader (written before step 2): false.
 */
export function migrateWarband(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const doc = { ...(raw as Record<string, unknown>) };
  if (doc["schemaVersion"] === undefined) doc["schemaVersion"] = 1;
  if (Array.isArray(doc["fighters"]))
    doc["fighters"] = (doc["fighters"] as unknown[]).map((f) =>
      typeof f === "object" && f !== null && !("promotedToLeader" in f)
        ? { ...f, promotedToLeader: false }
        : f,
    );
  return doc;
}

export type ImportResult = { ok: true; warbands: Warband[] } | { ok: false; error: string };

/** Accepts an export file, a bare warband or an array of warbands. */
export function parseImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid-json" };
  }
  let list: unknown[];
  if (Array.isArray(json)) list = json;
  else if (typeof json === "object" && json !== null && "warbands" in json && Array.isArray(json.warbands))
    list = json.warbands as unknown[];
  else list = [json];

  const warbands: Warband[] = [];
  for (const item of list) {
    const migrated = migrateWarband(item);
    const version = (migrated as { schemaVersion?: unknown } | null)?.schemaVersion;
    if (typeof version === "number" && version > WARBAND_SCHEMA_VERSION)
      return { ok: false, error: "newer-version" };
    const parsed = WarbandSchema.safeParse(migrated);
    if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };
    warbands.push(parsed.data);
  }
  if (warbands.length === 0) return { ok: false, error: "empty" };
  return { ok: true, warbands };
}
