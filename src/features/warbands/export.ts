/*
 * File:        src/features/warbands/export.ts
 * Role:        JSON export of warbands: file name, export document and browser
 *              download. Free of zod so that the home screen stays light; the
 *              import side lives in transfer.ts.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { Warband } from "../../data/schema.ts";

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
