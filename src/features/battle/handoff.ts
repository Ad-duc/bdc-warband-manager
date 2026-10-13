/*
 * File:        src/features/battle/handoff.ts
 * Role:        Hands the result of the battle set-up to the "New battle" form
 *              of a warband's campaign dashboard (scenario and opponent filled
 *              in). The draft lives in sessionStorage for the current tab only;
 *              without storage the form simply opens empty.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

const KEY = "bdc.battlePrefill";

export interface BattlePrefill {
  warbandId: string;
  scenario: string;
  opponent: string;
  notes: string;
}

export function savePrefill(prefill: BattlePrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch {
    // Storage blocked: the form opens empty.
  }
}

/** Draft waiting for this warband, without removing it. */
export function peekPrefill(warbandId: string): BattlePrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value["warbandId"] !== warbandId) return null;
    const str = (k: string): string => (typeof value[k] === "string" ? value[k] : "");
    return { warbandId, scenario: str("scenario"), opponent: str("opponent"), notes: str("notes") };
  } catch {
    return null;
  }
}

export function clearPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
