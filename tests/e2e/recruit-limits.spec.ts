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
  await page.getByRole("radio", { name: /Guild Mercenaries/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("radio", { name: /Guilde des chasseurs de sorcières/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  // The origin recruited its Witch Hunter: no other leader can be added.
  const recruit = (name: string) => page.getByRole("button", { name: `Recruter ${name}`, exact: true });
  await expect(recruit("Witch Hunter")).toBeDisabled();
  await expect(recruit("Witch Hunter")).toHaveAccessibleDescription("La bande a déjà son Chef.");
  await expect(recruit("Guild Captain")).toBeDisabled();

  // 0-1 Guild Wizard.
  await expect(recruit("Guild Wizard")).toBeEnabled();
  await recruit("Guild Wizard").click();
  await expect(recruit("Guild Wizard")).toBeDisabled();
  await expect(recruit("Guild Wizard")).toHaveAccessibleDescription(
    "Limite du profil atteinte : 1 au maximum.",
  );

  // Three Champions at most.
  await recruit("Guild Champion").click();
  await recruit("Guild Champion").click();
  await expect(recruit("Guild Champion")).toBeDisabled();
  await expect(recruit("Plague Doctor")).toHaveAccessibleDescription(
    "Limite atteinte : 3 Champions au maximum.",
  );

  // Removing a fighter frees the slot again.
  await page.getByRole("button", { name: "Renvoyer Guild Wizard" }).click();
  await expect(recruit("Guild Champion")).toBeEnabled();
  await expect(recruit("Guild Mercenary")).toBeEnabled();
});
