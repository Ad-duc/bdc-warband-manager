/*
 * File:        src/features/wizard/BudgetBar.tsx
 * Role:        Always visible summary: silver spent and left, warband rating.
 *              On small screens it sits above the step and sticks to the top
 *              of the screen; from lg it is the first frame of the side column,
 *              above the diagnostics panel.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { Warband } from "../../data/schema.ts";
import { recruitmentBudget, warbandRating, type FactionIndex } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";

export function BudgetBar({ warband, index }: { warband: Warband; index: FactionIndex }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const budget = recruitmentBudget(index, warband);
  const rating = warbandRating(index, warband);
  const over = budget.remaining < 0;
  const campaign = warband.mode === "campaign";

  return (
    <div className="sticky top-0 z-10 order-first border-2 border-on-page bg-page px-3 py-2 lg:static lg:order-none lg:p-4">
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 lg:flex-col lg:items-stretch">
        {campaign && (
          <div className="flex justify-between gap-2">
            <dt>{t("campaign.stash.silver")}</dt>
            <dd className="font-bold">{t("units.silver", { value: f.number(warband.stash.silver) })}</dd>
          </div>
        )}
        <div className={campaign ? "hidden" : "flex justify-between gap-2"}>
          <dt>{t("budget.spent")}</dt>
          <dd className="font-bold" data-testid="budget-spent">
            {t("units.silver", { value: f.number(budget.spent) })}
          </dd>
        </div>
        <div className={campaign ? "hidden" : "flex justify-between gap-2"}>
          <dt>{t("budget.remaining")}</dt>
          <dd className="font-bold" data-testid="budget-remaining">
            {t("units.silver", { value: f.number(budget.remaining) })}
            {over && <span className="ml-2 uppercase">{t("budget.over")}</span>}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t("budget.rating")}</dt>
          <dd className="font-bold" data-testid="warband-rating">
            {f.number(rating.total)}
          </dd>
        </div>
      </dl>
      {!campaign && (
        <meter
          className="mt-1 h-2 w-full"
          min={0}
          max={budget.starting}
          value={Math.min(budget.spent, budget.starting)}
          aria-label={t("budget.meter", { spent: budget.spent, starting: budget.starting })}
        />
      )}
    </div>
  );
}
