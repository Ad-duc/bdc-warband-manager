/*
 * File:        src/features/warbands/factory.ts
 * Role:        Creation and editing helpers for warband documents: empty
 *              warband, new fighter (starting experience, fixed wargear and
 *              skills), origin choice (leader and stronghold), duplication.
 *              Pure functions: they return new objects, never mutate.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { FactionData, FighterProfile, Warband, WarbandFighter } from "../../data/schema.ts";
import { WARBAND_SCHEMA_VERSION } from "../../data/schema.ts";
import { rollD6, rollStartingExperience, type RandomSource } from "../../rules/index.ts";

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createWarband(
  language: "en" | "fr",
  factionId: string,
  originId: string | null = null,
): Warband {
  const now = nowIso();
  return {
    schemaVersion: WARBAND_SCHEMA_VERSION,
    id: newId(),
    name: "",
    factionId,
    originId,
    creationLanguage: language,
    mode: "recruitment",
    createdAt: now,
    updatedAt: now,
    stash: { silver: 0, leechJars: 0, items: [] },
    strongholdId: null,
    strongholdTrackers: {},
    holdings: [],
    counters: { battlesFought: 0, victories: 0, holdingsRansacked: 0, fightersLost: 0 },
    notes: "",
    fighters: [],
    battleLog: [],
  };
}

/** New fighter with a simulated starting experience roll, fixed wargear and fixed skills. */
export function createFighter(profile: FighterProfile, random: RandomSource = Math.random): WarbandFighter {
  const roll = rollStartingExperience(profile, random);
  return {
    instanceId: newId(),
    profileId: profile.id,
    customName: "",
    wargearIds: [...profile.fixedWargearIds],
    skillIds: [...profile.recruitmentGrants.fixedSkillIds],
    spellIds: [],
    optionIds: [],
    experience: roll.total,
    startingExperienceRoll: roll,
    recruitCostPaid: null,
    injuries: [],
    blackRot: 0,
    statModifiers: {},
    status: "active",
    promotedToLeader: false,
    history: [],
  };
}

/** Rolls a stronghold tracker formula such as "2d6" (bottles of vintage wine). */
export function rollTracker(formula: string, random: RandomSource = Math.random): number {
  const m = /^(\d*)d6([+-]\d+)?$/.exec(formula);
  if (m === null) return Number(formula) || 0;
  const count = m[1] === undefined || m[1] === "" ? 1 : Number(m[1]);
  let total = Number(m[2] ?? 0);
  for (let i = 0; i < count; i += 1) total += rollD6(random);
  return total;
}

/**
 * Applies an origin: stronghold and its trackers, then the imposed leader.
 * Leaders of another profile are removed; the imposed one is added if missing.
 */
export function applyOrigin(
  warband: Warband,
  faction: FactionData,
  originId: string,
  random: RandomSource = Math.random,
): Warband {
  const origin = faction.origins.find((o) => o.id === originId);
  if (origin === undefined) return warband;
  const stronghold = faction.strongholds.find((s) => s.id === origin.strongholdId);
  const trackers: Record<string, number> = {};
  for (const t of stronghold?.trackers ?? []) trackers[t.id] = rollTracker(t.initial, random);

  const leaderIds = new Set(faction.fighters.filter((f) => f.category === "leader").map((f) => f.id));
  let fighters = warband.fighters.filter(
    (f) =>
      !leaderIds.has(f.profileId) ||
      origin.requiredLeaderId === null ||
      f.profileId === origin.requiredLeaderId,
  );
  const required = faction.fighters.find((f) => f.id === origin.requiredLeaderId);
  if (required !== undefined && !fighters.some((f) => f.profileId === required.id))
    fighters = [createFighter(required, random), ...fighters];

  return {
    ...warband,
    originId,
    strongholdId: origin.strongholdId,
    strongholdTrackers: trackers,
    fighters,
  };
}

export function duplicateWarband(warband: Warband, copySuffix: string): Warband {
  const now = nowIso();
  return {
    ...structuredClone(warband),
    id: newId(),
    name: `${warband.name} ${copySuffix}`.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

/** Display name of a fighter: custom name, else the profile name. */
export function fighterLabel(fighter: WarbandFighter, profileName: string): string {
  return fighter.customName.trim() === "" ? profileName : fighter.customName;
}
