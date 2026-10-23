/*
 * File:        src/features/reader/original-terms.ts
 * Role:        Original (English) terms of the French translation. Every game
 *              term of sources/fr is followed by its original term, in
 *              italics and in parentheses: "champ de bataille (*battlefield*)".
 *              The reader takes these notes out of the text: the original
 *              term is kept as a tooltip on the French words it translates,
 *              found with the glossary, or removed (print view). The Markdown
 *              files themselves are not changed.
 * Author:      Adrien Duclaud
 * Created:     2026-10-23
 * License:     MIT
 */

import { CHAPTERS, loadChapter } from "./chapters.ts";

/** Original term (lower case) -> French translations given by the glossary. */
export type Glossary = ReadonlyMap<string, readonly string[]>;

/** How the reader shows the original terms. */
export type OriginalTermsMode = "tooltip" | "hide";

/**
 * Private use characters around a marked span: OPEN, index of the term, SEP,
 * French words, CLOSE. The Markdown renderer turns them into a tooltip.
 */
export const OPEN = "";
export const SEP = "";
export const CLOSE = "";

/** "(*battlefield*)", with the space before it. */
const NOTE = /\s*\(\*([^*()\n]+?)\*\)/g;
const HEADING = /^(#{1,6}\s+)(.*)$/;
/** Emphasis, bold or code closing the text just before a note. */
const TRAILING_MARKED = /(\*\*|\*|_|`)[^*_`\n]+?\1$/;
/** A word of the text, with its hyphens and elided article. */
const WORD = "[\\p{L}\\p{N}][\\p{L}\\p{N}'-]*";
/** Words a term of several original words may span, beyond their number. */
const EXTRA_WORDS = 5;
/** Short words that link the words of a term: "champ de bataille". */
const LINKS = new Set(["de", "du", "des", "d", "a", "au", "aux"]);

function normalize(word: string): string {
  return word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** A word of the text matches a word of the glossary, plural, gender and verb endings aside. */
export function sameWord(text: string, glossary: string): boolean {
  const a = normalize(text);
  const b = normalize(glossary);
  if (a === b) return true;
  if (LINKS.has(a) && LINKS.has(b)) return true;
  if (a.length < 4 || b.length < 4) return b.length >= 2 && a.startsWith(b) && a.length - b.length <= 2;
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  return common >= Math.max(4, Math.max(a.length, b.length) - 3);
}

/** "l'outsider" -> "outsider": an elided article stays out of the term. */
function withoutArticle(word: string): string {
  const match = /^[\p{L}]{1,3}'(?=[\p{L}\p{N}])/u.exec(word);
  return match === null ? word : word.slice(match[0].length);
}

/** The last `count` words of `text`, when they are separated by single spaces. */
function lastWords(text: string, count: number): string[] | null {
  const found = new RegExp(`(?:${WORD} ){${String(count - 1)}}${WORD}$`, "u").exec(text);
  return found === null ? null : found[0].split(" ");
}

/** Length of the last words of `text`, the first one without its elided article. */
function spanLength(words: readonly string[]): number {
  const first = words[0] ?? "";
  return words.join(" ").length - (first.length - withoutArticle(first).length);
}

/**
 * Reads the glossary chapter: every table whose first columns are "VO" and
 * "VF". A cell with several translations ("lancer / jeter") gives each one.
 */
export function parseGlossary(markdown: string): Glossary {
  const glossary = new Map<string, string[]>();
  let inTable = false;
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) {
      inTable = false;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells[0] === "VO" && cells[1] === "VF") {
      inTable = true;
      continue;
    }
    if (!inTable || cells[0] === undefined || cells[1] === undefined || /^-+$/.test(cells[0])) continue;
    const original = cells[0].toLowerCase();
    const french = cells[1]
      .replace(/\([^)]*\)/g, "")
      .replace(/["*]/g, "")
      .split(/\s*[/;,]\s*|\s+ou\s+/)
      .map((f) => f.trim())
      .filter((f) => f !== "");
    if (french.length === 0) continue;
    glossary.set(original, [...(glossary.get(original) ?? []), ...french]);
  }
  return glossary;
}

/**
 * Number of characters at the end of `text` that hold the French term of
 * `original`: the whole emphasis or code span closing the text; else the
 * glossary translation when the last words match it; else, for a term of
 * several original words, the words back to the farthest one that
 * translates one of them; else the last word.
 */
export function termLength(text: string, original: string, glossary: Glossary): number {
  const marked = TRAILING_MARKED.exec(text);
  if (marked !== null) return marked[0].length;
  const last = lastWords(text, 1);
  if (last === null) return 0;
  const key = original.toLowerCase();
  for (const french of glossary.get(key) ?? glossary.get(key.replace(/s$/, "")) ?? []) {
    const words = french.split(/\s+/);
    const found = lastWords(text, words.length);
    if (found === null) continue;
    const first = withoutArticle(found[0] ?? "");
    if ([first, ...found.slice(1)].every((w, i) => sameWord(w, words[i] ?? ""))) return spanLength(found);
  }
  const originalWords = original.toLowerCase().split(/\s+/);
  if (originalWords.length > 1) {
    const keys = originalWords.flatMap((w) => [
      w,
      ...(glossary.get(w) ?? glossary.get(w.replace(/s$/, "")) ?? []).flatMap((f) => f.split(/\s+/)),
    ]);
    const isKey = (word: string): boolean =>
      keys.some((k) => !LINKS.has(normalize(k)) && sameWord(withoutArticle(word), k));
    for (let count = originalWords.length + EXTRA_WORDS; count > 1; count--) {
      const found = lastWords(text, count);
      if (found !== null && isKey(found[0] ?? "")) return spanLength(found);
    }
  }
  return spanLength(last);
}

export interface MarkedText {
  /** Markdown with the notes taken out, and the terms marked in tooltip mode. */
  text: string;
  /** Original terms, by marker index. */
  terms: string[];
}

function markLine(line: string, terms: string[], glossary: Glossary): string {
  let out = "";
  let from = 0;
  for (const note of line.matchAll(NOTE)) {
    const before = line.slice(from, note.index);
    const length = termLength(before, note[1] ?? "", glossary);
    if (length === 0) out += before;
    else {
      out += before.slice(0, before.length - length);
      out += `${OPEN}${String(terms.length)}${SEP}${before.slice(before.length - length)}${CLOSE}`;
      terms.push((note[1] ?? "").trim());
    }
    from = note.index + note[0].length;
  }
  return out + line.slice(from);
}

/**
 * Takes the "(*original term*)" notes out of a chapter. In tooltip mode, the
 * French term before each note is marked with its original term; a heading
 * is marked as a whole with the notes it holds. Lines keep their place.
 */
export function markOriginalTerms(
  markdown: string,
  mode: OriginalTermsMode,
  glossary: Glossary = new Map(),
): MarkedText {
  const terms: string[] = [];
  const lines = markdown.split("\n").map((line) => {
    const notes = [...line.matchAll(NOTE)].map((m) => (m[1] ?? "").trim());
    if (notes.length === 0) return line;
    if (mode === "hide") return line.replace(NOTE, "");
    const heading = HEADING.exec(line);
    if (heading === null) return markLine(line, terms, glossary);
    const title = (heading[2] ?? "").replace(NOTE, "");
    terms.push(notes.join(" / "));
    return `${heading[1] ?? ""}${OPEN}${String(terms.length - 1)}${SEP}${title}${CLOSE}`;
  });
  return { text: lines.join("\n"), terms };
}

let glossaryPromise: Promise<Glossary> | undefined;

/** Glossary of the translation, loaded once. An unreadable glossary gives an empty one. */
export function loadGlossary(): Promise<Glossary> {
  const chapter = CHAPTERS.find((c) => c.file === "00_glossaire.md");
  glossaryPromise ??= (chapter === undefined ? Promise.resolve("") : loadChapter(chapter))
    .then(parseGlossary)
    .catch(() => new Map());
  return glossaryPromise;
}
