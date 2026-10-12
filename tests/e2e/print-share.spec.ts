/*
 * File:        tests/e2e/print-share.spec.ts
 * Role:        Print view (A4 roster, TCG cards and their backs, page count of the PDF
 *              output on Chromium), share link opened read-only then saved as
 *              a copy, and the application working offline once loaded.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const demo = fileURLToPath(new URL("../fixtures/demo-export.json", import.meta.url));

test.use({ locale: "fr-FR" });

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.getByTestId("import-input").setInputFiles(demo);
  await expect(page.getByTestId("warband-list")).toContainText("Les Lames de Rennes");
});

test("print view: roster on 3 pages, cards on 1 page", async ({ page, browserName }) => {
  await page.getByRole("link", { name: "Imprimer Les Lames de Rennes" }).click();
  await expect(page.getByTestId("print-page")).toHaveCount(3);
  await expect(page.getByTestId("print-fighter")).toHaveCount(9);
  await page.getByLabel(/blocs combattant vierges/).check();
  await expect(page.getByTestId("print-fighter")).toHaveCount(15);
  await page.getByRole("radio", { name: "Cartes de combattants" }).check();
  await expect(page.getByTestId("print-card")).toHaveCount(15);
  await expect(page.getByTestId("print-page")).toHaveCount(2);
  await page.getByLabel(/blocs combattant vierges/).uncheck();
  await expect(page.getByTestId("print-card")).toHaveCount(9);

  // Card backs: one back page behind each card page, then a stand-alone sheet
  await page.getByLabel(/Imprimer les dos/).check();
  await expect(page.getByTestId("print-page")).toHaveCount(2);
  await expect(page.getByTestId("print-card-back")).toHaveCount(9);
  await expect(page.getByTestId("print-back-warband")).toHaveCount(0);
  await page.getByLabel("Nom de la bande au dos").check();
  await expect(page.getByTestId("print-back-warband").first()).toHaveText("Les Lames de Rennes");
  await page.getByRole("radio", { name: "Dos des cartes" }).check();
  await expect(page.getByTestId("print-page")).toHaveCount(1);
  await expect(page.getByTestId("print-card")).toHaveCount(0);
  await expect(page.getByTestId("print-card-back")).toHaveCount(9);
  await page.getByRole("radio", { name: "Les deux" }).check();
  // Roster of 3 pages + 1 blank page so the cards start on a new sheet
  await expect(page.getByTestId("print-page")).toHaveCount(6);

  if (browserName === "chromium") {
    await page.getByRole("radio", { name: "Feuille de bande" }).check();
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBe(3);
  }
});

test("share link opens read-only and can be saved as a copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  await page.getByRole("link", { name: "Campagne de Les Lames de Rennes" }).click();
  await page.getByRole("button", { name: "Partager" }).click();
  const field = page.getByLabel("Lien de partage");
  let url: string;
  if (await field.isVisible().catch(() => false)) url = await field.inputValue();
  else url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("#w=");

  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Bande partagée : Les Lames de Rennes" })).toBeVisible();
  await expect(page.getByTestId("print-fighter")).toHaveCount(9);
  await page.getByRole("button", { name: "Enregistrer une copie" }).click();
  await expect(page).toHaveURL(/#\/warband\/[0-9a-f-]+/);
  await expect(page.getByTestId("warband-rating")).toHaveText("1 277");
  await page.goto("./");
  await expect(page.getByRole("link", { name: "Les Lames de Rennes", exact: true })).toHaveCount(2);
});

test("works offline once loaded", async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos bandes");
  await expect(page.getByTestId("warband-list")).toContainText("Les Lames de Rennes");
  await page.getByRole("link", { name: "Imprimer Les Lames de Rennes" }).click();
  await expect(page.getByTestId("print-fighter")).toHaveCount(9);
  await context.setOffline(false);
});
