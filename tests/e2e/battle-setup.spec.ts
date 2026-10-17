/*
 * File:        tests/e2e/battle-setup.spec.ts
 * Role:        Scenario reference and battle set-up assistant (French
 *              interface): scenario pages, a battle between a saved warband
 *              and a typed-in one (underdog, scenario, twist, battle groups),
 *              hand-off to the battle log, and a group campaign from its
 *              creation to a recorded battle and its standings.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const demo = fileURLToPath(new URL("../fixtures/demo-export.json", import.meta.url));

test.use({ locale: "fr-FR", viewport: { width: 1440, height: 900 } });

async function importDemo(page: Page): Promise<void> {
  await page.goto("./");
  await page.getByTestId("import-input").setInputFiles(demo);
  await expect(page.getByTestId("warband-list")).toBeVisible();
}

test("scenario reference", async ({ page }) => {
  await page.goto("./#/scenarios");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chapitre 3 - Scénarios");
  await expect(page.getByRole("cell", { name: /La Chapelle/ })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Liste des scénarios" })
    .getByRole("link", { name: "4. La Chapelle" })
    .click();
  await expect(page).toHaveURL(/#\/scenarios\/4$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("4. La Chapelle");
  await expect(page.getByRole("heading", { name: "Rebondissements (1D3)" })).toBeVisible();
});

test("set up a battle against a typed-in warband and hand it to the battle log", async ({ page }) => {
  await importDemo(page);
  await page.goto("./#/warband/demo-1/campaign");
  await page.getByRole("main").getByRole("link", { name: "Préparer une bataille" }).click();
  await expect(page).toHaveURL(/#\/battle\?warband=demo-1$/);

  const second = page.getByRole("group", { name: "Seconde bande" });
  await second.getByLabel("Nom de la bande").fill("Les Rats");
  await second.getByLabel("Valeur de bande").fill("100");
  await second.getByLabel("Combattants").fill("7");
  await expect(page.getByTestId("underdog")).toHaveText("Outsider : Les Rats");

  await page.getByLabel("Ou choisir").first().selectOption("3");
  await expect(page.getByTestId("scenario-result")).toContainText("3. Pas de quartier");
  await page.getByRole("button", { name: "Lancer 1D6 sur la table des rebondissements" }).click();
  await expect(page.getByTestId("twist-result")).toBeVisible();

  // Pas de quartier: 3 battle groups for each warband.
  await expect(page.getByTestId("groups-b")).toContainText("7 combattants : groupes de 2 / 2 / 3");
  await page
    .getByTestId("groups-a")
    .getByRole("button", { name: "Répartir les combattants au hasard" })
    .click();
  await expect(page.getByTestId("groups-a").getByRole("listitem")).toHaveCount(3);
  await page
    .getByTestId("groups-b")
    .getByRole("button", { name: "Tirer le groupe déployé en premier" })
    .click();
  await expect(page.getByTestId("groups-b")).toContainText(/Le groupe [1-3] est déployé en premier\./);

  await page.getByRole("button", { name: /Enregistrer dans le journal de/ }).click();
  await expect(page).toHaveURL(/#\/warband\/demo-1\/campaign$/);
  await expect(page.getByRole("textbox", { name: "Scénario", exact: true })).toHaveValue(
    "3. Pas de quartier",
  );
  await expect(page.getByRole("textbox", { name: "Adversaire", exact: true })).toHaveValue("Les Rats");
});

test("run a group campaign", async ({ page }) => {
  await importDemo(page);
  await page.getByLabel("Nom de la campagne").fill("Hiver à Rennes");
  await page.getByRole("button", { name: "Nouvelle campagne" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hiver à Rennes");

  await page
    .getByRole("form", { name: "Ajouter une bande de l'application" })
    .getByLabel("Bande")
    .selectOption("demo-1");
  await page
    .getByRole("form", { name: "Ajouter une bande de l'application" })
    .getByRole("button", { name: "Ajouter" })
    .click();
  const guest = page.getByRole("form", { name: "Ajouter la bande d'un autre joueur" });
  await guest.getByLabel("Nom de la bande").fill("Les Rats");
  await guest.getByLabel("Faction").selectOption("verminkin");
  await guest.getByLabel("Valeur de bande").fill("900");
  await guest.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByTestId("participants").getByRole("row")).toHaveCount(3);

  await page.getByRole("link", { name: "Préparer la prochaine bataille" }).click();
  await page
    .getByRole("group", { name: "Première bande" })
    .getByLabel("Bande de la campagne")
    .selectOption({ label: "Les Lames de Rennes" });
  await page
    .getByRole("group", { name: "Seconde bande" })
    .getByLabel("Bande de la campagne")
    .selectOption({ label: "Les Rats" });
  await expect(page.getByTestId("underdog")).toHaveText("Outsider : Les Rats");
  await page.getByRole("button", { name: "Lancer 1D6 sur la table des scénarios" }).click();
  await page.getByRole("radio", { name: "Les Rats" }).check();
  await page.getByRole("button", { name: "Enregistrer la bataille" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hiver à Rennes");
  await expect(page.getByTestId("campaign-battles")).toContainText("Les Lames de Rennes contre Les Rats");
  await expect(page.getByTestId("campaign-battles")).toContainText("gagnée par Les Rats");
  const rats = page.getByTestId("standings").getByRole("row", { name: /Les Rats/ });
  await expect(rats).toContainText("1");
  await page.goto("./");
  await expect(page.getByTestId("campaign-list")).toContainText("Hiver à Rennes");
});
