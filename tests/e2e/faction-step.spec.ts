/*
 * File:        tests/e2e/faction-step.spec.ts
 * Role:        First two wizard steps (French interface): one faction and one
 *              origin per row, long faction descriptions and origin flavour
 *              texts cut to three lines with a "read more" toggle that does not
 *              select the card, short texts without toggle; the same for the
 *              long special rules of the fighter scrolls. Closed faction cards
 *              share one height and each radio is centred on its shield.
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
  await expect(page.getByRole("radio", { name: /Cabales de la Mort/ })).not.toBeChecked();

  // The short Guild Mercenaries text fits in three lines: no toggle.
  await expect(page.locator("#faction-guild-mercenaries-description + button")).toHaveCount(0);
});

test("closed faction cards share one height, radio centred on the shield", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();

  const cards = page.locator("fieldset .grid > div");
  await expect(cards).toHaveCount(4);
  const heights = (): Promise<number[]> =>
    cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(new Set(await heights()).size).toBe(1);
  // On a phone the long names wrap: the cards keep one height.
  await page.setViewportSize({ width: 360, height: 740 });
  await expect.poll(async () => new Set(await heights()).size).toBe(1);

  for (const card of await cards.all()) {
    const radio = (await card.getByRole("radio").boundingBox()) ?? { y: 0, height: 0 };
    const shield = (await card.locator("img").boundingBox()) ?? { y: 0, height: 0 };
    const cardBox = (await card.boundingBox()) ?? { y: 0, height: 0 };
    // The shield sits at the top of the card, the radio on its middle.
    expect(Math.abs(shield.y - cardBox.y)).toBeLessThan(20);
    expect(Math.abs(radio.y + radio.height / 2 - (shield.y + shield.height / 2))).toBeLessThanOrEqual(1);
  }
});

test("origin flavour texts can be expanded", async ({ page }) => {
  // One origin per row: the texts are only cut on a phone width.
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Cabales de la Mort/ }).check();
  await page.getByRole("button", { name: "Suivant" }).click();

  // One origin per row, as for the factions.
  const tops = await page
    .getByRole("radio")
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(tops.length);

  // Take the first origin whose text is cut.
  const toggle = page.locator(`button[aria-controls$="-flavour"]`).first();
  const flavourId = (await toggle.getAttribute("aria-controls")) ?? "";
  const first = page.locator(`input[type="radio"][aria-describedby="${flavourId}"]`);
  await expect(toggle).toHaveText("Lire la suite");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(first).not.toBeChecked();

  // The rules lines of the card still select the origin.
  const inputId = (await first.getAttribute("id")) ?? "";
  await page.locator(`label[for="${inputId}"]`).getByText("Chef :").click();
  await expect(first).toBeChecked();
});

test("long special rules of a scroll can be expanded", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nouvelle bande" }).click();
  await page.getByRole("radio", { name: /Cabales de la Mort/ }).check();
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
