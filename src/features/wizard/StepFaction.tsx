/*
 * File:        src/features/wizard/StepFaction.tsx
 * Role:        Step 1: warband name (typed or drawn from the house tables
 *              of the selected faction) and faction. Every faction file of
 *              src/data is listed; the faction can be changed while the
 *              warband has no fighter. One faction per row; long descriptions
 *              are cut to three lines with a "read more" toggle. The shield
 *              sits at the top, the radio is centred on it, and every closed
 *              card has the same height.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { gameData } from "../../data/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { ClampedText } from "../common/ClampedText.tsx";
import { randomWarbandName, WARBAND_NAME_TABLES } from "../names/houseNames.ts";
import type { StepProps } from "./WizardPage.tsx";

const BASE = import.meta.env.BASE_URL;

const warbandNameFor = (factionId: string): boolean => factionId in WARBAND_NAME_TABLES;

export function StepFaction({ warband, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const locked = warband.fighters.length > 0;
  const selected = gameData.factions.find((x) => x.id === warband.factionId);
  const factionName = selected === undefined ? "" : f.text(selected.name);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="warband-name" className="mb-1 block font-bold">
          {t("wizard.name")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="warband-name"
            className="field min-w-0 flex-1 basis-48"
            value={warband.name}
            maxLength={80}
            onChange={(e) => {
              const name = e.target.value;
              update((w) => ({ ...w, name }));
            }}
          />
          {warbandNameFor(warband.factionId) && (
            <button
              type="button"
              className="btn shrink-0"
              aria-label={t("names.randomWarbandFor", { faction: factionName })}
              onClick={() => {
                const name = randomWarbandName(warband.factionId);
                if (name !== null) update((w) => ({ ...w, name }));
              }}
            >
              {t("names.randomWarband")}
            </button>
          )}
        </div>
        {warbandNameFor(warband.factionId) && <p className="mt-1 text-sm">{t("names.houseNote")}</p>}
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
                {/* Same height as the shield, so that the radio is centred on it. */}
                <div className="flex h-20 shrink-0 items-center">
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
                    className="size-5"
                  />
                </div>
                {/* Fixed-width box so that every description starts at the same place. */}
                <label htmlFor={inputId} className="flex w-20 shrink-0 cursor-pointer justify-center">
                  <img src={`${BASE}images/${faction.assets.shield}`} alt="" className="h-20 w-auto" />
                </label>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={inputId}
                    className="block min-h-[2lh] cursor-pointer font-hand text-2xl sm:min-h-0"
                  >
                    {f.text(faction.name)}
                  </label>
                  <ClampedText id={descId} text={f.text(faction.description)} className="text-sm" uniform />
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
