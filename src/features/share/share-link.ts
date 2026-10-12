/*
 * File:        src/features/share/share-link.ts
 * Role:        Builds the share link of a warband (lz-string compressed JSON in
 *              the URL hash). Decoding, which needs the zod schemas, is in
 *              share.ts.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { compressToEncodedURIComponent } from "lz-string";
import type { Warband } from "../../data/schema.ts";

export const SHARE_PREFIX = "#w=";

export function encodeWarband(warband: Warband): string {
  return compressToEncodedURIComponent(JSON.stringify(warband));
}

/** Full link, built from the current page address. */
export function shareUrl(
  warband: Warband,
  location: Pick<Location, "origin" | "pathname"> = window.location,
): string {
  return `${location.origin}${location.pathname}${SHARE_PREFIX}${encodeWarband(warband)}`;
}
