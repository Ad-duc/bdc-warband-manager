/*
 * File:        src/features/wizard/StepSkills.tsx
 * Role:        Step 5: skills and signature spells for the fighters whose
 *              profile grants them. Only eligible tables are shown; a skill
 *              already held by another fighter is disabled with its holder.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { WarbandFighter } from "../../data/schema.ts";
import { fitsSkillCategory, isEligible } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { Term } from "../common/Term.tsx";
import { fighterLabel } from "../warbands/factory.ts";
import type { StepProps } from "./WizardPage.tsx";

export function StepSkills({ warband, index, update }: StepProps) {
  const { t } = useTranslation();
  const f = useFormatter();
  const active = warband.fighters.filter((x) => x.status === "active");
  const tables = [...index.common.skillTables, ...index.faction.skillTables];
  const label = (x: WarbandFighter) =>
    fighterLabel(x, index.fighters.get(x.profileId)?.name[f.lang] ?? x.profileId);

  const holderOf = new Map<string, WarbandFighter>();
  for (const x of active) for (const s of x.skillIds) if (!holderOf.has(s)) holderOf.set(s, x);

  const toggle = (fighter: WarbandFighter, field: "skillIds" | "spellIds", id: string) => {
    update((w) => ({
      ...w,
      fighters: w.fighters.map((x) =>
        x.instanceId !== fighter.instanceId
          ? x
          : { ...x, [field]: x[field].includes(id) ? x[field].filter((s) => s !== id) : [...x[field], id] },
      ),
    }));
  };

  const concerned = active.filter((x) => {
    const p = index.fighters.get(x.profileId);
    return (
      p !== undefined &&
      (p.recruitmentGrants.skills > 0 || p.recruitmentGrants.spells > 0 || x.skillIds.length > 0)
    );
  });
  if (concerned.length === 0) return <p>{t("wizard.skills.none")}</p>;

  return (
    <div className="space-y-6">
      {concerned.map((fighter) => {
        const profile = index.fighters.get(fighter.profileId);
        if (profile === undefined) return null;
        const g = profile.recruitmentGrants;
        const picked = fighter.skillIds.filter((s) => !g.fixedSkillIds.includes(s)).length;
        const lore = index.faction.spellLores.find((l) => l.id === g.spellLoreId);
        return (
          <section
            key={fighter.instanceId}
            aria-labelledby={`skills-${fighter.instanceId}`}
            className="border-2 border-on-panel p-3"
          >
            <h2 id={`skills-${fighter.instanceId}`} className="font-gothic text-2xl">
              {label(fighter)}
            </h2>
            <p className="text-sm">
              {t("wizard.skills.grant", { picked, expected: g.skills })}
              {g.fixedSkillIds.length > 0 &&
                ` ${t("wizard.skills.fixed", {
                  skills: g.fixedSkillIds.map((s) => index.skills.get(s)?.skill.name[f.lang] ?? s).join(", "),
                })}`}
            </p>

            {g.skills > 0 &&
              tables
                .filter((table) => isEligible(fighter, profile, table))
                .map((table) => (
                  <fieldset key={table.id} className="mt-3">
                    <legend className="band w-full text-lg">
                      {f.text(table.name)}{" "}
                      <span className="font-body text-sm">({f.text(table.eligibilityLabel)})</span>
                    </legend>
                    <ul className="mt-1 space-y-1">
                      {table.skills.map((skill) => {
                        const holder = holderOf.get(skill.id);
                        const mine = fighter.skillIds.includes(skill.id);
                        const fixed = g.fixedSkillIds.includes(skill.id);
                        const taken = holder !== undefined && holder.instanceId !== fighter.instanceId;
                        const wrongCategory = !fitsSkillCategory(fighter, profile, skill);
                        return (
                          <li key={skill.id}>
                            <label className={`flex gap-2 ${taken || wrongCategory ? "opacity-60" : ""}`}>
                              <input
                                type="checkbox"
                                className="mt-1 size-5 shrink-0"
                                checked={mine}
                                disabled={fixed || ((taken || wrongCategory) && !mine)}
                                onChange={() => {
                                  toggle(fighter, "skillIds", skill.id);
                                }}
                              />
                              <span>
                                <strong>
                                  <Term text={skill.name} />
                                </strong>
                                {taken && ` (${t("wizard.skills.takenBy", { name: label(holder) })})`}
                                {wrongCategory &&
                                  ` (${t("wizard.skills.categoryOnly", {
                                    category: skill.onlyCategories
                                      .map((c) => t(`categories.${c}_other`))
                                      .join(", "),
                                  })})`}
                                <span className="block text-sm">{f.text(skill.text)}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ))}

            {lore !== undefined && g.spells > 0 && (
              <fieldset className="mt-3">
                <legend className="band w-full text-lg">
                  {t("wizard.skills.spells", {
                    lore: f.text(lore.name),
                    picked: fighter.spellIds.length,
                    expected: g.spells,
                  })}
                </legend>
                <ul className="mt-1 space-y-1">
                  {lore.spells.map((spell) => (
                    <li key={spell.id}>
                      <label className="flex gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 size-5 shrink-0"
                          checked={fighter.spellIds.includes(spell.id)}
                          onChange={() => {
                            toggle(fighter, "spellIds", spell.id);
                          }}
                        />
                        <span>
                          <strong>
                            {spell.roll} - <Term text={spell.name} />
                          </strong>{" "}
                          <span className="text-sm">
                            {t("wizard.skills.casting", {
                              type: t(`spellTypes.${spell.spellType}`),
                              value: spell.castingValue,
                              critical: spell.criticalCastValue,
                            })}
                          </span>
                          <span className="block text-sm">{f.text(spell.text)}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
          </section>
        );
      })}
    </div>
  );
}
