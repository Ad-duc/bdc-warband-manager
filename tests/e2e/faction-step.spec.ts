/*
 * File:        tests/e2e/faction-step.spec.ts
 * Role:        First wizard step (French interface): one faction per row,
 *              long descriptions cut to three lines with a "read more" toggle
 *              that does not select the faction, short ones without toggle.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR", viewport: { width: 1700, height: 1000 } });

test("long faction descriptions can be expanded", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();

  const radios = page.getByRole("radio");
  await expect(radios).toHaveCount(4);
  // One faction per row: every radio sits in its own vertical slot.
  const tops = await radios.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(4);

  const description = page.locator("#faction-death-covens-description");
  const toggle = page.locator(`button[aria-controls="faction-death-covens-description"]`);
  await expect(toggle).toHaveText("Lire la suite");
  const closed = (await description.boundingBox())?.height ?? 0;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveText("Réduire");
  expect((await description.boundingBox())?.height ?? 0).toBeGreaterThan(closed);
  await expect(page.getByRole("radio", { name: /Death Covens/ })).not.toBeChecked();

  // The short Guild Mercenaries text fits in three lines: no toggle.
  await expect(page.locator("#faction-guild-mercenaries-description + button")).toHaveCount(0);
});
