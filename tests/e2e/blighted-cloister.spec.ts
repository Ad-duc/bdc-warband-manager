/*
 * File:        tests/e2e/blighted-cloister.spec.ts
 * Role:        The Blighted Cloister in the wizard (French interface): the
 *              Knights-Militant origin lifts the 0-3 limit of the Cloister
 *              Knights, the Knight-Abbot starts with his Full-Plate, and the
 *              epithet button adds a translated epithet to the fighter name.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("start a Knights-Militant warband", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByLabel("Nom de la bande").fill("Les Pieux");
  await page.getByRole("radio", { name: /The Blighted Cloister/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  await page.getByRole("radio", { name: /Chevaliers militants/ }).check();
  await expect(
    page.getByText("Votre bande peut recruter n'importe quel nombre de Cloister Knight."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  // No "0-3" in front of the Cloister Knight with this origin.
  const knight = page.locator("summary", { hasText: "Cloister Knight" });
  await expect(knight).not.toContainText("0-3");
  for (let i = 0; i < 4; i += 1)
    await page.getByRole("button", { name: "Recruter Cloister Knight", exact: true }).click();
  await expect(page.getByRole("complementary")).not.toContainText("limité à 0-");

  // The Knight-Abbot imposed by the origin gets a name and an epithet.
  const abbot = page.getByTestId("recruited-fighter").filter({ hasText: "Knight-Abbot" });
  const name = abbot.getByLabel("Nom", { exact: true });
  await name.fill("Gideon");
  await abbot.getByRole("button", { name: "Épithète au hasard pour Knight-Abbot" }).click();
  await expect(name).toHaveValue(/^Gideon, \S/);

  // His Full-Plate is already carried, at no cost.
  await page.getByRole("button", { name: "Suivant" }).click();
  await page
    .getByRole("group", { name: "Combattant à équiper" })
    .getByRole("button", { name: /Gideon/ })
    .click();
  await expect(page.getByTestId("carried-wargear")).toContainText("Armure de plates");
});
