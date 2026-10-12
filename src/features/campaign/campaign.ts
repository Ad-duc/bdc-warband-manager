/*
 * File:        src/features/campaign/campaign.ts
 * Role:        Pure campaign operations on a warband document: record a battle
 *              in one go (experience, losses, gains, counters, history), undo
 *              the last battle, injuries, stat modifiers, holdings and stash.
 *              Chapter 5 (Campaign) is not published: injuries and
 *              advancements stay free fields with optional stat modifiers.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import {
  STAT_KEYS,
  type BattleLogEntry,
  type StatDelta,
  type StatKey,
  type Warband,
  type WarbandFighter,
} from "../../data/schema.ts";
import { newId, nowIso } from "../warbands/factory.ts";

/** Sign of an improvement: Bl, Bw and Ar are target numbers (lower is better). */
export const IMPROVE_SIGN: Record<StatKey, 1 | -1> = { mv: 1, bl: -1, bw: -1, ar: -1, in: 1, wl: 1, lf: 1 };

/** Adds `steps` improvements (negative = worsening) to one characteristic. */
export function adjustDelta(delta: StatDelta, key: StatKey, steps: number): StatDelta {
  const value = (delta[key] ?? 0) + steps * IMPROVE_SIGN[key];
  const next: StatDelta = {};
  for (const k of STAT_KEYS) {
    const v = k === key ? value : delta[k];
    if (v !== undefined && v !== 0) next[k] = v;
  }
  return next;
}

/** Number of improvements (positive) or worsenings (negative) held by a delta. */
export function improvementSteps(delta: StatDelta, key: StatKey): number {
  return (delta[key] ?? 0) * IMPROVE_SIGN[key];
}

export interface BattleDraft {
  /** yyyy-mm-dd from the date input. */
  date: string;
  scenario: string;
  opponent: string;
  result: BattleLogEntry["result"];
  notes: string;
  /** Experience earned by fighter instance id. */
  experience: Record<string, number>;
  fightersLost: string[];
  silver: number;
  leechJars: number;
  holdingsRansacked: number;
}

export function emptyBattle(today: Date = new Date()): BattleDraft {
  return {
    date: today.toISOString().slice(0, 10),
    scenario: "",
    opponent: "",
    result: "victory",
    notes: "",
    experience: {},
    fightersLost: [],
    silver: 0,
    leechJars: 0,
    holdingsRansacked: 0,
  };
}

const clampMin0 = (n: number): number => Math.max(0, Math.trunc(n));

/** The entry that will be written to the battle log (zero gains are dropped). */
export function toLogEntry(draft: BattleDraft, id: string = newId()): BattleLogEntry {
  const experience: Record<string, number> = {};
  for (const [k, v] of Object.entries(draft.experience))
    if (Math.trunc(v) !== 0) experience[k] = Math.trunc(v);
  return {
    id,
    date: new Date(`${draft.date}T12:00:00.000Z`).toISOString(),
    scenario: draft.scenario.trim(),
    opponent: draft.opponent.trim(),
    result: draft.result,
    notes: draft.notes.trim(),
    deltas: {
      experience,
      silver: Math.trunc(draft.silver),
      leechJars: Math.trunc(draft.leechJars),
      fightersLost: [...new Set(draft.fightersLost)],
      holdingsRansacked: clampMin0(draft.holdingsRansacked),
    },
  };
}

/**
 * Applies a battle at once: experience, lost fighters (status "dead"),
 * stash gains, counters, fighter history and the log entry. The first battle
 * switches the warband to campaign mode.
 */
export function applyBattle(
  warband: Warband,
  entry: BattleLogEntry,
  historyText: (f: WarbandFighter) => string,
): Warband {
  const d = entry.deltas;
  const lost = new Set(d.fightersLost);
  const fighters = warband.fighters.map((f) => {
    const xp = d.experience[f.instanceId] ?? 0;
    if (xp === 0 && !lost.has(f.instanceId)) return f;
    return {
      ...f,
      experience: Math.max(0, f.experience + xp),
      status: lost.has(f.instanceId) ? ("dead" as const) : f.status,
      history: [...f.history, { date: entry.date, battleId: entry.id, text: historyText(f) }],
    };
  });
  return {
    ...warband,
    mode: "campaign",
    fighters,
    stash: {
      ...warband.stash,
      silver: Math.max(0, warband.stash.silver + d.silver),
      leechJars: Math.max(0, warband.stash.leechJars + d.leechJars),
    },
    counters: {
      battlesFought: warband.counters.battlesFought + 1,
      victories: warband.counters.victories + (entry.result === "victory" ? 1 : 0),
      holdingsRansacked: warband.counters.holdingsRansacked + d.holdingsRansacked,
      fightersLost: warband.counters.fightersLost + lost.size,
    },
    battleLog: [...warband.battleLog, entry],
    updatedAt: nowIso(),
  };
}

/** Reverts the most recent battle, using the deltas kept in its log entry. */
export function undoLastBattle(warband: Warband): Warband {
  const entry = warband.battleLog.at(-1);
  if (entry === undefined) return warband;
  const d = entry.deltas;
  const lost = new Set(d.fightersLost);
  const fighters = warband.fighters.map((f) => {
    const touched = f.history.some((h) => h.battleId === entry.id);
    if (!touched) return f;
    return {
      ...f,
      experience: Math.max(0, f.experience - (d.experience[f.instanceId] ?? 0)),
      status: lost.has(f.instanceId) ? ("active" as const) : f.status,
      history: f.history.filter((h) => h.battleId !== entry.id),
    };
  });
  const battleLog = warband.battleLog.slice(0, -1);
  return {
    ...warband,
    mode: battleLog.length === 0 ? "recruitment" : "campaign",
    fighters,
    stash: {
      ...warband.stash,
      silver: Math.max(0, warband.stash.silver - d.silver),
      leechJars: Math.max(0, warband.stash.leechJars - d.leechJars),
    },
    counters: {
      battlesFought: Math.max(0, warband.counters.battlesFought - 1),
      victories: Math.max(0, warband.counters.victories - (entry.result === "victory" ? 1 : 0)),
      holdingsRansacked: Math.max(0, warband.counters.holdingsRansacked - d.holdingsRansacked),
      fightersLost: Math.max(0, warband.counters.fightersLost - lost.size),
    },
    battleLog,
    updatedAt: nowIso(),
  };
}

/* ------------------------------------------------------------------------- */
/* Fighter and roster edits                                                  */
/* ------------------------------------------------------------------------- */

export function patchFighter(warband: Warband, instanceId: string, patch: Partial<WarbandFighter>): Warband {
  return {
    ...warband,
    fighters: warband.fighters.map((f) => (f.instanceId === instanceId ? { ...f, ...patch } : f)),
  };
}

export function addInjury(fighter: WarbandFighter): WarbandFighter {
  return {
    ...fighter,
    injuries: [...fighter.injuries, { id: newId(), text: "", tableEntryId: null, statModifiers: {} }],
  };
}

export function updateInjury(
  fighter: WarbandFighter,
  injuryId: string,
  patch: Partial<WarbandFighter["injuries"][number]>,
): WarbandFighter {
  return { ...fighter, injuries: fighter.injuries.map((i) => (i.id === injuryId ? { ...i, ...patch } : i)) };
}

export function removeInjury(fighter: WarbandFighter, injuryId: string): WarbandFighter {
  return { ...fighter, injuries: fighter.injuries.filter((i) => i.id !== injuryId) };
}

export const MAX_HOLDINGS = 5;

export function addHolding(warband: Warband): Warband {
  if (warband.holdings.length >= MAX_HOLDINGS) return warband;
  return { ...warband, holdings: [...warband.holdings, { holdingId: null, label: "", notes: "" }] };
}

export function updateHolding(
  warband: Warband,
  index: number,
  patch: { label?: string; notes?: string },
): Warband {
  return { ...warband, holdings: warband.holdings.map((h, i) => (i === index ? { ...h, ...patch } : h)) };
}

export function removeHolding(warband: Warband, index: number): Warband {
  return { ...warband, holdings: warband.holdings.filter((_, i) => i !== index) };
}

export function addStashItem(warband: Warband, wargearId: string | null, label: string): Warband {
  const items = [...warband.stash.items];
  const same = items.findIndex((i) => i.wargearId === wargearId && i.label === label);
  const existing = items[same];
  if (existing !== undefined) items[same] = { ...existing, quantity: existing.quantity + 1 };
  else items.push({ wargearId, label, quantity: 1 });
  return { ...warband, stash: { ...warband.stash, items } };
}

export function removeStashItem(warband: Warband, index: number): Warband {
  const items = warband.stash.items.flatMap((item, i) => {
    if (i !== index) return [item];
    return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : [];
  });
  return { ...warband, stash: { ...warband.stash, items } };
}
