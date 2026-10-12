/*
 * File:        src/features/changelog/changelog.ts
 * Role:        Loads the changelog shown by the "What's new" page:
 *              CHANGELOG.md in English, CHANGELOG.fr.md in French, without
 *              their header comment. Each file is a separate chunk loaded on
 *              demand and precached for offline use.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { Language } from "../../i18n/index.ts";

const loaders: Record<Language, () => Promise<string>> = {
  en: async () => (await import("../../../CHANGELOG.md?raw")).default,
  fr: async () => (await import("../../../CHANGELOG.fr.md?raw")).default,
};

/** Removes the leading HTML comment that holds the file header. */
export function stripHeader(markdown: string): string {
  return markdown.replace(/^\s*<!--[\s\S]*?-->\s*/, "");
}

export async function loadChangelog(language: Language): Promise<string> {
  return stripHeader(await loaders[language]());
}
