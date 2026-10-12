/*
 * File:        src/features/wizard/StepFighters.tsx
 * Role:        Step 3: recruitment. Category counters, catalogue filtered by
 *              category with the full scroll of each profile, then the recruited
 *              fighters with name (D66 random name), starting experience (roll,
 *              re-roll or manual entry) and removal.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category, FighterProfile, WarbandFighter } from "../../data/schema.ts";
import {
  effectiveCategory,
  manualStartingExperience,
  profileLimit,
  randomName,
  rollStartingExperience,
} from "../../rules/index.ts";
import { gameData } from "../../data/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { StatsTable } from "../common/StatsTable.tsx";
import { Term } from "../common/Term.tsx";
import { createFighter } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

const CATEGORIES: readonly Category[] = ["leader", "champion", "henchman", "brute", "beast"];

export function StepFighters({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const [filter, setFilter] = useState<Category | "all">("all");
  const active = warband.fighters.filter((x) => x.status === "active");
  const composition = index.common.recruitment.composition;

  const countOf = (c: Category) =>
    active.filter((x) => {
      const p = index.fighters.get(x.profileId);
      return p !== undefined && effectiveCategory(x, p) === c;
    }).length;

  const replace = (instanceId: string, patch: Partial<WarbandFighter>) => {
    update((w) => ({
      ...w,
      fighters: w.fighters.map((x) => (x.instanceId === instanceId ? { ...x, ...patch } : x)),
    }));
  };

  const profiles = index.faction.fighters.filter((p) => filter === "all" || p.category === filter);

  return (
    <div className="space-y-6">
      <ul
        className="flex flex-wrap gap-2"
        aria-label={t("wizard.fighters.counters")}
        data-testid="category-counters"
      >
        {CATEGORIES.map((c) => {
          const { min, max } = composition[c];
          const count = countOf(c);
          return (
            <li key={c} className="border-2 border-on-panel px-2 py-1 text-sm">
              {max === null
                ? t("wizard.fighters.counterMin", { count, min, label: t(`categories.${c}_other`) })
                : t("wizard.fighters.counterMax", { count, max, label: t(`categories.${c}_other`) })}
            </li>
          );
        })}
        <li className="border-2 border-on-panel px-2 py-1 text-sm">
          {t("wizard.fighters.counterTotal", {
            count: active.length,
            max: index.common.recruitment.maxFighters,
          })}
        </li>
      </ul>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <section aria-labelledby="catalogue-heading">
          <h2 id="catalogue-heading" className="font-gothic text-2xl">
            {t("wizard.fighters.catalogue")}
          </h2>
          <div role="group" aria-label={t("wizard.fighters.filter")} className="my-2 flex flex-wrap gap-1">
            {(["all", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                className="btn btn-sm aria-pressed:bg-on-panel aria-pressed:text-panel"
                onClick={() => {
                  setFilter(c);
                }}
              >
                {c === "all" ? t("wizard.fighters.all") : t(`categories.${c}_other`)}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {profiles.map((p) => (
              <ProfileEntry
                key={p.id}
                profile={p}
                limit={profileLimit(
                  p,
                  index.faction.origins.find((o) => o.id === warband.originId),
                )}
                onAdd={() => {
                  update((w) => ({ ...w, fighters: [...w.fighters, createFighter(p)] }));
                }}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="roster-heading">
          <h2 id="roster-heading" className="font-gothic text-2xl">
            {t("wizard.fighters.roster", { count: active.length })}
          </h2>
          {active.length === 0 ? (
            <p>{t("wizard.fighters.none")}</p>
          ) : (
            <ul className="space-y-3">
              {active.map((fighter) => {
                const profile = index.fighters.get(fighter.profileId);
                if (profile === undefined) return null;
                return (
                  <RecruitedFighter
                    key={fighter.instanceId}
                    fighter={fighter}
                    profile={profile}
                    onChange={(patch) => {
                      replace(fighter.instanceId, patch);
                    }}
                    onRandomName={() => {
                      replace(fighter.instanceId, {
                        customName: randomName(index.faction.nameTable.entries),
                      });
                    }}
                    onRemove={() => {
                      update((w) => ({
                        ...w,
                        fighters: w.fighters.filter((x) => x.instanceId !== fighter.instanceId),
                      }));
                    }}
                    costLabel={t("units.silver", { value: f.number(profile.cost) })}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileEntry({
  profile,
  limit,
  onAdd,
}: {
  profile: FighterProfile;
  limit: number | null;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const xp = profile.startingExperience;

  return (
    <li className="border-2 border-on-panel">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer">
            <span className="font-gothic text-xl">
              {limit !== null && `0-${limit} `}
              {f.text(profile.name)}
            </span>{" "}
            <span className="text-sm">
              {t(`categories.${profile.category}_one`)} -{" "}
              {t("units.silver", { value: f.number(profile.cost) })}
            </span>
          </summary>
          <div className="mt-2 space-y-2 text-sm">
            <KeywordLine keywords={profile.keywords} />
            <StatsTable stats={profile.stats} caption={f.text(profile.name)} />
            <p>
              <strong>{t("scroll.wargear")}</strong> {f.text(profile.wargearText)}
            </p>
            <p>
              <strong>{t("scroll.startingExperience")}</strong>{" "}
              {xp.dice === null ? xp.base : xp.base === 0 ? f.dice(xp.dice) : `${xp.base}+${f.dice(xp.dice)}`}
            </p>
            {profile.specialRules.map((r) => (
              <p key={r.id}>
                <strong>
                  <Term text={r.name} />
                  {r.tag !== null && ` [${t(`scroll.tag.${r.tag}`)}]`}
                </strong>{" "}
                {f.text(r.text)}
              </p>
            ))}
            {profile.quote !== null && (
              <blockquote className="text-center font-gothic text-lg">"{f.text(profile.quote)}"</blockquote>
            )}
            <p className="text-xs">{t("scroll.source", { page: profile.sourceRef.page })}</p>
          </div>
        </details>
        <button
          type="button"
          className="btn btn-solid btn-sm"
          onClick={onAdd}
          aria-label={t("wizard.fighters.addNamed", { name: f.text(profile.name) })}
        >
          {t("wizard.fighters.add")}
        </button>
      </div>
    </li>
  );
}

function KeywordLine({ keywords }: { keywords: string[] }) {
  const { t } = useTranslation();
  return (
    <p className="italic">
      <span className="sr-only">{t("scroll.keywords")}</span>
      {keywords.map((k, i) => (
        <span key={k}>
          {i > 0 && ", "}
          <KeywordTerm keyword={k} />
        </span>
      ))}
    </p>
  );
}

function KeywordTerm({ keyword }: { keyword: string }) {
  const kw = keywordMap.get(keyword);
  if (kw === undefined) return <span>{keyword}</span>;
  return <Term text={kw} />;
}

const keywordMap = new Map(gameData.common.keywords.map((k) => [k.key, k.name]));

function RecruitedFighter({
  fighter,
  profile,
  onChange,
  onRandomName,
  onRemove,
  costLabel,
}: {
  fighter: WarbandFighter;
  profile: FighterProfile;
  onChange: (patch: Partial<WarbandFighter>) => void;
  onRandomName: () => void;
  onRemove: () => void;
  costLabel: string;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const nameId = useId();
  const dieId = useId();
  const roll = fighter.startingExperienceRoll;
  const label = f.text(profile.name);

  return (
    <li className="border-2 border-on-panel p-3" data-testid="recruited-fighter">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-gothic text-xl">{label}</span>{" "}
          <span className="text-sm">
            {t(`categories.${profile.category}_one`)} - {costLabel}
          </span>
        </p>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onRemove}
          aria-label={t("wizard.fighters.removeNamed", { name: fighter.customName || label })}
        >
          {t("wizard.fighters.remove")}
        </button>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="block text-sm font-bold">
            {t("wizard.fighters.name")}
          </label>
          <div className="flex gap-2">
            <input
              id={nameId}
              className="field"
              value={fighter.customName}
              maxLength={60}
              onChange={(e) => {
                onChange({ customName: e.target.value });
              }}
            />
            <button
              type="button"
              className="btn btn-sm shrink-0"
              onClick={onRandomName}
              aria-label={t("wizard.fighters.randomNameFor", { name: label })}
            >
              {t("wizard.fighters.randomName")}
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold">{t("wizard.fighters.experience")}</p>
          <p data-testid="fighter-xp">
            {roll === null || roll.dice === null
              ? fighter.experience
              : t("wizard.fighters.xpDetail", {
                  base: roll.base,
                  die: f.dice(roll.dice),
                  result: roll.results[0] ?? "-",
                  total: fighter.experience,
                  mode: t(`wizard.fighters.xpMode.${roll.mode}`),
                })}
          </p>
          {profile.startingExperience.dice !== null && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const r = rollStartingExperience(profile);
                  onChange({ startingExperienceRoll: r, experience: r.total });
                }}
              >
                {t("wizard.fighters.reroll")}
              </button>
              <label htmlFor={dieId} className="text-sm">
                {t("wizard.fighters.manualDie")}
              </label>
              <input
                id={dieId}
                type="number"
                inputMode="numeric"
                min={1}
                max={profile.startingExperience.dice === "d3" ? 3 : 6}
                className="field w-20"
                value={roll?.mode === "manual" ? (roll.results[0] ?? "") : ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  try {
                    const r = manualStartingExperience(profile, v);
                    onChange({ startingExperienceRoll: r, experience: r.total });
                  } catch {
                    // Out of range: keep the previous value.
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
