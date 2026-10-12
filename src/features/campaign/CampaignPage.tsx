/*
 * File:        src/features/campaign/CampaignPage.tsx
 * Role:        Campaign dashboard (screen 3): overview with rating and
 *              counters, fighters, stronghold and holdings, stash, battle log
 *              and notes. Every change is saved at once and the warband is
 *              checked in campaign mode.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { gameData } from "../../data/index.ts";
import type { Warband } from "../../data/schema.ts";
import {
  battleLogTotals,
  findFaction,
  indexFaction,
  validateWarband,
  warbandRating,
  type FactionIndex,
} from "../../rules/index.ts";
import { hrefFor, navigate } from "../../app/router.ts";
import { useFormatter } from "../../i18n/text.ts";
import { useWizard } from "../../store/wizard.ts";
import { DiagnosticsPanel } from "../wizard/DiagnosticsPanel.tsx";
import { BattleLog } from "./BattleLog.tsx";
import { ShareButton } from "../share/ShareButton.tsx";
import { FighterCard } from "./FighterCard.tsx";
import {
  MAX_HOLDINGS,
  addHolding,
  addStashItem,
  patchFighter,
  removeHolding,
  removeStashItem,
  updateHolding,
} from "./campaign.ts";

const BASE = import.meta.env.BASE_URL;
type Update = (change: (w: Warband) => Warband) => void;

export function CampaignPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const { warband, load, update } = useWizard();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (warband?.id === id) return;
    void load(id).then((found) => {
      setMissing(!found);
    });
  }, [id, warband?.id, load]);

  const faction = warband === null ? undefined : findFaction(gameData, warband.factionId);
  const index = useMemo(
    () => (faction === undefined ? null : indexFaction(gameData.common, faction)),
    [faction],
  );
  const diagnostics = useMemo(
    () => (warband === null ? [] : validateWarband(warband, gameData, "campaign")),
    [warband],
  );

  if (missing)
    return (
      <section className="panel-parchment p-6 text-center">
        <p>{t("wizard.notFound")}</p>
        <a className="btn btn-solid mt-4" href={hrefFor({ name: "home" })}>
          {t("wizard.backHome")}
        </a>
      </section>
    );
  if (warband?.id !== id || index === null) return <p aria-busy="true">{t("wizard.loading")}</p>;

  const active = warband.fighters.filter((x) => x.status === "active");
  const gone = warband.fighters.filter((x) => x.status !== "active");

  return (
    <div className="space-y-4">
      <Overview warband={warband} index={index} update={update} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="fighters-heading" className="panel-parchment space-y-3 p-4">
            <h2 id="fighters-heading" className="band text-2xl">
              {t("campaign.fighters", { count: active.length })}
            </h2>
            {active.map((x) => (
              <FighterCard
                key={x.instanceId}
                fighter={x}
                warband={warband}
                index={index}
                onChange={(next) => {
                  update((w) => patchFighter(w, x.instanceId, next));
                }}
              />
            ))}
            <a className="btn" href={hrefFor({ name: "wizard", id: warband.id })}>
              {t("campaign.editRoster")}
            </a>
            {gone.length > 0 && (
              <details>
                <summary className="cursor-pointer font-bold">
                  {t("campaign.gone", { count: gone.length })}
                </summary>
                <div className="mt-2 space-y-3">
                  {gone.map((x) => (
                    <FighterCard
                      key={x.instanceId}
                      fighter={x}
                      warband={warband}
                      index={index}
                      onChange={(next) => {
                        update((w) => patchFighter(w, x.instanceId, next));
                      }}
                    />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="panel-parchment p-4">
            <BattleLog warband={warband} index={index} update={update} />
          </section>

          <Holdings warband={warband} index={index} update={update} />
          <Stash warband={warband} index={index} update={update} />

          <section aria-labelledby="notes-heading" className="panel-parchment p-4">
            <h2 id="notes-heading" className="band text-2xl">
              {t("campaign.notes")}
            </h2>
            <textarea
              aria-labelledby="notes-heading"
              className="field mt-2 min-h-32"
              value={warband.notes}
              onChange={(e) => {
                const notes = e.target.value;
                update((w) => ({ ...w, notes }));
              }}
            />
          </section>
        </div>
        <DiagnosticsPanel diagnostics={diagnostics} warband={warband} index={index} />
      </div>
      <p className="text-center">
        <button
          type="button"
          className="btn border-on-page"
          onClick={() => {
            navigate({ name: "home" });
          }}
        >
          {t("wizard.backHome")}
        </button>
      </p>
    </div>
  );
}

function Overview({ warband, index, update }: { warband: Warband; index: FactionIndex; update: Update }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const rating = warbandRating(index, warband);
  const origin = index.faction.origins.find((o) => o.id === warband.originId);
  const stronghold = index.faction.strongholds.find((s) => s.id === warband.strongholdId);
  const totals = battleLogTotals(warband.battleLog);
  const counters = ["battlesFought", "victories", "holdingsRansacked", "fightersLost"] as const;

  return (
    <section aria-labelledby="overview-heading" className="panel-parchment p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <img src={`${BASE}images/${index.faction.assets.shield}`} alt="" className="h-20 w-auto" />
        <div className="min-w-0 flex-1">
          <h1 id="overview-heading" className="font-gothic text-4xl">
            {warband.name.trim() === "" ? t("home.unnamed") : warband.name}
          </h1>
          <p className="no-print mt-1 flex flex-wrap gap-2">
            <a className="btn btn-sm" href={hrefFor({ name: "print", id: warband.id })}>
              {t("home.print")}
            </a>
            <ShareButton warband={warband} small />
          </p>
          <p className="text-sm">
            {f.text(index.faction.name)} - {origin === undefined ? "-" : f.text(origin.name)} -{" "}
            {t(`campaign.mode.${warband.mode}`)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
          <dt className="text-sm">{t("budget.rating")}</dt>
          <dd className="font-gothic text-3xl" data-testid="campaign-rating">
            {f.number(rating.total)}
          </dd>
          <dt className="text-sm">{t("campaign.ratingDetail")}</dt>
          <dd className="text-sm">
            {t("campaign.ratingParts", { cost: f.number(rating.cost), xp: f.number(rating.experience) })}
          </dd>
        </dl>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          label={t("campaign.stash.silver")}
          value={warband.stash.silver}
          testId="stash-silver"
          onChange={(silver) => {
            update((w) => ({ ...w, stash: { ...w.stash, silver } }));
          }}
        />
        <NumberField
          label={t("campaign.stash.leechJars")}
          value={warband.stash.leechJars}
          onChange={(leechJars) => {
            update((w) => ({ ...w, stash: { ...w.stash, leechJars } }));
          }}
        />
        {stronghold?.trackers.map((tr) => (
          <NumberField
            key={tr.id}
            label={f.text(tr.name)}
            value={warband.strongholdTrackers[tr.id] ?? 0}
            onChange={(v) => {
              update((w) => ({ ...w, strongholdTrackers: { ...w.strongholdTrackers, [tr.id]: v } }));
            }}
          />
        ))}
      </div>

      <fieldset className="mt-4">
        <legend className="font-bold">{t("campaign.counters.title")}</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counters.map((c) => (
            <NumberField
              key={c}
              label={t(`campaign.counters.${c}`)}
              value={warband.counters[c]}
              testId={`counter-${c}`}
              hint={
                totals[c] !== warband.counters[c]
                  ? t("campaign.counters.fromLog", { value: totals[c] })
                  : undefined
              }
              onChange={(v) => {
                update((w) => ({ ...w, counters: { ...w.counters, [c]: v } }));
              }}
            />
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  testId,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testId?: string;
  hint?: string | undefined;
}) {
  const id = useId();
  const { t } = useTranslation();
  const set = (v: number) => {
    onChange(Math.max(0, Math.trunc(v)));
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn btn-sm"
          aria-label={t("campaign.decrease", { label })}
          onClick={() => {
            set(value - 1);
          }}
        >
          -
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          className="field w-24 text-center"
          value={value}
          data-testid={testId}
          onChange={(e) => {
            set(Number(e.target.value) || 0);
          }}
        />
        <button
          type="button"
          className="btn btn-sm"
          aria-label={t("campaign.increase", { label })}
          onClick={() => {
            set(value + 1);
          }}
        >
          +
        </button>
      </div>
      {hint !== undefined && <p className="text-xs">{hint}</p>}
    </div>
  );
}

function Holdings({ warband, index, update }: { warband: Warband; index: FactionIndex; update: Update }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const stronghold = index.faction.strongholds.find((s) => s.id === warband.strongholdId);

  return (
    <section aria-labelledby="holdings-heading" className="panel-parchment space-y-3 p-4">
      <h2 id="holdings-heading" className="band text-2xl">
        {t("campaign.holdings.title")}
      </h2>
      {stronghold !== undefined && (
        <div className="border-2 border-on-panel p-3">
          <p>
            <strong>{t("wizard.origin.stronghold")}</strong>{" "}
            <span className="font-gothic text-xl">{f.text(stronghold.name)}</span> (
            {t("wizard.origin.income", { income: f.dice(stronghold.income) })})
          </p>
          {stronghold.rules.map((r) => (
            <p key={r.id} className="text-sm">
              <strong>{f.text(r.name)}</strong> {f.text(r.text)}
            </p>
          ))}
        </div>
      )}
      <p className="text-sm">{t("campaign.holdings.chapter5")}</p>
      <ol className="space-y-2">
        {warband.holdings.map((h, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input
              className="field"
              aria-label={t("campaign.holdings.label", { n: i + 1 })}
              placeholder={t("campaign.holdings.label", { n: i + 1 })}
              value={h.label}
              onChange={(e) => {
                const label = e.target.value;
                update((w) => updateHolding(w, i, { label }));
              }}
            />
            <input
              className="field"
              aria-label={t("campaign.holdings.notes", { n: i + 1 })}
              placeholder={t("campaign.holdings.notes", { n: i + 1 })}
              value={h.notes}
              onChange={(e) => {
                const notes = e.target.value;
                update((w) => updateHolding(w, i, { notes }));
              }}
            />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                update((w) => removeHolding(w, i));
              }}
            >
              {t("campaign.holdings.remove")}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-sm"
        disabled={warband.holdings.length >= MAX_HOLDINGS}
        onClick={() => {
          update(addHolding);
        }}
      >
        {t("campaign.holdings.add", { count: warband.holdings.length, max: MAX_HOLDINGS })}
      </button>
    </section>
  );
}

function Stash({ warband, index, update }: { warband: Warband; index: FactionIndex; update: Update }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const [choice, setChoice] = useState("");
  const [label, setLabel] = useState("");
  const selectId = useId();
  const purchasable = index.faction.wargear.filter((w) => w.purchasable);

  return (
    <section aria-labelledby="stash-heading" className="panel-parchment space-y-3 p-4">
      <h2 id="stash-heading" className="band text-2xl">
        {t("campaign.stash.title")}
      </h2>
      {warband.stash.items.length === 0 ? (
        <p>{t("campaign.stash.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {warband.stash.items.map((item, i) => {
            const name =
              item.wargearId === null
                ? item.label
                : (index.wargear.get(item.wargearId)?.name[f.lang] ?? item.wargearId);
            return (
              <li
                key={`${item.wargearId ?? item.label}-${i}`}
                className="flex items-center gap-2 border-2 border-on-panel px-2 py-1"
              >
                <span>{t("campaign.stash.item", { name, count: item.quantity })}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={t("campaign.stash.removeNamed", { name })}
                  onClick={() => {
                    update((w) => removeStashItem(w, i));
                  }}
                >
                  -
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={selectId} className="block text-sm font-bold">
            {t("campaign.stash.addWargear")}
          </label>
          <select
            id={selectId}
            className="field"
            value={choice}
            onChange={(e) => {
              setChoice(e.target.value);
            }}
          >
            <option value="">{t("campaign.stash.pick")}</option>
            {purchasable.map((w) => (
              <option key={w.id} value={w.id}>
                {f.text(w.name)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          disabled={choice === ""}
          onClick={() => {
            update((w) => addStashItem(w, choice, ""));
            setChoice("");
          }}
        >
          {t("campaign.stash.add")}
        </button>
        <label className="block">
          <span className="block text-sm font-bold">{t("campaign.stash.other")}</span>
          <input
            className="field"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-sm"
          disabled={label.trim() === ""}
          onClick={() => {
            const l = label.trim();
            update((w) => addStashItem(w, null, l));
            setLabel("");
          }}
        >
          {t("campaign.stash.add")}
        </button>
      </div>
    </section>
  );
}
