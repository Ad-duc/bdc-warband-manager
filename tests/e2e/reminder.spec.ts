/*
 * File:        tests/e2e/reminder.spec.ts
 * Role:        French reminder sheet opened from the header: one A4 page in
 *              French whatever the interface language, printed on one page;
 *              "My warbands" header button back to the warband list.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("reminder sheet from the header, in French, on one page", async ({ page, browserName }) => {
  await page.goto("./");
  await page.getByRole("banner").getByRole("link", { name: "Aide de jeu" }).click();
  await expect(page).toHaveURL(/#\/reminder$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aide de jeu");
  const sheet = page.getByTestId("reminder-sheet");
  await expect(sheet).toHaveAttribute("lang", "fr");
  await expect(sheet.getByRole("heading", { name: "Black Death City - Aide de jeu" })).toBeVisible();
  await expect(sheet).toContainText("Jet de fiasco");
  await expect(sheet).not.toContainText("p. xx");

  // Nothing is cut off at the bottom of the A4 sheet
  const overflow = await sheet.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(overflow).toBeLessThanOrEqual(0);

  if (browserName === "chromium") {
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBe(1);
  }
});

test("back to the warband list from the header", async ({ page }) => {
  await page.goto("./#/reminder");
  const home = page.getByRole("banner").getByRole("link", { name: "Mes bandes" });
  await expect(home).not.toHaveAttribute("aria-current", "page");
  await home.click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(home).toHaveAttribute("aria-current", "page");
});
