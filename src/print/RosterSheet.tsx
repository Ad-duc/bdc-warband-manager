/*
 * File:        src/print/RosterSheet.tsx
 * Role:        A4 Warband Roster following the official layout: page 1 with
 *              name, faction, origin, stash and Jars of Canal Leeches, rating,
 *              notes, stronghold and 5 holdings, counters; then 5 fighter
 *              blocks per page (characteristics, 3 weapon lines, text area,
 *              3 Black Rot circles).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { STAT_KEYS, type Warband } from "../data/schema.ts";
import { formatStat, useFormatter } from "../i18n/text.ts";
import { warbandRating, type FactionIndex } from "../rules/index.ts";
import { FIGHTERS_PER_PAGE, WEAPON_ROWS, paginate, type PrintFighter } from "./model.ts";

const BASE = import.meta.env.BASE_URL;

function Box({
  title,
  children,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`print-box ${className}`}>
      <h2 className="font-gothic text-[20pt] leading-tight">{title}</h2>
      <div className="text-[9pt]">{children}</div>
    </section>
  );
}

export function RosterFirstPage({ warband, index }: { warband: Warband; index: FactionIndex }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const origin = index.faction.origins.find((o) => o.id === warband.originId);
  const stronghold = index.faction.strongholds.find((s) => s.id === warband.strongholdId);
  const rating = warbandRating(index, warband);
  const items = warband.stash.items.map((i) => {
    const name =
      i.wargearId === null ? i.label : (index.wargear.get(i.wargearId)?.name[f.lang] ?? i.wargearId);
    return i.quantity > 1 ? `${name} x${i.quantity}` : name;
  });
  const holdings = Array.from({ length: 5 }, (_, i) => warband.holdings[i]);
  const counters = ["battlesFought", "victories", "holdingsRansacked", "fightersLost"] as const;

  return (
    <div className="print-page" data-testid="print-page">
      <Box title={t("print.warbandName")} className="mb-[4mm]">
        <p className="font-gothic text-[18pt]">{warband.name}</p>
      </Box>
      <div className="mb-[4mm] grid grid-cols-2 gap-[6mm]">
        <Box title={t("print.faction")}>
          <p className="text-[11pt]">{f.text(index.faction.name)}</p>
        </Box>
        <Box title={t("print.origin")}>
          <p className="text-[11pt]">{origin === undefined ? "" : f.text(origin.name)}</p>
        </Box>
      </div>
      <div className="grid grid-cols-2 gap-[6mm]">
        <div className="flex flex-col gap-[4mm]">
          <Box title={t("print.stash")} className="min-h-[52mm]">
            <p className="text-[11pt] font-bold">
              {t("units.silver", { value: f.number(warband.stash.silver) })}
            </p>
            {items.length > 0 && <p>{items.join(", ")}</p>}
            <div className="mt-[3mm] flex border-t-2 border-ink">
              <span className="bg-ink px-[2mm] py-[1mm] font-hand text-[10pt] text-white">
                {t("print.leechJars")}
              </span>
              <span className="px-[2mm] py-[1mm] text-[11pt]">{warband.stash.leechJars}</span>
            </div>
          </Box>
          <Box title={t("print.notesTitle")} className="min-h-[150mm]">
            <p className="whitespace-pre-wrap">{warband.notes}</p>
          </Box>
        </div>
        <div className="flex flex-col gap-[4mm]">
          <Box title={t("print.rating")} className="text-center">
            <p className="font-gothic text-[26pt]">{f.number(rating.total)}</p>
          </Box>
          <img src={`${BASE}images/cranes.png`} alt="" className="mx-auto h-[14mm] w-auto print-decor" />
          <Box title={t("print.holdings")}>
            <dl className="space-y-[1.5mm]">
              <div className="print-line">
                <dt className="font-bold">{t("print.stronghold")}</dt>
                <dd>{stronghold === undefined ? "" : f.text(stronghold.name)}</dd>
              </div>
              {holdings.map((h, i) => (
                <div key={i} className="print-line">
                  <dt className="font-bold">{t("print.holding", { n: i + 1 })}</dt>
                  <dd>{h === undefined ? "" : [h.label, h.notes].filter((x) => x !== "").join(" - ")}</dd>
                </div>
              ))}
            </dl>
          </Box>
          <table className="print-table">
            <tbody>
              {counters.map((c) => (
                <tr key={c}>
                  <th scope="row" className="font-hand text-[11pt] font-normal">
                    {t(`campaign.counters.${c}`)}
                  </th>
                  <td className="w-[40%] text-center text-[11pt]">{warband.counters[c]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FighterBlock({ fighter }: { fighter: PrintFighter | null }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const rows = Array.from({ length: WEAPON_ROWS }, (_, i) => fighter?.weapons[i]);

  return (
    <article className="print-fighter" data-testid="print-fighter">
      <div className="grid grid-cols-[1fr_22mm_1.4fr] gap-[2mm]">
        <div className="flex flex-col justify-between">
          <div className="text-[9pt]">
            <p>
              <strong>{t("print.name")}</strong> {fighter?.name ?? ""}
            </p>
            <p>
              <strong>{t("print.type")}</strong> {fighter?.type ?? ""}
            </p>
          </div>
          <table className="print-stats">
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
        </div>
        <div className="flex flex-col gap-[2mm]">
          <div className="print-cell h-[11mm]">
            <strong>{t("print.cost")}</strong>
            <p className="text-center text-[11pt]">
              {fighter === null || fighter.cost === null ? "" : f.number(fighter.cost)}
            </p>
          </div>
          <div className="print-cell h-[11mm]">
            <strong>{t("print.exp")}</strong>
            <p className="text-center text-[11pt]">
              {fighter === null || fighter.experience === null ? "" : f.number(fighter.experience)}
            </p>
          </div>
        </div>
        <div className="print-cell h-[24mm] overflow-hidden">
          <strong>{t("print.wargearEtc")}</strong>
          <ul className="list-none text-[8pt] leading-snug">
            {fighter?.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-[1.5mm] grid grid-cols-[1fr_20mm] gap-[2mm]">
        <table className="print-weapons">
          <thead>
            <tr>
              <th className="w-[26%]">{t("weapon.name")}</th>
              <th>{t("weapon.rng")}</th>
              <th>{t("weapon.atk")}</th>
              <th>{t("weapon.rnd")}</th>
              <th>{t("weapon.dmg")}</th>
              <th>{t("weapon.crit")}</th>
              <th className="w-[38%]">{t("weapon.traits")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={i}>
                <td>{w?.name ?? ""}</td>
                <td>{w?.rng ?? ""}</td>
                <td>{w?.atk ?? ""}</td>
                <td>{w?.rnd ?? ""}</td>
                <td>{w?.dmg ?? ""}</td>
                <td>{w?.crit ?? ""}</td>
                <td className="text-left text-[7pt]">{w?.traits ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <BlackRot boxes={fighter?.blackRot ?? 0} vertical />
      </div>
    </article>
  );
}

export function BlackRot({ boxes, vertical = false }: { boxes: number; vertical?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center ${vertical ? "flex-col" : "flex-row"} gap-[1mm]`}>
      <span className="bg-ink px-[1.5mm] text-center font-hand text-[7.5pt] leading-tight text-white">
        {t("print.blackRot")}
      </span>
      <span
        className={`flex ${vertical ? "flex-col" : "flex-row"} gap-[0.8mm]`}
        role="img"
        aria-label={t("print.blackRotValue", { count: boxes })}
      >
        {[1, 2, 3].map((b) => (
          <span key={b} className={`print-circle ${boxes >= b ? "print-circle-on" : ""}`} />
        ))}
      </span>
    </div>
  );
}

export function RosterFighterPages({ fighters }: { fighters: (PrintFighter | null)[] }) {
  return (
    <>
      {paginate(fighters, FIGHTERS_PER_PAGE).map((page, i) => (
        <div key={i} className="print-page flex flex-col gap-[3mm]" data-testid="print-page">
          {page.map((fighter, j) => (
            <FighterBlock key={fighter?.id ?? `blank-${i}-${j}`} fighter={fighter} />
          ))}
        </div>
      ))}
    </>
  );
}
