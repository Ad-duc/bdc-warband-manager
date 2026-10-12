/*
 * File:        src/rules/catalog.ts
 * Role:        Catalogue of every diagnostic the engine can raise, with its
 *              severity and the book reference shown in the interface tooltip.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { SourceRef } from "../data/schema.ts";
import type { Severity } from "./types.ts";

export interface RuleEntry {
  severity: Severity;
  /** Modes in which the rule runs. */
  modes: readonly ("recruitment" | "campaign")[];
  ref: SourceRef;
  /** Entry of RULES_ASSUMPTIONS.md when the rule rests on a reading of the book. */
  assumption?: string;
}

const BOTH = ["recruitment", "campaign"] as const;
const RECRUITMENT = ["recruitment"] as const;
const GENERAL = "05_bandes-regles-generales.md";
const CONCEPTS = "02_concepts-de-base.md";
const BATTLES = "03_batailles.md";
const GM = "06_guild-mercenaries.md";

export const RULES = {
  "data.unknownFaction": {
    severity: "error",
    modes: BOTH,
    ref: { page: 47, md: `${GENERAL} > Étape 1 - Choisir une faction` },
  },
  "data.unknownOrigin": {
    severity: "error",
    modes: BOTH,
    ref: { page: 47, md: `${GENERAL} > Étape 2 - Choisir une origine` },
  },
  "data.unknownFighter": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },
  "data.unknownWargear": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 4 - Acheter l'équipement` },
  },
  "data.unknownSkill": { severity: "error", modes: BOTH, ref: { page: 49, md: `${GENERAL} > Compétences` } },
  "data.unknownSpell": {
    severity: "error",
    modes: BOTH,
    ref: { page: 61, md: `${GM} > Domaines de magie des Guild Mercenaries` },
  },

  "budget.exceeded": {
    severity: "error",
    modes: RECRUITMENT,
    ref: { page: 47, md: `${GENERAL} > Mille pièces d'argent` },
  },
  "budget.leftover": {
    severity: "warning",
    modes: RECRUITMENT,
    ref: { page: 47, md: `${GENERAL} > Mille pièces d'argent` },
  },

  "composition.maxFighters": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },
  "composition.leaderCount": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },
  "composition.leaderOrigin": {
    severity: "error",
    modes: RECRUITMENT,
    ref: { page: 52, md: `${GM} > Origines` },
    assumption: "A10",
  },
  "composition.promotedLeader": {
    severity: "error",
    modes: BOTH,
    ref: { page: 54, md: `${GM} > Mort d'un Chef` },
    assumption: "A10",
  },
  "composition.categoryMax": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },
  "composition.categoryMin": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },
  "composition.profileLimit": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 3 - Recruter des combattants` },
  },

  "wargear.notAllowed": {
    severity: "error",
    modes: BOTH,
    ref: { page: 48, md: `${GENERAL} > Étape 4 - Acheter l'équipement` },
  },
  "wargear.fixedMissing": { severity: "error", modes: BOTH, ref: { page: 70, md: `${GM} > Hunting Dog` } },
  "wargear.notPurchasable": { severity: "error", modes: BOTH, ref: { page: 70, md: `${GM} > Hunting Dog` } },
  "carry.melee": {
    severity: "error",
    modes: BOTH,
    ref: { page: 13, md: `${CONCEPTS} > Limite de port` },
    assumption: "A05",
  },
  "carry.ranged": { severity: "error", modes: BOTH, ref: { page: 13, md: `${CONCEPTS} > Limite de port` } },
  "carry.armour": { severity: "error", modes: BOTH, ref: { page: 13, md: `${CONCEPTS} > Limite de port` } },
  "carry.items": { severity: "error", modes: BOTH, ref: { page: 13, md: `${CONCEPTS} > Limite de port` } },
  "twoHanded.multiple": {
    severity: "error",
    modes: BOTH,
    ref: { page: 28, md: `${BATTLES} > À deux mains` },
    assumption: "A03",
  },
  "twoHanded.heldItemRanged": {
    severity: "error",
    modes: BOTH,
    ref: { page: 60, md: `${GM} > Objets tenus` },
    assumption: "A05",
  },
  "twoHanded.heldItemMelee": {
    severity: "info",
    modes: BOTH,
    ref: { page: 60, md: `${GM} > Objets tenus` },
    assumption: "A05",
  },
  "twoHanded.offHand": {
    severity: "warning",
    modes: BOTH,
    ref: { page: 24, md: `${BATTLES} > Arme de main secondaire` },
    assumption: "A04",
  },
  "wargear.restriction": {
    severity: "error",
    modes: BOTH,
    ref: { page: 59, md: `${GM} > Armure de plates` },
  },
  "wargear.requires": { severity: "error", modes: BOTH, ref: { page: 59, md: `${GM} > Carreau explosif` } },
  "rarity.exceeded": {
    severity: "error",
    modes: BOTH,
    ref: { page: 28, md: `${BATTLES} > Rare (0-[x])` },
    assumption: "A02",
  },
  "fighter.unarmed": {
    severity: "warning",
    modes: BOTH,
    ref: { page: 24, md: `${BATTLES} > Combattants sans arme` },
    assumption: "A12",
  },
  "weapon.oneUse": {
    severity: "info",
    modes: BOTH,
    ref: { page: 27, md: `${BATTLES} > Usage unique` },
    assumption: "A16",
  },
  "henchman.championItem": {
    severity: "info",
    modes: BOTH,
    ref: { page: 56, md: `${GM} > Liste des Champions` },
  },

  "skill.duplicate": {
    severity: "error",
    modes: BOTH,
    ref: { page: 49, md: `${GENERAL} > Pas de doublon` },
    assumption: "A08",
  },
  "skill.notEligible": { severity: "error", modes: BOTH, ref: { page: 49, md: `${GENERAL} > Restrictions` } },
  "skill.fixedMissing": {
    severity: "error",
    modes: BOTH,
    ref: { page: 65, md: `${GM} > Noble` },
    assumption: "A08",
  },
  "skill.recruitmentCount": {
    severity: "error",
    modes: RECRUITMENT,
    ref: { page: 49, md: `${GENERAL} > Étape 5 - Choisir les compétences` },
    assumption: "A08",
  },

  "spell.notKnownLore": {
    severity: "error",
    modes: BOTH,
    ref: { page: 61, md: `${GM} > Domaines de magie des Guild Mercenaries` },
  },
  "spell.duplicateOnFighter": {
    severity: "error",
    modes: BOTH,
    ref: { page: 66, md: `${GM} > High Wizard of the Guild` },
    assumption: "A09",
  },
  "spell.recruitmentCount": {
    severity: "error",
    modes: RECRUITMENT,
    ref: { page: 66, md: `${GM} > High Wizard of the Guild` },
  },
  "spell.sharedSignature": {
    severity: "info",
    modes: BOTH,
    ref: { page: 66, md: `${GM} > High Wizard of the Guild` },
    assumption: "A09",
  },

  "blackRot.full": {
    severity: "warning",
    modes: BOTH,
    ref: { page: 133, md: "10_aide-de-jeu.md > Feuille de bande" },
    assumption: "A14",
  },
} as const satisfies Record<string, RuleEntry>;

export type RuleCode = keyof typeof RULES;

export const RULE_CODES = Object.keys(RULES) as RuleCode[];
