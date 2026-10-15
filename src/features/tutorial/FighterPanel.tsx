/*
 * File:        src/features/tutorial/FighterPanel.tsx
 * Role:        Card of a tutorial fighter, laid out like a fighter scroll:
 *              name, wargear, characteristics after wargear, weapons with
 *              their profile (range column for a ranged weapon) and traits, and the life points left at the
 *              current step (filled boxes, crossed out when lost).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { CommonData } from "../../data/schema.ts";
import { formatRange, formatRend, useFormatter } from "../../i18n/text.ts";
import type { ResolvedFighter } from "../../tutorial/model.ts";
import { StatsTable } from "../common/StatsTable.tsx";
import { Term } from "../common/Term.tsx";

export function FighterPanel({
  fighter,
  life,
  active,
  common,
}: {
  fighter: ResolvedFighter;
  life: number;
  active: boolean;
  common: CommonData;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const name = f.text(fighter.name);
  const max = fighter.stats.lf;
  const headingId = `tutorial-fighter-${fighter.lesson.id}`;
  const traitName = (key: string) => common.weaponTraits.find((x) => x.key === key)?.name;
  const ranged = fighter.weapons.some((w) => w.kind === "ranged");

  return (
    <article
      aria-labelledby={headingId}
      className={`panel-parchment min-w-0 p-3 ${active ? "outline-4 outline-offset-2 outline-on-page" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`inline-block size-4 shrink-0 rotate-45 border-2 border-on-panel ${
            fighter.lesson.side === "a" ? "bg-on-panel" : "bg-white"
          }`}
        />
        <h2 id={headingId} className="title-section font-gothic leading-tight">
          {name}
        </h2>
      </div>
      <p className="mb-2 mt-1 text-sm italic text-on-panel-muted">
        {fighter.wargear.map((w) => f.text(w.name)).join(", ")}
      </p>

      <StatsTable stats={fighter.stats} caption={t("tutorial.fighter.stats", { name })} />

      <div className="mt-2 overflow-x-auto">
        <table className="table-bdc text-sm">
          <caption className="sr-only">{t("tutorial.fighter.weapons", { name })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("weapon.name")}</th>
              {ranged && (
                <th scope="col" className="text-center">
                  {t("weapon.rng")}
                </th>
              )}
              <th scope="col" className="text-center">
                {t("weapon.atk")}
              </th>
              <th scope="col" className="text-center">
                {t("weapon.rnd")}
              </th>
              <th scope="col" className="text-center">
                {t("weapon.dmg")}
              </th>
              <th scope="col" className="text-center">
                {t("weapon.crit")}
              </th>
              <th scope="col">{t("weapon.traits")}</th>
            </tr>
          </thead>
          <tbody>
            {fighter.weapons.map((w) => (
              <tr key={w.id}>
                <th scope="row" className="font-bold">
                  {f.text(w.name)}
                </th>
                {ranged && (
                  <td className="text-center tabular-nums">
                    {w.profile === null ? "-" : formatRange(w.profile, t("weapon.flame"))}
                  </td>
                )}
                <td className="text-center tabular-nums">{f.dice(w.profile?.attacks)}</td>
                <td className="text-center tabular-nums">{formatRend(w.profile?.rend ?? 0)}</td>
                <td className="text-center tabular-nums">{f.dice(w.profile?.damage)}</td>
                <td className="text-center tabular-nums">{f.dice(w.profile?.critDamage)}</td>
                <td className="italic">
                  {w.traits.map((trait, i) => {
                    const text = traitName(trait.key);
                    return (
                      <span key={trait.key}>
                        {i > 0 && ", "}
                        {text === undefined ? trait.key : <Term text={text} />}
                      </span>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider">{t("tutorial.fighter.life")}</span>
        <span
          role="img"
          aria-label={t("tutorial.fighter.lifeLabel", { value: life, max })}
          className="flex gap-1"
        >
          {Array.from({ length: max }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`relative block size-4 border-2 border-on-panel ${i < life ? "bg-on-panel" : "bg-white"}`}
            >
              {i >= life && (
                <svg viewBox="0 0 10 10" className="absolute inset-0 size-full">
                  <path d="M0 10L10 0" strokeWidth="1.5" className="stroke-ink" />
                </svg>
              )}
            </span>
          ))}
        </span>
        <span className="ml-auto font-bold tabular-nums" aria-hidden="true">
          {t("tutorial.fighter.lifeValue", { value: life, max })}
        </span>
      </div>
    </article>
  );
}
