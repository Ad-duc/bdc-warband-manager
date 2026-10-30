/*
 * File:        tests/e2e/reminder-responsive.spec.ts
 * Role:        The reminder screen adapts to the screen like the other
 *              screens: no horizontal scroll on a phone, a tablet in portrait
 *              or a desktop, one column on narrow screens and two side by
 *              side on wide ones; the A4 sheet stays hidden on screen.
 * Author:      Adrien Duclaud
 * Created:     2026-10-15
 * License:     MIT
 */

import { expect, test, type Page } from "@playwright/test";

/** Widths of the area between the fixed header and footer, in CSS pixels. */
async function scrollAreaWidths(page: Page): Promise<{ scroll: number; client: number }> {
  return page.evaluate(() => {
    const guide = document.querySelector('[data-testid="reminder-guide"]');
    let el = guide?.parentElement ?? null;
    while (el && getComputedStyle(el).overflowY !== "auto") el = el.parentElement;
    const area = el ?? document.documentElement;
    return { scroll: area.scrollWidth, client: area.clientWidth };
  });
}

/** Number of grid columns of the guide. */
async function guideColumns(page: Page): Promise<number> {
  return page
    .getByTestId("reminder-guide")
    .locator(":scope > div")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
}

for (const { name, width, columns } of [
  { name: "phone", width: 390, columns: 1 },
  { name: "tablet portrait", width: 600, columns: 1 },
  { name: "desktop", width: 1280, columns: 2 },
]) {
  test(`reminder screen fits a ${name} screen without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/reminder");
    await expect(page.getByTestId("reminder-guide")).toBeVisible();
    await expect(page.getByTestId("reminder-sheet")).toBeHidden();

    const { scroll, client } = await scrollAreaWidths(page);
    expect(scroll).toBeLessThanOrEqual(client);
    expect(await guideColumns(page)).toBe(columns);
  });
}
