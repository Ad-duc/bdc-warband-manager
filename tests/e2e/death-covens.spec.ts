/*
 * File:        tests/e2e/death-covens.spec.ts
 * Role:        Death Covens in the wizard (French interface): The Hunt Descends
 *              origin with Dire Wolves out of the Beasts limit, the Lycanfell
 *              Beast shown inside the Lycanfell Noble scroll only, and a
 *              Misbegotten bloodline mutation added to the fighter cost, and
 *              the weapon granted by the Bestial Companion in the armoury.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("start a The Hunt Descends warband", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByLabel("Nom de la bande").fill("La Meute");
  await page.getByRole("radio", { name: /Cabales de la Mort/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  await page.getByRole("radio", { name: /La chasse s'abat/ }).check();
  await expect(page.getByText("Loup sinistre ne compte pas dans la limite des Bêtes.")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  // The Lycanfell Beast is not in the catalogue but inside the Noble's scroll.
  await expect(page.getByRole("button", { name: "Recruter Bête lycanthrope", exact: true })).toHaveCount(0);
  await page.locator("summary", { hasText: "Noble lycanthrope" }).click();
  await expect(page.getByTestId("profile-form")).toContainText("Forme : Bête lycanthrope");

  // Four Dire Wolves: the Beasts counter ignores them.
  for (let i = 0; i < 4; i += 1)
    await page.getByRole("button", { name: "Recruter Loup sinistre", exact: true }).click();
  await expect(page.getByTestId("category-counters")).toContainText("0/3 Bêtes");
  await expect(page.getByRole("complementary")).not.toContainText("3 au maximum");

  // Misbegotten with Wulfen Legs: 65 + 10 silver.
  await page.getByRole("button", { name: "Recruter Bâtard du sang", exact: true }).click();
  const misbegotten = page.getByTestId("recruited-fighter").filter({ hasText: "Bâtard du sang" });
  await misbegotten.getByRole("checkbox", { name: /Pattes de loup/ }).check();
  await expect(misbegotten).toContainText("75 pa");
  await expect(misbegotten.getByRole("checkbox", { name: /Carrure massive/ })).toBeDisabled();

  // Wargear step: the Bestial Companion row shows the weapon its text announces.
  await page.getByRole("button", { name: "Suivant" }).click();
  const items = page.locator("details:not([open]) > summary", { hasText: "Objets" });
  while ((await items.count()) > 0) await items.first().click();
  const granted = page.getByTestId("granted-attack-bestial-companion").first();
  await expect(granted).toBeVisible();
  await expect(granted).toContainText("-1");
  await expect(granted).toContainText("1D3+1");
  await expect(granted).toContainText("Arme naturelle");
});
