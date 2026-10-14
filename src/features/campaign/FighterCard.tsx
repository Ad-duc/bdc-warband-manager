/*
 * File:        src/features/campaign/FighterCard.tsx
 * Role:        Campaign card of one fighter, usable at the gaming table on a
 *              phone: effective characteristics, quick experience buttons,
 *              Black Rot boxes, status, promotion, injuries and advancements,
 *              wargear and skills summary, history.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Warband, WarbandFighter } from "../../data/schema.ts";
import { effectiveStats, fighterValue, gainsNoExperience, type FactionIndex } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { StatsTable } from "../common/StatsTable.tsx";
import { fighterLabel } from "../warbands/factory.ts";
import { addInjury, removeInjury, updateInjury } from "./campaign.ts";
import { StatEditor } from "./StatEditor.tsx";

const XP_STEPS = [-1, 1, 5, 10] as const;

export function FighterCard({
  fighter,
  index,
  onChange,
}: {
  fighter: WarbandFighter;
  warband: Warband;
  index: FactionIndex;
  onChange: (next: WarbandFighter) => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const xpId = useId();
  const statusId = useId();
  const profile = index.fighters.get(fighter.profileId);
  if (profile === undefined) return null;
  const typeName = f.text(profile.name);
  const name = fighterLabel(fighter, typeName);
  const stats = effectiveStats(index, fighter);
  const canPromote =
    profile.category === "champion" &&
    index.faction.leaderSuccession.some((s) => s.eligibleChampionIds.includes(profile.id));
  const nameOf = (ids: string[], lookup: (id: string) => string | undefined) =>
    ids.map((id) => lookup(id) ?? id).join(", ") || "-";

  return (
    <article
      aria-labelledby={`${xpId}-title`}
      className="border-2 border-on-panel p-3"
      data-testid="campaign-fighter"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${xpId}-title`} className="title-sub">
          {name}
        </h3>
        <p className="text-sm">
          {typeName} - {t(`categories.${fighter.promotedToLeader ? "leader" : profile.category}_one`)} -{" "}
          {t("units.silver", { value: f.number(fighterValue(index, fighter)) })}
        </p>
      </header>

      {stats !== null && (
        <div className="mt-2 overflow-x-auto">
          <StatsTable stats={stats} caption={t("campaign.fighter.effectiveStats", { name })} />
        </div>
      )}

      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline font-bold">{t("campaign.fighter.wargear")} </dt>
          <dd className="inline">
            {nameOf(fighter.wargearIds, (id) => index.wargear.get(id)?.name[f.lang])}
          </dd>
        </div>
        <div>
          <dt className="inline font-bold">{t("campaign.fighter.skills")} </dt>
          <dd className="inline">
            {nameOf(
              [...fighter.skillIds, ...fighter.spellIds],
              (id) => (index.skills.get(id)?.skill.name ?? index.spells.get(id)?.spell.name)?.[f.lang],
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        {gainsNoExperience(index, profile) ? (
          <p className="text-sm" data-testid="no-experience">
            <strong>{t("campaign.fighter.experience")}</strong> {t("campaign.fighter.noExperience")}
          </p>
        ) : (
          <div>
            <label htmlFor={xpId} className="block text-sm font-bold">
              {t("campaign.fighter.experience")}
            </label>
            <div className="flex items-center gap-1">
              <input
                id={xpId}
                type="number"
                inputMode="numeric"
                min={0}
                className="field w-24"
                value={fighter.experience}
                onChange={(e) => {
                  onChange({ ...fighter, experience: Math.max(0, Math.trunc(Number(e.target.value) || 0)) });
                }}
              />
              {XP_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className="btn btn-sm"
                  aria-label={t("campaign.fighter.addXp", { count: step, name })}
                  onClick={() => {
                    onChange({ ...fighter, experience: Math.max(0, fighter.experience + step) });
                  }}
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-bold">{t("campaign.fighter.blackRot")}</legend>
          <div className="flex gap-1">
            {[1, 2, 3].map((box) => (
              <label key={box} className="flex items-center">
                <input
                  type="checkbox"
                  className="size-7 accent-ink"
                  checked={fighter.blackRot >= box}
                  aria-label={t("campaign.fighter.blackRotBox", { box, name })}
                  onChange={() => {
                    onChange({ ...fighter, blackRot: fighter.blackRot >= box ? box - 1 : box });
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={statusId} className="block text-sm font-bold">
            {t("campaign.fighter.status")}
          </label>
          <select
            id={statusId}
            className="field"
            value={fighter.status}
            onChange={(e) => {
              onChange({ ...fighter, status: e.target.value as WarbandFighter["status"] });
            }}
          >
            {(["active", "dead", "retired"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`campaign.status.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {canPromote && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={fighter.promotedToLeader}
              onChange={() => {
                onChange({ ...fighter, promotedToLeader: !fighter.promotedToLeader });
              }}
            />
            {t("campaign.fighter.promoted")}
          </label>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer font-bold">
          {t("campaign.fighter.injuriesAndAdvances", { injuries: fighter.injuries.length })}
        </summary>
        <p className="mt-1 text-sm">{t("campaign.fighter.chapter5")}</p>

        <div className="mt-2 space-y-3">
          {fighter.injuries.map((injury, i) => (
            <div key={injury.id} className="border-l-4 border-on-panel pl-2">
              <label className="block text-sm font-bold" htmlFor={`${xpId}-inj-${injury.id}`}>
                {t("campaign.fighter.injury", { n: i + 1 })}
              </label>
              <div className="flex gap-2">
                <input
                  id={`${xpId}-inj-${injury.id}`}
                  className="field"
                  value={injury.text}
                  onChange={(e) => {
                    onChange(updateInjury(fighter, injury.id, { text: e.target.value }));
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    onChange(removeInjury(fighter, injury.id));
                  }}
                >
                  {t("campaign.fighter.removeInjury")}
                </button>
              </div>
              <StatEditor
                label={t("campaign.fighter.injuryEffects")}
                delta={injury.statModifiers}
                onChange={(statModifiers) => {
                  onChange(updateInjury(fighter, injury.id, { statModifiers }));
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              onChange(addInjury(fighter));
            }}
          >
            {t("campaign.fighter.addInjury")}
          </button>

          <StatEditor
            label={t("campaign.fighter.advancements")}
            delta={fighter.statModifiers}
            onChange={(statModifiers) => {
              onChange({ ...fighter, statModifiers });
            }}
          />
        </div>
      </details>

      {fighter.history.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-bold">
            {t("campaign.fighter.history", { count: fighter.history.length })}
          </summary>
          <ul className="mt-1 list-none text-sm">
            {fighter.history.map((h, i) => (
              <li key={`${h.date}-${i}`}>
                {f.date(h.date)} - {h.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
