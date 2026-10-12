/*
 * File:        src/features/wizard/StepRating.tsx
 * Role:        Step 6: warband rating. Summary of every fighter (cost with
 *              wargear, experience), totals, silver going to the stash, and the
 *              button that completes the recruitment when there is no error.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import {
  fighterValue,
  hasErrors,
  recruitmentBudget,
  warbandRating,
  type Diagnostic,
} from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { navigate } from "../../app/router.ts";
import { fighterLabel } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

export function StepRating({
  warband,
  index,
  update,
  diagnostics,
}: StepProps & { diagnostics: Diagnostic[] }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const active = warband.fighters.filter((x) => x.status === "active");
  const budget = recruitmentBudget(index, warband);
  const rating = warbandRating(index, warband);
  const blocked = hasErrors(diagnostics);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="table-bdc">
          <caption className="sr-only">{t("wizard.rating.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("roster.name")}</th>
              <th scope="col">{t("roster.type")}</th>
              <th scope="col">{t("roster.cost")}</th>
              <th scope="col">{t("roster.exp")}</th>
            </tr>
          </thead>
          <tbody>
            {active.map((x) => {
              const p = index.fighters.get(x.profileId);
              const typeName = p === undefined ? x.profileId : f.text(p.name);
              return (
                <tr key={x.instanceId}>
                  <td>{fighterLabel(x, typeName)}</td>
                  <td>{typeName}</td>
                  <td>{t("units.silver", { value: f.number(fighterValue(index, x)) })}</td>
                  <td>{f.number(x.experience)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink font-bold">
              <td colSpan={2}>{t("wizard.rating.totals")}</td>
              <td>{t("units.silver", { value: f.number(rating.cost) })}</td>
              <td>{f.number(rating.experience)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        <div className="border-2 border-on-panel p-3">
          <dt className="text-sm">{t("wizard.rating.formula")}</dt>
          <dd className="font-hand text-3xl" data-testid="final-rating">
            {f.number(rating.total)}
          </dd>
        </div>
        <div className="border-2 border-on-panel p-3">
          <dt className="text-sm">{t("wizard.rating.stash")}</dt>
          <dd className="font-hand text-3xl" data-testid="final-stash">
            {t("units.silver", { value: f.number(Math.max(0, budget.remaining)) })}
          </dd>
        </div>
        <div className="border-2 border-on-panel p-3">
          <dt className="text-sm">{t("wizard.rating.stronghold")}</dt>
          <dd className="font-hand text-2xl">
            {(() => {
              const s = index.faction.strongholds.find((x) => x.id === warband.strongholdId);
              return s === undefined ? "-" : f.text(s.name);
            })()}
          </dd>
        </div>
      </dl>

      {blocked && <p role="status">{t("wizard.rating.blocked")}</p>}
      <button
        type="button"
        className="btn btn-solid"
        disabled={blocked}
        onClick={() => {
          update((w) => ({ ...w, stash: { ...w.stash, silver: Math.max(0, budget.remaining) } }));
          navigate({ name: "campaign", id: warband.id });
        }}
      >
        {t("wizard.rating.finish")}
      </button>
    </div>
  );
}
