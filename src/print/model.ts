/*
 * File:        src/print/model.ts
 * Role:        Print model built from a warband: one entry per fighter with
 *              the values of the official Warband Roster (name, type, cost,
 *              experience, effective characteristics, 3 weapon lines with
 *              traits, wargear / spells / skills / injuries text, Black Rot),
 *              formatted for the active language. Pure, without React.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { LocalizedText, Stats, Warband, WarbandFighter } from "../data/schema.ts";
import type { Language } from "../i18n/index.ts";
import { formatDice, formatRange, formatRend } from "../i18n/text.ts";
import {
  activeFighters,
  effectiveStats,
  fighterOptions,
  fighterValue,
  formsOf,
  weaponLines,
  type FactionIndex,
} from "../rules/index.ts";

/** Weapon lines printed in each fighter block (official roster: 3). */
export const WEAPON_ROWS = 3;
/** Fighter blocks per roster page (official roster: 5). */
export const FIGHTERS_PER_PAGE = 5;
/** Fighter cards per A4 page (3 x 3, 63 x 88 mm). */
export const CARDS_PER_PAGE = 9;

export interface PrintWeapon {
  name: string;
  rng: string;
  atk: string;
  rnd: string;
  dmg: string;
  crit: string;
  traits: string;
}

export interface PrintFighter {
  id: string;
  name: string;
  type: string;
  category: string;
  /** null for an alternate form (Lycanfell Beast): no cost, no experience. */
  cost: number | null;
  experience: number | null;
  stats: Stats | null;
  weapons: PrintWeapon[];
  notes: string[];
  blackRot: number;
}

export interface PrintLabels {
  flame: string;
  unarmed: string;
  wargear: string;
  skills: string;
  spells: string;
  injuries: string;
  promoted: string;
  moreWeapons: string;
  options: string;
  /** "Form of {{name}}" with {{name}} replaced by the fighter's label. */
  formOf: (name: string) => string;
}

const pick = (text: LocalizedText, lang: Language): string => text[lang];

export function buildPrintFighter(
  index: FactionIndex,
  fighter: WarbandFighter,
  lang: Language,
  labels: PrintLabels,
): PrintFighter {
  const profile = index.fighters.get(fighter.profileId);
  const type = profile === undefined ? fighter.profileId : pick(profile.name, lang);
  const traitNames = new Map(index.common.weaponTraits.map((t) => [t.key, pick(t.name, lang)]));

  const lines = weaponLines(index, fighter).map((line): PrintWeapon => {
    const gear = index.wargear.get(line.id);
    const isGranted = gear !== undefined && gear.grantsAttack === line.profile;
    const name =
      line.id === "unarmed-strike" ? labels.unarmed : gear === undefined ? line.id : pick(gear.name, lang);
    const traits = (line.profile.traits ?? [])
      .map((t) =>
        t.key === "rare"
          ? `${traitNames.get(t.key) ?? t.key} 0-${gear?.rarity ?? ""}`
          : (traitNames.get(t.key) ?? t.key),
      )
      .join(", ");
    return {
      name: isGranted ? `${name} (+1)` : name,
      rng: line.kind === "ranged" ? formatRange(line.profile, labels.flame) : "-",
      atk: formatDice(line.profile.attacks ?? 1, lang),
      rnd: formatRend(line.profile.rend),
      dmg: formatDice(line.profile.damage, lang),
      crit: formatDice(line.profile.critDamage, lang),
      traits,
    };
  });

  const otherGear = fighter.wargearIds
    .map((id) => index.wargear.get(id))
    .filter((w) => w !== undefined && (w.kind === "armour" || w.kind === "item"))
    .map((w) => (w === undefined ? "" : pick(w.name, lang)));
  const overflow = lines.slice(WEAPON_ROWS).map((w) => w.name);
  const skills = fighter.skillIds.map((id) => {
    const s = index.skills.get(id);
    return s === undefined ? id : pick(s.skill.name, lang);
  });
  const spells = fighter.spellIds.map((id) => {
    const s = index.spells.get(id);
    return s === undefined ? id : pick(s.spell.name, lang);
  });
  const injuries = fighter.injuries.map((i) => i.text.trim()).filter((x) => x !== "");
  const options = fighterOptions(index, fighter).map((o) => pick(o.name, lang));

  const notes: string[] = [];
  if (fighter.promotedToLeader) notes.push(labels.promoted);
  if (options.length > 0) notes.push(`${labels.options} ${options.join(", ")}`);
  if (otherGear.length > 0) notes.push(`${labels.wargear} ${otherGear.join(", ")}`);
  if (overflow.length > 0) notes.push(`${labels.moreWeapons} ${overflow.join(", ")}`);
  if (skills.length > 0) notes.push(`${labels.skills} ${skills.join(", ")}`);
  if (spells.length > 0) notes.push(`${labels.spells} ${spells.join(", ")}`);
  if (injuries.length > 0) notes.push(`${labels.injuries} ${injuries.join(", ")}`);

  return {
    id: fighter.instanceId,
    name: fighter.customName.trim(),
    type,
    category: fighter.promotedToLeader ? "leader" : (profile?.category ?? "henchman"),
    cost: fighterValue(index, fighter),
    experience: fighter.experience,
    stats: effectiveStats(index, fighter),
    weapons: lines.slice(0, WEAPON_ROWS),
    notes,
    blackRot: fighter.blackRot,
  };
}

/**
 * Block of an alternate form (Lycanfell Beast) printed right after its fighter:
 * the form's own profile and natural weapons, none of the fighter's wargear,
 * skills or injuries (Vestiges of the Noble), no cost and no experience.
 */
export function buildFormFighter(
  index: FactionIndex,
  fighter: WarbandFighter,
  formId: string,
  lang: Language,
  labels: PrintLabels,
): PrintFighter {
  const form = index.fighters.get(formId);
  const base = buildPrintFighter(
    index,
    {
      ...fighter,
      profileId: formId,
      wargearIds: [...(form?.fixedWargearIds ?? [])],
      skillIds: [],
      spellIds: [],
      optionIds: [],
      injuries: [],
      statModifiers: {},
      promotedToLeader: false,
      blackRot: 0,
    },
    lang,
    labels,
  );
  const owner =
    fighter.customName.trim() ||
    pick(index.fighters.get(fighter.profileId)?.name ?? { en: "", fr: "" }, lang);
  return {
    ...base,
    id: `${fighter.instanceId}-${formId}`,
    cost: null,
    experience: null,
    notes: [labels.formOf(owner)],
  };
}

/** Active fighters, each followed by its alternate forms; with `blank`, empty blocks complete the roster up to 15. */
export function buildPrintFighters(
  index: FactionIndex,
  warband: Warband,
  lang: Language,
  labels: PrintLabels,
  blank: boolean,
): (PrintFighter | null)[] {
  const list: (PrintFighter | null)[] = activeFighters(warband).flatMap((f) => [
    buildPrintFighter(index, f, lang, labels),
    ...formsOf(index, f.profileId).map((form) => buildFormFighter(index, f, form.id, lang, labels)),
  ]);
  if (blank) while (list.length < index.common.recruitment.maxFighters) list.push(null);
  return list;
}

/** Splits a list into pages of `size` items. */
export function paginate<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}
