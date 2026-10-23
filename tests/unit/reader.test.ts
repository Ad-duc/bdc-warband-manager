/*
 * File:        tests/unit/reader.test.ts
 * Role:        French rules reader: every translation chapter of sources/fr
 *              is listed and loads, Markdown rendering (heading ids, contents
 *              list, wrapped tables, escaped raw HTML, source line of each
 *              heading, feedback links, original terms as tooltips or
 *              removed), the rules routes, and the changelog
 *              shown in the app (same versions in both languages).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hrefFor, parseHash } from "../../src/app/router.ts";
import { loadChangelog, stripHeader } from "../../src/features/changelog/changelog.ts";
import { CHAPTERS, findChapter, loadChapter } from "../../src/features/reader/chapters.ts";
import { escapeHtml, plainHeading, renderChapter, slugify } from "../../src/features/reader/markdown.ts";
import {
  loadGlossary,
  markOriginalTerms,
  parseGlossary,
  sameWord,
  termLength,
} from "../../src/features/reader/original-terms.ts";

const SOURCES = resolve(import.meta.dirname, "../../sources/fr");

describe("chapters", () => {
  it("lists every numbered translation file once", () => {
    const files = readdirSync(SOURCES).filter((f) => /^\d\d_.*\.md$/.test(f));
    expect([...CHAPTERS.map((c) => c.file)].sort()).toEqual(files.sort());
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
  });

  it("loads and renders each chapter with a first-level title", async () => {
    for (const chapter of CHAPTERS) {
      const { html } = renderChapter(await loadChapter(chapter));
      expect(html, chapter.file).toMatch(/^<h1 id="s-[a-z0-9-]+" tabindex="-1">/);
    }
  });

  it("gives each heading its line in the translation file", async () => {
    for (const chapter of CHAPTERS) {
      const markdown = await loadChapter(chapter);
      const lines = markdown.split("\n");
      const { headings } = renderChapter(markdown);
      expect(headings.length, chapter.file).toBeGreaterThan(0);
      for (const h of headings)
        expect(lines[h.line - 1], `${chapter.file}:${h.line}`).toMatch(new RegExp(`^#{${h.depth}} `));
    }
  });

  it("finds a chapter by id, the first one by default", () => {
    expect(findChapter(null)?.id).toBe("introduction");
    expect(findChapter("batailles")?.file).toBe("03_batailles.md");
    expect(findChapter("unknown")).toBeUndefined();
  });

  it("reports a missing file", async () => {
    await expect(loadChapter({ id: "x", file: "99_missing.md", title: "X" })).rejects.toThrow(
      "99_missing.md",
    );
  });
});

describe("markdown rendering", () => {
  const sample = [
    "# Chapitre 2 - Batailles (*Chapter Two - Battles*)",
    "",
    "## Le round (*The Round*)",
    "",
    "| Nom | Coût |",
    "| --- | --- |",
    "| Épée | 10 pa |",
    "",
    "## Le round",
    "",
    "<script>alert(1)</script>",
  ].join("\n");

  it("gives unique ids to headings and lists the second-level ones", () => {
    const { html, sections } = renderChapter(sample);
    expect(sections).toEqual([
      { id: "s-le-round", text: "Le round" },
      { id: "s-le-round-2", text: "Le round" },
    ]);
    expect(html).toContain('<h1 id="s-chapitre-2-batailles" tabindex="-1">');
  });

  it("wraps tables in a scrolling box and escapes raw HTML", () => {
    const { html } = renderChapter(sample);
    expect(html).toContain('<div class="reader-table reader-table-cost"><table>');
    expect(html).toContain("</table></div>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks the tables whose last column is a cost", () => {
    const cost = ["| Combattant | Coût |", "|---|---|", "| Noble | 120 pa |"].join("\n");
    expect(renderChapter(cost).html).toContain('<div class="reader-table reader-table-cost"><table>');
    const armoury = ["| Nom | Pièces d'argent |", "|---|---|", "| Dague | 5 pa |"].join("\n");
    expect(renderChapter(armoury).html).toContain('class="reader-table reader-table-cost"');
    const stats = ["| Mouvement | Vie |", "|---|---|", "| 4 | 3 |"].join("\n");
    expect(renderChapter(stats).html).toContain('<div class="reader-table"><table>');
    expect(renderChapter(stats).html).not.toContain("reader-table-cost");
  });

  it("adds a feedback link after headings of level 2 to 4 only", () => {
    const { html, headings } = renderChapter(sample, {
      feedbackLink: (h) => ({
        href: `https://example.org/?s=${h.id}&l=${h.line}`,
        text: "Corriger",
        label: `Corriger ${h.text}`,
      }),
    });
    expect(headings.map((h) => [h.id, h.depth, h.line])).toEqual([
      ["s-chapitre-2-batailles", 1, 1],
      ["s-le-round", 2, 3],
      ["s-le-round-2", 2, 9],
    ]);
    expect(html.match(/class="reader-feedback"/g)).toHaveLength(2);
    expect(html).toContain('href="https://example.org/?s=s-le-round&amp;l=3"');
    expect(html).toContain('data-heading="s-le-round" aria-label="Corriger Le round">Corriger</a>');
    expect(renderChapter(sample).html).not.toContain("reader-feedback");
  });

  it("cleans heading texts", () => {
    expect(plainHeading("Scénarios (*Scenarios*) **bis**")).toBe("Scénarios bis");
    expect(slugify("Règles de base : la Cité")).toBe("regles-de-base-la-cite");
    expect(slugify("(*only*)")).toBe("section");
    expect(escapeHtml(`a & "b" <c> 'd'`)).toBe("a &amp; &quot;b&quot; &lt;c&gt; &#39;d&#39;");
  });
});

describe("original terms", () => {
  const glossary = parseGlossary(
    [
      "| VO | VF | Catégorie | Remarque |",
      "|---|---|---|---|",
      "| battlefield | champ de bataille | Terrain | Imposé. |",
      "| enemy fighter | combattant ennemi | Général |  |",
      "| fighter | combattant | Général |  |",
      '| roll | jet / lancer (un dé) | Général | "jet" |',
      "| parry | parade | Combat |  |",
      "| special rule | règle spéciale | Général |  |",
      "| special | spécial | Général |  |",
      "| rule | règle | Général |  |",
      "",
      "| Réf. | VO | VF retenue |",
      "|---|---|---|",
      "| H1 | ignored | ignoré |",
    ].join("\n"),
  );

  it("reads the VO and VF columns of the glossary tables", () => {
    expect(glossary.get("battlefield")).toEqual(["champ de bataille"]);
    expect(glossary.get("roll")).toEqual(["jet", "lancer"]);
    expect(glossary.has("h1")).toBe(false);
    expect(glossary.has("---")).toBe(false);
  });

  it("matches words whatever their plural, gender or verb ending", () => {
    expect(sameWord("combattants", "combattant")).toBe(true);
    expect(sameWord("jets", "jet")).toBe(true);
    expect(sameWord("activés", "activer")).toBe(true);
    expect(sameWord("du", "de")).toBe(true);
    expect(sameWord("le", "de")).toBe(false);
    expect(sameWord("bande", "bataille")).toBe(false);
  });

  it("finds the French words of each original term", () => {
    const span = (text: string, original: string): string =>
      text.slice(text.length - termLength(text, original, glossary));
    expect(span("sur le champ de bataille", "battlefield")).toBe("champ de bataille");
    expect(span("chaque combattants ennemis", "enemy fighter")).toBe("combattants ennemis");
    expect(span("en commençant par l'outsider", "underdog")).toBe("outsider");
    expect(span("il réussit un jet de parade", "parry roll")).toBe("jet de parade");
    expect(span("les règles spéciales", "special rules")).toBe("règles spéciales");
    expect(span("devient **Ensanglanté**", "bloodied")).toBe("**Ensanglanté**");
    expect(span("ses bandes", "warband")).toBe("bandes");
    expect(span("voir :", "see")).toBe("");
  });

  it("marks each term with its original term, keeping the lines", () => {
    const markdown =
      "## Le round (*The Round*)\n\nUn combattant (*fighter*) au champ de bataille (*battlefield*).";
    const { text, terms } = markOriginalTerms(markdown, "tooltip", glossary);
    expect(terms).toEqual(["The Round", "fighter", "battlefield"]);
    expect(text.split("\n")).toHaveLength(3);
    expect(text).not.toContain("(*");
    expect(markOriginalTerms(markdown, "hide").text).toBe(
      "## Le round\n\nUn combattant au champ de bataille.",
    );
    expect(markOriginalTerms("Sans note.", "tooltip")).toEqual({ text: "Sans note.", terms: [] });
  });

  it("renders a tooltip on the French term and keeps the heading ids", () => {
    const markdown =
      "## Le round (*The Round*)\n\n**Jet de priorité (*Priority Roll*) :** un combattant (*fighter*).";
    const { html, headings } = renderChapter(markdown, { originalTerms: "tooltip", glossary });
    expect(headings[0]).toMatchObject({ id: "s-le-round", text: "Le round" });
    expect(html).toContain(
      '<h2 id="s-le-round" tabindex="-1"><span class="vo-term" data-vo="VO : The Round">Le round</span></h2>',
    );
    expect(html).toContain(
      '<strong><span class="vo-term" data-vo="VO : Priority Roll">Jet de priorité</span> :</strong>',
    );
    expect(html).toContain('un <span class="vo-term" data-vo="VO : fighter">combattant</span>.');
    expect(renderChapter(markdown).html).not.toContain("vo-term");
    expect(renderChapter(markdown).html).not.toContain("Priority Roll");
  });

  it("takes every note out of every chapter", async () => {
    const full = await loadGlossary();
    expect(full.size).toBeGreaterThan(1000);
    expect(await loadGlossary()).toBe(full);
    for (const chapter of CHAPTERS) {
      const markdown = await loadChapter(chapter);
      const notes = markdown.match(/\(\*[^*()\n]+?\*\)/g)?.length ?? 0;
      const { html } = renderChapter(markdown, { originalTerms: "tooltip", glossary: full });
      expect(html, chapter.file).not.toMatch(/\(<em>[^<]*<\/em>\)/);
      expect(html.match(/class="vo-term"/g)?.length ?? 0, chapter.file).toBeGreaterThan(notes * 0.9);
    }
  });
});

describe("rules routes", () => {
  it("parses and builds the reader addresses", () => {
    expect(parseHash("#/rules")).toEqual({ name: "rules", chapter: null });
    expect(parseHash("#/rules/batailles")).toEqual({ name: "rules", chapter: "batailles" });
    expect(hrefFor({ name: "rules", chapter: null })).toBe("#/rules");
    expect(hrefFor({ name: "rules", chapter: "verminkin" })).toBe("#/rules/verminkin");
    expect(parseHash("#/rules/print")).toEqual({ name: "rulesPrint" });
    expect(hrefFor({ name: "rulesPrint" })).toBe("#/rules/print");
  });
});

describe("changelog", () => {
  const versions = (text: string): string[] =>
    [...text.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1] ?? "").filter((v) => /^\d/.test(v));

  it("has the same released versions in English and French", async () => {
    const en = await loadChangelog("en");
    const fr = await loadChangelog("fr");
    expect(versions(en).length).toBeGreaterThan(0);
    expect(versions(fr)).toEqual(versions(en));
    expect(en.startsWith("# Changelog")).toBe(true);
    expect(fr.startsWith("# Nouveautés")).toBe(true);
  });

  it("drops the header comment", () => {
    expect(stripHeader("<!--\n  File: x\n-->\n\n# Title\n<!-- kept -->")).toBe("# Title\n<!-- kept -->");
  });

  it("has a route", () => {
    expect(parseHash("#/changelog")).toEqual({ name: "changelog" });
    expect(hrefFor({ name: "changelog" })).toBe("#/changelog");
  });
});
