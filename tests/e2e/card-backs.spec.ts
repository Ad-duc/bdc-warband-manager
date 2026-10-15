/*
 * File:        tests/e2e/card-backs.spec.ts
 * Role:        Stand-alone card back generator: opened from the header, one
 *              sheet of 9 backs for the chosen faction, optional warband name,
 *              several sheets, ink saver style.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("card back generator from the header", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("banner").getByRole("link", { name: "Dos de cartes" }).click();
  await expect(page).toHaveURL(/#\/card-backs$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Générateur de dos de cartes");
  await expect(page.getByRole("banner").getByRole("link", { name: "Dos de cartes" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await expect(page.getByTestId("print-page")).toHaveCount(1);
  await expect(page.getByTestId("print-card-back")).toHaveCount(9);
  await expect(page.getByTestId("print-back-warband")).toHaveCount(0);

  await page.getByRole("radio", { name: "Vermineux" }).check();
  await expect(page.getByTestId("print-card-back").first()).toContainText("Verminkin");
  await page.getByLabel("Nom de la bande (facultatif)").fill("Les Rats du Port");
  await expect(page.getByTestId("print-back-warband").first()).toHaveText("Les Rats du Port");

  await page.getByLabel("Planches").selectOption("3");
  await expect(page.getByTestId("print-page")).toHaveCount(3);
  await expect(page.getByTestId("print-card-back")).toHaveCount(27);

  await page.getByRole("radio", { name: "Économie d'encre" }).check();
  await expect(page.locator(".print-ink-saver")).toHaveCount(1);
});
