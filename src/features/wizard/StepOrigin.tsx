/*
 * File:        src/features/wizard/StepOrigin.tsx
 * Role:        Step 2: origin. Picking one sets the stronghold (and its
 *              trackers) and recruits the imposed leader.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { useFormatter } from "../../i18n/text.ts";
import { applyOrigin } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

export function StepOrigin({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const faction = index.faction;

  return (
    <fieldset>
      <legend className="mb-3">{t("wizard.origin.legend")}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {faction.origins.map((origin) => {
          const leader = faction.fighters.find((x) => x.id === origin.requiredLeaderId);
          const stronghold = faction.strongholds.find((s) => s.id === origin.strongholdId);
          return (
            <label
              key={origin.id}
              className="flex cursor-pointer flex-col gap-2 border-2 border-on-panel p-3 has-[:checked]:bg-bone"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="origin"
                  value={origin.id}
                  checked={warband.originId === origin.id}
                  onChange={() => {
                    update((w) => applyOrigin(w, faction, origin.id));
                  }}
                  className="size-5"
                />
                <span className="font-gothic text-2xl">{f.text(origin.name)}</span>
              </span>
              <span className="text-sm italic">{f.text(origin.flavour)}</span>
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
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
