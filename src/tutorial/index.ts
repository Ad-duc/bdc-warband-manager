/*
 * File:        src/tutorial/index.ts
 * Role:        Loads and validates the tutorial lessons of src/tutorial/lessons.
 *              A lesson is added by dropping <id>.json in that folder; the
 *              files are bundled with the tutorial screen, so they are
 *              available offline.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { LessonSchema, type Lesson } from "./schema.ts";

const files = import.meta.glob<{ default: unknown }>("./lessons/*.json", { eager: true });

/** Parses the bundled lessons; throws with the file name on bad data. */
export function loadLessons(): Lesson[] {
  return Object.entries(files)
    .map(([path, mod]) => {
      const parsed = LessonSchema.safeParse(mod.default);
      if (!parsed.success) throw new Error(`${path}: ${parsed.error.message}`);
      return parsed.data;
    })
    .sort((a, b) => a.sourceRef.page - b.sourceRef.page);
}

export const LESSONS: Lesson[] = loadLessons();

export function findLesson(id: string | null): Lesson | undefined {
  return id === null ? undefined : LESSONS.find((l) => l.id === id);
}
