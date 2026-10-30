/*
 * File:        src/features/common/WargearTable.tsx
 * Role:        Table of one kind of wargear (melee, ranged, armour or items)
 *              with weapon profiles, traits, rules and prices, as in the
 *              armoury of the book. Shared by the wargear step of the wizard
 *              (with a buy button on each row) and the compendium page (read
 *              only, reference prices). An item that grants a weapon shows
 *              its profile under its text.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { AttackProfile, Wargear } from "../../data/schema.ts";
import { formatRange, formatRend, useFormatter } from "../../i18n/text.ts";
import { TraitList } from "./TraitList.tsx";
import type { WargearKind } from "./wargear-kinds.ts";

export function WargearTable({
  kind,
  items,
  price,
  onAdd,
}: {
  kind: WargearKind;
  items: Wargear[];
  /** Price shown for an item (list price in the wizard, reference price elsewhere). */
  price: (w: Wargear) => number;
  /** Adds a buy button on each row when given. */
  onAdd?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const weapon = kind === "melee" || kind === "ranged";

  return (
    <div className="mt-1 overflow-x-auto">
      <table className="table-bdc">
        <caption className="sr-only">{t(`wargearKinds.${kind}`)}</caption>
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
            {onAdd !== undefined && (
              <th scope="col">
                <span className="sr-only">{t("wizard.wargear.add")}</span>
              </th>
            )}
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
                  {w.grantsAttack !== null && <GrantedAttack wargear={w} profile={w.grantsAttack} />}
                </td>
              )}
              <td className="whitespace-nowrap">{t("units.silver", { value: price(w) })}</td>
              {onAdd !== undefined && (
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Weapon profile granted by an item (Bestial Companion, Loyal Companion,
 * Bomb Bolt, Demonic Familiar): the item text ends with "the following
 * weapon:", so the profile is shown right under it, as in the book.
 */
function GrantedAttack({ wargear, profile }: { wargear: Wargear; profile: AttackProfile }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const ranged = profile.range !== undefined;

  return (
    <table
      className="mt-1 w-auto border border-on-panel text-xs"
      aria-label={t("wizard.wargear.grantedNamed", { name: f.text(wargear.name) })}
      data-testid={`granted-attack-${wargear.id}`}
    >
      <thead>
        <tr>
          {ranged && <th scope="col">{t("weapon.rng")}</th>}
          {profile.attacks !== undefined && <th scope="col">{t("weapon.atk")}</th>}
          <th scope="col">{t("weapon.rnd")}</th>
          <th scope="col">{t("weapon.dmg")}</th>
          <th scope="col">{t("weapon.crit")}</th>
          <th scope="col">{t("weapon.traits")}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {ranged && <td>{formatRange(profile, t("weapon.flame"))}</td>}
          {profile.attacks !== undefined && <td>{f.dice(profile.attacks)}</td>}
          <td>{formatRend(profile.rend)}</td>
          <td>{f.dice(profile.damage)}</td>
          <td>{f.dice(profile.critDamage)}</td>
          <td>
            <TraitList keys={profile.traits ?? []} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
