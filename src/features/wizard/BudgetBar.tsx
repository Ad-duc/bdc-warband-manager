/*
 * File:        src/features/wizard/BudgetBar.tsx
 * Role:        Always visible summary: silver spent and left, warband rating.
 *              Sticky at the top of the screen while scrolling.
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

  return (
    <div className="sticky top-0 z-10 border-2 border-on-page bg-page px-3 py-2">
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div className="flex gap-2">
          <dt>{t("budget.spent")}</dt>
          <dd className="font-bold" data-testid="budget-spent">
            {t("units.silver", { value: f.number(budget.spent) })}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt>{t("budget.remaining")}</dt>
          <dd className="font-bold" data-testid="budget-remaining">
            {t("units.silver", { value: f.number(budget.remaining) })}
            {over && <span className="ml-2 uppercase">{t("budget.over")}</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt>{t("budget.rating")}</dt>
          <dd className="font-bold" data-testid="warband-rating">
            {f.number(rating.total)}
          </dd>
        </div>
      </dl>
      <meter
        className="mt-1 h-2 w-full"
        min={0}
        max={budget.starting}
        value={Math.min(budget.spent, budget.starting)}
        aria-label={t("budget.meter", { spent: budget.spent, starting: budget.starting })}
      />
    </div>
  );
}
