/*
 * File:        src/features/reader/search.ts
 * Role:        Full text search in the French translation for the rules
 *              reader. Every chapter is cut into sections at its headings
 *              (same ids as the reader, so a result opens the right heading),
 *              each section is turned into plain text without the original
 *              term notes (kept apart, so an English term finds its section),
 *              and a query matches a section that holds all its words,
 *              accents and case aside. A
 *              result gives the chapter, the section and a short extract with
 *              the matched words marked. Pure functions apart from the
 *              cached loader, no React.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { withDiceCount } from "../../i18n/dice.ts";
import { CHAPTERS, loadChapter, type Chapter } from "./chapters.ts";
import { renderChapter } from "./markdown.ts";

/** A section of a chapter, as plain text. */
export interface SearchEntry {
  chapter: Chapter;
  /** Heading id in the reader ("s-garde"). */
  sectionId: string;
  /** Heading text, without Markdown marks. */
  section: string;
  /** Plain text of the section, heading excluded, original terms left out. */
  text: string;
  /** Original terms of the heading and the text, so an English word finds its section. */
  originalTerms: string;
}

/** Part of an extract; `match` marks a matched word. */
export interface Segment {
  text: string;
  match: boolean;
}

export interface SearchResult {
  entry: SearchEntry;
  /** The heading holds at least one of the words. */
  inHeading: boolean;
  /** Extract around the first matched word, or the start of the section. */
  extract: Segment[];
}

/** Shortest word of a query taken into account. */
export const MIN_WORD_LENGTH = 2;
/** Right single quote and modifier apostrophe, read as a straight apostrophe. */
const CURLY_APOSTROPHES = new RegExp(`[${String.fromCharCode(0x2019, 0x2bc)}]`, "g");
/** Characters kept on each side of the first match in an extract. */
const EXTRACT_RADIUS = 70;

/**
 * Lower case text without accents, with the index in `text` of each of its
 * characters, so a match found in the folded text can be shown in the
 * original one.
 */
export function fold(text: string): { folded: string; origin: number[] } {
  let folded = "";
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const part = (text[i] ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(CURLY_APOSTROPHES, "'");
    for (const c of part) {
      folded += c;
      origin.push(i);
    }
  }
  return { folded, origin };
}

/** Distinct words of a query, folded, shorter ones left out. */
export function queryWords(query: string): string[] {
  const words = fold(query)
    .folded.split(/[\s"]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((w) => w.length >= MIN_WORD_LENGTH);
  return [...new Set(words)];
}

/** One Markdown line as plain text: heading marks, emphasis, table pipes, links and list marks removed. */
export function plainLine(line: string): string {
  if (/^\s*\|?\s*:?-{3,}/.test(line)) return "";
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\*\*|\*|`|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "(*battlefield*)", with the space before it. */
const NOTE = /\s*\(\*([^*()\n]+?)\*\)/g;

/** Sections of a chapter, cut at every heading. Text before the first heading is left out. */
export function chapterEntries(chapter: Chapter, markdown: string): SearchEntry[] {
  const source = withDiceCount(markdown);
  const lines = source.split("\n");
  const { headings } = renderChapter(markdown);
  return headings.map((heading, i) => {
    const end = headings[i + 1]?.line ?? lines.length + 1;
    const part = lines.slice(heading.line - 1, end - 1);
    const terms = part.flatMap((l) => [...l.matchAll(NOTE)].map((m) => m[1] ?? ""));
    const text = part
      .slice(1)
      .map((l) => plainLine(l.replace(NOTE, "")))
      .filter((l) => l !== "")
      .join(" ");
    return { chapter, sectionId: heading.id, section: heading.text, text, originalTerms: terms.join(" ") };
  });
}

/** Extract of `text` around `at` (index in `text`), with every word of `words` marked. */
export function extractOf(text: string, words: readonly string[], at: number): Segment[] {
  const start = Math.max(0, at - EXTRACT_RADIUS);
  const end = Math.min(text.length, at + EXTRACT_RADIUS * 2);
  // Cut at word boundaries, with "..." where the text goes on.
  let from = start === 0 ? 0 : text.indexOf(" ", start) + 1;
  if (from <= 0 || from > at) from = start;
  let to = end === text.length ? end : text.lastIndexOf(" ", end);
  if (to <= at) to = end;
  const piece = text.slice(from, to);
  const { folded, origin } = fold(piece);
  const marks: [number, number][] = [];
  for (const word of words) {
    let i = folded.indexOf(word);
    while (i >= 0) {
      marks.push([origin[i] ?? 0, (origin[i + word.length - 1] ?? 0) + 1]);
      i = folded.indexOf(word, i + word.length);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  const segments: Segment[] = [];
  const push = (part: string, match: boolean) => {
    if (part === "") return;
    const last = segments.at(-1);
    if (last?.match === match) last.text += part;
    else segments.push({ text: part, match });
  };
  if (from > 0) push("...", false);
  let cursor = 0;
  for (const [a, b] of marks) {
    if (b <= cursor) continue;
    push(piece.slice(cursor, Math.max(a, cursor)), false);
    push(piece.slice(Math.max(a, cursor), b), true);
    cursor = b;
  }
  push(piece.slice(cursor), false);
  if (to < text.length) push("...", false);
  return segments;
}

/**
 * Sections holding every word of the query, in heading, text or original
 * terms. Sections
 * whose heading holds a word come first, then book order.
 */
export function search(entries: readonly SearchEntry[], query: string): SearchResult[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const results: SearchResult[] = [];
  for (const entry of entries) {
    const heading = fold(entry.section).folded;
    const body = fold(entry.text);
    const terms = fold(entry.originalTerms).folded;
    if (!words.every((w) => heading.includes(w) || body.folded.includes(w) || terms.includes(w))) continue;
    const inHeading = words.some((w) => heading.includes(w));
    const first = Math.min(
      ...words.map((w) => body.folded.indexOf(w)).map((i) => (i < 0 ? Number.POSITIVE_INFINITY : i)),
    );
    const at = Number.isFinite(first) ? (body.origin[first] ?? 0) : 0;
    results.push({ entry, inHeading, extract: extractOf(entry.text, words, at) });
  }
  return [...results.filter((r) => r.inHeading), ...results.filter((r) => !r.inHeading)];
}

let cache: Promise<SearchEntry[]> | null = null;

/** Sections of every chapter, loaded once. A failed load is tried again on the next call. */
export function loadSearchIndex(): Promise<SearchEntry[]> {
  cache ??= Promise.all(
    CHAPTERS.map(async (chapter) => chapterEntries(chapter, await loadChapter(chapter))),
  ).then(
    (all) => all.flat(),
    (error: unknown) => {
      cache = null;
      throw error;
    },
  );
  return cache;
}
