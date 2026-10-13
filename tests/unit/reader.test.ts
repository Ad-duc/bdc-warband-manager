/*
 * File:        tests/unit/reader.test.ts
 * Role:        French rules reader: every translation chapter of sources/fr
 *              is listed and loads, Markdown rendering (heading ids, contents
 *              list, wrapped tables, escaped raw HTML, source line of each
 *              heading, feedback links), the rules routes, and the changelog
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
    expect(html).toContain('<div class="reader-table"><table>');
    expect(html).toContain("</table></div>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
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

describe("rules routes", () => {
  it("parses and builds the reader addresses", () => {
    expect(parseHash("#/rules")).toEqual({ name: "rules", chapter: null });
    expect(parseHash("#/rules/batailles")).toEqual({ name: "rules", chapter: "batailles" });
    expect(hrefFor({ name: "rules", chapter: null })).toBe("#/rules");
    expect(hrefFor({ name: "rules", chapter: "verminkin" })).toBe("#/rules/verminkin");
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
