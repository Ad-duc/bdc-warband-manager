/*
 * File:        tests/e2e/verminkin.spec.ts
 * Role:        Verminkin in the wizard (French interface): faction choice,
 *              Sparkseer Coven origin with its 0-2 Rolling Contraptions, the
 *              Sparkseer recruited automatically, and the 2D6" Move value of
 *              the Rolling-Contraption scroll.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("start a Sparkseer Coven warband", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();

  await page.getByLabel("Nom de la bande").fill("Les Rongeurs");
  await page.getByRole("radio", { name: /Verminkin/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  const coven = page.getByRole("radio", { name: /Coven du Sparkseer/ });
  await coven.check();
  await expect(page.getByText("Votre bande peut inclure 0-2 Rolling-Contraption.")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  // The leader imposed by the origin is already recruited.
  await expect(page.getByTestId("recruited-fighter")).toHaveCount(1);
  await expect(page.getByTestId("recruited-fighter")).toContainText("Sparkseer");

  // The limit shown in the catalogue follows the origin.
  const contraption = page.locator("summary", { hasText: "Rolling-Contraption" });
  await expect(contraption).toContainText("0-2 Rolling-Contraption");
  await contraption.click();
  await expect(page.getByRole("cell", { name: '2D6"' })).toBeVisible();
  for (let i = 0; i < 2; i += 1)
    await page.getByRole("button", { name: "Recruter Rolling-Contraption", exact: true }).click();
  await expect(page.getByTestId("recruited-fighter")).toHaveCount(3);
  await expect(page.getByRole("complementary")).not.toContainText("limité à 0-");
});
