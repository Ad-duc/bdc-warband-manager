/*
 * File:        src/features/wizard/StepOrigin.tsx
 * Role:        Step 2: origin. Picking one sets the stronghold (and its
 *              trackers) and recruits the imposed leader. Flavour texts are cut
 *              to three lines with a "read more" toggle.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { useFormatter } from "../../i18n/text.ts";
import { ClampedText } from "../common/ClampedText.tsx";
import { applyOrigin } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

export function StepOrigin({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const faction = index.faction;

  return (
    <fieldset>
      <legend className="mb-3">{t("wizard.origin.legend")}</legend>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {faction.origins.map((origin) => {
          const leader = faction.fighters.find((x) => x.id === origin.requiredLeaderId);
          const stronghold = faction.strongholds.find((s) => s.id === origin.strongholdId);
          const inputId = `origin-${origin.id}`;
          const flavourId = `origin-${origin.id}-flavour`;
          return (
            <div
              key={origin.id}
              className="flex flex-col gap-2 border-2 border-on-panel p-3 has-[:checked]:bg-bone"
            >
              <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2">
                <input
                  id={inputId}
                  aria-labelledby={`${inputId}-name`}
                  aria-describedby={flavourId}
                  type="radio"
                  name="origin"
                  value={origin.id}
                  checked={warband.originId === origin.id}
                  onChange={() => {
                    update((w) => applyOrigin(w, faction, origin.id));
                  }}
                  className="size-5 shrink-0"
                />
                <span id={`${inputId}-name`} className="font-hand text-2xl">
                  {f.text(origin.name)}
                </span>
              </label>
              <ClampedText id={flavourId} text={f.text(origin.flavour)} className="text-sm italic" />
              <label htmlFor={inputId} className="flex cursor-pointer flex-col gap-2">
                <span className="text-sm">
                  <strong>{t("wizard.origin.leader")}</strong>{" "}
                  {leader === undefined ? "-" : f.text(leader.name)}
                </span>
                <span className="text-sm">
                  <strong>{t("wizard.origin.stronghold")}</strong>{" "}
                  {stronghold === undefined ? "-" : f.text(stronghold.name)}
                  {stronghold !== undefined &&
                    ` (${t("wizard.origin.income", { income: f.dice(stronghold.income) })})`}
                </span>
                {origin.uncappedFighterIds.map((id) => {
                  const fighter = faction.fighters.find((x) => x.id === id);
                  return (
                    <span key={id} className="text-sm">
                      {t("wizard.origin.uncapped", {
                        name: fighter === undefined ? id : f.text(fighter.name),
                        category: t(`categories.${fighter?.category ?? "beast"}_other`),
                      })}
                    </span>
                  );
                })}
                {origin.profileLimits.map((l) => {
                  const fighter = faction.fighters.find((x) => x.id === l.fighterId);
                  return (
                    <span key={l.fighterId} className="text-sm">
                      {l.limit === null
                        ? t("wizard.origin.profileLimitAny", {
                            name: fighter === undefined ? l.fighterId : f.text(fighter.name),
                          })
                        : t("wizard.origin.profileLimit", {
                            limit: l.limit,
                            name: fighter === undefined ? l.fighterId : f.text(fighter.name),
                          })}
                    </span>
                  );
                })}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
