/*
 * File:        src/features/scenarios/Markdown.tsx
 * Role:        Shows a fragment of the French translation (Markdown) with the
 *              rules reader styles. The text is French, so it is marked as such.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useMemo } from "react";
import { renderChapter } from "../reader/markdown.ts";

export function Markdown({
  text,
  idPrefix,
  className = "",
}: {
  text: string;
  idPrefix: string;
  className?: string;
}) {
  const html = useMemo(() => renderChapter(text, idPrefix).html, [text, idPrefix]);
  return (
    <div lang="fr" className={`reader-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
