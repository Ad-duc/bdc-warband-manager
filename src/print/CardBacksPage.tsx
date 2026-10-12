/*
 * File:        src/print/CardBacksPage.tsx
 * Role:        Stand-alone card back generator (header button): choice of the
 *              faction, optional warband name, parchment or ink saver style,
 *              number of sheets of 9 backs, on-screen A4 preview and printing
 *              through the browser dialog. Needs no saved warband, so the
 *              backs can go on the official fighter cards PDF or on any card
 *              sheet with the same 3 x 3 grid.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { gameData } from "../data/index.ts";
import { useFormatter } from "../i18n/text.ts";
import { CardBacksSheet, type CardBackInfo } from "./CardBack.tsx";

const BASE = import.meta.env.BASE_URL;

type Style = "parchment" | "ink-saver";

/** Sheets of 9 backs that can be printed in one go. */
export const MAX_BACK_SHEETS = 5;

export function CardBacksPage() {
  const { t } = useTranslation();
  const f = useFormatter();
  const factions = gameData.factions;
  const [factionId, setFactionId] = useState(factions[0]?.id ?? "");
  const [warbandName, setWarbandName] = useState("");
  const [style, setStyle] = useState<Style>("parchment");
  const [sheets, setSheets] = useState(1);

  const faction = factions.find((x) => x.id === factionId) ?? factions[0];
  if (faction === undefined) return null;
  const info: CardBackInfo = {
    shield: faction.assets.shield,
    factionName: faction.name.en,
    warbandName: warbandName.trim() === "" ? null : warbandName.trim(),
  };

  return (
    <div>
      <section aria-labelledby="backs-heading" className="no-print panel-parchment mb-6 space-y-3 p-4">
        <h1 id="backs-heading" className="font-hand text-3xl">
          {t("cardBacks.title")}
        </h1>
        <p className="text-sm">{t("cardBacks.intro")}</p>
        <div className="flex flex-wrap gap-6">
          <fieldset>
            <legend className="font-bold">{t("cardBacks.faction")}</legend>
            <div className="flex flex-wrap gap-3">
              {factions.map((x) => (
                <label key={x.id} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="backs-faction"
                    className="size-5"
                    checked={x.id === faction.id}
                    onChange={() => {
                      setFactionId(x.id);
                    }}
                  />
                  <img src={`${BASE}images/${x.assets.shield}`} alt="" className="h-8 w-auto" />
                  {f.text(x.name)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">{t("print.style")}</legend>
            {(["parchment", "ink-saver"] as const).map((s) => (
              <label key={s} className="mr-3 inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="backs-style"
                  className="size-5"
                  checked={style === s}
                  onChange={() => {
                    setStyle(s);
                  }}
                />
                {t(`print.styles.${s}`)}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-1">
            <span className="font-bold">{t("cardBacks.warbandName")}</span>
            <input
              type="text"
              className="field w-72 max-w-full"
              value={warbandName}
              maxLength={60}
              onChange={(e) => {
                setWarbandName(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">{t("cardBacks.sheets")}</span>
            <select
              className="field w-auto"
              value={sheets}
              onChange={(e) => {
                setSheets(Number(e.target.value));
              }}
            >
              {Array.from({ length: MAX_BACK_SHEETS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {t("cardBacks.sheetCount", { count: n, cards: n * 9 })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm">{t("print.backsHelp")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-solid"
            onClick={() => {
              window.print();
            }}
          >
            {t("print.print")}
          </button>
          <a className="btn" href="#/">
            {t("print.back")}
          </a>
        </div>
      </section>

      <div
        className={`print-root ${style === "ink-saver" ? "print-ink-saver" : "print-parchment"}`}
        lang={f.lang}
      >
        {Array.from({ length: sheets }, (_, i) => (
          <CardBacksSheet key={i} info={info} />
        ))}
      </div>
    </div>
  );
}
