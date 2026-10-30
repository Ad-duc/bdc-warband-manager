/*
 * File:        src/features/common/SpellDetails.tsx
 * Role:        Body of a signature spell as printed in the book: type and
 *              casting values, text, attack profile of an Attack spell (only
 *              the columns the book gives) and critical cast. Shared by the
 *              skills step of the wizard and the compendium page.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { AttackProfile, Spell } from "../../data/schema.ts";
import { formatRange, formatRend, useFormatter } from "../../i18n/text.ts";

/** Type and casting values, shown next to the spell name. */
export function SpellCasting({ spell }: { spell: Spell }) {
  const { t } = useTranslation();
  return (
    <span className="text-sm">
      {t("wizard.skills.casting", {
        type: t(`spellTypes.${spell.spellType}`),
        value: spell.castingValue,
        critical: spell.criticalCastValue,
      })}
    </span>
  );
}

/** Attack profile and critical cast, shown under the spell text. */
export function SpellExtra({ spell }: { spell: Spell }) {
  const { t } = useTranslation();
  const f = useFormatter();
  return (
    <div className="text-sm">
      {spell.attack !== null && <SpellAttack profile={spell.attack} />}
      <p>
        <strong>{t("wizard.skills.criticalCast", { value: spell.criticalCastValue })}</strong>{" "}
        {f.text(spell.criticalText)}
      </p>
    </div>
  );
}

function SpellAttack({ profile }: { profile: AttackProfile }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const range = profile.range !== undefined;
  const attacks = profile.attacks !== undefined;
  const crit = profile.critDamage !== undefined;
  return (
    <div className="my-1 overflow-x-auto">
      <table className="table-bdc w-auto">
        <thead>
          <tr>
            {range && <th scope="col">{t("weapon.rng")}</th>}
            {attacks && <th scope="col">{t("weapon.atk")}</th>}
            <th scope="col">{t("weapon.rnd")}</th>
            <th scope="col">{t("weapon.dmg")}</th>
            {crit && <th scope="col">{t("weapon.crit")}</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            {range && <td>{formatRange(profile, t("weapon.flame"))}</td>}
            {attacks && <td>{f.dice(profile.attacks)}</td>}
            <td>{formatRend(profile.rend)}</td>
            <td>{f.dice(profile.damage)}</td>
            {crit && <td>{f.dice(profile.critDamage)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
