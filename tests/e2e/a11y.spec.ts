/*
 * File:        tests/e2e/a11y.spec.ts
 * Role:        Accessibility audit with axe-core on every screen of the
 *              French interface: home, each wizard step (with an open scroll), the
 *              campaign dashboard (open injuries and battle form), the print
 *              view, the shared page, the rules reader, its search results and its print view,
 *              the changelog, the compendium (closed and open), the
 *              scenarios, the battle set-up, a group campaign, the rules
 *              tutorial and the confirmation dialog. WCAG 2.2 A and AA
 *              rules; any violation fails the test with its details.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const demo = fileURLToPath(new URL("../fixtures/demo-export.json", import.meta.url));
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Runs axe on the current state of the page and lists violations in a readable form. */
async function audit(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = results.violations.map(
    (v) =>
      `${label}: ${v.id} (${v.impact ?? "?"}) ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(report, report.join("\n")).toEqual([]);
}

async function importDemo(page: Page): Promise<void> {
  await page.goto("./");
  await page.getByTestId("import-input").setInputFiles(demo);
  await expect(page.getByTestId("warband-list")).toBeVisible();
}

for (const locale of ["fr-FR"] as const) {
  test.describe(`screens in ${locale}`, () => {
    test.use({ locale });

    test("home and confirmation dialog", async ({ page }) => {
      await page.goto("./");
      await audit(page, "home (empty)");
      await importDemo(page);
      await audit(page, "home");
      await page
        .getByRole("button", { name: /^Supprimer/ })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await audit(page, "delete dialog");
    });

    test("wizard steps", async ({ page }) => {
      await importDemo(page);
      await page.goto("./#/warband/demo-1");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const steps = ["Faction", "Origine", "Combattants", "Équipement", "Compétences", "Valeur"];
      for (const step of steps) {
        await page
          .getByRole("button", { name: new RegExp(step) })
          .first()
          .click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(step);
        if (["Combattants", "Équipement", "Compétences"].includes(step))
          await page.locator("summary").first().click();
        await audit(page, `wizard ${step}`);
      }
    });

    test("campaign dashboard", async ({ page }) => {
      await importDemo(page);
      await page.goto("./#/warband/demo-1/campaign");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator("summary").first().click();
      await audit(page, "campaign");
      await page.getByRole("button", { name: "Nouvelle bataille" }).click();
      await audit(page, "campaign battle form");
    });

    test("rules reader", async ({ page }) => {
      await page.goto("./#/rules/batailles");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator("summary").first().click();
      await audit(page, "rules reader");
      await page.goto("./#/rules/print");
      await expect(page.getByTestId("rules-book")).toBeVisible();
      await audit(page, "rules print view");
    });

    test("rules search", async ({ page }) => {
      await page.goto("./#/rules/batailles");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByLabel("Rechercher dans les règles").fill("charge");
      await expect(
        page.getByRole("region", { name: "Résultats de la recherche" }).getByRole("listitem").first(),
      ).toBeVisible();
      await audit(page, "rules search");
    });

    test("scenarios, battle set-up and group campaign", async ({ page }) => {
      await page.goto("./#/scenarios");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "scenarios");
      await page.goto("./#/scenarios/5");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "scenario page");
      await importDemo(page);
      await page.goto("./#/battle?warband=demo-1");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("button", { name: /table des scénarios/ }).click();
      await page.getByRole("button", { name: /table des rebondissements/ }).click();
      await audit(page, "battle set-up");
      await page.goto("./");
      await page.getByRole("button", { name: "Nouvelle campagne" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "group campaign");
    });

    test("rules tutorial", async ({ page }) => {
      await page.goto("./#/tutorial");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "tutorial lessons");
      await page.goto("./#/tutorial/melee-attack/6");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("img", { name: /Touche critique/ }).first()).toBeVisible();
      await audit(page, "tutorial step");
      await page.goto("./#/tutorial/melee-attack/12");
      await expect(page.getByRole("table", { name: /Récapitulatif/ })).toBeVisible();
      await audit(page, "tutorial last step");
      await page.goto("./#/tutorial/ranged-attack/4");
      await expect(page.getByText('Masqué, 8"')).toBeVisible();
      await audit(page, "ranged tutorial step");
    });

    test("compendium", async ({ page }) => {
      await page.goto("./#/compendium");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "compendium");
      await page.getByRole("button", { name: "Tout ouvrir" }).click();
      await audit(page, "compendium open");
    });

    test("changelog", async ({ page }) => {
      await page.goto("./#/changelog");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page, "changelog");
    });

    test("print view and shared page", async ({ page }) => {
      await importDemo(page);
      await page.goto("./#/warband/demo-1/print");
      await expect(page.getByTestId("print-page").first()).toBeVisible();
      await audit(page, "print");
      await page.getByRole("radio", { name: "Les deux" }).check();
      await page.getByRole("radio", { name: "Économie d'encre" }).check();
      await audit(page, "print cards, ink saver");
      await page.getByLabel(/Imprimer les dos/).check();
      await page.getByLabel("Nom de la bande au dos").check();
      await page.getByRole("radio", { name: "Fond parchemin" }).check();
      await audit(page, "print cards with backs");
      await page.goto("./#/card-backs");
      await expect(page.getByTestId("print-card-back").first()).toBeVisible();
      await audit(page, "card back generator");
      await page.goto("./#/reminder");
      await expect(page.getByTestId("reminder-sheet")).toBeVisible();
      await audit(page, "reminder sheet");
      await page.goto("./#/dice");
      await page.getByRole("button", { name: "Lancer" }).click();
      await audit(page, "direction dice");
      await page.goto("./#/warband/demo-1/campaign");
      await page.getByRole("button", { name: "Partager" }).click();
      const field = page.getByLabel("Lien de partage");
      if (await field.isVisible().catch(() => false)) {
        await audit(page, "share field");
        await page.goto(await field.inputValue());
        await expect(page.getByTestId("print-fighter").first()).toBeVisible();
        await audit(page, "shared page");
      }
    });
  });

  test.describe(`faction catalogues in ${locale}`, () => {
    test.use({ locale });
    for (const faction of ["Vermineux", "Cabales de la Mort", "Le Cloître gangrené"]) {
      test(faction, async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: "Nouvelle bande" }).click();
        await page.getByRole("radio", { name: new RegExp(faction) }).check();
        await page.getByRole("button", { name: "Suivant" }).click();
        await audit(page, `${faction} origins`);
        await page.getByRole("radio").first().check();
        await page.getByRole("button", { name: "Suivant" }).click();
        for (const summary of await page.locator("summary").all()) await summary.click();
        await audit(page, `${faction} fighters`);
      });
    }
  });
}
