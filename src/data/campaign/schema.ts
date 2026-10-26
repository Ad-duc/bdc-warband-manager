/*
 * File:        src/data/campaign/schema.ts
 * Role:        Zod schema and integrity checks of the Campaign chapter preview
 *              (Curiosities table, Explore the City). Kept apart from the
 *              playtest data: the preview is not part of a published version.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { z } from "zod";
import {
  AttackProfileSchema,
  DiceExprSchema,
  FileHeaderSchema,
  IdSchema,
  LocalizedTextSchema,
  SourceRefSchema,
} from "../schema.ts";

/** "11", "21-26", "6+", "10+" as printed in the book. */
const RollSchema = z.string().regex(/^\d+(-\d+|\+)?$/, "Invalid roll or range");

const TableSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** "d6", or what the table is read with ("climbing-score", "score"). */
    die: z.enum(["d6", "climbing-score", "score"]),
    entries: z
      .array(
        z
          .object({
            roll: RollSchema,
            name: LocalizedTextSchema,
            text: LocalizedTextSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const CuriosityGroupSchema = z
  .object({
    id: IdSchema,
    range: RollSchema,
    name: LocalizedTextSchema,
    /** Rule of the group when it has one (number of jars or tonics found). */
    text: LocalizedTextSchema.nullable(),
    /** The units of the D66 roll give how many items are found. */
    countFromUnits: z.boolean(),
    sourceRef: SourceRefSchema,
  })
  .strict();

const CuriosityItemSchema = z
  .object({
    id: IdSchema,
    roll: RollSchema,
    group: IdSchema,
    name: LocalizedTextSchema,
    keywords: z.array(z.enum(["item", "stash-item", "consumable"])).min(1),
    /** Rare 0-x, null when the item is not rare. */
    rarity: z.number().int().positive().nullable(),
    flavour: LocalizedTextSchema.nullable(),
    text: LocalizedTextSchema,
    /** Price when sold from the stash, null when it cannot be sold. */
    sellValue: DiceExprSchema.nullable(),
    actions: z.array(
      z
        .object({
          name: LocalizedTextSchema,
          tag: z.enum(["action", "bonus-action"]),
          text: LocalizedTextSchema,
        })
        .strict(),
    ),
    weapon: AttackProfileSchema.nullable(),
    sourceRef: SourceRefSchema,
  })
  .strict();

const PartyLimitSchema = z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }).strict();

const ExplorationResultSchema = z
  .object({
    id: IdSchema,
    /** One result can cover several ranges (Quiet Night: 21-36 and 52). */
    ranges: z.array(RollSchema).min(1),
    name: LocalizedTextSchema,
    flavour: LocalizedTextSchema,
    text: LocalizedTextSchema,
    options: z.array(
      z
        .object({
          id: IdSchema,
          name: LocalizedTextSchema,
          text: LocalizedTextSchema,
          /** Option open to one faction only, null when open to all. */
          factionId: IdSchema.nullable(),
        })
        .strict(),
    ),
    tables: z.array(TableSchema),
    sourceRef: SourceRefSchema,
  })
  .strict();

export const CampaignPreviewSchema = z
  .object({
    _header: FileHeaderSchema,
    schemaVersion: z.literal(1),
    status: z.literal("preview"),
    source: z
      .object({
        kind: z.literal("discord-preview"),
        received: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        basedOn: z.string(),
        pages: z.array(z.number().int().positive()).min(1),
      })
      .strict(),
    note: LocalizedTextSchema,
    curiosities: z
      .object({
        id: IdSchema,
        name: LocalizedTextSchema,
        die: z.literal("d66"),
        sourceRef: SourceRefSchema,
        groups: z.array(CuriosityGroupSchema).min(1),
        items: z.array(CuriosityItemSchema).min(1),
        treasureMap: TableSchema,
      })
      .strict(),
    exploration: z
      .object({
        id: IdSchema,
        name: LocalizedTextSchema,
        die: z.literal("d66"),
        aftermathStep: z.number().int().positive(),
        sourceRef: SourceRefSchema,
        scoutingParty: z
          .object({
            leaderOrChampion: PartyLimitSchema,
            henchman: PartyLimitSchema,
            beast: PartyLimitSchema,
            brute: PartyLimitSchema,
            excludeTakenDown: z.boolean(),
            sourceRef: SourceRefSchema,
          })
          .strict(),
        results: z.array(ExplorationResultSchema).min(1),
      })
      .strict(),
  })
  .strict();
export type CampaignPreview = z.infer<typeof CampaignPreviewSchema>;

/** The 36 results of a D66 roll, "11" to "66". */
export const D66_VALUES: readonly string[] = [1, 2, 3, 4, 5, 6].flatMap((t) =>
  [1, 2, 3, 4, 5, 6].map((u) => `${String(t)}${String(u)}`),
);

/** Expands a D66 roll or range ("21-36" gives 21 to 26 and 31 to 36). */
export function expandD66(range: string): string[] {
  const [from = "", to = from] = range.split("-");
  return D66_VALUES.filter((v) => v >= from && v <= to);
}

/**
 * Checks the preview against itself and the known trait and faction ids:
 * each D66 table covers 11 to 66 exactly once and every item belongs to the
 * group whose range holds its roll. An empty array means the file is consistent.
 */
export function checkPreviewIntegrity(
  preview: CampaignPreview,
  traitKeys: ReadonlySet<string>,
  factionIds: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const coverage = (label: string, ranges: string[]): void => {
    const counts = new Map<string, number>();
    for (const r of ranges) for (const v of expandD66(r)) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (const v of D66_VALUES) {
      const n = counts.get(v) ?? 0;
      if (n !== 1) problems.push(`${label}: D66 ${v} is covered ${String(n)} times`);
    }
  };
  const { curiosities, exploration } = preview;

  coverage(
    "Curiosity groups",
    curiosities.groups.map((g) => g.range),
  );
  coverage(
    "Curiosity items",
    curiosities.items.map((i) => i.roll),
  );
  coverage(
    "Exploration table",
    exploration.results.flatMap((r) => r.ranges),
  );

  const groups = new Map(curiosities.groups.map((g) => [g.id, g]));
  const seen = new Set<string>();
  for (const item of curiosities.items) {
    if (seen.has(item.id)) problems.push(`Duplicate curiosity id "${item.id}"`);
    seen.add(item.id);
    const group = groups.get(item.group);
    if (group === undefined) {
      problems.push(`${item.id}: unknown group "${item.group}"`);
      continue;
    }
    const inGroup = new Set(expandD66(group.range));
    if (!expandD66(item.roll).every((v) => inGroup.has(v)))
      problems.push(`${item.id}: roll ${item.roll} is outside group ${group.range}`);
    if (item.keywords.includes("stash-item") !== (item.sellValue !== null))
      problems.push(`${item.id}: a stash item needs a sell value, and only a stash item`);
    for (const trait of item.weapon?.traits ?? [])
      if (!traitKeys.has(trait.key)) problems.push(`${item.id}: unknown weapon trait "${trait.key}"`);
  }

  const resultIds = new Set<string>();
  for (const result of exploration.results) {
    if (resultIds.has(result.id)) problems.push(`Duplicate exploration result id "${result.id}"`);
    resultIds.add(result.id);
    for (const option of result.options)
      if (option.factionId !== null && !factionIds.has(option.factionId))
        problems.push(`${result.id}: unknown faction "${option.factionId}"`);
  }
  return problems;
}
