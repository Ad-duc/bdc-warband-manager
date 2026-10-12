/*
 * File:        tests/e2e/a11y.spec.ts
 * Role:        Accessibility audit with axe-core on every screen, in both
 *              languages: home, each wizard step (with an open scroll), the
 *              campaign dashboard (open injuries and battle form), the print
 *              view, the shared page, the rules reader, the changelog and the
 *              confirmation dialog. WCAG 2.2 A and AA rules; any violation
 *              fails the test with its details.
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

for (const locale of ["en-GB", "fr-FR"] as const) {
  test.describe(`screens in ${locale}`, () => {
    test.use({ locale });
    const fr = locale === "fr-FR";

    test("home and confirmation dialog", async ({ page }) => {
      await page.goto("./");
      await audit(page, "home (empty)");
      await importDemo(page);
      await audit(page, "home");
      await page
        .getByRole("button", { name: fr ? /^Supprimer/ : /^Delete/ })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await audit(page, "delete dialog");
    });

    test("wizard steps", async ({ page }) => {
      await importDemo(page);
      await page.goto("./#/warband/demo-1");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const steps = fr
        ? ["Faction", "Origine", "Combattants", "Équipement", "Compétences", "Valeur"]
        : ["Faction", "Origin", "Fighters", "Wargear", "Skills", "Rating"];
      for (const step of steps) {
        await page
          .getByRole("button", { name: new RegExp(step) })
          .first()
          .click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(step);
        if (step === "Combattants" || step === "Fighters") await page.locator("summary").first().click();
        await audit(page, `wizard ${step}`);
      }
    });

    test("campaign dashboard", async ({ page }) => {
      await importDemo(page);
      await page.goto("./#/warband/demo-1/campaign");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator("summary").first().click();
      await audit(page, "campaign");
      await page.getByRole("button", { name: fr ? "Nouvelle bataille" : "New battle" }).click();
      await audit(page, "campaign battle form");
    });

    test("rules reader", async ({ page }) => {
      await page.goto("./#/rules/batailles");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator("summary").first().click();
      await audit(page, "rules reader");
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
      await page.getByRole("radio", { name: fr ? "Les deux" : "Both" }).check();
      await page.getByRole("radio", { name: fr ? "Économie d'encre" : "Ink saver" }).check();
      await audit(page, "print cards, ink saver");
      await page.getByLabel(fr ? /Imprimer les dos/ : /Print the backs/).check();
      await page.getByLabel(fr ? "Nom de la bande au dos" : "Warband name on the backs").check();
      await page.getByRole("radio", { name: fr ? "Fond parchemin" : "Parchment background" }).check();
      await audit(page, "print cards with backs");
      await page.goto("./#/card-backs");
      await expect(page.getByTestId("print-card-back").first()).toBeVisible();
      await audit(page, "card back generator");
      await page.getByRole("button", { name: fr ? "Dé de direction" : "Direction dice" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: fr ? "Lancer" : "Roll" })
        .click();
      await audit(page, "direction dice");
      await page.keyboard.press("Escape");
      await page.goto("./#/warband/demo-1/campaign");
      await page.getByRole("button", { name: fr ? "Partager" : "Share" }).click();
      const field = page.getByLabel(fr ? "Lien de partage" : "Share link");
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
    for (const faction of ["Verminkin", "Death Covens", "The Blighted Cloister"]) {
      test(faction, async ({ page }) => {
        await page.goto("./");
        await page
          .getByRole("button", { name: locale === "fr-FR" ? "Nouvelle bande" : "New warband" })
          .click();
        await page.getByRole("radio", { name: new RegExp(faction) }).check();
        await page.getByRole("button", { name: locale === "fr-FR" ? "Suivant" : "Next" }).click();
        await audit(page, `${faction} origins`);
        await page.getByRole("radio").first().check();
        await page.getByRole("button", { name: locale === "fr-FR" ? "Suivant" : "Next" }).click();
        for (const summary of await page.locator("summary").all()) await summary.click();
        await audit(page, `${faction} fighters`);
      });
    }
  });
}
