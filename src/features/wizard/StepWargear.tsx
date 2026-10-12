/*
 * File:        src/features/wizard/StepWargear.tsx
 * Role:        Step 4: wargear. One fighter at a time, only the armoury lists
 *              allowed by the profile, with weapon profiles, traits and prices.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FighterProfile, Wargear, WarbandFighter } from "../../data/schema.ts";
import { fighterWargearCost, wargearPrice, type FactionIndex } from "../../rules/index.ts";
import { formatRange, formatRend, useFormatter } from "../../i18n/text.ts";
import { TraitList } from "../common/TraitList.tsx";
import { fighterLabel } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

const KINDS = ["melee", "ranged", "armour", "item"] as const;

export function StepWargear({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const active = warband.fighters.filter((x) => x.status === "active");
  const [selectedId, setSelectedId] = useState<string | null>(active[0]?.instanceId ?? null);
  const selected = active.find((x) => x.instanceId === selectedId) ?? active[0];

  if (selected === undefined) return <p>{t("wizard.fighters.none")}</p>;
  const profile = index.fighters.get(selected.profileId);
  if (profile === undefined) return null;

  const setGear = (wargearIds: string[]) => {
    update((w) => ({
      ...w,
      fighters: w.fighters.map((x) => (x.instanceId === selected.instanceId ? { ...x, wargearIds } : x)),
    }));
  };
  const name = (x: WarbandFighter) =>
    fighterLabel(x, index.fighters.get(x.profileId)?.name[f.lang] ?? x.profileId);

  return (
    <div className="space-y-5">
      <div role="group" aria-label={t("wizard.wargear.pickFighter")} className="flex flex-wrap gap-1">
        {active.map((x) => (
          <button
            key={x.instanceId}
            type="button"
            aria-pressed={x.instanceId === selected.instanceId}
            className="btn btn-sm aria-pressed:bg-on-panel aria-pressed:text-panel"
            onClick={() => {
              setSelectedId(x.instanceId);
            }}
          >
            {name(x)}
          </button>
        ))}
      </div>

      <section aria-labelledby="carried-heading">
        <h2 id="carried-heading" className="font-gothic text-2xl">
          {t("wizard.wargear.carried", { name: name(selected) })}
        </h2>
        <p className="text-sm">
          {t("wizard.wargear.total", { value: f.number(fighterWargearCost(index, selected)) })}
        </p>
        {selected.wargearIds.length === 0 ? (
          <p>{t("wizard.wargear.nothing")}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2" data-testid="carried-wargear">
            {selected.wargearIds.map((id, i) => {
              const w = index.wargear.get(id);
              const fixed = profile.fixedWargearIds.includes(id);
              const label = w === undefined ? id : f.text(w.name);
              return (
                <li key={`${id}-${i}`} className="flex items-center gap-2 border-2 border-on-panel px-2 py-1">
                  <span>
                    {label} ({t("units.silver", { value: wargearPrice(index, profile, id) })})
                  </span>
                  {!fixed && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={t("wizard.wargear.removeNamed", { name: label })}
                      onClick={() => {
                        setGear(selected.wargearIds.filter((_, j) => j !== i));
                      }}
                    >
                      {t("wizard.wargear.remove")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {profile.allowedWargearLists.length === 0 ? (
        <p>{f.text(profile.wargearText)}</p>
      ) : (
        profile.allowedWargearLists.map((listId) => {
          const list = index.faction.armouryLists.find((l) => l.id === listId);
          if (list === undefined) return null;
          return (
            <section key={list.id} aria-labelledby={`list-${list.id}`}>
              <h2 id={`list-${list.id}`} className="band text-xl">
                {f.text(list.name)}
              </h2>
              {KINDS.map((kind) => {
                const items = list.entries
                  .map((e) => index.wargear.get(e.wargearId))
                  .filter((w): w is Wargear => w !== undefined && w.kind === kind);
                if (items.length === 0) return null;
                return (
                  <WargearTable
                    key={kind}
                    kind={kind}
                    items={items}
                    index={index}
                    profile={profile}
                    onAdd={(id) => {
                      setGear([...selected.wargearIds, id]);
                    }}
                  />
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}

function WargearTable({
  kind,
  items,
  index,
  profile,
  onAdd,
}: {
  kind: (typeof KINDS)[number];
  items: Wargear[];
  index: FactionIndex;
  profile: FighterProfile;
  onAdd: (id: string) => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const weapon = kind === "melee" || kind === "ranged";

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="table-bdc">
        <caption className="py-1 text-left font-bold">{t(`wargearKinds.${kind}`)}</caption>
        <thead>
          <tr>
            <th scope="col">{t("weapon.name")}</th>
            {kind === "ranged" && <th scope="col">{t("weapon.rng")}</th>}
            {weapon && (
              <>
                <th scope="col">{t("weapon.atk")}</th>
                <th scope="col">{t("weapon.rnd")}</th>
                <th scope="col">{t("weapon.dmg")}</th>
                <th scope="col">{t("weapon.crit")}</th>
                <th scope="col">{t("weapon.traits")}</th>
              </>
            )}
            {kind === "armour" && <th scope="col">{t("stats.ar.abbr")}</th>}
            {!weapon && <th scope="col">{t("weapon.rules")}</th>}
            <th scope="col">{t("weapon.cost")}</th>
            <th scope="col">
              <span className="sr-only">{t("wizard.wargear.add")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id}>
              <th scope="row" className="!bg-transparent !text-on-panel font-normal">
                {f.text(w.name)}
              </th>
              {kind === "ranged" && (
                <td>{w.profile === null ? "-" : formatRange(w.profile, t("weapon.flame"))}</td>
              )}
              {weapon && w.profile !== null && (
                <>
                  <td>{f.dice(w.profile.attacks)}</td>
                  <td>{formatRend(w.profile.rend)}</td>
                  <td>{f.dice(w.profile.damage)}</td>
                  <td>{f.dice(w.profile.critDamage)}</td>
                  <td>
                    <TraitList wargear={w} />
                  </td>
                </>
              )}
              {kind === "armour" && <td>{w.armourValue === null ? "-" : `${w.armourValue}+`}</td>}
              {!weapon && (
                <td className="text-xs">
                  {[
                    w.itemKeywords.includes("held-item") ? t("wizard.wargear.held") : null,
                    w.rarity !== null ? t("wizard.wargear.rare", { max: w.rarity }) : null,
                    w.text === null ? null : f.text(w.text),
                  ]
                    .filter((x): x is string => x !== null)
                    .join(" - ") || "-"}
                </td>
              )}
              <td className="whitespace-nowrap">
                {t("units.silver", { value: wargearPrice(index, profile, w.id) })}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-solid btn-sm"
                  aria-label={t("wizard.wargear.addNamed", { name: f.text(w.name) })}
                  onClick={() => {
                    onAdd(w.id);
                  }}
                >
                  {t("wizard.wargear.add")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
