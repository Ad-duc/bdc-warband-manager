/*
 * File:        tests/unit/scenarios.test.ts
 * Role:        Reading of Chapter 3 of the translation: scenario table, shared
 *              rules, the six scenarios with their phases, map legend, twist
 *              tables, battle groups and reinforcement rounds.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import {
  findScenario,
  parseScenarios,
  scenarioChapter,
  twistDieSides,
} from "../../src/features/scenarios/scenarios.ts";

const chapter = scenarioChapter();

describe("scenario chapter", () => {
  it("reads the scenario table and the shared rules", () => {
    expect(chapter.title).toBe("Chapitre 3 - Scénarios");
    expect(chapter.table.map((r) => r.roll)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chapter.table[0]?.label).toContain("Une rencontre mortelle");
    expect(chapter.shared.map((s) => s.title)).toEqual(["Groupes de combat", "Réserve", "Trésor"]);
    expect(chapter.shared[1]?.markdown).toContain("### Arrivée des renforts");
  });

  it("reads the six scenarios in order", () => {
    expect(chapter.scenarios.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chapter.scenarios.map((s) => s.originalTitle)).toEqual([
      "A Deadly Encounter",
      "Glimmers in the Dark",
      "No Quarter",
      "The Chapel",
      "Street of Death",
      "The Find",
    ]);
  });

  it("cuts each scenario into phases, map and twists", () => {
    const first = findScenario(1);
    expect(first?.title).toBe("Une rencontre mortelle");
    expect(first?.intro).toContain("Deux bandes");
    expect(first?.phases.before.map((s) => s.title)).toEqual([
      "Le Rebondissement",
      "Le champ de bataille",
      "Groupes de combat",
      "Déploiement",
    ]);
    expect(first?.phases.during.map((s) => s.title)).toEqual([
      "Arrivée des renforts",
      "Remporter la bataille",
    ]);
    expect(first?.phases.campaign.map((s) => s.title)).toEqual(["Expérience bonus"]);
    expect(first?.phases.campaign[0]?.markdown).not.toContain("[Schéma");
    expect(first?.map).toMatch(/^\[Schéma/);
    expect(first?.map).toContain("- Point d'entrée");
    expect(first?.twists.map((t) => t.roll)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(first?.twists[0]?.title).toBe("L'orage menace");
  });

  it("finds the battle groups, the reinforcement rounds and the twist die", () => {
    expect(chapter.scenarios.map((s) => s.battleGroups)).toEqual([2, 3, 3, 3, null, 2]);
    expect(findScenario(1)?.reinforcementRounds).toEqual([3]);
    expect(findScenario(5)?.reinforcementRounds).toEqual([2, 3]);
    const chapel = findScenario(4);
    expect(chapel?.twistDie).toBe("1D3");
    expect(chapel === undefined ? 0 : twistDieSides(chapel)).toBe(3);
    expect(chapel?.twists).toHaveLength(3);
  });

  it("keeps the extra headings of a twist in its text and skips translator sections", () => {
    const parsed = parseScenarios(
      [
        "# Titre",
        "Intro",
        "## Scénario I - Essai (*Scenario I - Test*)",
        "### Rebondissements (*Twists*) - 1D6",
        "#### Détail orphelin",
        "#### 1 - Premier (*First*)",
        "Texte",
        "##### Précision",
        "Suite",
        "### Autre partie",
        "#### Ignorée",
        "Rien",
        "## Notes du traducteur",
        "#### Note",
      ].join("\n"),
    );
    const s = parsed.scenarios[0];
    expect(s?.twists).toEqual([{ roll: 1, title: "Premier", markdown: "Texte\n\n**Précision**\nSuite" }]);
    expect(s?.phases.before).toEqual([]);
    expect(parsed.shared).toEqual([]);
    expect(s === undefined ? 0 : twistDieSides({ ...s, twistDie: "" })).toBe(1);
  });

  it("copes with an empty file", () => {
    expect(parseScenarios("no heading")).toMatchObject({ title: "", intro: "no heading", scenarios: [] });
  });
});
