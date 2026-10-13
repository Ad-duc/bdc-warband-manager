/*
 * File:        src/features/reader/markdown.ts
 * Role:        Turns a translation chapter (Markdown) into HTML for the rules
 *              reader: GitHub tables, an id on every heading so the contents
 *              list can jump to it, wide tables wrapped in a scrolling box,
 *              raw HTML escaped rather than rendered, and every die written
 *              with its count (1D6).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Marked, type Tokens } from "marked";
import { withDiceCount } from "../../i18n/dice.ts";

export interface Section {
  id: string;
  text: string;
}

export interface RenderedChapter {
  html: string;
  /** Second-level headings, for the contents list. */
  sections: Section[];
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Heading text without the "(*original term*)" notes and Markdown marks. */
export function plainHeading(text: string): string {
  return text
    .replace(/\s*\(\*[^)]*\*\)/g, "")
    .replace(/[*_`]/g, "")
    .trim();
}

/** "Règles de base : la Cité" -> "regles-de-base-la-cite" */
export function slugify(text: string): string {
  return (
    plainHeading(text)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

export function renderChapter(markdown: string): RenderedChapter {
  const used = new Map<string, number>();
  const sections: Section[] = [];
  const idFor = (text: string): string => {
    const base = `s-${slugify(text)}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading): string {
        const id = idFor(text);
        if (depth === 2) sections.push({ id, text: plainHeading(text) });
        return `<h${depth} id="${id}" tabindex="-1">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return escapeHtml(text);
      },
    },
  });

  const html = marked
    .parser(marked.lexer(withDiceCount(markdown)))
    .replaceAll("<table>", '<div class="reader-table"><table>')
    .replaceAll("</table>", "</table></div>");
  return { html, sections };
}
