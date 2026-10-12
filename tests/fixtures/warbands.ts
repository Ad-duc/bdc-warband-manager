/*
 * File:        tests/fixtures/warbands.ts
 * Role:        Builders for test warbands and fighters, plus the reference
 *              valid "Swords for Hire" warband used across the rules tests.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { loadGameData } from "../../src/data/index.ts";
import type { FactionData, Warband, WarbandFighter } from "../../src/data/schema.ts";
import type { RulesData } from "../../src/rules/index.ts";

export const data: RulesData = loadGameData();

export function guild(): FactionData {
  const f = data.factions.find((x) => x.id === "guild-mercenaries");
  if (f === undefined) throw new Error("Guild Mercenaries data missing");
  return f;
}

/** Deep copy of the data, to test rules against modified game data. */
export function cloneData(): RulesData {
  return structuredClone(data);
}

let counter = 0;

export function fighter(profileId: string, overrides: Partial<WarbandFighter> = {}): WarbandFighter {
  counter += 1;
  return {
    instanceId: `f${counter}`,
    profileId,
    customName: "",
    wargearIds: [],
    skillIds: [],
    spellIds: [],
    optionIds: [],
    experience: 0,
    startingExperienceRoll: null,
    recruitCostPaid: null,
    injuries: [],
    blackRot: 0,
    statModifiers: {},
    status: "active",
    promotedToLeader: false,
    history: [],
    ...overrides,
  };
}

export function warband(fighters: WarbandFighter[], overrides: Partial<Warband> = {}): Warband {
  return {
    schemaVersion: 1,
    id: "w-test",
    name: "Test",
    factionId: "guild-mercenaries",
    originId: "swords-for-hire",
    creationLanguage: "fr",
    mode: "recruitment",
    createdAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
    stash: { silver: 0, leechJars: 0, items: [] },
    strongholdId: "guild-barracks",
    strongholdTrackers: {},
    holdings: [],
    counters: { battlesFought: 0, victories: 0, holdingsRansacked: 0, fightersLost: 0 },
    notes: "",
    fighters,
    battleLog: [],
    ...overrides,
  };
}

export const mercenary = (o: Partial<WarbandFighter> = {}): WarbandFighter =>
  fighter("guild-mercenary", { wargearIds: ["spear", "cuirass"], experience: 22, ...o });

/**
 * Reference valid warband: 995 silver spent, 5 left, 282 experience.
 * Captain 188, Champion 152, Plague Doctor 75, 5 Mercenaries 430, Ogre 150.
 */
export function swordsForHire(): Warband {
  return warband([
    fighter("guild-captain", {
      instanceId: "captain",
      wargearIds: ["sword", "cuirass", "shield"],
      skillIds: ["rallying-cry", "crackshot"],
      experience: 63,
    }),
    fighter("guild-champion", {
      instanceId: "champion",
      wargearIds: ["zweihander", "cuirass"],
      skillIds: ["feint"],
      experience: 44,
    }),
    fighter("plague-doctor", { instanceId: "doctor", wargearIds: ["dagger"], experience: 42 }),
    mercenary({ instanceId: "m1" }),
    mercenary({ instanceId: "m2" }),
    mercenary({ instanceId: "m3" }),
    mercenary({ instanceId: "m4" }),
    mercenary({ instanceId: "m5" }),
    fighter("mercenary-ogre", { instanceId: "ogre", wargearIds: ["ogre-great-weapon"], experience: 23 }),
  ]);
}

/** Replaces one fighter of a warband, matched by instance id. */
export function withFighter(w: Warband, instanceId: string, patch: Partial<WarbandFighter>): Warband {
  return { ...w, fighters: w.fighters.map((f) => (f.instanceId === instanceId ? { ...f, ...patch } : f)) };
}

/** Deterministic random source cycling through the given values. */
export function sequence(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length] ?? 0;
    i += 1;
    return v;
  };
}
