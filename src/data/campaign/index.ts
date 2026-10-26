/*
 * File:        src/data/campaign/index.ts
 * Role:        Loads and validates the Campaign chapter preview (Curiosities,
 *              Explore the City) against its schema and the game data.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { gameData, type GameData } from "../index.ts";
import raw from "./preview.json";
import { CampaignPreviewSchema, checkPreviewIntegrity, type CampaignPreview } from "./schema.ts";

/** Parses the preview file; throws with a readable message on bad data. */
export function loadCampaignPreview(data: unknown, game: GameData): CampaignPreview {
  const preview = CampaignPreviewSchema.parse(data);
  const problems = checkPreviewIntegrity(
    preview,
    new Set(game.common.weaponTraits.map((t) => t.key)),
    new Set(game.factions.map((f) => f.id)),
  );
  if (problems.length > 0) throw new Error(`campaign/preview.json: ${problems.join("; ")}`);
  return preview;
}

export const campaignPreview: CampaignPreview = loadCampaignPreview(raw, gameData);
