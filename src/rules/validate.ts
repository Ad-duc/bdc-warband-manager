/*
 * File:        src/rules/validate.ts
 * Role:        validateWarband(): pure function returning every diagnostic of a
 *              warband (errors block saving as valid, warnings and info do not).
 *              Each code is described in catalog.ts with its book reference.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { FighterProfile, SkillTable, Wargear, Warband, WarbandFighter } from "../data/schema.ts";
import { RULES, type RuleCode } from "./catalog.ts";
import { activeFighters, recruitmentBudget } from "./calc.ts";
import {
  effectiveCategory,
  findFaction,
  hasTrait,
  indexFaction,
  isHeldItem,
  type FactionIndex,
} from "./lookup.ts";
import type { Diagnostic, DiagnosticParams, RulesData, ValidationMode } from "./types.ts";

/** Above this amount of silver left at recruitment, a warning suggests spending it. */
export const LEFTOVER_WARNING_THRESHOLD = 100;

type Push = (code: RuleCode, params?: DiagnosticParams, fighterInstanceId?: string) => void;

export function validateWarband(warband: Warband, data: RulesData, mode: ValidationMode): Diagnostic[] {
  const out: Diagnostic[] = [];
  const push: Push = (code, params = {}, fighterInstanceId) => {
    const rule = RULES[code];
    if (!(rule.modes as readonly string[]).includes(mode)) return;
    out.push({
      severity: rule.severity,
      code,
      messageKey: `rules.${code}`,
      params,
      ...(fighterInstanceId !== undefined ? { fighterInstanceId } : {}),
    });
  };

  const faction = findFaction(data, warband.factionId);
  if (faction === undefined) {
    push("data.unknownFaction", { faction: warband.factionId });
    return out;
  }
  const index = indexFaction(data.common, faction);
  const origin = faction.origins.find((o) => o.id === warband.originId);
  if (warband.originId === null) push("origin.missing");
  else if (origin === undefined) push("data.unknownOrigin", { origin: warband.originId });

  const resolved: { fighter: WarbandFighter; profile: FighterProfile }[] = [];
  for (const fighter of activeFighters(warband)) {
    const profile = index.fighters.get(fighter.profileId);
    if (profile === undefined)
      push("data.unknownFighter", { profile: fighter.profileId }, fighter.instanceId);
    else resolved.push({ fighter, profile });
  }

  checkComposition(index, resolved, origin?.requiredLeaderId ?? null, push);
  for (const r of resolved) checkFighter(index, r.fighter, r.profile, mode, push);
  checkWarbandWide(index, resolved, push);

  if (mode === "recruitment") {
    const budget = recruitmentBudget(index, warband);
    if (budget.remaining < 0) push("budget.exceeded", { spent: budget.spent, starting: budget.starting });
    else if (budget.remaining > LEFTOVER_WARNING_THRESHOLD)
      push("budget.leftover", { remaining: budget.remaining });
  }
  return out;
}

/** True when the list has at least one error. */
export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === "error");
}

/* ------------------------------------------------------------------------- */
/* Composition                                                               */
/* ------------------------------------------------------------------------- */

function checkComposition(
  index: FactionIndex,
  resolved: { fighter: WarbandFighter; profile: FighterProfile }[],
  requiredLeaderId: string | null,
  push: Push,
): void {
  const { maxFighters, composition } = index.common.recruitment;
  if (resolved.length > maxFighters)
    push("composition.maxFighters", { count: resolved.length, max: maxFighters });

  const leaders = resolved.filter((r) => effectiveCategory(r.fighter, r.profile) === "leader");
  if (leaders.length !== 1) push("composition.leaderCount", { count: leaders.length });

  for (const leader of leaders) {
    if (leader.fighter.promotedToLeader) {
      const eligible = index.faction.leaderSuccession.some((s) =>
        s.eligibleChampionIds.includes(leader.profile.id),
      );
      if (leader.profile.category !== "champion" || !eligible)
        push("composition.promotedLeader", { profile: leader.profile.id }, leader.fighter.instanceId);
    }
    if (requiredLeaderId !== null && leader.profile.id !== requiredLeaderId)
      push(
        "composition.leaderOrigin",
        { profile: leader.profile.id, expected: requiredLeaderId },
        leader.fighter.instanceId,
      );
  }

  for (const category of ["champion", "henchman", "brute", "beast"] as const) {
    const count = resolved.filter((r) => effectiveCategory(r.fighter, r.profile) === category).length;
    const { min, max } = composition[category];
    if (count < min) push("composition.categoryMin", { category, count, min });
    if (max !== null && count > max) push("composition.categoryMax", { category, count, max });
  }

  const byProfile = new Map<FighterProfile, number>();
  for (const r of resolved) byProfile.set(r.profile, (byProfile.get(r.profile) ?? 0) + 1);
  for (const [profile, count] of byProfile)
    if (profile.limit !== null && count > profile.limit)
      push("composition.profileLimit", { profile: profile.id, count, max: profile.limit });
}

/* ------------------------------------------------------------------------- */
/* One fighter                                                               */
/* ------------------------------------------------------------------------- */

function checkFighter(
  index: FactionIndex,
  fighter: WarbandFighter,
  profile: FighterProfile,
  mode: ValidationMode,
  push: Push,
): void {
  const id = fighter.instanceId;
  const gear: Wargear[] = [];
  for (const wargearId of fighter.wargearIds) {
    const w = index.wargear.get(wargearId);
    if (w === undefined) push("data.unknownWargear", { wargear: wargearId }, id);
    else gear.push(w);
  }

  checkWargear(index, fighter, profile, gear, push);
  checkSkills(index, fighter, profile, mode, push);
  checkSpells(index, fighter, profile, mode, push);

  if (fighter.blackRot >= index.common.rosterLimits.blackRotBoxes)
    push("blackRot.full", { boxes: fighter.blackRot }, id);
}

function checkWargear(
  index: FactionIndex,
  fighter: WarbandFighter,
  profile: FighterProfile,
  gear: Wargear[],
  push: Push,
): void {
  const id = fighter.instanceId;
  const limits = index.common.carryingLimit;

  for (const fixed of profile.fixedWargearIds)
    if (!fighter.wargearIds.includes(fixed)) push("wargear.fixedMissing", { wargear: fixed }, id);

  for (const w of gear) {
    if (profile.fixedWargearIds.includes(w.id)) continue;
    if (!w.purchasable) {
      push("wargear.notPurchasable", { wargear: w.id }, id);
      continue;
    }
    const lists = index.listPrices.get(w.id);
    if (!profile.allowedWargearLists.some((l) => lists?.has(l) === true))
      push("wargear.notAllowed", { wargear: w.id }, id);
    if (profile.category === "henchman" && lists?.has("champion") === true)
      push("henchman.championItem", { wargear: w.id }, id);
  }

  const held = gear.filter(isHeldItem);
  const melee = gear.filter((w) => w.kind === "melee");
  const ranged = gear.filter((w) => w.kind === "ranged");
  const armour = gear.filter((w) => w.kind === "armour");
  const items = gear.filter((w) => w.kind === "item" && !isHeldItem(w));
  if (melee.length + held.length > limits.melee)
    push("carry.melee", { count: melee.length + held.length, max: limits.melee }, id);
  if (ranged.length > limits.ranged) push("carry.ranged", { count: ranged.length, max: limits.ranged }, id);
  if (armour.length > limits.armour) push("carry.armour", { count: armour.length, max: limits.armour }, id);
  if (items.length > limits.item) push("carry.items", { count: items.length, max: limits.item }, id);

  const twoHanded = gear.filter((w) => hasTrait(w, "two-handed"));
  if (twoHanded.length > 1) push("twoHanded.multiple", { count: twoHanded.length }, id);
  if (held.length > 0 && twoHanded.some((w) => w.kind === "ranged"))
    push("twoHanded.heldItemRanged", { wargear: held.map((w) => w.id).join(",") }, id);
  if (held.length > 0 && twoHanded.some((w) => w.kind === "melee"))
    push(
      "twoHanded.heldItemMelee",
      {
        wargear: twoHanded
          .filter((w) => w.kind === "melee")
          .map((w) => w.id)
          .join(","),
      },
      id,
    );
  const offHand = melee.filter((w) => hasTrait(w, "off-hand") && !hasTrait(w, "two-handed"));
  if (twoHanded.length > 0 && offHand.length > 0)
    push("twoHanded.offHand", { wargear: offHand.map((w) => w.id).join(",") }, id);

  for (const w of gear) {
    for (const r of w.restrictions) {
      const offending = gear.filter(
        (o) => o.kind === r.kind && hasTrait(o, r.trait) && !r.exceptWargearIds.includes(o.id),
      );
      for (const o of offending) push("wargear.restriction", { wargear: w.id, other: o.id }, id);
    }
    if (w.requires !== null && !w.requires.anyOfWargearIds.some((req) => fighter.wargearIds.includes(req)))
      push("wargear.requires", { wargear: w.id, required: w.requires.anyOfWargearIds.join(",") }, id);
    if (w.kind === "ranged" && hasTrait(w, "one-use")) push("weapon.oneUse", { wargear: w.id }, id);
  }

  if (melee.length === 0) push("fighter.unarmed", {}, id);
}

/** True when the fighter may take skills from this table. */
export function isEligible(fighter: WarbandFighter, profile: FighterProfile, table: SkillTable): boolean {
  const e = table.eligibility;
  if (e.kind === "any") return true;
  if (e.kind === "fighters") return e.fighterIds.includes(profile.id);
  const keywords = new Set(profile.keywords);
  if (fighter.promotedToLeader) keywords.add("leader");
  return e.anyOf.some((group) => group.every((k) => keywords.has(k)));
}

function checkSkills(
  index: FactionIndex,
  fighter: WarbandFighter,
  profile: FighterProfile,
  mode: ValidationMode,
  push: Push,
): void {
  const id = fighter.instanceId;
  const fixed = profile.recruitmentGrants.fixedSkillIds;
  for (const skillId of fighter.skillIds) {
    const entry = index.skills.get(skillId);
    if (entry === undefined) push("data.unknownSkill", { skill: skillId }, id);
    else if (!fixed.includes(skillId) && !isEligible(fighter, profile, entry.table))
      push("skill.notEligible", { skill: skillId, table: entry.table.id }, id);
  }
  for (const skillId of fixed)
    if (!fighter.skillIds.includes(skillId)) push("skill.fixedMissing", { skill: skillId }, id);

  if (mode === "recruitment") {
    const picked = fighter.skillIds.filter((s) => !fixed.includes(s)).length;
    const expected = profile.recruitmentGrants.skills;
    if (picked !== expected) push("skill.recruitmentCount", { expected, actual: picked }, id);
  }
}

function checkSpells(
  index: FactionIndex,
  fighter: WarbandFighter,
  profile: FighterProfile,
  mode: ValidationMode,
  push: Push,
): void {
  const id = fighter.instanceId;
  const seen = new Set<string>();
  for (const spellId of fighter.spellIds) {
    const entry = index.spells.get(spellId);
    if (entry === undefined) push("data.unknownSpell", { spell: spellId }, id);
    else if (!profile.knownSpellLoreIds.includes(entry.loreId))
      push("spell.notKnownLore", { spell: spellId, lore: entry.loreId }, id);
    if (seen.has(spellId)) push("spell.duplicateOnFighter", { spell: spellId }, id);
    seen.add(spellId);
  }
  if (mode === "recruitment") {
    const expected = profile.recruitmentGrants.spells;
    if (fighter.spellIds.length !== expected)
      push("spell.recruitmentCount", { expected, actual: fighter.spellIds.length }, id);
  }
}

/* ------------------------------------------------------------------------- */
/* Warband wide                                                              */
/* ------------------------------------------------------------------------- */

function checkWarbandWide(
  index: FactionIndex,
  resolved: { fighter: WarbandFighter; profile: FighterProfile }[],
  push: Push,
): void {
  // Rare 0-x: number of fighters equipped with the item (p. 28, assumption A02).
  const equipped = new Map<string, number>();
  for (const { fighter } of resolved)
    for (const wargearId of new Set(fighter.wargearIds))
      equipped.set(wargearId, (equipped.get(wargearId) ?? 0) + 1);
  for (const [wargearId, count] of equipped) {
    const rarity = index.wargear.get(wargearId)?.rarity ?? null;
    if (rarity !== null && count > rarity)
      push("rarity.exceeded", { wargear: wargearId, count, max: rarity });
  }

  // No Duplicates (p. 49): every holder after the first is flagged.
  const skillHolders = new Map<string, number>();
  for (const { fighter } of resolved) {
    for (const skillId of fighter.skillIds) {
      const seen = skillHolders.get(skillId) ?? 0;
      if (seen > 0) push("skill.duplicate", { skill: skillId }, fighter.instanceId);
      skillHolders.set(skillId, seen + 1);
    }
  }

  // Signature spells shared by two casters: allowed, reported as info (A09).
  const spellHolders = new Map<string, number>();
  for (const { fighter } of resolved)
    for (const spellId of new Set(fighter.spellIds))
      spellHolders.set(spellId, (spellHolders.get(spellId) ?? 0) + 1);
  for (const [spellId, count] of spellHolders)
    if (count > 1) push("spell.sharedSignature", { spell: spellId, count });
}
