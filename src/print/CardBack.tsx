/*
 * File:        src/print/CardBack.tsx
 * Role:        Back of the fighter cards (63 x 88 mm): game logo, faction
 *              shield on a torn stone panel, faction name in gothic letters
 *              and, as an option, the warband name. Back pages placed behind
 *              the card pages for a long-edge duplex print, and a stand-alone
 *              page of 9 backs to print on the reverse by hand.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { CARDS_PER_PAGE, duplexBackCells } from "./model.ts";

const BASE = import.meta.env.BASE_URL;

export interface CardBackInfo {
  /** File name of the faction shield, as in the faction data (`assets.shield`). */
  shield: string;
  /** Faction name, always in English (style guide section 6). */
  factionName: string;
  /** Warband name printed under the faction name, or null to leave it out. */
  warbandName: string | null;
}

/** Print-quality copy of a web image (public/images/print), same base name. */
function printImage(file: string): string {
  return `${BASE}images/print/${file.replace(/\.[a-z0-9]+$/i, "")}.webp`;
}

const CORNERS = ["tl", "tr", "bl", "br"] as const;

export function CardBack({ info }: { info: CardBackInfo }) {
  const long = info.factionName.length > 16;
  return (
    <article className="print-card-back" data-testid="print-card-back">
      <div className="print-back-face">
        {CORNERS.map((c) => (
          <span key={c} className={`print-back-corner print-back-corner-${c}`} aria-hidden="true" />
        ))}
        <img src={printImage("epee.webp")} alt="" className="print-back-sword print-decor" />
        <img src={printImage("logo.webp")} alt="" className="print-back-logo" />
        <div className="print-back-stone">
          <img src={printImage(info.shield)} alt="" className="print-back-shield" />
        </div>
        <p className={`print-back-faction ${long ? "print-back-faction-long" : ""}`}>{info.factionName}</p>
        {info.warbandName !== null && info.warbandName.trim() !== "" && (
          <p className="print-back-warband" data-testid="print-back-warband">
            {info.warbandName}
          </p>
        )}
        <img src={`${BASE}images/ornement.webp`} alt="" className="print-back-ornament" />
      </div>
    </article>
  );
}

/** Empty cell of a back page: keeps the mirrored grid in place. */
function EmptyCell() {
  return <div className="print-card-back-empty" aria-hidden="true" />;
}

/** Back page printed behind a page of `count` cards (long-edge duplex). */
export function CardBackPage({ count, info }: { count: number; info: CardBackInfo }) {
  return (
    <div className="print-page print-cards-page print-backs-page" data-testid="print-page">
      {duplexBackCells(count).map((filled, i) =>
        filled ? <CardBack key={i} info={info} /> : <EmptyCell key={i} />,
      )}
    </div>
  );
}

/** Stand-alone page of 9 backs, to print on the reverse of a card sheet by hand. */
export function CardBacksSheet({ info }: { info: CardBackInfo }) {
  return <CardBackPage count={CARDS_PER_PAGE} info={info} />;
}
