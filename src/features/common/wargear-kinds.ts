/*
 * File:        src/features/common/wargear-kinds.ts
 * Role:        Kinds of wargear in the order of the armoury tables of the
 *              book: melee weapons, ranged weapons, armour, items.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

export const WARGEAR_KINDS = ["melee", "ranged", "armour", "item"] as const;
export type WargearKind = (typeof WARGEAR_KINDS)[number];
