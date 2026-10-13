/*
 * File:        tests/e2e/translation-feedback.spec.ts
 * Role:        Community feedback on the French translation from the rules
 *              reader: a "suggest a correction" link under each section opens
 *              the pre-filled GitHub issue form, a selected passage is quoted,
 *              and the edit link points to the translation file.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR", viewport: { width: 1440, height: 900 } });

const params = (href: string | null) => new URL(href ?? "").searchParams;

test("section links open a pre-filled translation issue", async ({ page }) => {
  await page.goto("./#/rules/batailles");
  const content = page.locator(".reader-content");
  const heading = content.getByRole("heading", { level: 2 }).first();
  const section = ((await heading.textContent()) ?? "").replace(/\s*\(.*\)$/, "").trim();

  const link = content
    .getByRole("link", { name: `Proposer une correction pour la section ${section}`, exact: false })
    .first();
  await expect(link).toHaveAttribute("target", "_blank");
  const p = params(await link.getAttribute("href"));
  expect(p.get("template")).toBe("traduction.yml");
  expect(p.get("chapitre")).toBe("Batailles");
  expect(p.get("section")).toBe(section);
  expect(p.get("source")).toMatch(/sources\/fr\/03_batailles\.md#L\d+ /);

  await expect(page.getByRole("link", { name: "modifiez le fichier sur GitHub." })).toHaveAttribute(
    "href",
    "https://github.com/Ad-duc/bdc-warband-manager/edit/main/sources/fr/03_batailles.md",
  );
});

test("a selected passage is quoted in the issue", async ({ page }) => {
  await page.goto("./#/rules/batailles");
  const content = page.locator(".reader-content");
  const paragraph = content.locator("h2 ~ p:not(.reader-feedback)").first();
  const text = ((await paragraph.textContent()) ?? "").trim();
  await paragraph.selectText();

  const bar = page.getByText(/^Passage sélectionné/);
  await expect(bar).toBeVisible();
  const suggest = page.getByRole("link", { name: "Proposer une correction", exact: true }).last();
  const p = params(await suggest.getAttribute("href"));
  expect(p.get("passage")).toBe(text.replace(/\s+/g, " ").slice(0, 1500).trim());

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(bar).toHaveCount(0);
});
