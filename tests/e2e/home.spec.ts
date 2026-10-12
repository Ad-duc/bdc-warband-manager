/*
 * File:        tests/e2e/home.spec.ts
 * Role:        Smoke test of the built app: themed home page, language switch
 *              kept after reload, local fonts served, service worker active.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "en-GB" });

test("home page loads in English with local fonts", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your warbands");
  const fontOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('32px "Old Celtiberian"');
  });
  expect(fontOk).toBe(true);
});

test("language choice survives a reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos bandes");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos bandes");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("a service worker controls the page", async ({ page }) => {
  await page.goto("./");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toContain("/bdc-warband-manager/");
});
