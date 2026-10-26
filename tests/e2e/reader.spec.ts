/*
 * File:        tests/e2e/reader.spec.ts
 * Role:        French rules reader: the header button opens it, chapters are
 *              reached from the side list, the phone drop-down list and the
 *              previous / next links, the contents list jumps to a section,
 *              original terms are tooltips instead of text,
 *              the search field finds sections in every chapter and opens
 *              them, chapters stay readable offline once the app is loaded, and
 *              the print view lays out every chapter in book order.
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
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await expect(section).toBeFocused();
  await expect(section).toBeInViewport();

  await page
    .getByRole("link", { name: /Scénarios/ })
    .last()
    .click();
  await expect(page).toHaveURL(/#\/rules\/scenarios$/);
});

test("original terms show on hover, not in the text", async ({ page }) => {
  await page.goto("./#/rules/batailles");
  const content = page.locator(".reader-content");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chapitre 2 - Batailles");
  await expect(content).not.toContainText("(warband)");
  const term = content.locator('.vo-term[data-vo="VO : warband"]').first();
  await expect(term).toHaveText(/^bandes?$/);
  await term.hover();
  const tooltip = await term.evaluate((el) => getComputedStyle(el, "::after").content);
  expect(tooltip).toBe('"VO : warband"');
});

test("search the rules and open a result", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#/rules");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Black Death City");
  const field = page.getByLabel("Rechercher dans les règles");

  await field.fill("x");
  await expect(page.getByText("Saisissez au moins un mot de 2 lettres.")).toBeVisible();

  await field.fill("zzqqxx");
  await expect(page.getByText("Aucune section ne contient tous ces mots.")).toBeVisible();

  await field.fill("CONTRE-CHARGE");
  const results = page.getByRole("region", { name: "Résultats de la recherche" });
  await expect(results.getByText(/sections? conti/)).toBeVisible();
  await expect(results.locator("mark").first()).toHaveText(/contre-charge/i);
  const first = results.getByRole("listitem").first().getByRole("link");
  const href = (await first.getAttribute("href")) ?? "";
  expect(href).toMatch(/^#\/rules\/[a-z0-9-]+\/s-[a-z0-9-]+$/);

  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href.replace(/[/]/g, "\\/")}$`));
  await expect(field).toHaveValue("");
  await expect(results).toHaveCount(0);
  const section = page.locator(`[id="${href.slice(href.lastIndexOf("/") + 1)}"]`);
  await expect(section).toBeFocused();
  await expect(section).toBeInViewport();

  await field.fill("charge");
  await expect(results).toBeVisible();
  await field.press("Escape");
  await expect(results).toHaveCount(0);
  await expect(page.locator(".reader-content")).toBeVisible();
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vermineux");
  await context.setOffline(false);
});

test("the print view lists every chapter in book order", async ({ page }) => {
  await page.goto("./#/rules");
  await page.getByRole("link", { name: "Imprimer les règles" }).click();
  await expect(page).toHaveURL(/#\/rules\/print$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Imprimer les règles en français" }),
  ).toBeVisible();
  const book = page.getByTestId("rules-book");
  await expect(book).toBeVisible();
  await expect(book.getByText("Règles de la version de test 1.03", { exact: true })).toBeVisible();
  await expect(page.getByTestId("rules-book-chapter")).toHaveCount(13);
  await expect(
    page.getByTestId("rules-book-chapter").nth(2).getByRole("heading", { level: 1 }),
  ).toContainText("Chapitre 2 - Batailles");
  await expect(book.locator(".reader-feedback")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Imprimer" })).toBeEnabled();
  await page.getByRole("link", { name: "Retour au lecteur" }).click();
  await expect(page).toHaveURL(/#\/rules$/);
});
