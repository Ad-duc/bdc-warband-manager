/*
 * File:        tests/unit/home.test.tsx
 * Role:        The home screen renders in both languages without missing keys.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "../../src/i18n/index.ts";
import { App } from "../../src/App.tsx";

describe("home screen", () => {
  it("renders in English", async () => {
    await i18n.changeLanguage("en");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your warbands");
    expect(await screen.findByText("0 warbands saved on this device")).toBeInTheDocument();
  });

  it("renders in French and updates the html lang attribute", async () => {
    await i18n.changeLanguage("fr");
    render(<App />);
    expect(screen.getAllByRole("heading", { level: 1 }).at(-1)).toHaveTextContent("Vos bandes");
    expect(document.documentElement.lang).toBe("fr");
  });
});
