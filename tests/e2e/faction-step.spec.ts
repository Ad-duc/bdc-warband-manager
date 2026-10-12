/*
 * File:        tests/e2e/faction-step.spec.ts
 * Role:        First two wizard steps (French interface): one faction per
 *              row, long faction descriptions and origin flavour texts cut to
 *              three lines with a "read more" toggle that does not select the
 *              card, short texts without toggle; the same for the long special
 *              rules of the fighter scrolls.
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

test("origin flavour texts can be expanded", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Death Covens/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  const first = page.getByRole("radio").first();
  const flavourId = (await first.getAttribute("aria-describedby")) ?? "";
  const toggle = page.locator(`button[aria-controls="${flavourId}"]`);
  await expect(toggle).toHaveText("Lire la suite");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(first).not.toBeChecked();

  // The rules lines of the card still select the origin.
  await page.getByText("Chef :").first().click();
  await expect(first).toBeChecked();
});

test("long special rules of a scroll can be expanded", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Death Covens/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Suivant" }).click();

  for (const summary of await page.locator("summary").all()) await summary.click();
  const toggle = page.getByRole("button", { name: "Lire la suite" }).first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole("button", { name: "Réduire" }).first()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});
