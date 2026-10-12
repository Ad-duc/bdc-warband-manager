/*
 * File:        src/i18n/keys.ts
 * Role:        Helpers shared by the i18n checker and the unit tests: flatten a
 *              locale file into dotted keys and normalise plural suffixes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

/** Plural suffixes used by i18next (CLDR categories). */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Flattens nested objects into "a.b.c" keys; the "_header" block is ignored. */
export function flattenKeys(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value !== "object" || value === null) return out;
  for (const [key, child] of Object.entries(value)) {
    if (prefix === "" && key === "_header") continue;
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof child === "string") out.set(path, child);
    else for (const [k, v] of flattenKeys(child, path)) out.set(k, v);
  }
  return out;
}

/** "home.savedCount_other" becomes "home.savedCount". */
export function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, "");
}
