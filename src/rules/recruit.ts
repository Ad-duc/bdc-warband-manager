/*
 * File:        src/rules/recruit.ts
 * Role:        recruitBlockers(): the rules that forbid recruiting one more
 *              fighter of a profile right now (warband size, leader count and
 *              the leader imposed by the origin, category and profile limits,
 *              silver left). The wizard greys out the "Recruit" button and
 *              shows the first reason; validateWarband() still reports any
 *              warband built otherwise (import, older data).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import type { Category, FighterProfile, Origin, Warband } from "../data/schema.ts";
import { activeFighters, recruitmentBudget } from "./calc.ts";
import { effectiveCategory, isUncapped, profileLimit, type FactionIndex } from "./lookup.ts";

export type RecruitBlocker =
  | { code: "maxFighters"; max: number }
  | { code: "leaderTaken" }
  | { code: "leaderOrigin"; expected: string }
  | { code: "categoryMax"; category: Category; max: number }
  | { code: "profileLimit"; max: number }
  | { code: "budget"; cost: number; remaining: number };

/**
 * Reasons why one more fighter of `profile` cannot be recruited, most general
 * first; empty when the recruitment is allowed. Alternate forms (formOf) are
 * never offered by the catalogue and are not checked here.
 */
export function recruitBlockers(
  index: FactionIndex,
  warband: Warband,
  profile: FighterProfile,
  origin: Origin | undefined,
): RecruitBlocker[] {
  const out: RecruitBlocker[] = [];
  const { maxFighters, composition } = index.common.recruitment;
  const resolved = activeFighters(warband).flatMap((fighter) => {
    const p = index.fighters.get(fighter.profileId);
    return p === undefined ? [] : [{ fighter, profile: p }];
  });

  if (resolved.length >= maxFighters) out.push({ code: "maxFighters", max: maxFighters });

  if (profile.category === "leader") {
    const requiredLeaderId = origin?.requiredLeaderId ?? null;
    if (resolved.some((r) => effectiveCategory(r.fighter, r.profile) === "leader"))
      out.push({ code: "leaderTaken" });
    if (requiredLeaderId !== null && requiredLeaderId !== profile.id)
      out.push({ code: "leaderOrigin", expected: requiredLeaderId });
  } else if (!isUncapped(profile, origin)) {
    const { max } = composition[profile.category];
    const count = resolved.filter(
      (r) => effectiveCategory(r.fighter, r.profile) === profile.category && !isUncapped(r.profile, origin),
    ).length;
    if (max !== null && count >= max) out.push({ code: "categoryMax", category: profile.category, max });
  }

  const limit = profileLimit(profile, origin);
  if (limit !== null && resolved.filter((r) => r.profile.id === profile.id).length >= limit)
    out.push({ code: "profileLimit", max: limit });

  const { remaining } = recruitmentBudget(index, warband);
  if (profile.cost > remaining) out.push({ code: "budget", cost: profile.cost, remaining });
  return out;
}
