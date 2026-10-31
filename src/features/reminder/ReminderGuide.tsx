/*
 * File:        src/features/reminder/ReminderGuide.tsx
 * Role:        Screen version of the French reminder sheet, laid out like the
 *              other screens (parchment panel, title levels, ink tables):
 *              set-up, round sequence and reinforcements roll, weapon traits
 *              and misfire roll in one column; hide, melee, ranged and arcane
 *              actions, miscast roll, Bloodied and moves in the other. The
 *              text is the one of the printed sheet (reminder-fr.json).
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import type { ReactNode } from "react";
import sheet from "../../print/reminder-fr.json";
import { Rich } from "../../print/ReminderSheet.tsx";

const BASE = import.meta.env.BASE_URL;
const img = (name: string): string => `${BASE}images/reminder/${name}.webp`;

type DiceRow = [string, string, string];

/** Section with a level 2 title, optionally preceded by a sheet icon. */
function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="title-section flex items-center gap-3 border-b-2 border-on-panel pb-1">
        {icon !== undefined && <img src={img(icon)} alt="" className="h-8 w-8 shrink-0 object-contain" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Numbered steps: the number is part of the text of each step. */
function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1 text-sm">
      {steps.map((s) => (
        <li key={s}>
          <Rich text={s} />
        </li>
      ))}
    </ol>
  );
}

/** Bulleted lines of rich text. */
function Lines({ rows }: { rows: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {rows.map((r) => (
        <li key={r}>
          <Rich text={r} />
        </li>
      ))}
    </ul>
  );
}

/** Two-column table: label as row header, then the text. */
function Pairs({ rows }: { rows: string[][] }) {
  return (
    <table className="table-bdc">
      <tbody>
        {rows.map(([label = "", text = ""]) => (
          <tr key={label}>
            <th scope="row" className="w-1/3">
              {label}
            </th>
            <td>
              <Rich text={text} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Dice table under a level 3 title: result, then name and effect. */
function DiceTable({ id, table }: { id: string; table: { die: string; title: string; rows: string[][] } }) {
  return (
    <div className="space-y-2">
      <h3 id={id} className="title-sub">
        {table.title}
      </h3>
      <table className="table-bdc" aria-labelledby={id}>
        <thead>
          <tr>
            <th scope="col" className="w-16">
              {table.die}
            </th>
            <th scope="col">{table.title}</th>
          </tr>
        </thead>
        <tbody>
          {(table.rows as DiceRow[]).map(([result, name, effect]) => (
            <tr key={result}>
              <td className="whitespace-nowrap font-bold">{result}</td>
              <td>
                <strong>{`${name} :`}</strong> <Rich text={effect} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReminderGuide() {
  return (
    <article
      className="panel-parchment reminder-guide min-w-0 p-4 sm:p-8"
      lang="fr"
      data-testid="reminder-guide"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 space-y-8">
          <Section id="rg-setup" title={sheet.setup.title}>
            <Steps steps={sheet.setup.steps} />
          </Section>

          <Section id="rg-round" title={sheet.round.title}>
            <Steps steps={sheet.round.steps} />
            <DiceTable id="rg-reinforcements" table={sheet.reinforcements} />
          </Section>

          <Section id="rg-traits" title={sheet.traits.title}>
            <p className="text-sm italic">{sheet.traits.note}</p>
            <Pairs rows={sheet.traits.rows} />
            <DiceTable id="rg-misfire" table={sheet.misfire} />
          </Section>
        </div>

        <div className="min-w-0 space-y-8">
          <Section id="rg-hide" title={sheet.hide.label} icon="skull">
            <Pairs rows={sheet.hide.rows} />
            <Lines rows={[sheet.hide.text]} />
          </Section>

          <Section id="rg-melee" title={sheet.melee.label} icon="sword">
            <Steps steps={sheet.melee.rows} />
          </Section>

          <Section id="rg-ranged" title={sheet.ranged.label} icon="bow">
            <Lines rows={sheet.ranged.rows} />
            <Lines rows={[sheet.ranged.cover]} />
          </Section>

          <Section id="rg-arcane" title={sheet.arcane.label} icon="staff">
            <Pairs rows={sheet.arcane.rows} />
            <DiceTable id="rg-miscast" table={sheet.miscast} />
          </Section>

          <Section id="rg-bloodied" title={sheet.bloodied.label} icon="drop">
            <Lines rows={sheet.bloodied.rows} />
          </Section>

          <Section id="rg-moves" title={sheet.moves.label} icon="boot">
            <Pairs rows={sheet.moves.rows} />
          </Section>
        </div>
      </div>
    </article>
  );
}
