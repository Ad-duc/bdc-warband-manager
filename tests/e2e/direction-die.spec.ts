/*
 * File:        tests/e2e/direction-die.spec.ts
 * Role:        Direction dice opened from the header over any screen: roll
 *              with each distance of the rules, result announced, closed with
 *              the button or Escape. Header tools grouped in one menu on
 *              phones.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("direction dice from the header", async ({ page }) => {
  await page.goto("./#/rules");
  const dialog = page.getByRole("dialog", { name: "Dé de direction" });
  await expect(dialog).toBeHidden();
  await page.getByRole("banner").getByRole("button", { name: "Dé de direction" }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("direction-result")).toContainText("Choisissez la distance");

  await dialog.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/^[1-6]"/);
  await expect(page.getByTestId("direction-result")).toContainText(/Flèche à \d{1,3} degrés/);

  await dialog.getByRole("radio", { name: /D6x2"/ }).check();
  await dialog.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/D6 = [1-6], x2 = \d{1,2}"/);

  await dialog.getByRole("radio", { name: /3D6"/ }).check();
  await dialog.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText(/[1-6] \+ [1-6] \+ [1-6] = \d{1,2}"/);

  await dialog.getByRole("radio", { name: /Direction seule/ }).check();
  await dialog.getByRole("button", { name: "Relancer" }).click();
  await expect(page.getByTestId("direction-result")).toContainText("Direction tirée");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/rules$/);
  await page.getByRole("banner").getByRole("button", { name: "Dé de direction" }).click();
  await dialog.getByRole("button", { name: "Fermer" }).click();
  await expect(dialog).toBeHidden();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("header tools in one menu, title on one line", async ({ page }) => {
    await page.goto("./");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("button", { name: "Dé de direction" })).toBeHidden();
    const title = banner.getByRole("link", { name: "Black Death City" });
    const box = await title.boundingBox();
    expect(box?.height ?? 0).toBeLessThan(40);

    const menu = banner.getByRole("button", { name: "Outils et langue" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(banner.getByRole("link", { name: "Dos de cartes" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();

    await menu.click();
    await banner.getByRole("button", { name: "English" }).click();
    await expect(banner.getByRole("button", { name: "Tools and language" })).toBeVisible();
    await banner.getByRole("button", { name: "Direction dice" }).click();
    await expect(page.getByRole("dialog", { name: "Direction dice" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Tools and language" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await page.keyboard.press("Escape");

    await banner.getByRole("button", { name: "Tools and language" }).click();
    await banner.getByRole("link", { name: "Card backs" }).click();
    await expect(page).toHaveURL(/#\/card-backs$/);
    await banner.getByRole("button", { name: "Tools and language" }).click();
    await banner.getByRole("link", { name: "My warbands" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(banner.getByRole("button", { name: "Tools and language" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
