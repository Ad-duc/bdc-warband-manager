/*
 * File:        tests/unit/print-render.test.tsx
 * Role:        Rendering of the print screens under jsdom: roster pages and
 *              fighter blocks, cards and duplex backs, the blank page that
 *              keeps duplex backs aligned, style and language of the print
 *              root, disabled options, the card back generator, the French
 *              reminder sheet and its screen guide, pictograms and Black Rot
 *              boxes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "../../src/i18n/index.ts";
import { db, saveWarband } from "../../src/db/database.ts";
import { PrintPage, PrintView } from "../../src/print/PrintPage.tsx";
import { CardBacksPage, MAX_BACK_SHEETS } from "../../src/print/CardBacksPage.tsx";
import { ReminderPage } from "../../src/features/reminder/ReminderPage.tsx";
import { ReminderGuide } from "../../src/features/reminder/ReminderGuide.tsx";
import { ReminderSheet } from "../../src/print/ReminderSheet.tsx";
import { Pictogram } from "../../src/print/Pictogram.tsx";
import { BlackRot } from "../../src/print/RosterSheet.tsx";
import { CARDS_PER_PAGE, FIGHTERS_PER_PAGE } from "../../src/print/model.ts";
import reminder from "../../src/print/reminder-fr.json";
import { swordsForHire, warband } from "../fixtures/warbands.ts";

beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await db.warbands.clear();
});

const pages = () => screen.queryAllByTestId("print-page");
const fighters = () => screen.queryAllByTestId("print-fighter");
const cards = () => screen.queryAllByTestId("print-card");
const backs = () => screen.queryAllByTestId("print-card-back");
const printRoot = () => document.querySelector(".print-root");

describe("print view", () => {
  // The reference warband has 9 fighters: one roster cover page, then
  // 5 + 4 fighter blocks, and 9 cards on one sheet.
  const nine = swordsForHire();

  it("opens on the roster: cover page, paginated fighter blocks, parchment style", () => {
    render(<PrintView warband={nine} backHref="#/back" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Impression");
    expect(pages()).toHaveLength(1 + Math.ceil(9 / FIGHTERS_PER_PAGE));
    expect(fighters()).toHaveLength(9);
    expect(cards()).toHaveLength(0);
    expect(printRoot()).toHaveClass("print-parchment");
    expect(printRoot()).toHaveAttribute("lang", "fr");
    expect(screen.getByRole("link", { name: "Retour" })).toHaveAttribute("href", "#/back");
  });

  it("shows the warband and its fighters on the cover page", () => {
    render(<PrintView warband={{ ...nine, name: "Les Lames" }} backHref="#/" />);
    expect(screen.getAllByText("Les Lames").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mercenaires de la Guilde").length).toBeGreaterThan(0);
  });

  it("blank blocks fill the roster up to fifteen fighters", () => {
    render(<PrintView warband={nine} backHref="#/" />);
    fireEvent.click(screen.getByLabelText(/blocs combattant vierges/));
    expect(fighters()).toHaveLength(15);
    expect(pages()).toHaveLength(1 + 15 / FIGHTERS_PER_PAGE);
    fireEvent.click(screen.getByLabelText(/blocs combattant vierges/));
    expect(fighters()).toHaveLength(9);
  });

  it("cards: one sheet of nine, no backs until duplex is chosen", () => {
    render(<PrintView warband={nine} backHref="#/" />);
    const duplex = screen.getByLabelText(/recto verso/);
    const backName = screen.getByLabelText("Nom de la bande au dos");
    expect(duplex).toBeDisabled();
    expect(backName).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "Cartes de combattants" }));
    expect(cards()).toHaveLength(CARDS_PER_PAGE);
    expect(pages()).toHaveLength(1);
    expect(backs()).toHaveLength(0);
    expect(duplex).toBeEnabled();
    expect(backName).toBeDisabled();

    fireEvent.click(duplex);
    expect(pages()).toHaveLength(2);
    expect(backs()).toHaveLength(CARDS_PER_PAGE);
    expect(screen.queryAllByTestId("print-back-warband")).toHaveLength(0);
    expect(backName).toBeEnabled();
    expect(screen.getByText(/retournement sur le bord long/)).toBeInTheDocument();

    fireEvent.click(backName);
    const names = screen.getAllByTestId("print-back-warband");
    expect(names).toHaveLength(CARDS_PER_PAGE);
    expect(names[0]).toHaveTextContent(nine.name);
  });

  it("backs only: one sheet of nine backs and no card", () => {
    render(<PrintView warband={nine} backHref="#/" />);
    fireEvent.click(screen.getByRole("radio", { name: "Dos des cartes" }));
    expect(pages()).toHaveLength(1);
    expect(cards()).toHaveLength(0);
    expect(backs()).toHaveLength(CARDS_PER_PAGE);
    expect(screen.getByLabelText(/recto verso/)).toBeDisabled();
    expect(screen.getByLabelText("Nom de la bande au dos")).toBeEnabled();
  });

  it("both with duplex: a blank page closes an odd roster so backs stay behind their cards", () => {
    render(<PrintView warband={nine} backHref="#/" />);
    fireEvent.click(screen.getByRole("radio", { name: "Les deux" }));
    // 3 roster pages + 1 card sheet, no padding without duplex
    expect(pages()).toHaveLength(4);
    fireEvent.click(screen.getByLabelText(/recto verso/));
    // 3 roster pages + 1 blank + 1 card sheet + 1 back sheet
    expect(pages()).toHaveLength(6);
    const blank = pages().find((p) => p.getAttribute("aria-hidden") === "true");
    expect(blank).toBeDefined();
    expect(blank?.children).toHaveLength(0);
  });

  it("both with duplex: no blank page when the roster has an even number of pages", () => {
    // 0 fighters: cover page only... which is odd, so pad. 6 fighters: cover + 2 = 3, odd.
    // 5 fighters: cover + 1 page = 2, even: no padding.
    const five = { ...nine, fighters: nine.fighters.slice(0, 5) };
    render(<PrintView warband={five} backHref="#/" />);
    fireEvent.click(screen.getByRole("radio", { name: "Les deux" }));
    fireEvent.click(screen.getByLabelText(/recto verso/));
    // 2 roster pages + 1 card sheet + 1 back sheet
    expect(pages()).toHaveLength(4);
    expect(pages().some((p) => p.getAttribute("aria-hidden") === "true")).toBe(false);
  });

  it("ink saver swaps the style class of the print root", () => {
    render(<PrintView warband={nine} backHref="#/" />);
    fireEvent.click(screen.getByRole("radio", { name: "Économie d'encre" }));
    expect(printRoot()).toHaveClass("print-ink-saver");
    expect(printRoot()).not.toHaveClass("print-parchment");
  });

  it("an unknown faction shows a message instead of crashing", () => {
    render(<PrintView warband={{ ...nine, factionId: "lost-faction" }} backHref="#/" />);
    expect(pages()).toHaveLength(0);
    expect(screen.getByText(/lost-faction/)).toBeInTheDocument();
  });

  it("an empty warband prints its cover page and an empty fighter page", () => {
    render(<PrintView warband={warband([])} backHref="#/" />);
    expect(fighters()).toHaveLength(0);
    expect(pages()).toHaveLength(1);
  });
});

describe("print page", () => {
  it("loads the warband from the database, then prints it with a link back to its campaign", async () => {
    const saved = { ...swordsForHire(), id: "print-me", name: "Imprimable" };
    await saveWarband(db, saved);
    render(<PrintPage id="print-me" />);
    expect(screen.getByText("Chargement...")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findAllByText("Imprimable")).not.toHaveLength(0);
    expect(fighters()).toHaveLength(9);
    expect(screen.getByRole("link", { name: "Retour" })).toHaveAttribute(
      "href",
      "#/warband/print-me/campaign",
    );
  });

  it("the print button calls the browser print dialog", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintView warband={swordsForHire()} backHref="#/" />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimer" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("card back generator", () => {
  it("prints one sheet of the first faction by default, up to five sheets", () => {
    render(<CardBacksPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Générateur de dos de cartes");
    expect(backs()).toHaveLength(CARDS_PER_PAGE);
    expect(screen.getByRole("radio", { name: /Mercenaires de la Guilde/ })).toBeChecked();
    const select = screen.getByRole("combobox");
    expect(select.querySelectorAll("option")).toHaveLength(MAX_BACK_SHEETS);
    fireEvent.change(select, { target: { value: String(MAX_BACK_SHEETS) } });
    expect(pages()).toHaveLength(MAX_BACK_SHEETS);
    expect(backs()).toHaveLength(MAX_BACK_SHEETS * CARDS_PER_PAGE);
  });

  it("switches faction and prints the trimmed warband name", () => {
    render(<CardBacksPage />);
    fireEvent.click(screen.getByRole("radio", { name: /Vermineux/ }));
    expect(screen.getByRole("radio", { name: /Vermineux/ })).toBeChecked();
    expect(screen.queryAllByTestId("print-back-warband")).toHaveLength(0);
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "   " } });
    expect(screen.queryAllByTestId("print-back-warband")).toHaveLength(0);
    fireEvent.change(field, { target: { value: "  Les Lames  " } });
    const names = screen.getAllByTestId("print-back-warband");
    expect(names).toHaveLength(CARDS_PER_PAGE);
    expect(names[0]).toHaveTextContent("Les Lames");
    fireEvent.click(screen.getByRole("radio", { name: "Économie d'encre" }));
    expect(printRoot()).toHaveClass("print-ink-saver");
  });
});

describe("reminder page", () => {
  it("shows the screen guide and keeps the A4 sheet in a print-only root", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<ReminderPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Aide de jeu");
    const guide = screen.getByTestId("reminder-guide");
    expect(guide).toHaveAttribute("lang", "fr");
    expect(guide.closest(".no-print")).not.toBeNull();
    expect(printRoot()).toHaveClass("print-only");
    expect(printRoot()?.querySelector("[data-testid=reminder-sheet]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Imprimer la feuille A4" }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Retour" })).toHaveAttribute("href", "#/");
  });
});

describe("reminder guide", () => {
  it("shows every part of the sheet with the site title levels and tables", () => {
    render(<ReminderGuide />);
    const guide = screen.getByTestId("reminder-guide");
    for (const title of [
      reminder.setup.title,
      reminder.round.title,
      reminder.traits.title,
      reminder.hide.label,
      reminder.melee.label,
      reminder.ranged.label,
      reminder.arcane.label,
      reminder.bloodied.label,
      reminder.moves.label,
    ])
      expect(screen.getByRole("heading", { level: 2, name: title })).toHaveClass("title-section");
    for (const table of [reminder.reinforcements, reminder.misfire, reminder.miscast])
      expect(screen.getByRole("heading", { level: 3, name: table.title })).toHaveClass("title-sub");
    expect(guide.querySelectorAll("table.table-bdc").length).toBeGreaterThanOrEqual(7);
    expect(guide).toHaveTextContent("Arcanique");
    expect(guide.querySelector(".rs-sep")).not.toBeNull();
  });
});

describe("reminder sheet", () => {
  it("is in French whatever the interface language, with its sections", async () => {
    await i18n.changeLanguage("en");
    render(<ReminderSheet />);
    const sheet = screen.getByTestId("reminder-sheet");
    expect(sheet).toHaveAttribute("lang", "fr");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(reminder.title);
    expect(screen.getByRole("heading", { name: reminder.setup.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: reminder.round.title })).toBeInTheDocument();
    expect(sheet.querySelectorAll("section").length).toBeGreaterThan(3);
    await i18n.changeLanguage("fr");
  });
});

describe("roster widgets", () => {
  it("pictogram: one shape per category, henchman shape for an unknown one", () => {
    const { container, rerender } = render(<Pictogram category="leader" label="Chef" />);
    const leader = container.querySelector("path")?.getAttribute("d");
    expect(screen.getByRole("img", { name: "Chef" })).toHaveAttribute("width", "28");
    rerender(<Pictogram category="henchman" label="Homme de main" size={20} />);
    const henchman = container.querySelector("path")?.getAttribute("d");
    expect(henchman).not.toBe(leader);
    expect(screen.getByRole("img")).toHaveAttribute("width", "20");
    rerender(<Pictogram category="not-a-category" label="?" />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe(henchman);
  });

  it("black rot: three boxes, the first ones ticked", () => {
    const { container, rerender } = render(<BlackRot boxes={2} />);
    expect(screen.getByRole("img", { name: "2 cases de Pourriture noire cochées" })).toBeInTheDocument();
    expect(container.querySelectorAll(".print-circle")).toHaveLength(3);
    expect(container.querySelectorAll(".print-circle-on")).toHaveLength(2);
    expect(screen.getByRole("img").className).toContain("flex-row");
    rerender(<BlackRot boxes={0} vertical />);
    expect(screen.getByRole("img", { name: "0 case de Pourriture noire cochée" })).toBeInTheDocument();
    expect(container.querySelectorAll(".print-circle-on")).toHaveLength(0);
    expect(screen.getByRole("img").className).toContain("flex-col");
  });
});
