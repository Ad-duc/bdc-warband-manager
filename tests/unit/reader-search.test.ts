/*
 * File:        tests/unit/reader-search.test.ts
 * Role:        Search of the rules reader: folding of accents and case,
 *              query words, plain text of a Markdown line, sections cut at
 *              the reader heading ids, extracts with marked words, matching
 *              and ordering of results, and the index of every chapter.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { CHAPTERS, loadChapter, type Chapter } from "../../src/features/reader/chapters.ts";
import { renderChapter } from "../../src/features/reader/markdown.ts";
import {
  chapterEntries,
  extractOf,
  fold,
  loadSearchIndex,
  plainLine,
  queryWords,
  search,
} from "../../src/features/reader/search.ts";

const CHAPTER: Chapter = { id: "test", file: "test.md", title: "Test" };

const MARKDOWN = [
  "# Chapitre test",
  "",
  "Texte d'introduction.",
  "",
  "## Charge (*Charge*)",
  "",
  "Un combattant (*fighter*) qui **charge** se déplace de 1D6 pouces.",
  "",
  "### Garde",
  "",
  "| Arme | Coût |",
  "| --- | --- |",
  "| Épée | 10 pa |",
  "",
  "## Moral",
  "",
  "- Un test de Volonté avec D6 dés.",
].join("\n");

describe("fold", () => {
  it("removes accents and case and keeps the origin of each character", () => {
    const { folded, origin } = fold("Épée L'été");
    expect(folded).toBe("epee l'ete");
    expect(origin).toHaveLength(folded.length);
    expect(origin[0]).toBe(0);
    expect(origin.at(-1)).toBe(9);
  });

  it("reads a curly apostrophe as a straight one", () => {
    expect(fold(`l${String.fromCharCode(0x2019)}arme`).folded).toBe("l'arme");
  });
});

describe("queryWords", () => {
  it("splits, folds, deduplicates and leaves out short words", () => {
    expect(queryWords('  Épée a "Lourde" épée, ')).toEqual(["epee", "lourde"]);
    expect(queryWords("a")).toEqual([]);
    expect(queryWords("")).toEqual([]);
  });
});

describe("plainLine", () => {
  it("removes Markdown marks", () => {
    expect(plainLine("## Titre **gras** et *italique*")).toBe("Titre gras et italique");
    expect(plainLine("- Point de `code` et [lien](http://x)")).toBe("Point de code et lien");
    expect(plainLine("1. Premier")).toBe("Premier");
    expect(plainLine("> Citation")).toBe("Citation");
    expect(plainLine("| A | B |")).toBe("A B");
    expect(plainLine("| --- | :---: |")).toBe("");
    expect(plainLine("nom_compose et _souligne_")).toBe("nom_compose et souligne");
  });
});

describe("chapterEntries", () => {
  const entries = chapterEntries(CHAPTER, MARKDOWN);

  it("gives one entry per heading with the reader ids", () => {
    const { headings } = renderChapter(MARKDOWN);
    expect(entries.map((e) => e.sectionId)).toEqual(headings.map((h) => h.id));
    expect(entries.map((e) => e.section)).toEqual(["Chapitre test", "Charge", "Garde", "Moral"]);
  });

  it("keeps the plain text of each section only, dice with their count", () => {
    expect(entries[0]?.text).toBe("Texte d'introduction.");
    expect(entries[1]?.text).toBe("Un combattant qui charge se déplace de 1D6 pouces.");
    expect(entries[2]?.text).toBe("Arme Coût Épée 10 pa");
    expect(entries[3]?.text).toBe("Un test de Volonté avec 1D6 dés.");
    expect(entries.every((e) => e.chapter === CHAPTER)).toBe(true);
  });

  it("keeps the original terms of the heading and the text apart", () => {
    expect(entries.map((e) => e.originalTerms)).toEqual(["", "Charge fighter", "", ""]);
  });
});

describe("extractOf", () => {
  it("marks every occurrence of the words", () => {
    expect(extractOf("Une épée et une Epee.", ["epee"], 4)).toEqual([
      { text: "Une ", match: false },
      { text: "épée", match: true },
      { text: " et une ", match: false },
      { text: "Epee", match: true },
      { text: ".", match: false },
    ]);
  });

  it("merges overlapping marks", () => {
    expect(extractOf("chargement", ["charge", "argem"], 0)).toEqual([
      { text: "chargem", match: true },
      { text: "ent", match: false },
    ]);
  });

  it("cuts a long text at word boundaries around the match", () => {
    const text = `${"avant ".repeat(40)}cible ${"apres ".repeat(60)}fin`;
    const extract = extractOf(text, ["cible"], text.indexOf("cible"));
    expect(extract[0]?.text.startsWith("...avant ")).toBe(true);
    expect(extract.at(-1)?.text.endsWith("apres...")).toBe(true);
    expect(extract.filter((s) => s.match)).toEqual([{ text: "cible", match: true }]);
    expect(extract.map((s) => s.text).join("").length).toBeLessThan(230);
  });

  it("keeps a short text whole", () => {
    expect(extractOf("Court.", ["xx"], 0)).toEqual([{ text: "Court.", match: false }]);
  });
});

describe("search", () => {
  const entries = chapterEntries(CHAPTER, MARKDOWN);

  it("finds the sections holding every word, accents and case aside", () => {
    expect(search(entries, "EPEE").map((r) => r.entry.section)).toEqual(["Garde"]);
    expect(search(entries, "volonte 1d6").map((r) => r.entry.section)).toEqual(["Moral"]);
    expect(search(entries, "volonte pouces")).toEqual([]);
    expect(search(entries, "a")).toEqual([]);
  });

  it("finds a section by an original term, kept out of the extract", () => {
    const [result] = search(entries, "fighter");
    expect(result?.entry.section).toBe("Charge");
    expect(result?.inHeading).toBe(false);
    expect(result?.extract.some((s) => s.match)).toBe(false);
  });

  it("puts the sections whose heading holds a word first", () => {
    const results = search(entries, "garde");
    expect(results.map((r) => [r.entry.section, r.inHeading])).toEqual([["Garde", true]]);
    const charge = search(entries, "charge");
    expect(charge[0]?.inHeading).toBe(true);
    expect(charge[0]?.entry.section).toBe("Charge");
  });

  it("matches a word found in the heading only and starts the extract at the text", () => {
    const [result] = search(entries, "moral");
    expect(result?.inHeading).toBe(true);
    expect(result?.extract[0]?.text.startsWith("Un test")).toBe(true);
  });

  it("orders heading matches before text matches, book order otherwise", () => {
    const many = chapterEntries(CHAPTER, "## Alpha\n\nmot\n\n## Mot\n\nrien\n\n## Beta\n\nmot");
    expect(search(many, "mot").map((r) => r.entry.section)).toEqual(["Mot", "Alpha", "Beta"]);
  });
});

describe("loadSearchIndex", () => {
  it("indexes every chapter with the heading ids of the reader", async () => {
    const entries = await loadSearchIndex();
    expect(await loadSearchIndex()).toBe(entries);
    for (const chapter of CHAPTERS) {
      const { headings } = renderChapter(await loadChapter(chapter));
      expect(entries.filter((e) => e.chapter === chapter).map((e) => e.sectionId)).toEqual(
        headings.map((h) => h.id),
      );
    }
    expect(entries.every((e) => !/^#/.test(e.text))).toBe(true);
    expect(search(entries, "contre-charge").some((r) => r.entry.chapter.id === "batailles")).toBe(true);
  });
});
