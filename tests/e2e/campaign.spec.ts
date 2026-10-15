/*
 * File:        tests/e2e/campaign.spec.ts
 * Role:        Campaign dashboard on a phone-sized screen: import a warband,
 *              record a battle (experience, a loss, silver), check the summary,
 *              counters, stash and rating, Black Rot warning, then undo.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const demo = fileURLToPath(new URL("../fixtures/demo-export.json", import.meta.url));

test.use({ locale: "fr-FR", viewport: { width: 390, height: 844 } });

test("record and undo a battle", async ({ page }) => {
  await page.goto("./");
  await page.getByTestId("import-input").setInputFiles(demo);
  await page.getByRole("link", { name: "Campagne de Les Lames de Rennes" }).click();
  await expect(page.getByTestId("campaign-rating")).toHaveText("1 277");

  await page.getByRole("button", { name: "Nouvelle bataille" }).click();
  await page.getByLabel("Scénario").fill("Dans les fosses");
  await page.getByLabel("Adversaire").fill("Vermineux");
  await page.getByLabel("Expérience gagnée par Konrad").fill("5");
  await page.getByLabel("Mercenaire de la Guilde est perdu").first().check();
  await page.getByLabel(/^Pièces d'argent gagnées/).fill("40");
  await page.getByRole("button", { name: "Vérifier" }).click();
  const summary = page.getByTestId("battle-summary");
  await expect(summary).toContainText("Konrad : 5 d'expérience");
  await expect(summary).toContainText("Mercenaire de la Guilde est perdu");
  await expect(summary).toContainText("Butin : 40 pa");
  await page.getByRole("button", { name: "Appliquer la bataille" }).click();

  await expect(page.getByTestId("counter-battlesFought")).toHaveValue("1");
  await expect(page.getByTestId("counter-victories")).toHaveValue("1");
  await expect(page.getByTestId("counter-fightersLost")).toHaveValue("1");
  await expect(page.getByTestId("stash-silver")).toHaveValue("45");
  await expect(page.getByTestId("campaign-rating")).toHaveText("1 174");
  await expect(page.getByTestId("battle-log")).toContainText("Dans les fosses");
  await expect(page.getByText("4 Hommes de main : au moins 5 requis.")).toBeVisible();

  await page.getByLabel("Case 3 de Pourriture noire de Konrad").check();
  await expect(page.getByText(/Pourriture noire : les 3 cases sont cochées/)).toBeVisible();

  await page.getByRole("button", { name: "Annuler la dernière bataille" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Annuler la dernière bataille" }).click();
  await expect(page.getByTestId("campaign-rating")).toHaveText("1 277");
  await expect(page.getByTestId("counter-battlesFought")).toHaveValue("0");
  await expect(page.getByTestId("stash-silver")).toHaveValue("5");
});
