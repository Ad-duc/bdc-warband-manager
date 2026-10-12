/*
 * File:        src/data/schema.ts
 * Role:        Zod schemas for game data (common.json, <faction>.json) and for
 *              player documents (warband, campaign). Also exports a referential
 *              integrity check shared by the app loader and scripts/check-data.ts.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT (code). Game content belongs to its author, see README.
 */

import { z } from "zod";

/* ------------------------------------------------------------------------- */
/* Primitives                                                                */
/* ------------------------------------------------------------------------- */

/** Stable identifier: English kebab-case, never translated. */
export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiers must be English kebab-case");
export type Id = z.infer<typeof IdSchema>;

/** Every displayable text carries both languages. */
export const LocalizedTextSchema = z
  .object({
    en: z.string().min(1),
    fr: z.string().min(1),
  })
  .strict();
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** Dice or fixed value as printed in the book: "3", "d3", "d3+1", "2d6", "3d6x5". */
export const DiceExprSchema = z.string().regex(/^(\d+|\d*d\d+([+-]\d+)?(x\d+)?)$/, "Invalid dice expression");
export type DiceExpr = z.infer<typeof DiceExprSchema>;

/** Traceability: printed VO page plus the Markdown file and heading. */
export const SourceRefSchema = z
  .object({
    page: z.number().int().positive(),
    md: z.string().min(1),
  })
  .strict();
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** Header block replacing comments in JSON files. */
export const FileHeaderSchema = z
  .object({
    file: z.string(),
    role: z.string(),
    author: z.string(),
    created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    license: z.string(),
  })
  .strict();

export const CategorySchema = z.enum(["leader", "champion", "henchman", "brute", "beast"]);
export type Category = z.infer<typeof CategorySchema>;

export const TraitRefSchema = z
  .object({
    key: IdSchema,
  })
  .strict();

/** Weapon or spell attack profile, values as printed. */
export const AttackProfileSchema = z
  .object({
    /** Inches, or "flame" for the flame template. Absent for melee. */
    range: z.union([z.number().int().positive(), z.literal("flame")]).optional(),
    attacks: z.union([z.number().int().positive(), DiceExprSchema]).optional(),
    /** 0 is printed "-". */
    rend: z.number().int().max(0),
    damage: z.union([z.number().int().positive(), DiceExprSchema]),
    /** null is printed "-". */
    critDamage: z.union([z.number().int().positive(), DiceExprSchema]).nullable().optional(),
    traits: z.array(TraitRefSchema).optional(),
  })
  .strict();
export type AttackProfile = z.infer<typeof AttackProfileSchema>;

/* ------------------------------------------------------------------------- */
/* Common data                                                               */
/* ------------------------------------------------------------------------- */

export const KeywordSchema = z
  .object({
    key: IdSchema,
    name: LocalizedTextSchema,
    /** category = fighter type, fighter = other fighter keyword, item = wargear keyword */
    kind: z.enum(["category", "fighter", "item"]),
  })
  .strict();

export const WeaponTraitSchema = z
  .object({
    key: IdSchema,
    name: LocalizedTextSchema,
    reminder: LocalizedTextSchema,
    fullRuleRef: SourceRefSchema,
  })
  .strict();
export type WeaponTrait = z.infer<typeof WeaponTraitSchema>;

/**
 * Skill table eligibility in disjunctive form.
 * "any": every fighter. "keywords": eligible when the fighter has ALL keywords
 * of at least ONE group. "fighters": explicit list of profile ids.
 */
export const EligibilitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("any") }).strict(),
  z
    .object({
      kind: z.literal("keywords"),
      anyOf: z.array(z.array(IdSchema).min(1)).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("fighters"),
      fighterIds: z.array(IdSchema).min(1),
    })
    .strict(),
]);
export type Eligibility = z.infer<typeof EligibilitySchema>;

export const SkillSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    text: LocalizedTextSchema,
    sourceRef: SourceRefSchema,
  })
  .strict();
export type Skill = z.infer<typeof SkillSchema>;

export const SkillTableSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    eligibility: EligibilitySchema,
    eligibilityLabel: LocalizedTextSchema,
    skills: z.array(SkillSchema).min(1),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type SkillTable = z.infer<typeof SkillTableSchema>;

export const ConditionSchema = z
  .object({
    key: IdSchema,
    name: LocalizedTextSchema,
    reminder: LocalizedTextSchema,
    sourceRef: SourceRefSchema,
  })
  .strict();

const CompositionLimitSchema = z
  .object({
    min: z.number().int().min(0),
    max: z.number().int().min(0).nullable(),
  })
  .strict();

/** Open tables for the unpublished Chapter 5 (campaign). Empty until released. */
const OpenTableSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    die: z.string().nullable(),
    entries: z.array(
      z
        .object({
          roll: z.string(),
          name: LocalizedTextSchema,
          text: LocalizedTextSchema,
        })
        .strict(),
    ),
  })
  .strict();

export const CommonDataSchema = z
  .object({
    _header: FileHeaderSchema,
    schemaVersion: z.literal(1),
    sourceVersion: z.string(),
    recruitment: z
      .object({
        startingSilver: z.number().int().positive(),
        maxFighters: z.number().int().positive(),
        composition: z
          .object({
            leader: CompositionLimitSchema,
            champion: CompositionLimitSchema,
            henchman: CompositionLimitSchema,
            brute: CompositionLimitSchema,
            beast: CompositionLimitSchema,
          })
          .strict(),
        sourceRef: SourceRefSchema,
      })
      .strict(),
    carryingLimit: z
      .object({
        melee: z.number().int().min(0),
        ranged: z.number().int().min(0),
        armour: z.number().int().min(0),
        item: z.number().int().min(0),
        sourceRef: SourceRefSchema,
      })
      .strict(),
    unarmedStrike: z
      .object({
        name: LocalizedTextSchema,
        profile: AttackProfileSchema,
        sourceRef: SourceRefSchema,
      })
      .strict(),
    rosterLimits: z
      .object({
        holdings: z.number().int().min(0),
        blackRotBoxes: z.number().int().min(0),
        sourceRef: SourceRefSchema,
      })
      .strict(),
    keywords: z.array(KeywordSchema).min(1),
    weaponTraits: z.array(WeaponTraitSchema).min(1),
    conditions: z.array(ConditionSchema),
    skillTables: z.array(SkillTableSchema).min(1),
    campaign: z
      .object({
        status: z.enum(["not-published", "published"]),
        note: LocalizedTextSchema,
        tables: z.array(OpenTableSchema),
      })
      .strict(),
  })
  .strict();
export type CommonData = z.infer<typeof CommonDataSchema>;

/* ------------------------------------------------------------------------- */
/* Faction data                                                              */
/* ------------------------------------------------------------------------- */

export const RuleSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** "action" and "bonus-action" mirror the [Action] / [Bonus Action] tags. */
    tag: z.enum(["action", "bonus-action"]).nullable(),
    text: LocalizedTextSchema,
  })
  .strict();
export type Rule = z.infer<typeof RuleSchema>;

export const EquipRestrictionSchema = z
  .object({
    type: z.literal("forbid-trait"),
    kind: z.enum(["melee", "ranged"]),
    trait: IdSchema,
    exceptWargearIds: z.array(IdSchema),
  })
  .strict();

export const WargearSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    kind: z.enum(["melee", "ranged", "armour", "item"]),
    /** Reference price (the one printed in the profile tables). */
    cost: z.number().int().min(0),
    /** false for natural weapons granted by a scroll (eg. Vicious Bite). */
    purchasable: z.boolean(),
    profile: AttackProfileSchema.nullable(),
    traits: z.array(TraitRefSchema),
    armourValue: z.number().int().min(2).max(6).nullable(),
    itemKeywords: z.array(IdSchema),
    /** Rare 0-x: max number of fighters of the WARBAND equipped with it (p. 28). */
    rarity: z.number().int().positive().nullable(),
    requires: z
      .object({ anyOfWargearIds: z.array(IdSchema).min(1) })
      .strict()
      .nullable(),
    restrictions: z.array(EquipRestrictionSchema),
    /** Extra attack granted by an item (eg. Loyal Companion). */
    grantsAttack: AttackProfileSchema.nullable(),
    text: LocalizedTextSchema.nullable(),
    designerNote: LocalizedTextSchema.nullable(),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type Wargear = z.infer<typeof WargearSchema>;

export const ArmouryListSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    entries: z
      .array(
        z
          .object({
            wargearId: IdSchema,
            /** Price in this list. Must equal the reference price unless noted. */
            cost: z.number().int().min(0),
          })
          .strict(),
      )
      .min(1),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type ArmouryList = z.infer<typeof ArmouryListSchema>;

/** Characteristics. Mv in inches; Bl, Bw, Ar are target numbers (3 = "3+"); null = "-". */
export const StatsSchema = z
  .object({
    mv: z.number().int().min(0),
    bl: z.number().int().min(2).max(6).nullable(),
    bw: z.number().int().min(2).max(6).nullable(),
    ar: z.number().int().min(2).max(6).nullable(),
    in: z.number().int().min(0),
    wl: z.number().int().min(0),
    lf: z.number().int().min(1),
  })
  .strict();
export type Stats = z.infer<typeof StatsSchema>;
export const STAT_KEYS = ["mv", "bl", "bw", "ar", "in", "wl", "lf"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const FighterProfileSchema = z
  .object({
    id: IdSchema,
    /** Fighter names stay in English in both languages. */
    name: LocalizedTextSchema,
    category: CategorySchema,
    keywords: z.array(IdSchema).min(1),
    cost: z.number().int().min(0),
    /** 1 for "0-1", null when unrestricted. */
    limit: z.number().int().positive().nullable(),
    stats: StatsSchema,
    allowedWargearLists: z.array(IdSchema),
    fixedWargearIds: z.array(IdSchema),
    startingExperience: z
      .object({
        base: z.number().int().min(0),
        dice: z.enum(["d3", "d6"]).nullable(),
      })
      .strict(),
    knownSpellLoreIds: z.array(IdSchema),
    recruitmentGrants: z
      .object({
        /** Skills to pick, on top of fixedSkillIds. */
        skills: z.number().int().min(0),
        fixedSkillIds: z.array(IdSchema),
        /** Signature spells to pick from spellLoreId. */
        spells: z.number().int().min(0),
        spellLoreId: IdSchema.nullable(),
      })
      .strict(),
    specialRules: z.array(RuleSchema),
    wargearText: LocalizedTextSchema,
    quote: LocalizedTextSchema.nullable(),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type FighterProfile = z.infer<typeof FighterProfileSchema>;

export const StrongholdSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    flavour: LocalizedTextSchema,
    income: DiceExprSchema,
    rules: z.array(RuleSchema),
    /** Counters noted on the roster (eg. bottles of vintage wine). */
    trackers: z.array(
      z
        .object({
          id: IdSchema,
          name: LocalizedTextSchema,
          initial: DiceExprSchema,
        })
        .strict(),
    ),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type Stronghold = z.infer<typeof StrongholdSchema>;

export const OriginSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    flavour: LocalizedTextSchema,
    /** null when the origin does not impose the leader (allowed by p. 47). */
    requiredLeaderId: IdSchema.nullable(),
    strongholdId: IdSchema.nullable(),
    specialRules: z.array(RuleSchema),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type Origin = z.infer<typeof OriginSchema>;

export const SpellSchema = z
  .object({
    id: IdSchema,
    roll: z.number().int().positive(),
    name: LocalizedTextSchema,
    spellType: z.enum(["attack", "enchant", "cantrip", "hex", "healing", "aura"]),
    castingValue: z.number().int().positive(),
    criticalCastValue: z.number().int().positive(),
    text: LocalizedTextSchema,
    criticalText: LocalizedTextSchema,
    attack: AttackProfileSchema.nullable(),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type Spell = z.infer<typeof SpellSchema>;

export const SpellLoreSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    die: z.literal("d6"),
    spells: z.array(SpellSchema).min(1),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type SpellLore = z.infer<typeof SpellLoreSchema>;

export const FactionDataSchema = z
  .object({
    _header: FileHeaderSchema,
    schemaVersion: z.literal(1),
    id: IdSchema,
    name: LocalizedTextSchema,
    description: LocalizedTextSchema,
    armouryName: LocalizedTextSchema,
    origins: z.array(OriginSchema).min(1),
    strongholds: z.array(StrongholdSchema),
    campaignRules: z.array(RuleSchema),
    leaderSuccession: z.array(
      z
        .object({
          formerLeaderId: IdSchema,
          eligibleChampionIds: z.array(IdSchema).min(1),
        })
        .strict(),
    ),
    nameTable: z
      .object({
        die: z.literal("d66"),
        entries: z.record(z.string().regex(/^[1-6][1-6]$/), z.string().min(1)),
        sourceRef: SourceRefSchema,
      })
      .strict(),
    fighters: z.array(FighterProfileSchema).min(1),
    wargear: z.array(WargearSchema).min(1),
    armouryLists: z.array(ArmouryListSchema).min(1),
    skillTables: z.array(SkillTableSchema),
    spellLores: z.array(SpellLoreSchema),
    assets: z
      .object({
        shield: z.string().min(1),
        /** null: the style guide is grayscale only, see RULES_ASSUMPTIONS.md. */
        accentColor: z
          .string()
          .regex(/^#[0-9A-F]{6}$/)
          .nullable(),
      })
      .strict(),
    sourceRef: SourceRefSchema,
  })
  .strict();
export type FactionData = z.infer<typeof FactionDataSchema>;

/* ------------------------------------------------------------------------- */
/* Player documents                                                          */
/* ------------------------------------------------------------------------- */

export const WARBAND_SCHEMA_VERSION = 1;

const StatDeltaSchema = z
  .object({
    mv: z.number().int(),
    bl: z.number().int(),
    bw: z.number().int(),
    ar: z.number().int(),
    in: z.number().int(),
    wl: z.number().int(),
    lf: z.number().int(),
  })
  .partial()
  .strict();
export type StatDelta = z.infer<typeof StatDeltaSchema>;

export const ExperienceRollSchema = z
  .object({
    base: z.number().int().min(0),
    dice: z.enum(["d3", "d6"]).nullable(),
    /** Raw die results, empty when there is no die. */
    results: z.array(z.number().int().min(1).max(6)),
    total: z.number().int().min(0),
    mode: z.enum(["rolled", "manual"]),
  })
  .strict();

export const InjurySchema = z
  .object({
    id: z.string().min(1),
    /** Free text until Chapter 5 publishes the lasting injury table. */
    text: z.string(),
    tableEntryId: z.string().nullable(),
    statModifiers: StatDeltaSchema,
  })
  .strict();

export const FighterHistoryEntrySchema = z
  .object({
    date: z.iso.datetime(),
    battleId: z.string().nullable(),
    text: z.string(),
  })
  .strict();

export const WarbandFighterSchema = z
  .object({
    instanceId: z.string().min(1),
    profileId: IdSchema,
    customName: z.string(),
    wargearIds: z.array(IdSchema),
    skillIds: z.array(IdSchema),
    spellIds: z.array(IdSchema),
    experience: z.number().int().min(0),
    startingExperienceRoll: ExperienceRollSchema.nullable(),
    /** Silver actually paid when it differs from the profile (eg. Eager to Prove: 0). */
    recruitCostPaid: z.number().int().min(0).nullable(),
    injuries: z.array(InjurySchema),
    blackRot: z.number().int().min(0).max(3),
    /** Advancement deltas, kept apart from injury deltas for traceability. */
    statModifiers: StatDeltaSchema,
    status: z.enum(["active", "dead", "retired"]),
    history: z.array(FighterHistoryEntrySchema),
  })
  .strict();
export type WarbandFighter = z.infer<typeof WarbandFighterSchema>;

export const BattleLogEntrySchema = z
  .object({
    id: z.string().min(1),
    date: z.iso.datetime(),
    scenario: z.string(),
    opponent: z.string(),
    result: z.enum(["victory", "defeat", "draw"]),
    notes: z.string(),
    deltas: z
      .object({
        experience: z.record(z.string(), z.number().int()),
        silver: z.number().int(),
        leechJars: z.number().int(),
        fightersLost: z.array(z.string()),
        holdingsRansacked: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();
export type BattleLogEntry = z.infer<typeof BattleLogEntrySchema>;

export const WarbandSchema = z
  .object({
    schemaVersion: z.literal(WARBAND_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string(),
    factionId: IdSchema,
    originId: IdSchema,
    creationLanguage: z.enum(["en", "fr"]),
    mode: z.enum(["recruitment", "campaign"]),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    stash: z
      .object({
        silver: z.number().int().min(0),
        leechJars: z.number().int().min(0),
        items: z.array(
          z
            .object({
              wargearId: IdSchema.nullable(),
              label: z.string(),
              quantity: z.number().int().positive(),
            })
            .strict(),
        ),
      })
      .strict(),
    strongholdId: IdSchema.nullable(),
    strongholdTrackers: z.record(IdSchema, z.number().int().min(0)),
    holdings: z
      .array(
        z
          .object({
            holdingId: IdSchema.nullable(),
            label: z.string(),
            notes: z.string(),
          })
          .strict(),
      )
      .max(5),
    counters: z
      .object({
        battlesFought: z.number().int().min(0),
        victories: z.number().int().min(0),
        holdingsRansacked: z.number().int().min(0),
        fightersLost: z.number().int().min(0),
      })
      .strict(),
    notes: z.string(),
    /** Includes dead and retired fighters for history; the engine caps active ones at 15. */
    fighters: z.array(WarbandFighterSchema).max(100),
    battleLog: z.array(BattleLogEntrySchema),
  })
  .strict();
export type Warband = z.infer<typeof WarbandSchema>;

/** Campaign arbiter document: modelled now, screen planned after step 7. */
export const CampaignSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string(),
    warbandIds: z.array(z.string().min(1)),
    notes: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type Campaign = z.infer<typeof CampaignSchema>;

/* ------------------------------------------------------------------------- */
/* Referential integrity                                                     */
/* ------------------------------------------------------------------------- */

/**
 * Checks every cross reference of a faction file against itself and common.json.
 * Returns human readable problems; an empty array means the file is consistent.
 */
export function checkFactionIntegrity(faction: FactionData, common: CommonData): string[] {
  const problems: string[] = [];
  const dup = (label: string, ids: string[]): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`Duplicate ${label} id "${id}"`);
      seen.add(id);
    }
  };

  const keywordKeys = new Set(common.keywords.map((k) => k.key));
  const traitKeys = new Set(common.weaponTraits.map((t) => t.key));
  const fighterIds = new Set(faction.fighters.map((f) => f.id));
  const wargearById = new Map(faction.wargear.map((w) => [w.id, w]));
  const listIds = new Set(faction.armouryLists.map((l) => l.id));
  const strongholdIds = new Set(faction.strongholds.map((s) => s.id));
  const loreIds = new Set(faction.spellLores.map((l) => l.id));
  const allTables = [...common.skillTables, ...faction.skillTables];
  const skillIds = allTables.flatMap((t) => t.skills.map((s) => s.id));

  dup(
    "fighter",
    faction.fighters.map((f) => f.id),
  );
  dup(
    "wargear",
    faction.wargear.map((w) => w.id),
  );
  dup(
    "armoury list",
    faction.armouryLists.map((l) => l.id),
  );
  dup(
    "origin",
    faction.origins.map((o) => o.id),
  );
  dup(
    "stronghold",
    faction.strongholds.map((s) => s.id),
  );
  dup(
    "skill table",
    allTables.map((t) => t.id),
  );
  dup("skill", skillIds);
  dup(
    "spell",
    faction.spellLores.flatMap((l) => l.spells.map((s) => s.id)),
  );
  const skillIdSet = new Set(skillIds);

  const checkTraits = (owner: string, traits: { key: string }[] | undefined): void => {
    for (const t of traits ?? []) {
      if (!traitKeys.has(t.key)) problems.push(`${owner}: unknown weapon trait "${t.key}"`);
    }
  };

  for (const o of faction.origins) {
    if (o.requiredLeaderId !== null) {
      const leader = faction.fighters.find((f) => f.id === o.requiredLeaderId);
      if (!leader) problems.push(`Origin ${o.id}: unknown leader "${o.requiredLeaderId}"`);
      else if (leader.category !== "leader")
        problems.push(`Origin ${o.id}: "${o.requiredLeaderId}" is not a leader`);
    }
    if (o.strongholdId !== null && !strongholdIds.has(o.strongholdId))
      problems.push(`Origin ${o.id}: unknown stronghold "${o.strongholdId}"`);
  }

  for (const s of faction.leaderSuccession) {
    if (!fighterIds.has(s.formerLeaderId))
      problems.push(`Leader succession: unknown fighter "${s.formerLeaderId}"`);
    for (const c of s.eligibleChampionIds)
      if (!fighterIds.has(c)) problems.push(`Leader succession: unknown fighter "${c}"`);
  }

  for (const f of faction.fighters) {
    if (f.name.en !== f.name.fr) problems.push(`Fighter ${f.id}: name must be identical in EN and FR`);
    if (!f.keywords.includes(f.category))
      problems.push(`Fighter ${f.id}: keywords must include its category "${f.category}"`);
    for (const k of f.keywords)
      if (!keywordKeys.has(k)) problems.push(`Fighter ${f.id}: unknown keyword "${k}"`);
    for (const l of f.allowedWargearLists)
      if (!listIds.has(l)) problems.push(`Fighter ${f.id}: unknown armoury list "${l}"`);
    for (const w of f.fixedWargearIds)
      if (!wargearById.has(w)) problems.push(`Fighter ${f.id}: unknown fixed wargear "${w}"`);
    for (const s of f.recruitmentGrants.fixedSkillIds)
      if (!skillIdSet.has(s)) problems.push(`Fighter ${f.id}: unknown fixed skill "${s}"`);
    for (const l of f.knownSpellLoreIds)
      if (!loreIds.has(l)) problems.push(`Fighter ${f.id}: unknown spell lore "${l}"`);
    const g = f.recruitmentGrants;
    if (g.spells > 0 && (g.spellLoreId === null || !f.knownSpellLoreIds.includes(g.spellLoreId)))
      problems.push(`Fighter ${f.id}: signature spells must come from a known lore`);
  }

  for (const w of faction.wargear) {
    checkTraits(`Wargear ${w.id}`, w.traits);
    checkTraits(`Wargear ${w.id} (granted attack)`, w.grantsAttack?.traits);
    for (const k of w.itemKeywords)
      if (!keywordKeys.has(k)) problems.push(`Wargear ${w.id}: unknown item keyword "${k}"`);
    const isWeapon = w.kind === "melee" || w.kind === "ranged";
    if (isWeapon && w.profile === null) problems.push(`Wargear ${w.id}: weapons need a profile`);
    if (!isWeapon && w.profile !== null) problems.push(`Wargear ${w.id}: only weapons have a profile`);
    if (w.kind === "ranged" && w.profile?.range === undefined)
      problems.push(`Wargear ${w.id}: ranged weapons need a range`);
    if (w.kind === "melee" && w.profile?.range !== undefined)
      problems.push(`Wargear ${w.id}: melee weapons have no range`);
    if (w.kind === "armour" && w.armourValue === null)
      problems.push(`Wargear ${w.id}: armour needs an armour value`);
    const hasRareTrait = w.traits.some((t) => t.key === "rare");
    if (isWeapon && hasRareTrait !== (w.rarity !== null))
      problems.push(`Wargear ${w.id}: Rare trait and rarity value disagree`);
    for (const r of w.requires?.anyOfWargearIds ?? [])
      if (!wargearById.has(r)) problems.push(`Wargear ${w.id}: unknown required wargear "${r}"`);
    for (const r of w.restrictions) {
      if (!traitKeys.has(r.trait)) problems.push(`Wargear ${w.id}: unknown restricted trait "${r.trait}"`);
      for (const e of r.exceptWargearIds)
        if (!wargearById.has(e)) problems.push(`Wargear ${w.id}: unknown exception "${e}"`);
    }
  }

  for (const l of faction.armouryLists) {
    dup(
      `entry of list ${l.id}`,
      l.entries.map((e) => e.wargearId),
    );
    for (const e of l.entries) {
      const w = wargearById.get(e.wargearId);
      if (!w) problems.push(`List ${l.id}: unknown wargear "${e.wargearId}"`);
      else if (!w.purchasable) problems.push(`List ${l.id}: "${w.id}" is not purchasable`);
    }
  }

  for (const t of allTables) {
    if (t.eligibility.kind === "keywords")
      for (const group of t.eligibility.anyOf)
        for (const k of group)
          if (!keywordKeys.has(k)) problems.push(`Skill table ${t.id}: unknown keyword "${k}"`);
    if (t.eligibility.kind === "fighters")
      for (const id of t.eligibility.fighterIds)
        if (!fighterIds.has(id)) problems.push(`Skill table ${t.id}: unknown fighter "${id}"`);
  }

  for (const lore of faction.spellLores) {
    const rolls = lore.spells.map((s) => s.roll).sort((a, b) => a - b);
    const expected = Array.from({ length: 6 }, (_, i) => i + 1);
    if (rolls.join(",") !== expected.join(","))
      problems.push(`Spell lore ${lore.id}: rolls must be exactly 1 to 6`);
    for (const s of lore.spells) checkTraits(`Spell ${s.id}`, s.attack?.traits);
  }

  const d66 = Object.keys(faction.nameTable.entries);
  if (d66.length !== 36) problems.push(`Name table: expected 36 entries, found ${d66.length}`);

  return problems;
}
