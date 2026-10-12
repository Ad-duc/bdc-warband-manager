/*
 * File:        src/data/constants.ts
 * Role:        Plain constants shared by the schemas and the rules engine. Kept
 *              apart from schema.ts so that the first screen does not load zod.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

/** Profile characteristics, in the order of the printed profile. */
export const STAT_KEYS = ["mv", "bl", "bw", "ar", "in", "wl", "lf"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** Version of the warband document; bump it with a migration in transfer.ts. */
export const WARBAND_SCHEMA_VERSION = 1;
