/*
 * File:        src/store/wizard.ts
 * Role:        zustand store of the creation wizard: the warband being edited
 *              and the current step. Every change is saved to IndexedDB at
 *              once, so going back, reloading or closing never loses choices.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { create } from "zustand";
import type { Warband } from "../data/schema.ts";
import { db, saveWarband } from "../db/database.ts";
import { nowIso } from "../features/warbands/factory.ts";

export const WIZARD_STEPS = ["faction", "origin", "fighters", "wargear", "skills", "rating"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

interface WizardState {
  warband: Warband | null;
  step: number;
  saveError: string | null;
  /** Loads a warband from the database; false when it does not exist. */
  load: (id: string) => Promise<boolean>;
  /** Starts editing an unsaved warband (new creation). */
  start: (warband: Warband) => Promise<void>;
  update: (change: (w: Warband) => Warband) => void;
  goTo: (step: number) => void;
  close: () => void;
}

export const useWizard = create<WizardState>((set, get) => ({
  warband: null,
  step: 0,
  saveError: null,

  load: async (id) => {
    const found = await db.warbands.get(id);
    if (found === undefined) return false;
    set({ warband: found, step: found.fighters.length > 0 ? 2 : 1, saveError: null });
    return true;
  },

  start: async (warband) => {
    set({ warband, step: 0, saveError: null });
    await saveWarband(db, warband);
  },

  update: (change) => {
    const current = get().warband;
    if (current === null) return;
    const next = { ...change(current), updatedAt: nowIso() };
    set({ warband: next });
    saveWarband(db, next).then(
      () => {
        set({ saveError: null });
      },
      (e: unknown) => {
        set({ saveError: e instanceof Error ? e.message : String(e) });
      },
    );
  },

  goTo: (step) => {
    set({ step: Math.max(0, Math.min(WIZARD_STEPS.length - 1, step)) });
  },

  close: () => {
    set({ warband: null, step: 0, saveError: null });
  },
}));
