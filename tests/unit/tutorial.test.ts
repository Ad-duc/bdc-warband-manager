/*
 * File:        tests/unit/tutorial.test.ts
 * Role:        Rules tutorial: every lesson parses, refers to existing game
 *              data and to existing headings of the French rules reader, and
 *              stays consistent from one step to the next (positions, life
 *              points that never go up, dice that keep their values and whose
 *              count follows the Attacks of the weapons). The melee lesson
 *              matches the example printed in the book. Also the helpers of
 *              src/tutorial/model.ts and the tutorial and rules routes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { hrefFor, parseHash } from "../../src/app/router.ts";
import { gameData } from "../../src/data/index.ts";
import { hasTrait } from "../../src/rules/lookup.ts";
import { CHAPTERS, loadChapter } from "../../src/features/reader/chapters.ts";
import { plainHeading, renderChapter } from "../../src/features/reader/markdown.ts";
import { LESSONS, findLesson } from "../../src/tutorial/index.ts";
import { clampStep, dieResult, firstDiceStep, resolveFighters, textRuns } from "../../src/tutorial/model.ts";

describe("lessons", () => {
  it("has unique ids and a header naming its own file", () => {
    expect(LESSONS.length).toBeGreaterThan(0);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const lesson of LESSONS) expect(lesson._header.file).toBe(`src/tutorial/lessons/${lesson.id}.json`);
    expect(findLesson("melee-attack")?.title).toBe("Attaque au corps à corps");
    expect(findLesson("nope")).toBeUndefined();
    expect(findLesson(null)).toBeUndefined();
  });

  it("refers to existing factions, fighters and wargear", () => {
    for (const lesson of LESSONS) {
      const { fighters, problems } = resolveFighters(lesson, gameData);
      expect(problems, lesson.id).toEqual([]);
      expect(fighters).toHaveLength(lesson.fighters.length);
      expect(new Set(lesson.fighters.map((f) => f.id)).size).toBe(lesson.fighters.length);
    }
  });

  it("links every step to an existing heading of the rules reader", async () => {
    for (const lesson of LESSONS) {
      for (const [i, step] of lesson.steps.entries()) {
        const chapter = CHAPTERS.find((c) => c.id === step.rulesRef.chapter);
        expect(chapter, `${lesson.id} step ${i + 1}`).toBeDefined();
        if (chapter === undefined) continue;
        const { headings } = renderChapter(await loadChapter(chapter));
        const heading = headings.find((h) => h.id === step.rulesRef.section);
        expect(heading, `${lesson.id} step ${i + 1}: ${step.rulesRef.section}`).toBeDefined();
        expect(plainHeading(heading?.text ?? "")).toBe(step.rulesRef.label);
      }
    }
  });

  it("keeps every step consistent with the fighters of the lesson", () => {
    for (const lesson of LESSONS) {
      const { fighters } = resolveFighters(lesson, gameData);
      const ids = lesson.fighters.map((f) => f.id).sort();
      let previousLife: Record<string, number> | null = null;
      let previousDice: (typeof lesson.steps)[number]["dice"] = null;
      for (const [i, step] of lesson.steps.entries()) {
        const where = `${lesson.id} step ${i + 1}`;
        expect(Object.keys(step.positions).sort(), where).toEqual(ids);
        expect(Object.keys(step.life).sort(), where).toEqual(ids);
        for (const [x, y] of Object.values(step.positions)) {
          expect(x, where).toBeLessThanOrEqual(lesson.board.width);
          expect(y, where).toBeLessThanOrEqual(lesson.board.height);
        }
        for (const id of step.focus) expect(ids, where).toContain(id);
        if (step.initiative !== null) expect(ids, where).toContain(step.initiative);
        for (const a of step.annotations) {
          if (a.kind === "charge") expect(ids, where).toContain(a.fighter);
          else
            expect(
              [a.from, a.to].every((id) => ids.includes(id)),
              where,
            ).toBe(true);
        }
        // Life points stay within the profile and never go up during an action.
        for (const fighter of fighters) {
          const life = step.life[fighter.lesson.id] ?? -1;
          expect(life, where).toBeGreaterThanOrEqual(0);
          expect(life, where).toBeLessThanOrEqual(fighter.stats.lf);
          if (previousLife !== null)
            expect(life, where).toBeLessThanOrEqual(previousLife[fighter.lesson.id] ?? 0);
        }
        previousLife = step.life;
        // Rolls are made with a melee weapon of their owner; once made, they keep their values.
        if (step.dice !== null) {
          for (const die of step.dice) {
            const owner = fighters.find((f) => f.lesson.id === die.owner);
            expect(owner, where).toBeDefined();
            expect(
              owner?.weapons.some((w) => w.id === die.weapon && w.kind === "melee"),
              where,
            ).toBe(true);
          }
          if (previousDice !== null) {
            expect(
              step.dice.map((d) => [d.owner, d.weapon, d.value]),
              where,
            ).toEqual(previousDice.map((d) => [d.owner, d.weapon, d.value]));
            step.dice.forEach((d, k) => {
              if (previousDice?.[k]?.status !== "rolled")
                expect(d.status, where).toBe(previousDice?.[k]?.status);
            });
          }
        } else expect(previousDice, `${where}: dice cannot disappear`).toBeNull();
        previousDice = step.dice;
      }
      expect(lesson.steps.filter((s) => s.recap !== null).length).toBeLessThanOrEqual(1);
    }
  });

  it("rolls as many dice as the Attacks of the weapons, one for an off-hand weapon", () => {
    for (const lesson of LESSONS) {
      const first = lesson.steps[firstDiceStep(lesson)];
      if (first?.dice == null) continue;
      const { fighters } = resolveFighters(lesson, gameData);
      for (const fighter of fighters) {
        const own = first.dice.filter((d) => d.owner === fighter.lesson.id);
        const main = own.filter((d) => !d.offHand);
        const off = own.filter((d) => d.offHand);
        const weapon = fighter.weapons.find((w) => w.id === main[0]?.weapon);
        expect(new Set(main.map((d) => d.weapon)).size, fighter.lesson.id).toBe(1);
        expect(main.length, fighter.lesson.id).toBe(weapon?.profile?.attacks);
        expect(off.length, fighter.lesson.id).toBeLessThanOrEqual(1);
        for (const d of off) {
          const item = fighter.weapons.find((w) => w.id === d.weapon);
          expect(item !== undefined && hasTrait(item, "off-hand"), d.weapon).toBe(true);
        }
      }
    }
  });
});

describe("melee lesson (book example, p. 25)", () => {
  const lesson = findLesson("melee-attack");
  if (lesson === undefined) throw new Error("melee-attack lesson missing");
  const { fighters } = resolveFighters(lesson, gameData);
  const merc = fighters.find((f) => f.lesson.id === "merc");
  const vermin = fighters.find((f) => f.lesson.id === "vermin");

  it("uses the characteristics of the example: Blade 4+ and 5+, Armour 4+ and 6+, 4 life points", () => {
    expect(merc?.stats).toMatchObject({ bl: 4, ar: 4, lf: 4 });
    expect(vermin?.stats).toMatchObject({ bl: 5, ar: 6, lf: 4 });
  });

  it("follows the five steps and the six exchanges, ending with 2 and 1 life points", () => {
    expect(lesson.steps).toHaveLength(12);
    const exchanges = lesson.steps.filter((s) => s.annotations.some((a) => a.kind === "exchange"));
    expect(exchanges.map((s) => s.annotations[0]?.kind === "exchange" && s.annotations[0].from)).toEqual([
      "merc",
      "vermin",
      "merc",
      "vermin",
      "merc",
      "vermin",
    ]);
    const last = lesson.steps.at(-1);
    expect(last?.life).toEqual({ merc: 2, vermin: 1 });
    expect(last?.recap).toHaveLength(6);
    expect(last?.dice?.every((d) => d.status !== "rolled")).toBe(true);
  });

  it("names the dagger as the book example does, keeping the English name", () => {
    const dagger = vermin?.wargear.find((w) => w.id === "dagger");
    expect(dagger?.name).toEqual({ en: "Dagger/Punch Dagger", fr: "Dague" });
    expect(merc?.wargear.map((w) => w.name.fr)).toEqual(["Épée", "Bouclier", "Cuirasse"]);
  });

  it("reports a label for wargear the fighter does not carry", () => {
    const broken = {
      ...lesson,
      fighters: lesson.fighters.map((f) => (f.id === "merc" ? { ...f, wargearLabels: { axe: "Hache" } } : f)),
    };
    expect(resolveFighters(broken, gameData).problems).toEqual(['merc: label for wargear "axe" not carried']);
  });

  it("sorts the printed rolls as the book does", () => {
    const rolls = lesson.steps[firstDiceStep(lesson)]?.dice ?? [];
    const results = (owner: string, blade: number | null) =>
      rolls.filter((d) => d.owner === owner).map((d) => dieResult(d.value, blade));
    expect(results("merc", merc?.stats.bl ?? null)).toEqual(["miss", "hit", "crit"]);
    expect(results("vermin", vermin?.stats.bl ?? null)).toEqual(["hit", "hit", "crit", "hit"]);
  });
});

describe("helpers", () => {
  it("reads an attack roll from the Blade value", () => {
    expect(dieResult(6, 5)).toBe("crit");
    expect(dieResult(6, null)).toBe("crit");
    expect(dieResult(4, 4)).toBe("hit");
    expect(dieResult(3, 4)).toBe("miss");
    expect(dieResult(5, null)).toBe("miss");
  });

  it("keeps the step of the address inside the lesson", () => {
    expect(clampStep(null, 12)).toBe(1);
    expect(clampStep(0, 12)).toBe(1);
    expect(clampStep(5, 12)).toBe(5);
    expect(clampStep(99, 12)).toBe(12);
    expect(clampStep(Number.NaN, 12)).toBe(1);
  });

  it("splits a step text into plain and bold runs", () => {
    expect(textRuns("a **b** c")).toEqual([
      { text: "a ", bold: false },
      { text: "b", bold: true },
      { text: " c", bold: false },
    ]);
    expect(textRuns("**x**")).toEqual([{ text: "x", bold: true }]);
  });

  it("finds the first step with dice", () => {
    const lesson = LESSONS[0];
    if (lesson === undefined) throw new Error("no lesson");
    expect(firstDiceStep({ ...lesson, steps: lesson.steps.map((s) => ({ ...s, dice: null })) })).toBe(-1);
  });
});

describe("routes", () => {
  it("parses and builds the tutorial addresses", () => {
    expect(parseHash("#/tutorial")).toEqual({ name: "tutorial", lesson: null, step: null });
    expect(parseHash("#/tutorial/melee-attack")).toEqual({
      name: "tutorial",
      lesson: "melee-attack",
      step: null,
    });
    expect(parseHash("#/tutorial/melee-attack/5")).toEqual({
      name: "tutorial",
      lesson: "melee-attack",
      step: 5,
    });
    expect(parseHash("#/tutorial/melee-attack/0")).toEqual({ name: "home" });
    expect(hrefFor({ name: "tutorial", lesson: null, step: null })).toBe("#/tutorial");
    expect(hrefFor({ name: "tutorial", lesson: "melee-attack", step: null })).toBe("#/tutorial/melee-attack");
    expect(hrefFor({ name: "tutorial", lesson: "melee-attack", step: 3 })).toBe("#/tutorial/melee-attack/3");
  });

  it("opens a rules chapter at a section", () => {
    expect(parseHash("#/rules/batailles/s-garde")).toEqual({
      name: "rules",
      chapter: "batailles",
      section: "s-garde",
    });
    expect(hrefFor({ name: "rules", chapter: "batailles", section: "s-garde" })).toBe(
      "#/rules/batailles/s-garde",
    );
    expect(parseHash("#/rules/batailles/garde")).toEqual({ name: "home" });
  });
});
