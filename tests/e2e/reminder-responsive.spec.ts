/*
 * File:        tests/e2e/reminder-responsive.spec.ts
 * Role:        The reminder sheet adapts to the screen: no horizontal scroll
 *              on a phone, a tablet in portrait or a desktop, columns stacked
 *              on narrow screens and kept side by side on wide ones.
 * Author:      Adrien Duclaud
 * Created:     2026-10-15
 * License:     MIT
 */

import { expect, test, type Page } from "@playwright/test";

/** Widths of the area between the fixed header and footer, in CSS pixels. */
async function scrollAreaWidths(page: Page): Promise<{ scroll: number; client: number }> {
  return page.evaluate(() => {
    const sheet = document.querySelector('[data-testid="reminder-sheet"]');
    let el = sheet?.parentElement ?? null;
    while (el && getComputedStyle(el).overflowY !== "auto") el = el.parentElement;
    const area = el ?? document.documentElement;
    return { scroll: area.scrollWidth, client: area.clientWidth };
  });
}

/** Number of grid columns of the lower part of the sheet. */
async function lowerColumns(page: Page): Promise<number> {
  return page
    .locator(".rs-columns")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
}

for (const { name, width, columns } of [
  { name: "phone", width: 390, columns: 1 },
  { name: "tablet portrait", width: 600, columns: 1 },
  { name: "desktop", width: 1280, columns: 2 },
]) {
  test(`reminder sheet fits a ${name} screen without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/reminder");
    await expect(page.getByTestId("reminder-sheet")).toBeVisible();

    const { scroll, client } = await scrollAreaWidths(page);
    expect(scroll).toBeLessThanOrEqual(client);
    expect(await lowerColumns(page)).toBe(columns);
  });
}
