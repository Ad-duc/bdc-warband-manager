/*
 * File:        tests/unit/groups.test.ts
 * Role:        Group campaign documents (participants, battles, standings)
 *              and the hand-off of a prepared battle to a warband's log.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignSchema } from "../../src/data/schema.ts";
import { clearPrefill, peekPrefill, savePrefill } from "../../src/features/battle/handoff.ts";
import {
  addBattle,
  addGuestParticipant,
  addLocalParticipant,
  canRemoveParticipant,
  createCampaign,
  participantName,
  removeBattle,
  removeParticipant,
  standings,
  updateParticipant,
} from "../../src/features/groups/groups.ts";
import { warband } from "../fixtures/warbands.ts";

const local = { ...warband([]), id: "w1", name: "Les Lames" };

function campaignWithTwo() {
  let c = createCampaign("Hiver", "2026-10-13T08:00:00.000Z");
  c = addLocalParticipant(c, local);
  c = addGuestParticipant(c, { name: "Les Rats", factionId: "verminkin", rating: 1100 });
  return c;
}

describe("group campaigns", () => {
  it("creates a valid document and adds each local warband once", () => {
    const c = campaignWithTwo();
    expect(CampaignSchema.parse(c)).toEqual(c);
    expect(addLocalParticipant(c, local)).toBe(c);
    expect(c.participants.map((p) => p.warbandId)).toEqual(["w1", null]);
  });

  it("records battles and computes the standings", () => {
    let c = campaignWithTwo();
    const [a, b] = c.participants.map((p) => p.id) as [string, string];
    const battle = { date: "2026-10-13T09:00:00.000Z", scenario: 1, twist: 2, underdogId: b, notes: "" };
    c = addBattle(c, { ...battle, participantIds: [a, b], winnerId: a });
    c = addBattle(c, { ...battle, participantIds: [a, b], winnerId: null });
    c = addBattle(c, { ...battle, participantIds: [a, "gone"], winnerId: "gone" });
    expect(standings(c)).toEqual([
      { participantId: a, played: 3, victories: 1, draws: 1, defeats: 1 },
      { participantId: b, played: 2, victories: 0, draws: 1, defeats: 1 },
    ]);
    expect(canRemoveParticipant(c, b)).toBe(false);
    expect(removeParticipant(c, b)).toBe(c);
    const last = c.battles.at(-1)?.id ?? "";
    expect(removeBattle(c, last).battles).toHaveLength(2);
  });

  it("removes and renames participants", () => {
    const c = campaignWithTwo();
    const guest = c.participants[1]?.id ?? "";
    expect(updateParticipant(c, guest, { name: "Rats", id: "x" }).participants[1]).toMatchObject({
      id: guest,
      name: "Rats",
    });
    expect(removeParticipant(c, guest).participants).toHaveLength(1);
  });

  it("names a local warband with its live name", () => {
    const c = campaignWithTwo();
    const [p, g] = c.participants;
    const warbands = new Map([["w1", { ...local, name: "Les Lames de Rennes" }]]);
    expect(p === undefined ? "" : participantName(p, warbands)).toBe("Les Lames de Rennes");
    expect(g === undefined ? "" : participantName(g, warbands)).toBe("Les Rats");
    expect(p === undefined ? "" : participantName(p, new Map())).toBe("Les Lames");
  });
});

describe("battle hand-off", () => {
  afterEach(() => {
    clearPrefill();
    vi.restoreAllMocks();
  });

  it("keeps the draft for its warband only", () => {
    savePrefill({ warbandId: "w1", scenario: "1. Une rencontre mortelle", opponent: "Les Rats", notes: "n" });
    expect(peekPrefill("w2")).toBeNull();
    expect(peekPrefill("w1")).toEqual({
      warbandId: "w1",
      scenario: "1. Une rencontre mortelle",
      opponent: "Les Rats",
      notes: "n",
    });
    clearPrefill();
    expect(peekPrefill("w1")).toBeNull();
  });

  it("ignores broken drafts and blocked storage", () => {
    sessionStorage.setItem("bdc.battlePrefill", JSON.stringify({ warbandId: "w1", scenario: 3 }));
    expect(peekPrefill("w1")).toEqual({ warbandId: "w1", scenario: "", opponent: "", notes: "" });
    sessionStorage.setItem("bdc.battlePrefill", "{");
    expect(peekPrefill("w1")).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => {
      savePrefill({ warbandId: "w1", scenario: "", opponent: "", notes: "" });
      clearPrefill();
    }).not.toThrow();
  });
});
