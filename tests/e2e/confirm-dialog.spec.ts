/*
 * File:        tests/e2e/confirm-dialog.spec.ts
 * Role:        Layout check of the confirmation dialog: its content fits,
 *              so no scrollbar appears around the parchment frame.
 * Author:      Adrien Duclaud
 * Created:     2026-10-19
 * License:     MIT
 */

import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const demo = fileURLToPath(new URL("../fixtures/demo-export.json", import.meta.url));

test.use({ locale: "fr-FR" });

for (const width of [390, 1280]) {
  test(`delete dialog has no scrollbar at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("./");
    await page.getByTestId("import-input").setInputFiles(demo);
    await expect(page.getByTestId("warband-list")).toBeVisible();
    await page
      .getByRole("button", { name: /^Supprimer/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog can scroll when it clips its overflow and something overflows
    const scrollable = await dialog.evaluate((el) => {
      const style = getComputedStyle(el);
      const clips = (value: string) => value !== "visible";
      return (
        (clips(style.overflowY) && el.scrollHeight > el.clientHeight) ||
        (clips(style.overflowX) && el.scrollWidth > el.clientWidth)
      );
    });
    expect(scrollable).toBe(false);
  });
}
