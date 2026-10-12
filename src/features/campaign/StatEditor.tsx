/*
 * File:        src/features/campaign/StatEditor.tsx
 * Role:        Editor of stat modifiers (injuries, advancements). Each line has
 *              "improve" and "worsen" buttons, so the user never has to know
 *              that a better Blade value is a lower number.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { STAT_KEYS, type StatDelta, type StatKey } from "../../data/schema.ts";
import { adjustDelta, improvementSteps } from "./campaign.ts";

export function StatEditor({
  delta,
  onChange,
  label,
}: {
  delta: StatDelta;
  onChange: (next: StatDelta) => void;
  label: string;
}) {
  const { t } = useTranslation();
  const describe = (key: StatKey): string => {
    const steps = improvementSteps(delta, key);
    if (steps === 0) return t("campaign.stats.unchanged");
    return steps > 0
      ? t("campaign.stats.improved", { count: steps })
      : t("campaign.stats.worsened", { count: -steps });
  };

  return (
    <fieldset>
      <legend className="text-sm font-bold">{label}</legend>
      <ul className="mt-1 grid gap-1 sm:grid-cols-2">
        {STAT_KEYS.map((key) => {
          const name = t(`stats.${key}.name`);
          return (
            <li key={key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm">{name}</span>
              <button
                type="button"
                className="btn btn-sm"
                aria-label={t("campaign.stats.worsen", { stat: name })}
                onClick={() => {
                  onChange(adjustDelta(delta, key, -1));
                }}
              >
                -
              </button>
              <button
                type="button"
                className="btn btn-sm"
                aria-label={t("campaign.stats.improve", { stat: name })}
                onClick={() => {
                  onChange(adjustDelta(delta, key, 1));
                }}
              >
                +
              </button>
              <span className="text-sm" aria-live="polite">
                {describe(key)}
              </span>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
