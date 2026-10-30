/*
 * File:        tests/e2e/compendium.spec.ts
 * Role:        Compendium screen: reached from the header (button and phone
 *              menu), its six collapsible menus (skills, spells, melee,
 *              ranged, armour, items) closed at first, opened one by one or
 *              all at once, and the faction filter.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test("the compendium groups skills, spells and wargear in menus", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Arsenal et grimoire" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Arsenal et grimoire" })).toBeVisible();

  const menus = page.locator("details");
  await expect(menus).toHaveCount(6);
  await expect(page.locator("details[open]")).toHaveCount(0);
  await expect(page.locator("summary")).toHaveText([
    /^Compétences \(\d+\)$/,
    /^Sorts fétiches \(\d+\)$/,
    /^Armes de corps à corps \(\d+\)$/,
    /^Armes à distance \(\d+\)$/,
    /^Armures \(\d+\)$/,
    /^Objets \(\d+\)$/,
  ]);

  // Spells, one faction: its two lores only.
  await page.locator("summary", { hasText: "Sorts fétiches" }).click();
  const spells = page.getByTestId("compendium-spells");
  await expect(spells).toContainText("Domaine de la Magie autorisée");
  await page.getByLabel("Faction", { exact: true }).selectOption("verminkin");
  await expect(spells).toContainText("Domaine des Tunnels profonds");
  await expect(spells).not.toContainText("Domaine de la Magie autorisée");
  await expect(page.locator("summary", { hasText: "Sorts fétiches" })).toHaveText("Sorts fétiches (12)");

  // Common skills stay whatever the faction.
  await page.locator("summary", { hasText: "Compétences" }).click();
  await expect(page.getByTestId("compendium-skills")).toContainText("Compétences de vétéran");

  // Armour of the Verminkin armoury, with its Armour value and price.
  await page.getByRole("button", { name: "Tout ouvrir" }).click();
  await expect(page.locator("details[open]")).toHaveCount(6);
  await expect(page.getByTestId("compendium-armour").getByRole("table")).toHaveCount(1);
  await page.getByRole("button", { name: "Tout fermer" }).click();
  await expect(page.locator("details[open]")).toHaveCount(0);
});

test("the compendium is in the phone menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Outils" }).click();
  await page.getByRole("link", { name: "Arsenal et grimoire" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Arsenal et grimoire" })).toBeVisible();
});
