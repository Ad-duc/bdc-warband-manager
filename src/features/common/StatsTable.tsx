/*
 * File:        src/features/common/StatsTable.tsx
 * Role:        7-column characteristics table (Mv Bl Bw Ar In Wl Lf), with the
 *              roster abbreviations of the active language and full names for
 *              screen readers.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { STAT_KEYS } from "../../data/constants.ts";
import type { Stats } from "../../data/schema.ts";
import { formatStat } from "../../i18n/text.ts";

export function StatsTable({ stats, caption }: { stats: Stats; caption?: string }) {
  const { t } = useTranslation();
  return (
    <table className="table-bdc text-center">
      {caption !== undefined && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {STAT_KEYS.map((k) => (
            <th key={k} scope="col" className="text-center">
              <abbr title={t(`stats.${k}.name`)} className="no-underline">
                {t(`stats.${k}.abbr`)}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {STAT_KEYS.map((k) => (
            <td key={k}>{formatStat(k, stats[k])}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
