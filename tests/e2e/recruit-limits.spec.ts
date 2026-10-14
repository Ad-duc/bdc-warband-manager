/*
 * File:        tests/e2e/recruit-limits.spec.ts
 * Role:        Step 3 of the wizard: the "Recruit" buttons are greyed out with
 *              their reason when a rule forbids one more fighter (leader
 *              imposed by the origin, profile limit, category limit).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("recruit buttons follow the recruitment limits", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Mercenaires de la Guilde/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("radio", { name: /Guilde des chasseurs de sorcières/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  // The origin recruited its Witch Hunter: no other leader can be added.
  const recruit = (name: string) => page.getByRole("button", { name: `Recruter ${name}`, exact: true });
  await expect(recruit("Chasseur de sorcières")).toBeDisabled();
  await expect(recruit("Chasseur de sorcières")).toHaveAccessibleDescription("La bande a déjà son Chef.");
  await expect(recruit("Capitaine de la Guilde")).toBeDisabled();

  // 0-1 Guild Wizard.
  await expect(recruit("Magicien de la Guilde")).toBeEnabled();
  await recruit("Magicien de la Guilde").click();
  await expect(recruit("Magicien de la Guilde")).toBeDisabled();
  await expect(recruit("Magicien de la Guilde")).toHaveAccessibleDescription(
    "Limite du profil atteinte : 1 au maximum.",
  );

  // Three Champions at most.
  await recruit("Champion de la Guilde").click();
  await recruit("Champion de la Guilde").click();
  await expect(recruit("Champion de la Guilde")).toBeDisabled();
  await expect(recruit("Médecin de peste")).toHaveAccessibleDescription(
    "Limite atteinte : 3 Champions au maximum.",
  );

  // Removing a fighter frees the slot again.
  await page.getByRole("button", { name: "Renvoyer Magicien de la Guilde" }).click();
  await expect(recruit("Champion de la Guilde")).toBeEnabled();
  await expect(recruit("Mercenaire de la Guilde")).toBeEnabled();
});
