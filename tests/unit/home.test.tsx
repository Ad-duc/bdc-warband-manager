/*
 * File:        tests/unit/home.test.tsx
 * Role:        The home screen renders in both languages, lists the saved
 *              warbands with their rating and opens the creation wizard.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import i18n from "../../src/i18n/index.ts";
import { App } from "../../src/App.tsx";
import { db, saveWarband } from "../../src/db/database.ts";
import { swordsForHire } from "../fixtures/warbands.ts";

afterEach(async () => {
  cleanup();
  await db.warbands.clear();
  window.location.hash = "";
});

describe("home screen", () => {
  it("renders in English with the empty state", async () => {
    await i18n.changeLanguage("en");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your warbands");
    expect(await screen.findByText(/No warband yet/)).toBeInTheDocument();
  });

  it("lists a saved warband with its rating, in French", async () => {
    await i18n.changeLanguage("fr");
    await saveWarband(db, { ...swordsForHire(), name: "Les Lames" });
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vos bandes");
    expect(await screen.findByRole("link", { name: "Les Lames" })).toBeInTheDocument();
    expect(screen.getByText(/valeur 1 277/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("fr");
  });
});
