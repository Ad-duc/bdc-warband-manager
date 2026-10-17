/*
 * File:        tests/unit/store.test.ts
 * Role:        Creation wizard store (zustand): loading a saved warband and
 *              choosing the first step, starting a new one, saving every
 *              change at once with a fresh updatedAt, reporting a save error,
 *              clamping the step and closing.
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { db, saveWarband } from "../../src/db/database.ts";
import { useWizard, WIZARD_STEPS } from "../../src/store/wizard.ts";
import { mercenary, swordsForHire, warband } from "../fixtures/warbands.ts";

/** Waits for the pending save of update() to settle. */
const flush = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 20));
};

afterEach(async () => {
  useWizard.getState().close();
  await db.warbands.clear();
  vi.restoreAllMocks();
});

describe("wizard store", () => {
  it("starts empty", () => {
    expect(useWizard.getState()).toMatchObject({ warband: null, step: 0, saveError: null });
    expect(WIZARD_STEPS).toEqual(["faction", "origin", "fighters", "wargear", "skills", "rating"]);
  });

  it("load: false and no change when the warband does not exist", async () => {
    expect(await useWizard.getState().load("missing")).toBe(false);
    expect(useWizard.getState().warband).toBeNull();
  });

  it("load: a warband without fighters opens on the origin step", async () => {
    await saveWarband(db, warband([], { id: "w-empty" }));
    expect(await useWizard.getState().load("w-empty")).toBe(true);
    expect(useWizard.getState().warband?.id).toBe("w-empty");
    expect(useWizard.getState().step).toBe(1);
  });

  it("load: a warband with fighters opens on the fighters step", async () => {
    await saveWarband(db, swordsForHire());
    expect(await useWizard.getState().load(swordsForHire().id)).toBe(true);
    expect(useWizard.getState().step).toBe(2);
    expect(useWizard.getState().saveError).toBeNull();
  });

  it("start: keeps the warband at step 0 and writes it to the database", async () => {
    const w = warband([], { id: "w-new", name: "Nouvelle" });
    await useWizard.getState().start(w);
    expect(useWizard.getState()).toMatchObject({ warband: w, step: 0, saveError: null });
    expect((await db.warbands.get("w-new"))?.name).toBe("Nouvelle");
  });

  it("update: applies the change, refreshes updatedAt and saves", async () => {
    const w = warband([], { id: "w-up", updatedAt: "2026-10-12T09:00:00.000Z" });
    await useWizard.getState().start(w);
    useWizard.getState().update((x) => ({ ...x, name: "Renommee", fighters: [mercenary()] }));
    const next = useWizard.getState().warband;
    expect(next?.name).toBe("Renommee");
    expect(next?.fighters).toHaveLength(1);
    expect(next?.updatedAt).not.toBe("2026-10-12T09:00:00.000Z");
    expect(Date.parse(next?.updatedAt ?? "")).not.toBeNaN();
    await flush();
    expect((await db.warbands.get("w-up"))?.name).toBe("Renommee");
    expect(useWizard.getState().saveError).toBeNull();
  });

  it("update: does nothing when no warband is open", async () => {
    const change = vi.fn((x: ReturnType<typeof warband>) => x);
    useWizard.getState().update(change);
    await flush();
    expect(change).not.toHaveBeenCalled();
    expect(await db.warbands.count()).toBe(0);
  });

  it("update: an invalid document stays on screen and sets saveError", async () => {
    await useWizard.getState().start(warband([], { id: "w-bad" }));
    // A faction id that the schema rejects: the state keeps the user's input
    // and the error is reported instead of being thrown.
    useWizard.getState().update((x) => ({ ...x, factionId: "Not A Faction" }));
    expect(useWizard.getState().warband?.factionId).toBe("Not A Faction");
    await flush();
    expect(useWizard.getState().saveError).toMatch(/factionId/);
    expect((await db.warbands.get("w-bad"))?.factionId).toBe("guild-mercenaries");
  });

  it("update: a later valid change clears saveError", async () => {
    await useWizard.getState().start(warband([], { id: "w-fix" }));
    useWizard.getState().update((x) => ({ ...x, factionId: "Not A Faction" }));
    await flush();
    expect(useWizard.getState().saveError).not.toBeNull();
    useWizard.getState().update((x) => ({ ...x, factionId: "guild-mercenaries" }));
    await flush();
    expect(useWizard.getState().saveError).toBeNull();
  });

  it("update: a rejection that is not an Error is stringified", async () => {
    await useWizard.getState().start(warband([], { id: "w-str" }));
    vi.spyOn(db.warbands, "put").mockRejectedValueOnce("disk full");
    useWizard.getState().update((x) => ({ ...x, notes: "x" }));
    await flush();
    expect(useWizard.getState().saveError).toBe("disk full");
  });

  it("goTo: clamps the step to the wizard range", () => {
    const { goTo } = useWizard.getState();
    goTo(3);
    expect(useWizard.getState().step).toBe(3);
    goTo(-4);
    expect(useWizard.getState().step).toBe(0);
    goTo(99);
    expect(useWizard.getState().step).toBe(WIZARD_STEPS.length - 1);
  });

  it("close: resets everything but keeps the saved warband", async () => {
    await useWizard.getState().start(warband([], { id: "w-close" }));
    useWizard.getState().goTo(2);
    useWizard.getState().close();
    expect(useWizard.getState()).toMatchObject({ warband: null, step: 0, saveError: null });
    expect(await db.warbands.count()).toBe(1);
  });
});
