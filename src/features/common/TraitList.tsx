/*
 * File:        src/features/common/TraitList.tsx
 * Role:        Weapon traits in the active language, each with its reminder as
 *              a tooltip (and the original English name in French).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Fragment } from "react";
import type { Wargear } from "../../data/schema.ts";
import { gameData } from "../../data/index.ts";
import { useFormatter } from "../../i18n/text.ts";

const traits = new Map(gameData.common.weaponTraits.map((t) => [t.key, t]));

export function TraitList({ wargear, keys }: { wargear?: Wargear; keys?: { key: string }[] }) {
  const f = useFormatter();
  const list = keys ?? wargear?.traits ?? [];
  if (list.length === 0) return <span>-</span>;
  return (
    <span>
      {list.map((ref, i) => {
        const trait = traits.get(ref.key);
        const label =
          trait === undefined
            ? ref.key
            : ref.key === "rare"
              ? `${f.text(trait.name)} 0-${wargear?.rarity ?? ""}`
              : f.text(trait.name);
        const tip =
          trait === undefined
            ? ""
            : f.lang === "fr"
              ? `${trait.name.en} : ${trait.reminder.fr}`
              : trait.reminder.en;
        return (
          <Fragment key={ref.key}>
            {i > 0 && ", "}
            <abbr title={tip} className="no-underline decoration-dotted hover:underline">
              {label}
            </abbr>
          </Fragment>
        );
      })}
    </span>
  );
}
