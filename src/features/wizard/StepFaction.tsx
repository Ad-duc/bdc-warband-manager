/*
 * File:        src/features/wizard/StepFaction.tsx
 * Role:        Step 1: warband name and faction. Every faction file of
 *              src/data is listed; the faction can be changed while the
 *              warband has no fighter. One faction per row; long descriptions
 *              are cut to three lines with a "read more" toggle.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { gameData } from "../../data/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { ClampedText } from "../common/ClampedText.tsx";
import type { StepProps } from "./WizardPage.tsx";

const BASE = import.meta.env.BASE_URL;

export function StepFaction({ warband, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const locked = warband.fighters.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="warband-name" className="mb-1 block font-bold">
          {t("wizard.name")}
        </label>
        <input
          id="warband-name"
          className="field"
          value={warband.name}
          maxLength={80}
          onChange={(e) => {
            const name = e.target.value;
            update((w) => ({ ...w, name }));
          }}
        />
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("wizard.faction.legend")}</legend>
        {locked && <p className="mb-2 text-sm">{t("wizard.faction.locked")}</p>}
        <div className="grid gap-3">
          {gameData.factions.map((faction) => {
            const inputId = `faction-${faction.id}`;
            const descId = `faction-${faction.id}-description`;
            return (
              <div
                key={faction.id}
                className="flex gap-3 border-2 border-on-panel p-3 has-[:checked]:bg-bone"
              >
                <input
                  id={inputId}
                  type="radio"
                  name="faction"
                  value={faction.id}
                  aria-describedby={descId}
                  checked={warband.factionId === faction.id}
                  disabled={locked && warband.factionId !== faction.id}
                  onChange={() => {
                    update((w) => ({
                      ...w,
                      factionId: faction.id,
                      originId: null,
                      strongholdId: null,
                      strongholdTrackers: {},
                    }));
                  }}
                  className="mt-1 size-5 shrink-0"
                />
                {/* Fixed-width box so that every description starts at the same place. */}
                <label htmlFor={inputId} className="flex w-20 shrink-0 cursor-pointer justify-center">
                  <img src={`${BASE}images/${faction.assets.shield}`} alt="" className="h-20 w-auto" />
                </label>
                <div className="min-w-0 flex-1">
                  <label htmlFor={inputId} className="block cursor-pointer font-hand text-2xl">
                    {f.text(faction.name)}
                  </label>
                  <ClampedText id={descId} text={f.text(faction.description)} className="text-sm" />
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
