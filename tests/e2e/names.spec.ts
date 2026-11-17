/*
 * File:        tests/e2e/names.spec.ts
 * Role:        Name generators of the wizard: random warband name drawn from
 *              the house tables of the selected faction (step 1), male and
 *              female random fighter names (step 3): book tables of the Guild
 *              Mercenaries (first name and surname), Death Covens book rule.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { WARBAND_NAME_TABLES } from "../../src/features/names/houseNames.ts";

/** Book name tables of the Guild Mercenaries, read from the data file (the data loader needs the bundler). */
const GUILD = JSON.parse(
  readFileSync(new URL("../../src/data/guild-mercenaries.json", import.meta.url), "utf8"),
) as {
  femaleNameTable: { entries: Record<string, string> };
  surnameTable: { entries: Record<string, string> };
};

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

test("Guild female names come from the book tables (v1.11)", async ({ page }) => {
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
  const [first = "", surname = ""] = drawn.split(" ");
  expect(Object.values(GUILD.femaleNameTable.entries)).toContain(first);
  expect(Object.values(GUILD.surnameTable.entries)).toContain(surname);
  await expect(page.getByText("tables du livre (p. 75)")).toBeVisible();
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
