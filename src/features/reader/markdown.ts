/*
 * File:        src/features/reader/markdown.ts
 * Role:        Turns a translation chapter (Markdown) into HTML for the rules
 *              reader: GitHub tables, an id on every heading so the contents
 *              list can jump to it, wide tables wrapped in a scrolling box,
 *              cost columns marked so they line up from one list to the next,
 *              raw HTML escaped rather than rendered, and every die written
 *              with its count (1D6). The "(*original term*)" notes are taken
 *              out of the text: kept as a tooltip on the French term (rules
 *              reader) or removed (print view). Optionally, a feedback link
 *              after each heading (rules reader), built from the heading and
 *              its line.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Marked, type Tokens } from "marked";
import { withDiceCount } from "../../i18n/dice.ts";
import {
  CLOSE,
  OPEN,
  SEP,
  markOriginalTerms,
  type Glossary,
  type OriginalTermsMode,
} from "./original-terms.ts";

export interface Section {
  id: string;
  text: string;
}

export interface Heading extends Section {
  depth: number;
  /** 1-based line of the heading in the Markdown source. */
  line: number;
}

export interface RenderedChapter {
  html: string;
  /** Second-level headings, for the contents list. */
  sections: Section[];
  /** Every heading, with its source line. */
  headings: Heading[];
}

export interface RenderOptions {
  /** Keeps the heading ids unique when several fragments share a page. */
  prefix?: string;
  /** Adds a link after each heading of level 2 to 4 (href and text). */
  feedbackLink?: (heading: Heading) => { href: string; text: string; label: string };
  /** Original terms as tooltips on the French terms, or removed (default). */
  originalTerms?: OriginalTermsMode;
  /** Glossary used to find the French words of each original term. */
  glossary?: Glossary;
}

interface OriginalTermToken {
  type: "originalTerm";
  raw: string;
  term: string;
  tokens: Tokens.Generic[];
}

const MARKED_TERM = new RegExp(`^${OPEN}(\\d+)${SEP}([^${CLOSE}]*)${CLOSE}`);
const MARKERS = new RegExp(`${OPEN}\\d+${SEP}|${CLOSE}`, "g");

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Headers of a cost column, as written in the French translation. */
const COST_HEADERS = new Set(["Coût", "Pièces d'argent", "Prix"]);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Heading text without the "(*original term*)" notes, term markers and Markdown marks. */
export function plainHeading(text: string): string {
  return text
    .replace(/\s*\(\*[^)]*\*\)/g, "")
    .replace(MARKERS, "")
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

export function renderChapter(markdown: string, options: RenderOptions = {}): RenderedChapter {
  const { prefix = "s", feedbackLink, originalTerms = "hide", glossary } = options;
  const { text: source, terms } = markOriginalTerms(withDiceCount(markdown), originalTerms, glossary);
  const used = new Map<string, number>();
  const sections: Section[] = [];
  const headings: Heading[] = [];
  const lines = new WeakMap<object, number>();
  const idFor = (text: string): string => {
    const base = `${prefix}-${slugify(text)}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const marked = new Marked({ gfm: true });
  marked.use({
    extensions: [
      {
        name: "originalTerm",
        level: "inline",
        start: (src: string) => {
          const at = src.indexOf(OPEN);
          return at < 0 ? undefined : at;
        },
        tokenizer(src: string): OriginalTermToken | undefined {
          const match = MARKED_TERM.exec(src);
          if (match === null) return undefined;
          return {
            type: "originalTerm",
            raw: match[0],
            term: terms[Number(match[1])] ?? "",
            tokens: this.lexer.inlineTokens(match[2] ?? ""),
          };
        },
        renderer(token: Tokens.Generic): string {
          const { term, tokens } = token as OriginalTermToken;
          return `<span class="vo-term" data-vo="${escapeHtml(`VO : ${term}`)}">${this.parser.parseInline(tokens)}</span>`;
        },
      },
    ],
    renderer: {
      heading(token: Tokens.Heading): string {
        const { tokens, depth, text } = token;
        const id = idFor(text);
        const heading: Heading = { id, text: plainHeading(text), depth, line: lines.get(token) ?? 0 };
        headings.push(heading);
        if (depth === 2) sections.push({ id, text: heading.text });
        const out = `<h${depth} id="${id}" tabindex="-1">${this.parser.parseInline(tokens)}</h${depth}>\n`;
        if (feedbackLink === undefined || depth < 2 || depth > 4) return out;
        const link = feedbackLink(heading);
        return (
          out +
          `<p class="reader-feedback"><a href="${escapeHtml(link.href)}" target="_blank" rel="noopener"` +
          ` data-heading="${id}" aria-label="${escapeHtml(link.label)}">${escapeHtml(link.text)}</a></p>\n`
        );
      },
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return escapeHtml(text);
      },
      // Every table sits in a scrolling box. A table whose last column is a
      // cost gets a second class: the stylesheet gives that column a fixed
      // width, so the costs of the successive lists of a chapter line up.
      table(token: Tokens.Table): string {
        const cells = (row: Tokens.TableCell[]): string => row.map((cell) => this.tablecell(cell)).join("");
        const head = this.tablerow({ text: cells(token.header) });
        const body = token.rows.map((row) => this.tablerow({ text: cells(row) })).join("");
        const last = plainHeading(token.header.at(-1)?.text ?? "");
        const classes = COST_HEADERS.has(last) ? "reader-table reader-table-cost" : "reader-table";
        return (
          `<div class="${classes}"><table>\n<thead>\n${head}</thead>\n` +
          (body === "" ? "" : `<tbody>${body}</tbody>`) +
          "</table></div>\n"
        );
      },
    },
  });

  // Top-level tokens keep their raw text: the line of a heading is the number
  // of line breaks before it, plus one.
  const tokens = marked.lexer(source);
  let line = 1;
  for (const token of tokens) {
    lines.set(token, line);
    line += (token.raw.match(/\n/g) ?? []).length;
  }
  const html = marked.parser(tokens);
  return { html, sections, headings };
}
