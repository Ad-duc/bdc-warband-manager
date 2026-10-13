/*
 * File:        tests/e2e/changelog.spec.ts
 * Role:        "What's new" page: opened from the footer, shown in French,
 *              without the file header comment.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("open the changelog from the footer", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("contentinfo").getByRole("link", { name: "Nouveautés" }).click();
  await expect(page).toHaveURL(/#\/changelog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nouveautés");
  await expect(page.getByRole("heading", { level: 2, name: /1\.0\.0/ })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("File:");

  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Nouveautés" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
