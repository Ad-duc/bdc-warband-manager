/*
 * File:        src/features/wizard/StepFighters.tsx
 * Role:        Step 3: recruitment. Category counters, catalogue filtered by
 *              category with the full scroll of each profile, then the recruited
 *              fighters with name (D66 random name, male or female), starting experience (roll,
 *              re-roll or manual entry), options bought at recruitment
 *              (Misbegotten mutations) and removal. Alternate forms (Lycanfell
 *              Beast) are shown inside the scroll of their base profile. Long
 *              special rules are cut to three lines with a "read more" toggle.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category, FighterProfile, WarbandFighter } from "../../data/schema.ts";
import {
  effectiveCategory,
  fighterOptions,
  formsOf,
  isUncapped,
  manualStartingExperience,
  profileLimit,
  randomEpithet,
  recruitBlockers,
  rollStartingExperience,
  type RecruitBlocker,
} from "../../rules/index.ts";
import { gameData } from "../../data/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { ClampedText } from "../common/ClampedText.tsx";
import { GenderToggle } from "../names/GenderToggle.tsx";
import { randomFighterName, type NameGender } from "../names/houseNames.ts";
import { StatsTable } from "../common/StatsTable.tsx";
import { Term } from "../common/Term.tsx";
import { createFighter } from "../warbands/factory.ts";
import type { FactionIndex } from "../../rules/index.ts";
import type { StepProps } from "./WizardPage.tsx";

const CATEGORIES: readonly Category[] = ["leader", "champion", "henchman", "brute", "beast"];

export function StepFighters({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const [filter, setFilter] = useState<Category | "all">("all");
  const active = warband.fighters.filter((x) => x.status === "active");
  const composition = index.common.recruitment.composition;
  const origin = index.faction.origins.find((o) => o.id === warband.originId);

  // Fighters taken out of their category limit by the origin (Dire Wolves) are not counted.
  const countOf = (c: Category) =>
    active.filter((x) => {
      const p = index.fighters.get(x.profileId);
      return p !== undefined && effectiveCategory(x, p) === c && !isUncapped(p, origin);
    }).length;

  const replace = (instanceId: string, patch: Partial<WarbandFighter>) => {
    update((w) => ({
      ...w,
      fighters: w.fighters.map((x) => (x.instanceId === instanceId ? { ...x, ...patch } : x)),
    }));
  };

  const profiles = index.faction.fighters.filter(
    (p) => p.formOf === null && (filter === "all" || p.category === filter),
  );

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
          <h2 id="catalogue-heading" className="font-hand text-2xl">
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
                limit={profileLimit(p, origin)}
                blocker={recruitBlockers(index, warband, p, origin)[0] ?? null}
                index={index}
                forms={formsOf(index, p.id)}
                onAdd={() => {
                  update((w) => ({ ...w, fighters: [...w.fighters, createFighter(p)] }));
                }}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="roster-heading">
          <h2 id="roster-heading" className="font-hand text-2xl">
            {t("wizard.fighters.roster", { count: active.length })}
          </h2>
          {active.length === 0 ? (
            <p>{t("wizard.fighters.none")}</p>
          ) : (
            <>
              <p className="mb-2 text-sm">
                {t(index.faction.id === "death-covens" ? "names.femaleBookNote" : "names.femaleHouseNote")}
              </p>
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
                      onRandomName={(gender) => {
                        replace(fighter.instanceId, {
                          customName: randomFighterName(
                            index.faction.id,
                            index.faction.nameTable.entries,
                            gender,
                          ),
                        });
                      }}
                      onRandomEpithet={
                        index.faction.epithetTable === null
                          ? null
                          : () => {
                              const epithet = randomEpithet(index.faction.epithetTable?.entries);
                              if (epithet === undefined) return;
                              const base = fighter.customName.trim();
                              replace(fighter.instanceId, {
                                customName: base === "" ? f.text(epithet) : `${base}, ${f.text(epithet)}`,
                              });
                            }
                      }
                      onRemove={() => {
                        update((w) => ({
                          ...w,
                          fighters: w.fighters.filter((x) => x.instanceId !== fighter.instanceId),
                        }));
                      }}
                      costLabel={t("units.silver", {
                        value: f.number(
                          profile.cost + fighterOptions(index, fighter).reduce((sum, o) => sum + o.cost, 0),
                        ),
                      })}
                      index={index}
                    />
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileEntry({
  profile,
  limit,
  forms,
  blocker,
  index,
  onAdd,
}: {
  profile: FighterProfile;
  limit: number | null;
  forms: FighterProfile[];
  /** First rule that forbids one more fighter of this profile, or null. */
  blocker: RecruitBlocker | null;
  index: FactionIndex;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const reasonId = useId();
  const reason = blocker === null ? null : blockerText(blocker);

  function blockerText(b: RecruitBlocker): string {
    switch (b.code) {
      case "maxFighters":
        return t("wizard.fighters.blocked.maxFighters", { max: b.max });
      case "leaderTaken":
        return t("wizard.fighters.blocked.leaderTaken");
      case "leaderOrigin": {
        const expected = index.fighters.get(b.expected);
        return t("wizard.fighters.blocked.leaderOrigin", {
          name: expected === undefined ? b.expected : f.text(expected.name),
        });
      }
      case "categoryMax":
        return t("wizard.fighters.blocked.categoryMax", {
          max: b.max,
          label: t(`categories.${b.category}_other`),
        });
      case "profileLimit":
        return t("wizard.fighters.blocked.profileLimit", { max: b.max });
      case "budget":
        return t("wizard.fighters.blocked.budget", {
          cost: f.number(b.cost),
          remaining: f.number(b.remaining),
        });
    }
  }

  return (
    <li className="border-2 border-on-panel">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer">
            <span className="font-hand text-xl">
              {limit !== null && `0-${limit} `}
              {f.text(profile.name)}
            </span>{" "}
            <span className="text-sm">
              {t(`categories.${profile.category}_one`)} -{" "}
              {t("units.silver", { value: f.number(profile.cost) })}
            </span>
          </summary>
          <div className="mt-2 space-y-2 text-sm">
            <ScrollBody profile={profile} />
            {forms.map((form) => (
              <section key={form.id} className="border-t-2 border-on-panel pt-2" data-testid="profile-form">
                <h3 className="font-hand text-lg">{t("scroll.form", { name: f.text(form.name) })}</h3>
                <ScrollBody profile={form} />
              </section>
            ))}
          </div>
        </details>
        <button
          type="button"
          className="btn btn-solid btn-sm"
          onClick={onAdd}
          disabled={reason !== null}
          aria-describedby={reason === null ? undefined : reasonId}
          aria-label={t("wizard.fighters.addNamed", { name: f.text(profile.name) })}
        >
          {t("wizard.fighters.add")}
        </button>
        {reason !== null && (
          <p id={reasonId} className="w-full text-right text-sm italic" data-testid="recruit-blocked">
            {reason}
          </p>
        )}
      </div>
    </li>
  );
}

/** Keywords, characteristics, wargear, experience, options, rules and quote of a scroll. */
function ScrollBody({ profile }: { profile: FighterProfile }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const xp = profile.startingExperience;
  return (
    <>
      <KeywordLine keywords={profile.keywords} />
      <StatsTable stats={profile.stats} caption={f.text(profile.name)} />
      <p>
        <strong>{t("scroll.wargear")}</strong> {f.text(profile.wargearText)}
      </p>
      {profile.formOf === null && (
        <p>
          <strong>{t("scroll.startingExperience")}</strong>{" "}
          {xp.dice === null ? xp.base : xp.base === 0 ? f.dice(xp.dice) : `${xp.base}+${f.dice(xp.dice)}`}
        </p>
      )}
      {profile.specialRules.map((r) => (
        <div key={r.id} className="flex flex-col">
          <ClampedText className="whitespace-pre-line" watch={f.text(r.text)}>
            <strong>
              <Term text={r.name} />
              {r.tag !== null && ` [${t(`scroll.tag.${r.tag}`)}]`}
            </strong>{" "}
            {f.text(r.text)}
          </ClampedText>
        </div>
      ))}
      {profile.options?.choices.map((o) => (
        <p key={o.id} className="pl-4">
          <strong>
            <Term text={o.name} />
          </strong>{" "}
          ({t("units.silverPlus", { value: f.number(o.cost) })}) {f.text(o.text)}
        </p>
      ))}
      {profile.quote !== null && (
        <blockquote className="text-center font-hand text-lg">"{f.text(profile.quote)}"</blockquote>
      )}
      <p className="text-xs">{t("scroll.source", { page: profile.sourceRef.page })}</p>
    </>
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
  onRandomEpithet,
  onRemove,
  costLabel,
  index,
}: {
  fighter: WarbandFighter;
  profile: FighterProfile;
  onChange: (patch: Partial<WarbandFighter>) => void;
  onRandomName: (gender: NameGender) => void;
  /** null when the faction has no epithet table. */
  onRandomEpithet: (() => void) | null;
  onRemove: () => void;
  costLabel: string;
  index: FactionIndex;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const nameId = useId();
  const dieId = useId();
  const [gender, setGender] = useState<NameGender>("male");
  const roll = fighter.startingExperienceRoll;
  const label = f.text(profile.name);

  return (
    <li className="border-2 border-on-panel p-3" data-testid="recruited-fighter">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-hand text-xl">{label}</span>{" "}
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
          <div className="flex flex-wrap gap-2">
            <input
              id={nameId}
              className="field min-w-0 flex-1 basis-40"
              value={fighter.customName}
              maxLength={60}
              onChange={(e) => {
                onChange({ customName: e.target.value });
              }}
            />
            <GenderToggle value={gender} onChange={setGender} fighterLabel={label} />
            <button
              type="button"
              className="btn btn-sm shrink-0"
              onClick={() => {
                onRandomName(gender);
              }}
              aria-label={t("wizard.fighters.randomNameFor", { name: label })}
            >
              {t("wizard.fighters.randomName")}
            </button>
            {onRandomEpithet !== null && (
              <button
                type="button"
                className="btn btn-sm shrink-0"
                onClick={onRandomEpithet}
                aria-label={t("wizard.fighters.randomEpithetFor", { name: label })}
              >
                {t("wizard.fighters.randomEpithet")}
              </button>
            )}
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

      {profile.options !== null && (
        <OptionsPicker
          fighter={fighter}
          profile={profile}
          index={index}
          onChange={(optionIds) => {
            onChange({ optionIds });
          }}
        />
      )}
    </li>
  );
}

/** Options bought at recruitment, at most `options.max` of them. */
function OptionsPicker({
  fighter,
  profile,
  index,
  onChange,
}: {
  fighter: WarbandFighter;
  profile: FighterProfile;
  index: FactionIndex;
  onChange: (optionIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const options = profile.options;
  if (options === null) return null;
  const picked = fighterOptions(index, fighter).map((o) => o.id);
  return (
    <fieldset className="mt-3">
      <legend className="text-sm font-bold">
        {t("wizard.fighters.options", { picked: picked.length, max: options.max })}
      </legend>
      <ul className="mt-1 space-y-1">
        {options.choices.map((o) => {
          const on = picked.includes(o.id);
          return (
            <li key={o.id}>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0"
                  checked={on}
                  disabled={!on && picked.length >= options.max}
                  onChange={() => {
                    onChange(on ? picked.filter((id) => id !== o.id) : [...picked, o.id]);
                  }}
                />
                <span>
                  <strong>{f.text(o.name)}</strong> ({t("units.silverPlus", { value: f.number(o.cost) })}){" "}
                  <span className="text-sm">{f.text(o.text)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
