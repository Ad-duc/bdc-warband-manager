/*
 * File:        src/features/warbands/transfer.ts
 * Role:        JSON export and import of warbands: file name, migration of
 *              older schemaVersion documents, zod validation with readable
 *              errors. Exports hold ids and numbers only, so they do not depend
 *              on the interface language.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { z } from "zod";
import { WarbandSchema, WARBAND_SCHEMA_VERSION, type Warband } from "../../data/schema.ts";

export const EXPORT_FORMAT = "bdc-warband-manager";

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  warbands: Warband[];
}

/** "Épées & Cie" -> "epees-cie" */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "warband"
  );
}

/** bdc_<warband-name>_<yyyy-mm-dd>.json, or bdc_all_<date>.json for several. */
export function exportFileName(warbands: Warband[], date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const first = warbands[0];
  const name = warbands.length === 1 && first !== undefined ? slugify(first.name) : "all";
  return `bdc_${name}_${day}.json`;
}

export function buildExport(warbands: Warband[], date: Date = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, exportedAt: date.toISOString(), warbands };
}

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

/** Triggers a browser download of the export file. */
export function downloadExport(warbands: Warband[]): void {
  const blob = new Blob([JSON.stringify(buildExport(warbands), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(warbands);
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
