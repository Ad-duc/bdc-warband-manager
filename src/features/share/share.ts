/*
 * File:        src/features/share/share.ts
 * Role:        Share links: the warband is compressed with lz-string into the
 *              URL fragment "#w=...", so nothing is sent to any server. The
 *              receiver opens it read-only and can save a copy.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { decompressFromEncodedURIComponent } from "lz-string";
import { parseImport, type ImportResult } from "../warbands/transfer.ts";

export { SHARE_PREFIX, encodeWarband, shareUrl } from "./share-link.ts";

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
