/*
 * File:        tests/e2e/direction-die.spec.ts
 * Role:        Direction dice screen opened from the header: roll with each
 *              distance of the rules, result announced, shown in the page
 *              (no dialog). Header tools grouped in one menu on phones.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("direction dice screen from the header", async ({ page }) => {
  await page.goto("./#/rules");
  const banner = page.getByRole("banner");
  const link = banner.getByRole("link", { name: "Dé de direction" });
  await link.click();
  await expect(page).toHaveURL(/#\/dice$/);
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const die = page.getByRole("region", { name: "Dé de direction" });
  await expect(die.getByRole("heading", { level: 1, name: "Dé de direction" })).toBeVisible();
  await expect(page.getByTestId("direction-result")).toContainText("Choisissez la distance");

  await die.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/^[1-6]"/);
  await expect(page.getByTestId("direction-result")).toContainText(/Flèche à \d{1,3} degrés/);

  await die.getByRole("radio", { name: /D6x2"/ }).check();
  await die.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/D6 = [1-6], x2 = \d{1,2}"/);

  await die.getByRole("radio", { name: /3D6"/ }).check();
  await die.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/[1-6] \+ [1-6] \+ [1-6] = \d{1,2}"/);

  await die.getByRole("radio", { name: /Direction seule/ }).check();
  await die.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText("Direction tirée");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("header tools in one menu, title on one line", async ({ page }) => {
    await page.goto("./");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "Dé de direction" })).toBeHidden();
    const title = banner.getByRole("link", { name: "Black Death City" });
    const box = await title.boundingBox();
    expect(box?.height ?? 0).toBeLessThan(40);

    const menu = banner.getByRole("button", { name: "Outils" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(banner.getByRole("link", { name: "Dos de cartes" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();

    await menu.click();
    await banner.getByRole("link", { name: "Dé de direction" }).click();
    await expect(page).toHaveURL(/#\/dice$/);
    await expect(page.getByRole("button", { name: "Lancer" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Outils" })).toHaveAttribute("aria-expanded", "false");

    await banner.getByRole("button", { name: "Outils" }).click();
    await banner.getByRole("link", { name: "Dos de cartes" }).click();
    await expect(page).toHaveURL(/#\/card-backs$/);
    await banner.getByRole("button", { name: "Outils" }).click();
    await banner.getByRole("link", { name: "Mes bandes" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(banner.getByRole("button", { name: "Outils" })).toHaveAttribute("aria-expanded", "false");
  });
});
