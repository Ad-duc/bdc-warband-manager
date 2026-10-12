/*
 * File:        src/data/index.ts
 * Role:        Loads and validates every game data file of src/data at start-up.
 *              A faction is added by dropping <faction>.json in this folder.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import {
  CommonDataSchema,
  FactionDataSchema,
  checkFactionIntegrity,
  type CommonData,
  type FactionData,
} from "./schema.ts";

export interface GameData {
  common: CommonData;
  factions: FactionData[];
}

const files = import.meta.glob<{ default: unknown }>("./*.json", { eager: true });

/** Parses the bundled JSON files; throws with a readable message on bad data. */
export function loadGameData(): GameData {
  const commonFile = files["./common.json"];
  if (commonFile === undefined) throw new Error("src/data/common.json is missing");
  const common = CommonDataSchema.parse(commonFile.default);

  const factions = Object.entries(files)
    .filter(([path]) => path !== "./common.json")
    .map(([path, mod]) => {
      const faction = FactionDataSchema.parse(mod.default);
      const problems = checkFactionIntegrity(faction, common);
      if (problems.length > 0) throw new Error(`${path}: ${problems.join("; ")}`);
      return faction;
    })
    // Book order (Guild Mercenaries first), from the page of each faction chapter.
    .sort((a, b) => a.sourceRef.page - b.sourceRef.page);

  return { common, factions };
}

export const gameData: GameData = loadGameData();
