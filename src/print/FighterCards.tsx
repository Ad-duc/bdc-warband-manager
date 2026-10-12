/*
 * File:        src/print/FighterCards.tsx
 * Role:        Fighter cards in TCG sleeve format (63 x 88 mm), 9 per A4 page
 *              with dashed cut lines: category pictogram, name, cost,
 *              characteristics, 3 weapons with their traits underneath, text
 *              area, Black Rot circles and experience. With card backs on,
 *              each card page is followed by its back page (long-edge duplex).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { STAT_KEYS } from "../data/schema.ts";
import { formatStat, useFormatter } from "../i18n/text.ts";
import { CARDS_PER_PAGE, WEAPON_ROWS, paginate, type PrintFighter } from "./model.ts";
import { Pictogram } from "./Pictogram.tsx";
import { CardBackPage, type CardBackInfo } from "./CardBack.tsx";
import { BlackRot } from "./RosterSheet.tsx";

function Card({ fighter }: { fighter: PrintFighter | null }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const rows = Array.from({ length: WEAPON_ROWS }, (_, i) => fighter?.weapons[i]);

  return (
    <article className="print-card" data-testid="print-card">
      <div className="flex items-start gap-[1.5mm]">
        <Pictogram
          category={fighter?.category ?? "henchman"}
          size={34}
          label={t(`categories.${fighter?.category ?? "henchman"}_one`)}
        />
        <div className="min-w-0 flex-1">
          <div className="bg-stone px-[1mm] text-[7pt]">
            <strong>{t("print.name")}</strong> {fighter?.name ?? ""}
            <span className="block truncate text-[6.5pt]">{fighter?.type ?? ""}</span>
          </div>
          <div className="mt-[0.8mm] ml-auto w-[22mm] border border-ink px-[1mm] text-[7pt]">
            <strong>{t("print.cost")}</strong>{" "}
            {fighter === null || fighter.cost === null ? "" : f.number(fighter.cost)}
          </div>
        </div>
      </div>

      <table className="print-stats mt-[1mm] text-[6.5pt]">
        <thead>
          <tr>
            {STAT_KEYS.map((k) => (
              <th key={k}>{t(`stats.${k}.abbr`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {STAT_KEYS.map((k) => (
              <td key={k}>{fighter?.stats ? formatStat(k, fighter.stats[k], f.lang) : ""}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <table className="print-weapons mt-[1mm] text-[6pt]">
        <thead>
          <tr>
            <th className="w-[34%]">{t("weapon.name")}</th>
            <th>{t("weapon.rng")}</th>
            <th>{t("weapon.atk")}</th>
            <th>{t("weapon.rnd")}</th>
            <th>{t("weapon.dmg")}</th>
            <th>{t("weapon.crit")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((w, i) => [
            <tr key={`w${i}`}>
              <td className="truncate">{w?.name ?? ""}</td>
              <td>{w?.rng ?? ""}</td>
              <td>{w?.atk ?? ""}</td>
              <td>{w?.rnd ?? ""}</td>
              <td>{w?.dmg ?? ""}</td>
              <td>{w?.crit ?? ""}</td>
            </tr>,
            <tr key={`t${i}`}>
              <td colSpan={6} className="text-left italic">
                {t("print.traits")} <span className="not-italic">{w?.traits ?? ""}</span>
              </td>
            </tr>,
          ])}
        </tbody>
      </table>

      <div className="print-cell mt-[1mm] min-h-[14mm] flex-1 text-[6pt] leading-tight">
        <strong>{t("print.wargearEtc")}</strong>
        {fighter?.notes.map((n) => (
          <span key={n} className="block">
            {n}
          </span>
        ))}
      </div>

      <div className="mt-[1mm] flex items-center justify-between gap-[1mm] text-[7pt]">
        <BlackRot boxes={fighter?.blackRot ?? 0} />
        <span className="flex-1 border border-ink px-[1mm]">
          <strong>{t("print.exp")}</strong>{" "}
          {fighter === null || fighter.experience === null ? "" : f.number(fighter.experience)}
        </span>
      </div>
    </article>
  );
}

export function FighterCards({
  fighters,
  backs = null,
}: {
  fighters: (PrintFighter | null)[];
  /** Card back to print behind each card page, or null for fronts only. */
  backs?: CardBackInfo | null;
}) {
  return (
    <>
      {paginate(fighters, CARDS_PER_PAGE).map((page, i) => (
        <Fragment key={i}>
          <div className="print-page print-cards-page" data-testid="print-page">
            {page.map((fighter, j) => (
              <Card key={fighter?.id ?? `blank-${i}-${j}`} fighter={fighter} />
            ))}
          </div>
          {backs !== null && <CardBackPage count={page.length} info={backs} />}
        </Fragment>
      ))}
    </>
  );
}
