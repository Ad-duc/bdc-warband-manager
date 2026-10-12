/*
 * File:        src/print/PrintPage.tsx
 * Role:        Print view (screen 4): options (roster, cards, both or card
 *              backs; parchment or ink saver; blank blocks up to 15; card
 *              backs for a duplex print, with or without the warband name),
 *              on-screen A4 preview, and printing through the browser dialog
 *              (PDF or paper).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { gameData } from "../data/index.ts";
import type { Warband } from "../data/schema.ts";
import { db } from "../db/database.ts";
import { useLiveQuery } from "../app/useLiveQuery.ts";
import { hrefFor } from "../app/router.ts";
import { findFaction, indexFaction } from "../rules/index.ts";
import { useFormatter } from "../i18n/text.ts";
import { FIGHTERS_PER_PAGE, buildPrintFighters, paginate, type PrintLabels } from "./model.ts";
import { RosterFighterPages, RosterFirstPage } from "./RosterSheet.tsx";
import { FighterCards } from "./FighterCards.tsx";
import { CardBacksSheet, type CardBackInfo } from "./CardBack.tsx";

type Content = "roster" | "cards" | "both" | "backs";
type Style = "parchment" | "ink-saver";

export function PrintPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const warband = useLiveQuery(() => db.warbands.get(id), [id]);
  if (warband === undefined) return <p aria-busy="true">{t("wizard.loading")}</p>;
  return <PrintView warband={warband} backHref={hrefFor({ name: "campaign", id })} />;
}

export function PrintView({ warband, backHref }: { warband: Warband; backHref: string }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const [content, setContent] = useState<Content>("roster");
  const [style, setStyle] = useState<Style>("parchment");
  const [blank, setBlank] = useState(false);
  const [duplex, setDuplex] = useState(false);
  const [showName, setShowName] = useState(false);

  const faction = findFaction(gameData, warband.factionId);
  if (faction === undefined) return <p>{t("rules.data.unknownFaction", { faction: warband.factionId })}</p>;
  const index = indexFaction(gameData.common, faction);
  const labels: PrintLabels = {
    flame: t("weapon.flame"),
    unarmed: f.text(gameData.common.unarmedStrike.name),
    wargear: t("print.notes.wargear"),
    skills: t("print.notes.skills"),
    spells: t("print.notes.spells"),
    injuries: t("print.notes.injuries"),
    promoted: t("print.notes.promoted"),
    moreWeapons: t("print.notes.moreWeapons"),
    options: t("print.notes.options"),
    formOf: (name) => t("print.notes.formOf", { name }),
  };
  const fighters = buildPrintFighters(index, warband, f.lang, labels, blank);
  const hasCards = content === "cards" || content === "both";
  const backsUsed = content === "backs" || (hasCards && duplex);
  const backInfo: CardBackInfo = {
    shield: faction.assets.shield,
    factionName: faction.name.en,
    warbandName: showName ? warband.name : null,
  };
  /* Duplex after the roster: an odd roster would put the first card page on
     the back of its last sheet, so a blank page closes the roster. */
  const rosterPages = 1 + paginate(fighters, FIGHTERS_PER_PAGE).length;
  const padRoster = content === "both" && duplex && rosterPages % 2 === 1;

  return (
    <div>
      <section aria-labelledby="print-heading" className="no-print panel-parchment mb-6 space-y-3 p-4">
        <h1 id="print-heading" className="font-hand text-3xl">
          {t("print.title")}
        </h1>
        <div className="flex flex-wrap gap-6">
          <fieldset>
            <legend className="font-bold">{t("print.content")}</legend>
            {(["roster", "cards", "both", "backs"] as const).map((c) => (
              <label key={c} className="mr-3 inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="print-content"
                  className="size-5"
                  checked={content === c}
                  onChange={() => {
                    setContent(c);
                  }}
                />
                {t(`print.contents.${c}`)}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="font-bold">{t("print.style")}</legend>
            {(["parchment", "ink-saver"] as const).map((s) => (
              <label key={s} className="mr-3 inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="print-style"
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
          <label className="inline-flex items-center gap-2 self-end">
            <input
              type="checkbox"
              className="size-5"
              checked={blank}
              onChange={() => {
                setBlank(!blank);
              }}
            />
            {t("print.blank")}
          </label>
          <fieldset>
            <legend className="font-bold">{t("print.backs")}</legend>
            <label className="mr-3 inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="size-5"
                checked={duplex}
                disabled={!hasCards}
                onChange={() => {
                  setDuplex(!duplex);
                }}
              />
              {t("print.duplex")}
            </label>
            <label className="mr-3 inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="size-5"
                checked={showName}
                disabled={!backsUsed}
                onChange={() => {
                  setShowName(!showName);
                }}
              />
              {t("print.backName")}
            </label>
          </fieldset>
        </div>
        <p className="text-sm">{t("print.help")}</p>
        {backsUsed && <p className="text-sm">{t("print.backsHelp")}</p>}
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
          <a className="btn" href={backHref}>
            {t("print.back")}
          </a>
        </div>
      </section>

      <div
        className={`print-root ${style === "ink-saver" ? "print-ink-saver" : "print-parchment"}`}
        lang={f.lang}
      >
        {(content === "roster" || content === "both") && (
          <>
            <RosterFirstPage warband={warband} index={index} />
            <RosterFighterPages fighters={fighters} />
            {padRoster && <div className="print-page" data-testid="print-page" aria-hidden="true" />}
          </>
        )}
        {hasCards && <FighterCards fighters={fighters} backs={duplex ? backInfo : null} />}
        {content === "backs" && <CardBacksSheet info={backInfo} />}
      </div>
    </div>
  );
}
