/*
 * File:        src/features/reader/feedback.ts
 * Role:        Links from the rules reader to the GitHub repository for
 *              community feedback on the French translation: a pre-filled
 *              issue form (.github/ISSUE_TEMPLATE/traduction.yml) for one
 *              section, with the selected passage, and the edit page of a
 *              translation file. Nothing is sent by the app itself: the
 *              reader opens GitHub, where the issue is written and submitted.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

export const REPO_URL = "https://github.com/Ad-duc/bdc-warband-manager";
export const ISSUE_TEMPLATE = "traduction.yml";
const BRANCH = "main";
const SOURCES = "sources/fr";

/** Longest quoted passage, to keep the address under the server limit. */
export const MAX_QUOTE = 1500;

export interface FeedbackTarget {
  chapterTitle: string;
  file: string;
  /** Plain text of the section heading, empty for the whole chapter. */
  section: string;
  /** 1-based line of the heading in the translation file. */
  line: number;
  /** Address of the chapter in the app. */
  pageUrl: string;
  /** Selected passage, if any. */
  quote?: string;
}

/** Selected text on one line per paragraph, cut at MAX_QUOTE characters. */
export function trimQuote(text: string): string {
  const clean = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l !== "")
    .join("\n");
  return clean.length <= MAX_QUOTE ? clean : `${clean.slice(0, MAX_QUOTE).trimEnd()} [...]`;
}

/** File of the translation on GitHub, at a line. */
export function sourceUrl(file: string, line?: number): string {
  const base = `${REPO_URL}/blob/${BRANCH}/${SOURCES}/${encodeURIComponent(file)}`;
  return line === undefined ? base : `${base}#L${line}`;
}

/** Edit page of a translation file (fork and pull request for visitors). */
export function editUrl(file: string): string {
  return `${REPO_URL}/edit/${BRANCH}/${SOURCES}/${encodeURIComponent(file)}`;
}

/** New issue from the translation form, its fields filled in. */
export function issueUrl(target: FeedbackTarget): string {
  const where = target.section === "" ? target.chapterTitle : `${target.chapterTitle} - ${target.section}`;
  const params = new URLSearchParams({
    template: ISSUE_TEMPLATE,
    title: `Traduction : ${where}`,
    chapitre: target.chapterTitle,
    section: target.section,
    source: `${sourceUrl(target.file, target.line)} (${target.pageUrl})`,
  });
  const quote = target.quote === undefined ? "" : trimQuote(target.quote);
  if (quote !== "") params.set("passage", quote);
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
