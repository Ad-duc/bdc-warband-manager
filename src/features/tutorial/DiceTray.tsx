/*
 * File:        src/features/tutorial/DiceTray.tsx
 * Role:        Attack rolls of a tutorial step, grouped by fighter and weapon.
 *              The result of each roll (miss, hit, critical hit) comes from the
 *              Blade of the fighter; what happened to it (parried, discarded,
 *              attack resolved) is drawn on the die and spelled out for screen
 *              readers. A legend explains the marks.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { useFormatter } from "../../i18n/text.ts";
import { dieResult, type DieResult, type ResolvedFighter } from "../../tutorial/model.ts";
import type { Die } from "../../tutorial/schema.ts";

type Status = Die["status"];

const RESULT_CLASS: Record<DieResult, string> = {
  miss: "border-2 border-ash bg-white text-ash",
  hit: "border-[3px] border-on-panel bg-white text-on-panel",
  crit: "border-[3px] border-on-panel bg-on-panel text-white",
};

function DieFace({
  value,
  result,
  status,
  offHand,
  highlight,
  label,
  small = false,
}: {
  value: number;
  result: DieResult;
  status: Status;
  offHand: boolean;
  highlight: boolean;
  label?: string;
  small?: boolean;
}) {
  const size = small ? "size-6 text-xs" : "size-10 text-xl";
  const spent = status === "rolled" ? "" : "opacity-50";
  const ring = highlight ? "ring-4 ring-stone" : "";
  const outline = offHand ? "outline-2 outline-offset-2 outline-on-panel" : "";
  return (
    <span
      {...(label === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label, title: label })}
      className={`relative inline-grid shrink-0 place-items-center font-bold tabular-nums ${size} ${RESULT_CLASS[result]} ${spent} ${ring} ${outline}`}
    >
      {value}
      {(status === "parried" || status === "discarded") && (
        <svg viewBox="0 0 10 10" className="absolute inset-0 size-full" aria-hidden="true">
          <path d="M0 10L10 0" strokeWidth="1" className="stroke-ink" />
        </svg>
      )}
      {status === "used" && (
        <svg
          viewBox="0 0 10 10"
          className={`absolute rounded-full border-2 border-on-panel bg-white ${small ? "-right-2 -top-2 size-3" : "-right-2.5 -top-2.5 size-5"}`}
          aria-hidden="true"
        >
          <path d="M2.5 5.2l1.8 1.8 3.4-3.8" fill="none" strokeWidth="1.4" className="stroke-ink" />
        </svg>
      )}
    </span>
  );
}

export function DiceTray({
  dice,
  fighters,
  firstStep,
}: {
  dice: Die[] | null;
  fighters: ResolvedFighter[];
  /** Number (1-based) of the first step that shows dice. */
  firstStep: number;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const fighterOf = (id: string): ResolvedFighter | undefined => fighters.find((x) => x.lesson.id === id);

  // One group per fighter and weapon, in the order of the rolls.
  const groups: {
    key: string;
    owner: ResolvedFighter | undefined;
    weapon: string;
    offHand: boolean;
    dice: Die[];
  }[] = [];
  for (const die of dice ?? []) {
    const key = `${die.owner}/${die.weapon}`;
    const group = groups.find((g) => g.key === key);
    if (group !== undefined) group.dice.push(die);
    else
      groups.push({
        key,
        owner: fighterOf(die.owner),
        weapon: die.weapon,
        offHand: die.offHand,
        dice: [die],
      });
  }

  const weaponName = (owner: ResolvedFighter | undefined, id: string): string => {
    const item = owner?.wargear.find((w) => w.id === id);
    return item === undefined ? id : f.text(item.name);
  };

  return (
    <section aria-labelledby="tutorial-dice" className="panel-parchment flex flex-col gap-3 p-4">
      <h2 id="tutorial-dice" className="text-sm font-bold uppercase tracking-wider">
        {t("tutorial.dice.title")}
      </h2>
      {dice === null ? (
        <p className="italic text-on-panel-muted">{t("tutorial.dice.empty", { step: firstStep })}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => {
            const name = group.owner === undefined ? "" : f.text(group.owner.name);
            const weapon = weaponName(group.owner, group.weapon);
            return (
              <div key={group.key} className="min-w-0">
                <p className="mb-2 text-sm text-on-panel-muted">
                  {t(group.offHand ? "tutorial.dice.groupOffHand" : "tutorial.dice.group", { name, weapon })}
                </p>
                <ul className="flex flex-wrap gap-3">
                  {group.dice.map((die, i) => {
                    const result = dieResult(die.value, group.owner?.stats.bl ?? null);
                    const parts = [t(`tutorial.dice.result.${result}`)];
                    if (die.offHand) parts.push(t("tutorial.dice.offHand"));
                    if (die.status !== "rolled") parts.push(t(`tutorial.dice.status.${die.status}`));
                    const label = t("tutorial.dice.label", {
                      weapon,
                      value: die.value,
                      state: parts.join(", "),
                    });
                    return (
                      <li key={`${group.key}-${i}`}>
                        <DieFace
                          value={die.value}
                          result={result}
                          status={die.status}
                          offHand={die.offHand}
                          highlight={die.highlight}
                          label={label}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <ul
        aria-label={t("tutorial.dice.legend")}
        className="flex flex-wrap gap-x-4 gap-y-2 border-t border-stone pt-3 text-xs text-on-panel-muted"
      >
        <li className="inline-flex items-center gap-2">
          <DieFace small value={1} result="miss" status="rolled" offHand={false} highlight={false} />
          {t("tutorial.dice.result.miss")}
        </li>
        <li className="inline-flex items-center gap-2">
          <DieFace small value={4} result="hit" status="rolled" offHand={false} highlight={false} />
          {t("tutorial.dice.result.hit")}
        </li>
        <li className="inline-flex items-center gap-2">
          <DieFace small value={6} result="crit" status="rolled" offHand={false} highlight={false} />
          {t("tutorial.dice.result.crit")}
        </li>
        <li className="inline-flex items-center gap-2">
          <DieFace small value={5} result="hit" status="rolled" offHand highlight={false} />
          {t("tutorial.dice.legendOffHand")}
        </li>
        <li className="inline-flex items-center gap-2">
          <DieFace small value={5} result="hit" status="parried" offHand={false} highlight={false} />
          {t("tutorial.dice.legendCancelled")}
        </li>
        <li className="inline-flex items-center gap-2">
          <DieFace small value={5} result="hit" status="used" offHand={false} highlight={false} />
          {t("tutorial.dice.legendUsed")}
        </li>
      </ul>
    </section>
  );
}
