/*
 * File:        src/print/richText.ts
 * Role:        Light markup of the printed reference texts (reminder sheet):
 *              **bold**, *italic*, {sep} diamond separator and {br} line
 *              break, split into tokens for rendering.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

export function tokenize(text: string): string[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{sep\}|\{br\})/).filter((t) => t !== "");
}
