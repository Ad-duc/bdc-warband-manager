/*
 * File:        tests/e2e/tutorial.spec.ts
 * Role:        Rules tutorial: opened from the header, lesson list, step by
 *              step with the buttons and the arrow keys (the step is kept in
 *              the address), a step opened from its address, life points and
 *              dice following the book example, the link to the rules reader
 *              that opens the chapter at the quoted section, and the ranged
 *              attack house example (target choice, Bow roll, cover, damage).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test("lesson list from the header, then the melee lesson step by step", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("banner").getByRole("link", { name: "Tutoriel" }).first().click();
  await expect(page).toHaveURL(/#\/tutorial$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tutoriel");

  await page.getByRole("link", { name: "Commencer la leçon Attaque au corps à corps" }).click();
  await expect(page).toHaveURL(/#\/tutorial\/melee-attack\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Attaque au corps à corps");
  await expect(page.getByText("Étape 1 sur 12")).toBeVisible();
  await expect(page.getByRole("button", { name: "Précédent" })).toBeDisabled();
  await expect(page.getByText("Les dés sont lancés à l'étape 5.")).toBeVisible();

  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page).toHaveURL(/#\/tutorial\/melee-attack\/2$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Désigner l'attaquant et le défenseur" }),
  ).toBeVisible();

  // Arrow keys move between steps
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/tutorial\/melee-attack\/5$/);
  await expect(page.getByRole("img", { name: "Hache, 6 : Touche critique" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Dague, 5 : Touche, main secondaire" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/#\/tutorial\/melee-attack\/4$/);
});

test("a step opened from its address, with life points and dice of the book example", async ({ page }) => {
  await page.goto("./#/tutorial/melee-attack/8");
  await expect(page.getByText("Étape 8 sur 12")).toBeVisible();
  await expect(page.getByRole("img", { name: "Points de vie : 3 sur 4" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Points de vie : 1 sur 4" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Épée, 6 : Touche critique, attaque résolue" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Hache, 5 : Touche, parée" })).toBeVisible();

  await page.goto("./#/tutorial/melee-attack/99");
  await expect(page.getByText("Étape 12 sur 12")).toBeVisible();
  await expect(page.getByRole("button", { name: "Suivant" })).toBeDisabled();
  await expect(page.getByRole("table", { name: "Récapitulatif des échanges" })).toBeVisible();
  await page.getByRole("button", { name: "Recommencer" }).click();
  await expect(page).toHaveURL(/#\/tutorial\/melee-attack\/1$/);

  await page.goto("./#/tutorial/unknown");
  await expect(page.getByRole("alert")).toHaveText("Cette leçon n'existe pas.");
});

test("the rule link opens the rules reader at the quoted section", async ({ page }) => {
  await page.goto("./#/tutorial/melee-attack/6");
  await page.getByRole("link", { name: "Lire la règle : Garde" }).click();
  await expect(page).toHaveURL(/#\/rules\/batailles\/s-garde$/);
  const heading = page.locator("#s-garde");
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
});

test("ranged attack lesson: target choice, Bow roll, cover and damage", async ({ page }) => {
  await page.goto("./#/tutorial");
  await page.getByRole("link", { name: "Commencer la leçon Attaque à distance" }).click();
  await expect(page).toHaveURL(/#\/tutorial\/ranged-attack\/1$/);
  await expect(page.getByText(/Exemple maison construit à partir des règles de la page 28/)).toBeVisible();
  await expect(page.getByText("Étape 1 sur 10")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText('Portée 16"')).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Por" })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/tutorial\/ranged-attack\/4$/);
  await expect(page.getByText('Engagé, 5"')).toBeVisible();
  await expect(page.getByText('Masqué, 8"')).toBeVisible();
  await expect(page.getByText('Dégagé, 13"')).toBeVisible();

  await page.goto("./#/tutorial/ranged-attack/6");
  await expect(page.getByRole("img", { name: "Arc court, 5 : Touche" })).toBeVisible();

  await page.goto("./#/tutorial/ranged-attack/9");
  await expect(page.getByRole("img", { name: "Points de vie : 3 sur 4" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Arc court, 5 : Touche, attaque résolue" })).toBeVisible();
  await page.getByRole("link", { name: "Lire la règle : 2. Allouer les dégâts" }).click();
  await expect(page).toHaveURL(/#\/rules\/batailles\/s-2-allouer-les-degats$/);
});
