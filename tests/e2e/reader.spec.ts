/*
 * File:        tests/e2e/reader.spec.ts
 * Role:        French rules reader: the header button opens it, chapters are
 *              reached from the side list, the phone drop-down list and the
 *              previous / next links, the contents list jumps to a section,
 *              and chapters stay readable offline once the app is loaded.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("open the reader from the header and move between chapters", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  const button = page.getByRole("link", { name: "Règles en français" });
  await button.click();
  await expect(page).toHaveURL(/#\/rules$/);
  await expect(button).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Black Death City");

  await page.getByRole("navigation", { name: "Chapitres" }).getByRole("link", { name: "Batailles" }).click();
  await expect(page).toHaveURL(/#\/rules\/batailles$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chapitre 2 - Batailles");

  await page.getByText("Sommaire").click();
  const section = page.getByRole("heading", { level: 2 }).nth(2);
  const title = (await section.textContent()) ?? "";
  await page
    .getByRole("button", { name: title.replace(/\s*\(.*\)$/, ""), exact: true })
    .first()
    .click();
  await expect(section).toBeFocused();
  await expect(section).toBeInViewport();

  await page
    .getByRole("link", { name: /Scénarios/ })
    .last()
    .click();
  await expect(page).toHaveURL(/#\/rules\/scenarios$/);
});

test("pick a chapter from the list on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/rules");
  await page.getByLabel("Chapitre", { exact: true }).selectOption("glossaire");
  await expect(page).toHaveURL(/#\/rules\/glossaire$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("glossaire");
});

test("an unknown chapter is reported", async ({ page }) => {
  await page.goto("./#/rules/nowhere");
  await expect(page.getByRole("alert")).toHaveText("Chapitre inconnu. Choisissez-en un dans la liste.");
});

test("chapters are available offline", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto("./#/rules/verminkin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vermigènes (Verminkin)");
  await context.setOffline(false);
});
