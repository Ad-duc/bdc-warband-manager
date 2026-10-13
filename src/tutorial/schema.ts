/*
 * File:        src/tutorial/schema.ts
 * Role:        Format of the tutorial lessons (src/tutorial/lessons/*.json):
 *              a board seen from above, the fighters taken from the game data
 *              and a list of steps. Every step holds its full state (positions,
 *              life points, dice, annotations) so that any step can be shown
 *              on its own. Strict schemas: an unknown property is an error.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { z } from "zod";
import { FileHeaderSchema, IdSchema, SourceRefSchema } from "../data/schema.ts";

/** Position on the board, in inches from the top left corner. */
export const PointSchema = z.tuple([z.number().min(0), z.number().min(0)]);
export type Point = z.infer<typeof PointSchema>;

export const LessonFighterSchema = z
  .object({
    /** Short id used by the steps ("merc"). */
    id: IdSchema,
    /** "a" is drawn as a solid base, "b" as a hatched base. */
    side: z.enum(["a", "b"]),
    faction: IdSchema,
    profile: IdSchema,
    /** Wargear ids of the faction, in the order of the book example. */
    wargear: z.array(IdSchema).min(1),
    /** Base diameter in millimetres. */
    base: z.number().int().positive(),
    /**
     * Short French names used in the lesson instead of the armoury names, by
     * wargear id (eg. "Dague" for "Dague/Dague de poing", as in the book example).
     */
    wargearLabels: z.record(IdSchema, z.string().min(1)),
  })
  .strict();
export type LessonFighter = z.infer<typeof LessonFighterSchema>;

export const TerrainSchema = z
  .object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
    label: z.string().min(1),
  })
  .strict();

/** Section of the French rules reader quoted by a step. */
export const RulesRefSchema = z
  .object({
    /** Chapter id of the rules reader ("batailles"). */
    chapter: IdSchema,
    /** Heading id in that chapter ("s-1-choisir-une-cible"). */
    section: z.string().regex(/^s-[a-z0-9-]+$/),
    /** Heading text shown on the link. */
    label: z.string().min(1),
  })
  .strict();
export type RulesRef = z.infer<typeof RulesRefSchema>;

/**
 * One attack roll. Its result (miss, hit, critical hit) is not stored: it
 * follows from the value and the Blade of the fighter, see dieResult().
 */
export const DieSchema = z
  .object({
    owner: IdSchema,
    /** Wargear id of the weapon the roll is made for. */
    weapon: IdSchema,
    value: z.number().int().min(1).max(6),
    offHand: z.boolean(),
    /** What happened to the roll so far in the action. */
    status: z.enum(["rolled", "parried", "discarded", "used"]),
    /** True for the rolls touched by the current step. */
    highlight: z.boolean(),
  })
  .strict();
export type Die = z.infer<typeof DieSchema>;

export const AnnotationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("charge"),
      fighter: IdSchema,
      /** Where the charge started. */
      from: PointSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("exchange"),
      from: IdSchema,
      to: IdSchema,
      label: z.string().min(1),
    })
    .strict(),
]);
export type Annotation = z.infer<typeof AnnotationSchema>;

export const RecapRowSchema = z
  .object({
    exchange: z.string().min(1),
    fighter: IdSchema,
    result: z.string().min(1),
  })
  .strict();
export type RecapRow = z.infer<typeof RecapRowSchema>;

export const StepSchema = z
  .object({
    /** Text of the black band: the step of the printed sequence. */
    banner: z.string().min(1),
    title: z.string().min(1),
    /** Paragraphs; game terms between double asterisks are shown in bold. */
    text: z.array(z.string().min(1)).min(1),
    rulesRef: RulesRefSchema,
    positions: z.record(IdSchema, PointSchema),
    life: z.record(IdSchema, z.number().int().min(0)),
    /** Fighters highlighted on the board and on their card. */
    focus: z.array(IdSchema),
    /** Fighter holding the initiative, once it is known. */
    initiative: IdSchema.nullable(),
    annotations: z.array(AnnotationSchema),
    /** Attack rolls, null before they are made. */
    dice: z.array(DieSchema).nullable(),
    /** Outcome of the step; dice values only when the book gives them. */
    event: z.string().min(1).nullable(),
    /** Summary table shown on the last step. */
    recap: z.array(RecapRowSchema).nullable(),
  })
  .strict();
export type Step = z.infer<typeof StepSchema>;

export const LessonSchema = z
  .object({
    _header: FileHeaderSchema,
    id: IdSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    /** Example of the book the lesson follows. */
    sourceRef: SourceRefSchema,
    board: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
        terrain: z.array(TerrainSchema),
      })
      .strict(),
    fighters: z.array(LessonFighterSchema).min(1),
    steps: z.array(StepSchema).min(1),
  })
  .strict();
export type Lesson = z.infer<typeof LessonSchema>;
