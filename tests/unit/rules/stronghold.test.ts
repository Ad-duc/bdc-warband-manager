/**
 * File:        tests/unit/rules/stronghold.test.ts
 * Role:        Stronghold level and income by battles fought (rules v1.10, p. 137)
 * Author:      Adrien Duclaud
 * Created:     2026-11-10
 * License:     MIT
 */

import { describe, expect, it } from "vitest";
import { loadGameData } from "../../../src/data/index.ts";
import { strongholdLevel } from "../../../src/rules/index.ts";

const { common } = loadGameData();

describe("stronghold level", () => {
  it("is level 1 with 3D6x5 silver for the first 2 battles", () => {
    expect(strongholdLevel(common, 0)).toMatchObject({ level: 1, income: "3d6x5", upgrades: 0 });
    expect(strongholdLevel(common, 2)).toMatchObject({ level: 1 });
  });

  it("becomes level 2 after the 3rd battle and level 3 after the 8th", () => {
    expect(strongholdLevel(common, 3)).toMatchObject({ level: 2, income: "4d6x5", upgrades: 1 });
    expect(strongholdLevel(common, 7)).toMatchObject({ level: 2 });
    expect(strongholdLevel(common, 8)).toMatchObject({ level: 3, income: "5d6x5", upgrades: 2 });
    expect(strongholdLevel(common, 40)).toMatchObject({ level: 3 });
  });

  it("does not depend on the order of the table", () => {
    const reversed = structuredClone(common);
    reversed.campaign.strongholdLevels.reverse();
    expect(strongholdLevel(reversed, 3)).toMatchObject({ level: 2 });
  });

  it("refuses an empty table", () => {
    const empty = structuredClone(common);
    empty.campaign.strongholdLevels = [];
    expect(() => strongholdLevel(empty, 0)).toThrow("no stronghold level");
  });
});
