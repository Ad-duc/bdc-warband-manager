/*
 * File:        tests/unit/feedback.test.ts
 * Role:        Links of the rules reader to GitHub for feedback on the French
 *              translation: pre-filled issue form, source line, edit page,
 *              quoted passage cut to a safe length.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ISSUE_TEMPLATE,
  MAX_QUOTE,
  REPO_URL,
  editUrl,
  issueUrl,
  sourceUrl,
  trimQuote,
} from "../../src/features/reader/feedback.ts";

const target = {
  chapterTitle: "Concepts de base",
  file: "02_concepts-de-base.md",
  section: "Mouvement",
  line: 42,
  pageUrl: "https://ad-duc.github.io/bdc-warband-manager/#/rules/concepts-de-base",
};

describe("feedback links", () => {
  it("opens the translation issue form with its fields filled in", () => {
    const url = new URL(issueUrl({ ...target, quote: "  Un  combattant\n\n peut   courir. " }));
    expect(`${url.origin}${url.pathname}`).toBe(`${REPO_URL}/issues/new`);
    const p = url.searchParams;
    expect(p.get("template")).toBe(ISSUE_TEMPLATE);
    expect(p.get("title")).toBe("Traduction : Concepts de base - Mouvement");
    expect(p.get("chapitre")).toBe("Concepts de base");
    expect(p.get("section")).toBe("Mouvement");
    expect(p.get("source")).toBe(
      `${REPO_URL}/blob/main/sources/fr/02_concepts-de-base.md#L42 (${target.pageUrl})`,
    );
    expect(p.get("passage")).toBe("Un combattant\npeut courir.");
  });

  it("leaves the passage out without a selection and names the chapter alone", () => {
    const p = new URL(issueUrl({ ...target, section: "", quote: "   " })).searchParams;
    expect(p.get("title")).toBe("Traduction : Concepts de base");
    expect(p.has("passage")).toBe(false);
    expect(new URL(issueUrl(target)).searchParams.has("passage")).toBe(false);
  });

  it("cuts long passages", () => {
    const quote = trimQuote("mot ".repeat(1000));
    expect(quote.length).toBeLessThanOrEqual(MAX_QUOTE + 6);
    expect(quote.endsWith(" [...]")).toBe(true);
    expect(issueUrl({ ...target, quote: "x".repeat(10000) }).length).toBeLessThan(4000);
  });

  it("links to the source file and its edit page", () => {
    expect(sourceUrl("00_glossaire.md")).toBe(`${REPO_URL}/blob/main/sources/fr/00_glossaire.md`);
    expect(editUrl("00_glossaire.md")).toBe(`${REPO_URL}/edit/main/sources/fr/00_glossaire.md`);
  });

  it("fills fields that exist in the issue form", () => {
    const form = readFileSync(
      resolve(import.meta.dirname, "../../.github/ISSUE_TEMPLATE", ISSUE_TEMPLATE),
      "utf8",
    );
    for (const id of ["chapitre", "section", "source", "passage"]) expect(form).toContain(`id: ${id}\n`);
    expect(form).toContain('labels: ["traduction"]');
  });
});
