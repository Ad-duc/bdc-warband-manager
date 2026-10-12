/*
 * File:        tests/e2e/wizard.spec.ts
 * Role:        End to end creation of a valid "Épées à louer" warband in the
 *              French interface: origin, recruitment with manual dice, wargear,
 *              skills, checks of budget, rating and saving after a reload.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("create a valid Swords for Hire warband", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();

  // 1. Faction and name
  await page.getByLabel("Nom de la bande").fill("Les Lames de Rennes");
  await expect(page.getByRole("radio", { name: /Guild Mercenaries/ })).toBeChecked();
  await page.getByRole("button", { name: "Suivant" }).click();

  // 2. Origin: the Guild Captain is recruited automatically
  await page.getByRole("radio", { name: /Épées à louer/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  // 3. Fighters
  for (const name of ["Guild Champion", "Plague Doctor"])
    await page.getByRole("button", { name: `Recruter ${name}`, exact: true }).click();
  for (let i = 0; i < 5; i += 1)
    await page.getByRole("button", { name: "Recruter Guild Mercenary", exact: true }).click();
  await page.getByRole("button", { name: "Recruter Mercenary Ogre", exact: true }).click();
  await expect(page.getByTestId("recruited-fighter")).toHaveCount(9);
  await expect(page.getByTestId("category-counters")).toContainText("1/1 Chefs");
  await expect(page.getByTestId("category-counters")).toContainText("5/5+ Hommes de main");
  const dice = page.getByLabel("Résultat du dé");
  for (let i = 0; i < 9; i += 1) await dice.nth(i).fill("3");
  await page.getByRole("button", { name: "Suivant" }).click();

  // 4. Wargear
  const equip = async (fighter: string, nth: number, items: string[]) => {
    await page
      .getByRole("group", { name: "Combattant à équiper" })
      .getByRole("button", { name: fighter })
      .nth(nth)
      .click();
    for (const item of items)
      await page
        .getByRole("button", { name: `Acheter ${item}`, exact: true })
        .first()
        .click();
  };
  await equip("Guild Captain", 0, ["Épée", "Cuirasse", "Bouclier"]);
  await equip("Guild Champion", 0, ["Espadon", "Cuirasse"]);
  await equip("Plague Doctor", 0, ["Dague"]);
  for (let i = 0; i < 5; i += 1) await equip("Guild Mercenary", i, ["Lance", "Cuirasse"]);
  await equip("Mercenary Ogre", 0, ["Grande arme d'ogre"]);
  await expect(page.getByTestId("budget-spent")).toHaveText("995 pa");
  await page.getByRole("button", { name: "Suivant" }).click();

  // 5. Skills
  const captain = page.getByRole("region", { name: "Guild Captain" });
  await captain.getByRole("checkbox", { name: /^Cri de ralliement/ }).check();
  await captain.getByRole("checkbox", { name: /^Fine gâchette/ }).check();
  await page
    .getByRole("region", { name: "Guild Champion" })
    .getByRole("checkbox", { name: /^Feinte/ })
    .check();
  await expect(
    page.getByRole("region", { name: "Guild Champion" }).getByRole("checkbox", { name: /^Fine gâchette/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Suivant" }).click();

  // 6. Rating: 995 silver + 287 experience, 5 silver to the stash, no error or warning
  await expect(page.getByTestId("budget-remaining")).toHaveText("5 pa");
  await expect(page.getByTestId("final-rating")).toHaveText("1 282");
  await expect(page.getByTestId("final-stash")).toHaveText("5 pa");
  await expect(page.getByTestId("diagnostics-summary")).toHaveText(
    "0 erreur(s), 0 avertissement(s), 0 information(s)",
  );
  await page.getByRole("button", { name: "Terminer la bande" }).click();

  // The campaign dashboard opens, with 5 silver in the stash
  await expect(page.getByRole("heading", { level: 1, name: "Les Lames de Rennes" })).toBeVisible();
  await expect(page.getByTestId("stash-silver")).toHaveValue("5");
  await page.getByRole("button", { name: "Retour aux bandes" }).click();

  // Saved on the device
  const list = page.getByTestId("warband-list");
  await expect(list).toContainText("Les Lames de Rennes");
  await expect(list).toContainText("valeur 1 282");
  await page.reload();
  await expect(page.getByTestId("warband-list")).toContainText("Les Lames de Rennes");
});

test("an invalid warband shows blocking errors", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("button", { name: "6 Valeur" }).click();
  await expect(page.getByTestId("diagnostics-summary")).toContainText("erreur");
  await expect(page.getByText("Aucune origine choisie.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terminer la bande" })).toBeDisabled();
});
