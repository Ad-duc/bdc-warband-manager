/*
 * File:        src/features/share/share.ts
 * Role:        Share links: the warband is compressed with lz-string into the
 *              URL fragment "#w=...", so nothing is sent to any server. The
 *              receiver opens it read-only and can save a copy.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Warband } from "../../data/schema.ts";
import { parseImport, type ImportResult } from "../warbands/transfer.ts";

export const SHARE_PREFIX = "#w=";

export function encodeWarband(warband: Warband): string {
  return compressToEncodedURIComponent(JSON.stringify(warband));
}

export function decodeWarband(payload: string): ImportResult {
  let text: string | null;
  try {
    text = decompressFromEncodedURIComponent(payload);
  } catch {
    text = null;
  }
  if (text === null || text === "") return { ok: false, error: "invalid-json" };
  return parseImport(text);
}

/** Full link, built from the current page address. */
export function shareUrl(
  warband: Warband,
  location: Pick<Location, "origin" | "pathname"> = window.location,
): string {
  return `${location.origin}${location.pathname}${SHARE_PREFIX}${encodeWarband(warband)}`;
}
