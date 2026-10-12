/*
 * File:        tests/unit/data.test.ts
 * Role:        The bundled game data loads, validates and resolves its
 *              references the same way the app does at start-up.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/index.ts";

describe("game data", () => {
  const data = loadGameData();

  it("loads common data from playtest 1.02", () => {
    expect(data.common.sourceVersion).toBe("playtest-1.02");
    expect(data.common.recruitment.startingSilver).toBe(1000);
  });

  it("loads the Guild Mercenaries faction", () => {
    const gm = data.factions.find((f) => f.id === "guild-mercenaries");
    expect(gm?.fighters).toHaveLength(13);
    expect(gm?.origins.map((o) => o.requiredLeaderId)).toEqual([
      "guild-captain",
      "noble",
      "witch-hunter",
      "high-wizard-of-the-guild",
    ]);
  });
});
