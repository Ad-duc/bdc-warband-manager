/*
 * File:        src/print/ReminderSheet.tsx
 * Role:        French reminder sheet (one A4 page), laid out as the official
 *              "Black Death City - Reminder Sheet": set-up, round sequence,
 *              reinforcements roll, weapon trait reminders, misfire roll,
 *              hide, melee, ranged and arcane actions, miscast roll, Bloodied
 *              and moves. The text lives in reminder-fr.json (French only,
 *              page numbers of the playtest v1.03); this file only lays it out.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { ReactNode } from "react";
import sheet from "./reminder-fr.json";
import { tokenize } from "./richText.ts";

const BASE = import.meta.env.BASE_URL;
const img = (name: string): string => `${BASE}images/reminder/${name}.webp`;

type DiceRow = [string, string, string];

/** Renders **bold**, *italic*, {sep} (diamond separator) and {br}. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((tok, i) => {
        if (tok === "{sep}") return <span key={i} className="rs-sep" aria-hidden="true" />;
        if (tok === "{br}") return <br key={i} />;
        if (tok.startsWith("**"))
          return (
            <strong key={i}>
              <Rich text={tok.slice(2, -2)} />
            </strong>
          );
        if (tok.startsWith("*"))
          return (
            <em key={i}>
              <Rich text={tok.slice(1, -1)} />
            </em>
          );
        return tok;
      })}
    </>
  );
}

/** Box with a diamond icon on the left (actions and states). */
function IconBox({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <section className="rs-box rs-iconbox" aria-label={label}>
      <img src={img(icon)} alt="" className="rs-icon" />
      <div className="rs-iconbox-body">{children}</div>
    </section>
  );
}

/** One-column table, one line of rich text per row. */
function Lines({ rows, className = "" }: { rows: string[]; className?: string }) {
  return (
    <table className={`rs-table ${className}`}>
      <tbody>
        {rows.map((r) => (
          <tr key={r}>
            <td>
              <Rich text={r} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Two-column table: label in bold, then the text. */
function Pairs({ rows, className = "" }: { rows: string[][]; className?: string }) {
  return (
    <table className={`rs-table rs-pairs ${className}`}>
      <tbody>
        {rows.map(([label = "", text = ""]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>
              <Rich text={text} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Dice table: narrow result column, result name in bold, then the effect. */
function DiceTable({ table }: { table: { die: string; title: string; rows: string[][] } }) {
  return (
    <table className="rs-table rs-dice">
      <thead>
        <tr>
          <th className="rs-die">{table.die}</th>
          <th>{table.title}</th>
        </tr>
      </thead>
      <tbody>
        {(table.rows as DiceRow[]).map(([result, name, effect]) => (
          <tr key={result}>
            <td className="rs-die">{result}</td>
            <td>
              <strong>{`${name} :`}</strong> <Rich text={effect} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="rs-steps">
      {steps.map((s) => (
        <li key={s}>
          <Rich text={s} />
        </li>
      ))}
    </ol>
  );
}

export function ReminderSheet() {
  return (
    <article className="reminder-sheet" lang="fr" data-testid="reminder-sheet">
      <header className="rs-banner">
        <img src={img("banner")} alt="" className="rs-banner-bg" />
        <span className="rs-banner-diamond" aria-hidden="true" />
        <h2 className="rs-banner-title">{sheet.title}</h2>
      </header>

      <div className="rs-top">
        <section className="rs-box" aria-labelledby="rs-setup">
          <h3 id="rs-setup" className="rs-gothic">
            {sheet.setup.title}
          </h3>
          <Steps steps={sheet.setup.steps} />
        </section>

        <section className="rs-box rs-round" aria-labelledby="rs-round">
          <div>
            <h3 id="rs-round" className="rs-gothic">
              {sheet.round.title}
            </h3>
            <Steps steps={sheet.round.steps} />
          </div>
          <DiceTable table={sheet.reinforcements} />
        </section>
      </div>

      <div className="rs-columns">
        <div className="rs-column">
          <section className="rs-box" aria-labelledby="rs-traits">
            <h3 id="rs-traits" className="rs-heading">
              {sheet.traits.title}
            </h3>
            <p className="rs-note">{sheet.traits.note}</p>
            <Pairs rows={sheet.traits.rows} className="rs-traits" />
            <DiceTable table={sheet.misfire} />
          </section>

          <IconBox icon="drop" label={sheet.bloodied.label}>
            <Lines rows={sheet.bloodied.rows} />
          </IconBox>

          <IconBox icon="boot" label={sheet.moves.label}>
            <Pairs rows={sheet.moves.rows} />
          </IconBox>
        </div>

        <div className="rs-column">
          <IconBox icon="skull" label={sheet.hide.label}>
            <Pairs rows={sheet.hide.rows} />
            <Lines rows={[sheet.hide.text]} className="rs-joined" />
          </IconBox>

          <IconBox icon="sword" label={sheet.melee.label}>
            <Lines rows={sheet.melee.rows} />
          </IconBox>

          <IconBox icon="bow" label={sheet.ranged.label}>
            <Lines rows={sheet.ranged.rows} />
            <Lines rows={[sheet.ranged.cover]} className="rs-gap" />
          </IconBox>

          <img src={img("rats")} alt="" className="rs-rats" />

          <section className="rs-box" aria-label={sheet.arcane.label}>
            <div className="rs-iconbox">
              <img src={img("staff")} alt="" className="rs-icon" />
              <div className="rs-iconbox-body">
                <Pairs rows={sheet.arcane.rows} />
              </div>
            </div>
            <DiceTable table={sheet.miscast} />
          </section>
        </div>
      </div>
    </article>
  );
}
