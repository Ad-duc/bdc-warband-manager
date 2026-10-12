/*
 * File:        src/features/wizard/diagnostics.ts
 * Role:        Turns engine diagnostics (ids and numbers) into display
 *              parameters: names in the active language, category labels.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { TFunction } from "i18next";
import type { Warband } from "../../data/schema.ts";
import type { Language } from "../../i18n/index.ts";
import type { Diagnostic, FactionIndex } from "../../rules/index.ts";
import { fighterLabel } from "../warbands/factory.ts";

/** Parameter names holding one or more comma-separated wargear ids. */
const WARGEAR_PARAMS = new Set(["wargear", "other", "required"]);

export function displayParams(
  d: Diagnostic,
  index: FactionIndex,
  lang: Language,
  t: TFunction,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(d.params)) {
    if (typeof value === "number") {
      out[key] = value;
      continue;
    }
    if (WARGEAR_PARAMS.has(key))
      out[key] = value
        .split(",")
        .map((id) => index.wargear.get(id)?.name[lang] ?? id)
        .join(", ");
    else if (key === "skill") out[key] = index.skills.get(value)?.skill.name[lang] ?? value;
    else if (key === "table") {
      const table = [...index.common.skillTables, ...index.faction.skillTables].find((x) => x.id === value);
      out[key] = table?.name[lang] ?? value;
    } else if (key === "spell") out[key] = index.spells.get(value)?.spell.name[lang] ?? value;
    else if (key === "lore")
      out[key] = index.faction.spellLores.find((l) => l.id === value)?.name[lang] ?? value;
    else if (key === "profile" || key === "expected")
      out[key] = index.fighters.get(value)?.name[lang] ?? value;
    else if (key === "category") out[key] = t(`categories.${value}_other`);
    else out[key] = value;
  }
  return out;
}

export function fighterName(
  warband: Warband,
  index: FactionIndex,
  instanceId: string | undefined,
  lang: Language,
): string | null {
  if (instanceId === undefined) return null;
  const f = warband.fighters.find((x) => x.instanceId === instanceId);
  if (f === undefined) return null;
  return fighterLabel(f, index.fighters.get(f.profileId)?.name[lang] ?? f.profileId);
}
