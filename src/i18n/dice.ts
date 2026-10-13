/*
 * File:        src/i18n/dice.ts
 * Role:        Dice notation shown to players: every roll states its number of
 *              dice ("D6" -> "1D6", "d3+1" -> "1D3+1", "2d6" -> "2D6"), in
 *              upper case. D66 tables keep their name: a D66 is read on two
 *              dice and is not a die of its own. The same rule is applied to
 *              the data files by scripts/fix-dice.ts and checked by check-data.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

/** A die without its count: D3, D6 or D12, alone or followed by "x<n>". */
export const BARE_DIE = /(?<![A-Za-z0-9])[dD](3|6|12)(?=x\d|[^0-9A-Za-z]|$)/g;

/** A counted die written in lower case: "2d6". */
const LOWER_COUNTED_DIE = /(?<![A-Za-z0-9])(\d+)d(3|6|12)(?=x\d|[^0-9A-Za-z]|$)/g;

export function withDiceCount(text: string): string {
  return text.replace(LOWER_COUNTED_DIE, "$1D$2").replace(BARE_DIE, "1D$1");
}

/** True when the text still has a die without its count. */
export function hasBareDie(text: string): boolean {
  return new RegExp(BARE_DIE.source).test(text);
}
