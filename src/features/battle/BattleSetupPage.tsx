/*
 * File:        src/features/battle/BattleSetupPage.tsx
 * Role:        Battle set-up assistant, following "Setting Up the Battle"
 *              (Chapter 2) and the chosen scenario (Chapter 3): the two
 *              warbands and the underdog, the scenario and its twist (rolled or
 *              chosen), the "Before the battle" steps with the battle group
 *              sizes and an optional random split of the fighters, the spells
 *              prepared by the casters, what happens during the battle, the
 *              bonus experience, then the record of the battle in a warband's
 *              battle log or in a group campaign. Opened from the header, a
 *              warband's campaign dashboard ("?warband=<id>") or a group
 *              campaign ("?campaign=<id>").
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { useLiveQuery } from "../../app/useLiveQuery.ts";
import type { Campaign, Warband, WarbandFighter } from "../../data/schema.ts";
import { useGameData } from "../../data/useGameData.ts";
import { db, listWarbands, saveCampaign } from "../../db/database.ts";
import { useFormatter } from "../../i18n/text.ts";
import {
  battleGroupSizes,
  casters,
  d6ToD3,
  findFaction,
  indexFaction,
  prepareSpells,
  rollD6,
  underdog,
  warbandRating,
  type FactionIndex,
  type PreparedSpells,
} from "../../rules/index.ts";
import { addBattle, participantName } from "../groups/groups.ts";
import { Markdown } from "../scenarios/Markdown.tsx";
import { findScenario, scenarioChapter, twistDieSides, type Scenario } from "../scenarios/scenarios.ts";
import { fighterLabel, nowIso } from "../warbands/factory.ts";
import { savePrefill } from "./handoff.ts";

type SideKey = "a" | "b";
const SIDES: SideKey[] = ["a", "b"];

interface SideChoice {
  /** Local warband id, or "" for a warband typed in. */
  warbandId: string;
  /** Group campaign participant, when the battle belongs to a campaign. */
  participantId: string;
  name: string;
  rating: number | null;
  fighters: number;
}

/** Fisher-Yates shuffle on a copy. */
function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** Whole number from 1 to max. */
function randomInt(max: number, random: () => number = Math.random): number {
  return Math.floor(random() * max) + 1;
}

const emptySide = (): SideChoice => ({
  warbandId: "",
  participantId: "",
  name: "",
  rating: null,
  fighters: 0,
});

interface ResolvedSide {
  label: string;
  rating: number | null;
  warband: Warband | undefined;
  index: FactionIndex | undefined;
  fighters: WarbandFighter[];
  fighterCount: number;
}

export function BattleSetupPage({
  warbandId,
  campaignId,
}: {
  warbandId: string | null;
  campaignId: string | null;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const gameData = useGameData();
  const warbands = useLiveQuery(() => listWarbands(db), []);
  const campaign = useLiveQuery(
    async () => (campaignId === null ? null : ((await db.campaigns.get(campaignId)) ?? null)),
    [campaignId],
  );
  const [sides, setSides] = useState<Record<SideKey, SideChoice>>(() => ({
    a: { ...emptySide(), warbandId: warbandId ?? "" },
    b: emptySide(),
  }));
  const [rollOff, setRollOff] = useState<{ a: number; b: number; winner: SideKey } | null>(null);
  const [scenarioNumber, setScenarioNumber] = useState<number | null>(null);
  const [twistRoll, setTwistRoll] = useState<number | null>(null);
  const [groupCounts, setGroupCounts] = useState<Record<SideKey, number | null>>({ a: null, b: null });
  const [assignments, setAssignments] = useState<Record<SideKey, WarbandFighter[][] | null>>({
    a: null,
    b: null,
  });
  const [deployed, setDeployed] = useState<Record<SideKey, number | null>>({ a: null, b: null });
  const [spells, setSpells] = useState<Record<SideKey, Map<string, PreparedSpells> | null>>({
    a: null,
    b: null,
  });
  const [winner, setWinner] = useState<SideKey | "draw">("a");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const formId = useId();

  if (warbands === undefined || gameData === null || (campaignId !== null && campaign === undefined))
    return <p aria-busy="true">{t("wizard.loading")}</p>;
  if (campaignId !== null && campaign === null) return <p role="alert">{t("battle.campaignMissing")}</p>;

  const byId = new Map(warbands.map((w) => [w.id, w]));
  const scenario = scenarioNumber === null ? undefined : findScenario(scenarioNumber);
  const twist = scenario?.twists.find((x) => x.roll === twistRoll);

  const resolve = (key: SideKey): ResolvedSide => {
    const choice = sides[key];
    const participant = campaign?.participants.find((p) => p.id === choice.participantId);
    const localId = participant?.warbandId ?? (choice.warbandId === "" ? null : choice.warbandId);
    const warband = localId === null ? undefined : byId.get(localId);
    if (warband !== undefined) {
      const faction = findFaction(gameData, warband.factionId);
      const index = faction === undefined ? undefined : indexFaction(gameData.common, faction);
      const fighters = warband.fighters.filter((x) => x.status === "active");
      return {
        label: warband.name || t("home.unnamed"),
        rating: index === undefined ? null : warbandRating(index, warband).total,
        warband,
        index,
        fighters,
        fighterCount: fighters.length,
      };
    }
    if (participant !== undefined)
      return {
        label: participantName(participant, byId),
        rating: participant.rating,
        warband: undefined,
        index: undefined,
        fighters: [],
        fighterCount: choice.fighters,
      };
    return {
      label: choice.name,
      rating: choice.rating,
      warband: undefined,
      index: undefined,
      fighters: [],
      fighterCount: choice.fighters,
    };
  };
  const resolved: Record<SideKey, ResolvedSide> = { a: resolve("a"), b: resolve("b") };
  const ready = SIDES.every((k) => resolved[k].label !== "" && resolved[k].rating !== null);
  const ratingA = resolved.a.rating ?? 0;
  const ratingB = resolved.b.rating ?? 0;
  const byRating = ready ? underdog(ratingA, ratingB) : null;
  const underdogSide: SideKey | null = byRating === "tie" ? (rollOff?.winner ?? null) : byRating;

  const patchSide = (key: SideKey, change: Partial<SideChoice>) => {
    setSides((s) => ({ ...s, [key]: { ...s[key], ...change } }));
    setRollOff(null);
    setAssignments((a) => ({ ...a, [key]: null }));
    setSpells((sp) => ({ ...sp, [key]: null }));
  };

  const doRollOff = () => {
    let a = rollD6();
    let b = rollD6();
    while (a === b) {
      a = rollD6();
      b = rollD6();
    }
    setRollOff({ a, b, winner: a > b ? "a" : "b" });
  };

  const pickScenario = (n: number | null) => {
    setScenarioNumber(n);
    setTwistRoll(null);
    setGroupCounts({ a: null, b: null });
    setAssignments({ a: null, b: null });
    setDeployed({ a: null, b: null });
  };

  const groupsFor = (key: SideKey): number => groupCounts[key] ?? scenario?.battleGroups ?? 2;

  const splitAtRandom = (key: SideKey) => {
    const pool = shuffled(resolved[key].fighters);
    const sizes = battleGroupSizes(pool.length, groupsFor(key));
    let start = 0;
    const groups = sizes.map((size) => {
      const g = pool.slice(start, start + size);
      start += size;
      return g;
    });
    setAssignments((a) => ({ ...a, [key]: groups }));
  };

  const nameOf = (index: FactionIndex | undefined, x: WarbandFighter): string =>
    fighterLabel(x, index?.fighters.get(x.profileId)?.name[f.lang] ?? x.profileId);

  const scenarioLabel = (s: Scenario): string => `${s.number}. ${s.title}`;
  const summary = (): string =>
    [
      scenario === undefined ? "" : t("battle.summaryScenario", { scenario: scenarioLabel(scenario) }),
      twist === undefined ? "" : t("battle.summaryTwist", { twist: `${twist.roll} - ${twist.title}` }),
      underdogSide === null ? "" : t("battle.summaryUnderdog", { name: resolved[underdogSide].label }),
    ]
      .filter((x) => x !== "")
      .join(" ");

  const openLog = (key: SideKey) => {
    const warband = resolved[key].warband;
    if (warband === undefined) return;
    const other = resolved[key === "a" ? "b" : "a"];
    savePrefill({
      warbandId: warband.id,
      scenario: scenario === undefined ? "" : scenarioLabel(scenario),
      opponent: other.label,
      notes: summary(),
    });
    navigate({ name: "campaign", id: warband.id });
  };

  const saveToCampaign = async (c: Campaign) => {
    const a = sides.a.participantId;
    const b = sides.b.participantId;
    const updated = addBattle(c, {
      date: nowIso(),
      scenario: scenarioNumber,
      twist: twistRoll,
      participantIds: [a, b],
      underdogId: underdogSide === null ? null : sides[underdogSide].participantId,
      winnerId: winner === "draw" ? null : sides[winner].participantId,
      notes: [summary(), notes].filter((x) => x !== "").join(" "),
    });
    await saveCampaign(db, updated);
    setSaved(true);
    navigate({ name: "groupCampaign", id: c.id });
  };

  const chapter = scenarioChapter();
  const step = (n: number, key: string) => (
    <h2 className="band title-section">
      {n}. {t(`battle.step.${key}`)}
    </h2>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="title-page">{t("battle.title")}</h1>
          {campaign !== null && campaign !== undefined && (
            <p>
              {t("battle.forCampaign")}{" "}
              <a className="underline" href={hrefFor({ name: "groupCampaign", id: campaign.id })}>
                {campaign.name || t("groups.unnamed")}
              </a>
            </p>
          )}
        </div>
        <a className="btn" href={hrefFor({ name: "scenarios", number: null })}>
          {t("battle.reference")}
        </a>
      </header>
      <p className="text-sm text-on-page-muted">{t("battle.intro")}</p>

      {/* 1. Warbands and underdog */}
      <section className="panel-parchment space-y-4 p-4 sm:p-6" aria-label={t("battle.step.warbands")}>
        {step(1, "warbands")}
        <div className="grid gap-4 md:grid-cols-2">
          {SIDES.map((key) => (
            <fieldset key={key} className="space-y-2 border-2 border-on-panel p-3">
              <legend className="px-1 font-bold">{t(`battle.side.${key}`)}</legend>
              {campaign !== null && campaign !== undefined ? (
                <label className="block">
                  <span className="text-sm font-bold">{t("battle.participant")}</span>
                  <select
                    className="field"
                    value={sides[key].participantId}
                    onChange={(e) => {
                      patchSide(key, { participantId: e.target.value });
                    }}
                  >
                    <option value="">{t("battle.choose")}</option>
                    {campaign.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {participantName(p, byId)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-bold">{t("battle.warband")}</span>
                    <select
                      className="field"
                      value={sides[key].warbandId}
                      onChange={(e) => {
                        patchSide(key, { warbandId: e.target.value });
                      }}
                    >
                      <option value="">{t("battle.guest")}</option>
                      {warbands.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name || t("home.unnamed")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {sides[key].warbandId === "" && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block sm:col-span-3">
                        <span className="text-sm font-bold">{t("battle.guestName")}</span>
                        <input
                          className="field"
                          value={sides[key].name}
                          onChange={(e) => {
                            patchSide(key, { name: e.target.value });
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold">{t("battle.guestRating")}</span>
                        <input
                          className="field"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={sides[key].rating ?? ""}
                          onChange={(e) => {
                            patchSide(key, {
                              rating: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                            });
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold">{t("battle.guestFighters")}</span>
                        <input
                          className="field"
                          type="number"
                          min={0}
                          max={15}
                          inputMode="numeric"
                          value={sides[key].fighters}
                          onChange={(e) => {
                            patchSide(key, {
                              fighters: Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                            });
                          }}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
              <p className="text-sm" data-testid={`side-${key}-summary`}>
                {(() => {
                  const rating = resolved[key].rating;
                  return rating === null
                    ? t("battle.noRating")
                    : t("battle.rating", { rating: f.number(rating), count: resolved[key].fighterCount });
                })()}
              </p>
            </fieldset>
          ))}
        </div>
        <div aria-live="polite" data-testid="underdog">
          {!ready && <p>{t("battle.needBoth")}</p>}
          {byRating === "tie" && rollOff === null && (
            <p className="flex flex-wrap items-center gap-3">
              {t("battle.tie")}
              <button type="button" className="btn btn-solid" onClick={doRollOff}>
                {t("battle.rollOff")}
              </button>
            </p>
          )}
          {rollOff !== null && byRating === "tie" && (
            <p>{t("battle.rollOffResult", { a: rollOff.a, b: rollOff.b })}</p>
          )}
          {underdogSide !== null && (
            <p className="font-bold">{t("battle.underdog", { name: resolved[underdogSide].label })}</p>
          )}
        </div>
      </section>

      {/* 2. Scenario */}
      <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-label={t("battle.step.scenario")}>
        {step(2, "scenario")}
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            className="btn btn-solid"
            onClick={() => {
              pickScenario(rollD6());
            }}
          >
            {t("battle.rollScenario")}
          </button>
          <label className="block min-w-64">
            <span className="text-sm font-bold">{t("battle.orChoose")}</span>
            <select
              className="field"
              lang="fr"
              value={scenarioNumber ?? ""}
              onChange={(e) => {
                pickScenario(e.target.value === "" ? null : Number(e.target.value));
              }}
            >
              <option value="">{t("battle.choose")}</option>
              {chapter.scenarios.map((s) => (
                <option key={s.number} value={s.number}>
                  {scenarioLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {scenario !== undefined && (
          <div data-testid="scenario-result">
            <p lang="fr" className="font-hand text-3xl">
              {scenarioLabel(scenario)}{" "}
              <span className="font-body text-sm italic">({scenario.originalTitle})</span>
            </p>
            <Markdown text={scenario.intro} idPrefix="setup-intro" />
            <a className="underline" href={hrefFor({ name: "scenarios", number: scenario.number })}>
              {t("battle.fullScenario")}
            </a>
          </div>
        )}
      </section>

      {scenario !== undefined && (
        <>
          {/* 3. Twist */}
          <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-label={t("battle.step.twist")}>
            {step(3, "twist")}
            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  const sides6 = twistDieSides(scenario);
                  setTwistRoll(sides6 === 3 ? d6ToD3(rollD6()) : rollD6());
                }}
              >
                {t("battle.rollTwist", { die: scenario.twistDie })}
              </button>
              <label className="block min-w-64">
                <span className="text-sm font-bold">{t("battle.orChoose")}</span>
                <select
                  className="field"
                  lang="fr"
                  value={twistRoll ?? ""}
                  onChange={(e) => {
                    setTwistRoll(e.target.value === "" ? null : Number(e.target.value));
                  }}
                >
                  <option value="">{t("battle.choose")}</option>
                  {scenario.twists.map((x) => (
                    <option key={x.roll} value={x.roll}>
                      {x.roll} - {x.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {twist !== undefined && (
              <div data-testid="twist-result" lang="fr">
                <p className="font-bold">
                  {twist.roll} - {twist.title}
                </p>
                <Markdown text={twist.markdown} idPrefix="setup-twist" />
              </div>
            )}
          </section>

          {/* 4. Before the battle */}
          <section className="panel-parchment space-y-4 p-4 sm:p-6" aria-label={t("battle.step.before")}>
            {step(4, "before")}
            {scenario.phases.before
              .filter((s) => !s.title.startsWith("Le Rebondissement"))
              .map((section, i) => (
                <div key={section.title} lang="fr">
                  <h3 className="title-sub">{section.title}</h3>
                  <Markdown text={section.markdown} idPrefix={`setup-before-${i}`} />
                </div>
              ))}
            {scenario.map !== "" && (
              <details className="border-2 border-on-panel p-3">
                <summary className="cursor-pointer font-bold">{t("scenarios.map")}</summary>
                <Markdown text={scenario.map} idPrefix="setup-map" className="mt-2" />
              </details>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {SIDES.map((key) => {
                const side = resolved[key];
                const count = groupsFor(key);
                const sizes = battleGroupSizes(side.fighterCount, count);
                const groups = assignments[key];
                return (
                  <div
                    key={key}
                    className="space-y-2 border-2 border-on-panel p-3"
                    data-testid={`groups-${key}`}
                  >
                    <h3 className="title-sub">
                      {t("battle.groupsOf", { name: side.label || t(`battle.side.${key}`) })}
                    </h3>
                    <label className="flex items-center gap-2">
                      <span className="text-sm">{t("battle.groupCount")}</span>
                      <input
                        className="field w-20"
                        type="number"
                        min={1}
                        max={6}
                        value={count}
                        onChange={(e) => {
                          const n = Math.min(6, Math.max(1, Math.trunc(Number(e.target.value) || 1)));
                          setGroupCounts((g) => ({ ...g, [key]: n }));
                          setAssignments((a) => ({ ...a, [key]: null }));
                          setDeployed((d) => ({ ...d, [key]: null }));
                        }}
                      />
                    </label>
                    {scenario.battleGroups === null && (
                      <p className="text-sm italic">{t("battle.groupsByText")}</p>
                    )}
                    <p>{t("battle.groupSizes", { count: side.fighterCount, sizes: sizes.join(" / ") })}</p>
                    <div className="flex flex-wrap gap-2">
                      {side.fighters.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            splitAtRandom(key);
                          }}
                        >
                          {t("battle.split")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setDeployed((d) => ({ ...d, [key]: randomInt(count) }));
                        }}
                      >
                        {t("battle.drawGroup")}
                      </button>
                    </div>
                    {deployed[key] !== null && (
                      <p aria-live="polite" className="font-bold">
                        {t("battle.groupDrawn", { group: deployed[key] })}
                      </p>
                    )}
                    {groups !== null && (
                      <ol className="space-y-1 text-sm">
                        {groups.map((g, i) => (
                          <li key={i}>
                            <strong>{t("battle.group", { group: i + 1 })}</strong>{" "}
                            {g.map((x) => nameOf(side.index, x)).join(", ") || "-"}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Prepared spells */}
          <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-label={t("battle.step.spells")}>
            {step(5, "spells")}
            <p className="text-sm">{t("battle.spellsRule")}</p>
            {SIDES.map((key) => {
              const side = resolved[key];
              if (side.index === undefined) return null;
              const index = side.index;
              const list = casters(index, side.fighters);
              const prepared = spells[key];
              return (
                <div key={key} className="space-y-2">
                  <h3 className="title-sub">{side.label}</h3>
                  {list.length === 0 ? (
                    <p className="text-sm">{t("battle.noCaster")}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setSpells((sp) => ({
                            ...sp,
                            [key]: new Map(list.map((x) => [x.instanceId, prepareSpells(index, x)])),
                          }));
                        }}
                      >
                        {t("battle.rollSpells")}
                      </button>
                      <ul className="space-y-1 text-sm" data-testid={`spells-${key}`}>
                        {list.map((x) => {
                          const p = prepared?.get(x.instanceId) ?? prepareSpells(index, x, () => 0);
                          return (
                            <li key={x.instanceId}>
                              <strong>{nameOf(index, x)}</strong>{" "}
                              {t("battle.signature", {
                                spells: p.signature.map((s) => f.text(s.name)).join(", ") || "-",
                              })}
                              {prepared !== null &&
                                p.rolls.map((r) => (
                                  <span key={r.loreId}>
                                    {" "}
                                    {r.spell === undefined
                                      ? t("battle.spellRoll", { roll: r.roll, spell: "-" })
                                      : r.noEffect
                                        ? t("battle.spellNoEffect", {
                                            roll: r.roll,
                                            spell: f.text(r.spell.name),
                                          })
                                        : t("battle.spellRoll", {
                                            roll: r.roll,
                                            spell: f.text(r.spell.name),
                                          })}
                                  </span>
                                ))}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
            {SIDES.every((k) => resolved[k].index === undefined) && (
              <p className="text-sm">{t("battle.spellsGuest")}</p>
            )}
          </section>

          {/* 6. During the battle */}
          <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-label={t("battle.step.during")}>
            {step(6, "during")}
            {scenario.reinforcementRounds.length > 0 && (
              <p className="font-bold">
                {t("battle.reinforcements", { rounds: scenario.reinforcementRounds.join(" / ") })}
              </p>
            )}
            {scenario.phases.during.map((section, i) => (
              <div key={section.title} lang="fr">
                <h3 className="title-sub">{section.title}</h3>
                <Markdown text={section.markdown} idPrefix={`setup-during-${i}`} />
              </div>
            ))}
          </section>

          {/* 7. After the battle */}
          <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-label={t("battle.step.after")}>
            {step(7, "after")}
            {scenario.phases.campaign.map((section, i) => (
              <div key={section.title} lang="fr">
                <h3 className="title-sub">{section.title}</h3>
                <Markdown text={section.markdown} idPrefix={`setup-after-${i}`} />
              </div>
            ))}
            {campaign !== null && campaign !== undefined ? (
              <form
                aria-labelledby={`${formId}-title`}
                className="space-y-3 border-2 border-on-panel p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveToCampaign(campaign);
                }}
              >
                <h3 id={`${formId}-title`} className="title-sub">
                  {t("battle.recordCampaign")}
                </h3>
                <fieldset>
                  <legend className="text-sm font-bold">{t("battle.winner")}</legend>
                  <div className="flex flex-wrap gap-4">
                    {[...SIDES, "draw" as const].map((key) => (
                      <label key={key} className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name={`${formId}-winner`}
                          className="size-5"
                          checked={winner === key}
                          onChange={() => {
                            setWinner(key);
                          }}
                        />
                        {key === "draw" ? t("battle.draw") : resolved[key].label || t(`battle.side.${key}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="text-sm font-bold">{t("battle.notes")}</span>
                  <textarea
                    className="field min-h-20"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-solid"
                  disabled={
                    saved ||
                    sides.a.participantId === "" ||
                    sides.b.participantId === "" ||
                    sides.a.participantId === sides.b.participantId
                  }
                >
                  {t("battle.save")}
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {SIDES.map((key) =>
                  resolved[key].warband === undefined ? null : (
                    <button
                      key={key}
                      type="button"
                      className="btn btn-solid"
                      onClick={() => {
                        openLog(key);
                      }}
                    >
                      {t("battle.openLog", { name: resolved[key].label })}
                    </button>
                  ),
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
