/*
 * File:        src/features/reader/chapters.ts
 * Role:        Chapters of the French translation shown by the rules reader,
 *              in book order, with a loader for each Markdown file of
 *              sources/fr. Files are bundled as separate chunks, loaded on
 *              demand and precached for offline use.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT (code). The rules text belongs to its author, see README.
 */

export interface Chapter {
  /** Stable id used in the address: "#/rules/<id>". */
  id: string;
  /** File name in sources/fr. */
  file: string;
  /** Short French title for the navigation. */
  title: string;
}

/** Book order: introduction, chapters, factions, reference, change log, glossary. */
export const CHAPTERS: readonly Chapter[] = [
  { id: "introduction", file: "01_introduction.md", title: "Introduction" },
  { id: "concepts-de-base", file: "02_concepts-de-base.md", title: "Concepts de base" },
  { id: "batailles", file: "03_batailles.md", title: "Batailles" },
  { id: "scenarios", file: "04_scenarios.md", title: "Scénarios" },
  { id: "bandes", file: "05_bandes-regles-generales.md", title: "Bandes : règles générales" },
  { id: "guild-mercenaries", file: "06_guild-mercenaries.md", title: "Mercenaires de la Guilde" },
  { id: "verminkin", file: "07_verminkin.md", title: "Vermigènes" },
  { id: "death-covens", file: "08_death-covens.md", title: "Cabales de la Mort" },
  { id: "the-blighted-cloister", file: "09_the-blighted-cloister.md", title: "Le Cloître gangrené" },
  { id: "reference", file: "10_aide-de-jeu.md", title: "Référence" },
  { id: "journal-1-03", file: "11_journal-modifications-1.03.md", title: "Modifications de la v1.03" },
  { id: "glossaire", file: "00_glossaire.md", title: "Glossaire VO - VF" },
];

const loaders = import.meta.glob<string>("../../../sources/fr/[0-9][0-9]_*.md", {
  query: "?raw",
  import: "default",
});

export function findChapter(id: string | null): Chapter | undefined {
  return id === null ? CHAPTERS[0] : CHAPTERS.find((c) => c.id === id);
}

/** Markdown text of a chapter. */
export async function loadChapter(chapter: Chapter): Promise<string> {
  const load = loaders[`../../../sources/fr/${chapter.file}`];
  if (load === undefined) throw new Error(`Missing translation file ${chapter.file}`);
  return load();
}
