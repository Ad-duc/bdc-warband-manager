/*
 * File:        src/features/compendium/CompendiumPage.tsx
 * Role:        Compendium screen ("#/compendium", header button): every
 *              skill, signature spell, weapon, armour and item of the game
 *              data, grouped in collapsible menus (skills, spells, melee
 *              weapons, ranged weapons, armour, items) and, inside each menu,
 *              by faction. A faction filter narrows the lists; the common
 *              skill tables are shown whatever the faction. Wargear is the
 *              content of the armoury lists of each faction, at the
 *              reference prices of the profile tables. Read only.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { gameData } from "../../data/index.ts";
import type { FactionData, SkillTable, Wargear } from "../../data/schema.ts";
import { useFormatter } from "../../i18n/text.ts";
import { Collapsible } from "../common/Collapsible.tsx";
import { SpellCasting, SpellExtra } from "../common/SpellDetails.tsx";
import { Term } from "../common/Term.tsx";
import { WargearTable } from "../common/WargearTable.tsx";
import { WARGEAR_KINDS } from "../common/wargear-kinds.ts";

const GROUPS = ["skills", "spells", ...WARGEAR_KINDS] as const;
type Group = (typeof GROUPS)[number];

/** Value of the faction filter that shows every faction. */
const ALL = "all";

export function CompendiumPage() {
  const { t } = useTranslation();
  const f = useFormatter();
  const titleId = useId();
  const filterId = useId();
  const [factionId, setFactionId] = useState<string>(ALL);
  const [open, setOpen] = useState<ReadonlySet<Group>>(new Set());

  const factions = gameData.factions.filter((x) => factionId === ALL || x.id === factionId);
  const setGroupOpen = (group: Group, value: boolean): void => {
    setOpen((current) => {
      const next = new Set(current);
      if (value) next.add(group);
      else next.delete(group);
      return next;
    });
  };

  const count = (group: Group): number => {
    if (group === "skills")
      return [...gameData.common.skillTables, ...factions.flatMap((x) => x.skillTables)].reduce(
        (n, table) => n + table.skills.length,
        0,
      );
    if (group === "spells")
      return factions.flatMap((x) => x.spellLores).reduce((n, lore) => n + lore.spells.length, 0);
    return factions.flatMap((x) => armoury(x).filter((w) => w.kind === group)).length;
  };

  const title = (group: Group): string =>
    group === "skills"
      ? t("compendium.groups.skills")
      : group === "spells"
        ? t("compendium.groups.spells")
        : t(`wargearKinds.${group}`);

  return (
    <section aria-labelledby={titleId} className="panel-parchment space-y-4 p-4 sm:p-6">
      <div>
        <h1 id={titleId} className="title-page">
          {t("compendium.title")}
        </h1>
        <p className="mt-1 text-sm">{t("compendium.intro")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={filterId} className="block font-bold">
            {t("compendium.faction")}
          </label>
          <select
            id={filterId}
            className="field min-h-11"
            value={factionId}
            onChange={(e) => {
              setFactionId(e.target.value);
            }}
          >
            <option value={ALL}>{t("compendium.allFactions")}</option>
            {gameData.factions.map((x) => (
              <option key={x.id} value={x.id}>
                {f.text(x.name)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-sm min-h-11"
          onClick={() => {
            setOpen(new Set(GROUPS));
          }}
        >
          {t("compendium.openAll")}
        </button>
        <button
          type="button"
          className="btn btn-sm min-h-11"
          onClick={() => {
            setOpen(new Set());
          }}
        >
          {t("compendium.closeAll")}
        </button>
      </div>

      <div className="space-y-3">
        {GROUPS.map((group) => (
          <Collapsible
            key={group}
            level="section"
            testId={`compendium-${group}`}
            open={open.has(group)}
            onOpenChange={(value) => {
              setGroupOpen(group, value);
            }}
            summary={t("compendium.group", { name: title(group), n: count(group) })}
          >
            {group === "skills" && (
              <div className="space-y-4">
                <div>
                  <h2 className="title-section">{t("compendium.commonSkills")}</h2>
                  {gameData.common.skillTables.map((table) => (
                    <SkillTableBlock key={table.id} table={table} />
                  ))}
                </div>
                {factions
                  .filter((x) => x.skillTables.length > 0)
                  .map((x) => (
                    <div key={x.id}>
                      <h2 className="title-section">{f.text(x.name)}</h2>
                      {x.skillTables.map((table) => (
                        <SkillTableBlock key={table.id} table={table} />
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {group === "spells" && (
              <div className="space-y-4">
                {factions
                  .filter((x) => x.spellLores.length > 0)
                  .map((x) => (
                    <div key={x.id}>
                      <h2 className="title-section">{f.text(x.name)}</h2>
                      {x.spellLores.map((lore) => (
                        <div key={lore.id} className="mt-2">
                          <h3 className="title-sub">{f.text(lore.name)}</h3>
                          <ul className="mt-1 space-y-2">
                            {lore.spells.map((spell) => (
                              <li key={spell.id}>
                                <strong>
                                  {spell.roll} - <Term text={spell.name} />
                                </strong>{" "}
                                <SpellCasting spell={spell} />
                                <span className="block text-sm">{f.text(spell.text)}</span>
                                <SpellExtra spell={spell} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {group !== "skills" && group !== "spells" && (
              <div className="space-y-4">
                {factions.map((x) => {
                  const items = armoury(x).filter((w) => w.kind === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={x.id}>
                      <h2 className="title-section">{f.text(x.armouryName)}</h2>
                      <WargearTable kind={group} items={items} price={(w) => w.cost} />
                    </div>
                  );
                })}
              </div>
            )}
          </Collapsible>
        ))}
      </div>
    </section>
  );
}

/** Wargear a warband of the faction can buy: the entries of its armoury lists, in book order. */
function armoury(faction: FactionData): Wargear[] {
  const listed = new Set(faction.armouryLists.flatMap((l) => l.entries.map((e) => e.wargearId)));
  return faction.wargear.filter((w) => listed.has(w.id));
}

/** One skill table: name, who may pick it, then each skill with its text. */
function SkillTableBlock({ table }: { table: SkillTable }) {
  const { t } = useTranslation();
  const f = useFormatter();
  return (
    <div className="mt-2">
      <h3 className="title-sub">
        {f.text(table.name)} <span className="font-body text-sm">({f.text(table.eligibilityLabel)})</span>
      </h3>
      <ul className="mt-1 space-y-1">
        {table.skills.map((skill) => (
          <li key={skill.id}>
            <strong>
              <Term text={skill.name} />
            </strong>
            {skill.onlyCategories.length > 0 &&
              ` (${t("wizard.skills.categoryOnly", {
                category: skill.onlyCategories.map((c) => t(`categories.${c}_other`)).join(", "),
              })})`}
            <span className="block text-sm">{f.text(skill.text)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
