/*
 * File:        src/features/groups/groups.ts
 * Role:        Group campaign documents: creation, participants (warbands of
 *              this app or guest warbands), battles and the standings table
 *              (battles, victories, draws, defeats). Pure functions, no
 *              storage; no campaign rule is applied (Chapter 5 is not
 *              published yet).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import type { Campaign, CampaignBattle, CampaignParticipant, Warband } from "../../data/schema.ts";
import { newId, nowIso } from "../warbands/factory.ts";

export function createCampaign(name: string, now: string = nowIso()): Campaign {
  return {
    schemaVersion: 1,
    id: newId(),
    name,
    participants: [],
    battles: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

const touch = (c: Campaign, change: Partial<Campaign>, now: string = nowIso()): Campaign => ({
  ...c,
  ...change,
  updatedAt: now,
});

/** Adds a warband of this app; nothing changes when it already takes part. */
export function addLocalParticipant(c: Campaign, warband: Warband): Campaign {
  if (c.participants.some((p) => p.warbandId === warband.id)) return c;
  const participant: CampaignParticipant = {
    id: newId(),
    warbandId: warband.id,
    name: warband.name,
    factionId: warband.factionId,
    rating: null,
  };
  return touch(c, { participants: [...c.participants, participant] });
}

export function addGuestParticipant(
  c: Campaign,
  guest: { name: string; factionId: string | null; rating: number | null },
): Campaign {
  const participant: CampaignParticipant = { id: newId(), warbandId: null, ...guest };
  return touch(c, { participants: [...c.participants, participant] });
}

export function updateParticipant(c: Campaign, id: string, change: Partial<CampaignParticipant>): Campaign {
  return touch(c, { participants: c.participants.map((p) => (p.id === id ? { ...p, ...change, id } : p)) });
}

/** A participant who fought a recorded battle cannot be removed. */
export function canRemoveParticipant(c: Campaign, id: string): boolean {
  return !c.battles.some((b) => b.participantIds.includes(id));
}

export function removeParticipant(c: Campaign, id: string): Campaign {
  if (!canRemoveParticipant(c, id)) return c;
  return touch(c, { participants: c.participants.filter((p) => p.id !== id) });
}

export function addBattle(c: Campaign, battle: Omit<CampaignBattle, "id">): Campaign {
  return touch(c, { battles: [...c.battles, { ...battle, id: newId() }] });
}

export function removeBattle(c: Campaign, id: string): Campaign {
  return touch(c, { battles: c.battles.filter((b) => b.id !== id) });
}

export interface Standing {
  participantId: string;
  played: number;
  victories: number;
  draws: number;
  defeats: number;
}

/** Results of each participant, most victories first, then fewest defeats. */
export function standings(c: Campaign): Standing[] {
  const rows = new Map<string, Standing>(
    c.participants.map((p) => [p.id, { participantId: p.id, played: 0, victories: 0, draws: 0, defeats: 0 }]),
  );
  for (const battle of c.battles) {
    for (const id of battle.participantIds) {
      const row = rows.get(id);
      if (row === undefined) continue;
      row.played += 1;
      if (battle.winnerId === null) row.draws += 1;
      else if (battle.winnerId === id) row.victories += 1;
      else row.defeats += 1;
    }
  }
  return [...rows.values()].sort((a, b) => b.victories - a.victories || a.defeats - b.defeats);
}

/** Name shown for a participant: the live name of a local warband, the typed name otherwise. */
export function participantName(p: CampaignParticipant, warbands: Map<string, Warband>): string {
  const local = p.warbandId === null ? undefined : warbands.get(p.warbandId);
  return local?.name ?? p.name;
}
