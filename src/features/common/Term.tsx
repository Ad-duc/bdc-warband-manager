/*
 * File:        src/features/common/Term.tsx
 * Role:        Game term in the active language. In French the original English
 *              term is given as a tooltip (glossary rule), eg. "Ensanglanté"
 *              with "Bloodied". No tooltip when both spellings are identical.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { LocalizedText } from "../../data/schema.ts";
import { useFormatter } from "../../i18n/text.ts";

export function Term({ text, className }: { text: LocalizedText; className?: string }) {
  const f = useFormatter();
  const shown = f.text(text);
  if (f.lang === "en" || text.en === text.fr) return <span className={className}>{shown}</span>;
  return (
    <abbr title={text.en} className={`no-underline decoration-dotted hover:underline ${className ?? ""}`}>
      {shown}
    </abbr>
  );
}
