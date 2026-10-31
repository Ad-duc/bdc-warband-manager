/*
 * File:        src/features/wizard/StepWargear.tsx
 * Role:        Step 4: wargear. One fighter at a time (picked by name, with
 *              its category under it), only the armoury lists allowed by the
 *              profile, with weapon profiles, traits and prices. Each kind
 *              of wargear (melee, ranged, armour, items) is a collapsible
 *              menu; open menus stay open when another fighter is picked.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Wargear, WarbandFighter } from "../../data/schema.ts";
import { effectiveCategory, fighterWargearCost, wargearPrice } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { Collapsible } from "../common/Collapsible.tsx";
import { WargearTable } from "../common/WargearTable.tsx";
import { WARGEAR_KINDS } from "../common/wargear-kinds.ts";
import { fighterLabel } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

export function StepWargear({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const active = warband.fighters.filter((x) => x.status === "active");
  const [selectedId, setSelectedId] = useState<string | null>(active[0]?.instanceId ?? null);
  const selected = active.find((x) => x.instanceId === selectedId) ?? active[0];
  /* Open menus ("<list>:<kind>"), kept when another fighter is picked. */
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  const setGroupOpen = (key: string, open: boolean): void => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  };

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
  /** Category shown under the name: Chef, Champion, Homme de main... */
  const category = (x: WarbandFighter): string => {
    const p = index.fighters.get(x.profileId);
    return p === undefined ? "" : t(`categories.${effectiveCategory(x, p)}_one`);
  };

  return (
    <div className="space-y-5">
      <div role="group" aria-label={t("wizard.wargear.pickFighter")} className="flex flex-wrap gap-1">
        {active.map((x) => (
          <button
            key={x.instanceId}
            type="button"
            aria-pressed={x.instanceId === selected.instanceId}
            className="btn btn-sm flex-col !gap-0 py-1 leading-tight aria-pressed:bg-on-panel aria-pressed:text-panel"
            onClick={() => {
              setSelectedId(x.instanceId);
            }}
          >
            <span>{name(x)}</span>
            <span className="text-xs font-normal">{category(x)}</span>
          </button>
        ))}
      </div>

      <section aria-labelledby="carried-heading">
        <h2 id="carried-heading" className="title-section">
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
              <h2 id={`list-${list.id}`} className="band title-section">
                {f.text(list.name)}
              </h2>
              <div className="grid gap-x-6 min-[100rem]:grid-cols-2 min-[100rem]:items-start">
                {WARGEAR_KINDS.map((kind) => {
                  const items = list.entries
                    .map((e) => index.wargear.get(e.wargearId))
                    .filter((w): w is Wargear => w !== undefined && w.kind === kind);
                  if (items.length === 0) return null;
                  const key = `${list.id}:${kind}`;
                  return (
                    <Collapsible
                      key={kind}
                      className="mt-2"
                      open={openGroups.has(key)}
                      onOpenChange={(open) => {
                        setGroupOpen(key, open);
                      }}
                      summary={t("wizard.wargear.group", {
                        kind: t(`wargearKinds.${kind}`),
                        n: items.length,
                      })}
                    >
                      <WargearTable
                        kind={kind}
                        items={items}
                        price={(w) => wargearPrice(index, profile, w.id)}
                        onAdd={(id) => {
                          setGear([...selected.wargearIds, id]);
                        }}
                      />
                    </Collapsible>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
