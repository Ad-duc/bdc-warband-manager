/*
 * File:        tests/e2e/names.spec.ts
 * Role:        Name generators of the wizard: random warband name drawn from
 *              the house tables of the selected faction (step 1), male and
 *              female random fighter names (step 3), with the Death Covens
 *              book rule for female names.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { expect, test } from "@playwright/test";
import { FEMALE_NAME_TABLES, WARBAND_NAME_TABLES } from "../../src/features/names/houseNames.ts";

test.use({ locale: "fr-FR" });

test("random warband name follows the selected faction", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Vermineux/ }).check();
  await page.getByRole("button", { name: /^Nom de bande au hasard/ }).click();
  const name = await page.getByLabel("Nom de la bande").inputValue();
  const table = WARBAND_NAME_TABLES["verminkin"];
  expect(table?.heads.some((h) => name.startsWith(`${h} `))).toBe(true);
  expect(table?.complements.some((c) => name.endsWith(` ${c}`))).toBe(true);
  await expect(page.getByText("tables maison, non officielles")).toBeVisible();
});

test("female names from the house table and the Death Covens rule", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Mercenaires de la Guilde/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Suivant" }).click();
  // The origin has already recruited its leader.

  const fighter = page.getByTestId("recruited-fighter").first();
  const male = fighter.getByRole("button", { name: "Nom masculin" });
  const female = fighter.getByRole("button", { name: "Nom féminin" });
  await expect(male).toHaveAttribute("aria-pressed", "true");
  await female.click();
  await expect(female).toHaveAttribute("aria-pressed", "true");
  await expect(male).toHaveAttribute("aria-pressed", "false");
  await fighter.getByRole("button", { name: /^Nom au hasard/ }).click();
  const drawn = await fighter.getByLabel("Nom", { exact: true }).inputValue();
  expect(Object.values(FEMALE_NAME_TABLES["guild-mercenaries"] ?? {})).toContain(drawn);
});

test("Death Covens female names end with -a or a vowel", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Cabales de la Mort/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Suivant" }).click();
  // The origin has already recruited its leader.
  await expect(page.getByText(/règle du livre/)).toBeVisible();

  const fighter = page.getByTestId("recruited-fighter").first();
  await fighter.getByRole("button", { name: "Nom féminin" }).click();
  for (let i = 0; i < 5; i += 1) {
    await fighter.getByRole("button", { name: /^Nom au hasard/ }).click();
    expect(await fighter.getByLabel("Nom", { exact: true }).inputValue()).toMatch(/[aeiouy]$/i);
  }
});
