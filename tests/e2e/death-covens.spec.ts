/*
 * File:        tests/e2e/death-covens.spec.ts
 * Role:        Death Covens in the wizard (French interface): The Hunt Descends
 *              origin with Dire Wolves out of the Beasts limit, the Lycanfell
 *              Beast shown inside the Lycanfell Noble scroll only, and a
 *              Misbegotten bloodline mutation added to the fighter cost.
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
  await page.getByRole("radio", { name: /Death Covens/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  await page.getByRole("radio", { name: /La chasse s'abat/ }).check();
  await expect(page.getByText("Dire Wolf ne compte pas dans la limite des Bêtes.")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  // The Lycanfell Beast is not in the catalogue but inside the Noble's scroll.
  await expect(page.getByRole("button", { name: "Recruter Lycanfell Beast", exact: true })).toHaveCount(0);
  await page.locator("summary", { hasText: "Lycanfell Noble" }).click();
  await expect(page.getByTestId("profile-form")).toContainText("Forme : Lycanfell Beast");

  // Four Dire Wolves: the Beasts counter ignores them.
  for (let i = 0; i < 4; i += 1)
    await page.getByRole("button", { name: "Recruter Dire Wolf", exact: true }).click();
  await expect(page.getByTestId("category-counters")).toContainText("0/3 Bêtes");
  await expect(page.getByRole("complementary")).not.toContainText("3 au maximum");

  // Misbegotten with Wulfen Legs: 65 + 10 silver.
  await page.getByRole("button", { name: "Recruter Misbegotten", exact: true }).click();
  const misbegotten = page.getByTestId("recruited-fighter").filter({ hasText: "Misbegotten" });
  await misbegotten.getByRole("checkbox", { name: /Pattes de loup/ }).check();
  await expect(misbegotten).toContainText("75 pa");
  await expect(misbegotten.getByRole("checkbox", { name: /Carrure massive/ })).toBeDisabled();
});
