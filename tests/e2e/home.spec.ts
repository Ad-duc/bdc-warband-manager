/*
 * File:        tests/e2e/home.spec.ts
 * Role:        Smoke test of the built app: home page in French even in an
 *              English browser, no language selector, official website link,
 *              local fonts served, service worker active,
 *              fixed header and footer on phones and large screens (the page
 *              itself never scrolls, only the area between them).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

// An English browser still gets the French interface.
test.use({ locale: "en-GB" });

test("home page loads in French with local fonts", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos bandes");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  const fontOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('32px "Old Celtiberian"');
  });
  expect(fontOk).toBe(true);
});

test("no language selector, link to the official website", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "English" })).toHaveCount(0);
  const official = page
    .getByRole("contentinfo")
    .getByRole("link", { name: /Site officiel de Black Death City/ });
  await expect(official).toHaveAttribute("href", "https://www.blackdeathcity.com/");
  await expect(official).toHaveAttribute("target", "_blank");
});

test("a service worker controls the page", async ({ page }) => {
  await page.goto("./");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toContain("/bdc-warband-manager/");
});

for (const [width, height] of [
  [360, 740],
  [1440, 900],
] as const) {
  test(`header and footer stay in place at ${width}x${height}`, async ({ page }) => {
    const pageScroll = (): Promise<number> =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await page.setViewportSize({ width, height });
    await page.goto("./");
    expect(await pageScroll()).toBe(0);

    await page.getByRole("button", { name: "Nouvelle bande" }).click();
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 3000);
    await expect(page.getByRole("banner")).toBeInViewport();
    await expect(page.getByRole("contentinfo")).toBeInViewport();
    expect(await pageScroll()).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
}
