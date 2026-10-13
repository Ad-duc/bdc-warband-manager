/*
 * File:        src/features/tutorial/TutorialBoard.tsx
 * Role:        Board of a tutorial step seen from above, drawn in SVG at scale
 *              (one grid square = one inch): terrain, bases at their real
 *              diameter (side "a" solid, side "b" hatched, never told apart by
 *              colour alone), highlighted fighters, initiative marker, charge
 *              path and the arrow of the current attack or parry.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useFormatter } from "../../i18n/text.ts";
import type { ResolvedFighter } from "../../tutorial/model.ts";
import type { Lesson, Point, Step } from "../../tutorial/schema.ts";

/** SVG units per inch. */
const UNIT = 10;
const MM_PER_INCH = 25.4;

export function TutorialBoard({
  lesson,
  step,
  fighters,
}: {
  lesson: Lesson;
  step: Step;
  fighters: ResolvedFighter[];
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = { hatch: `hatch${uid}`, grid: `grid${uid}`, arrow: `arrow${uid}`, title: `title${uid}` };
  const width = lesson.board.width * UNIT;
  const height = lesson.board.height * UNIT;

  const at = (id: string): Point | undefined => step.positions[id];
  const radius = (fighter: ResolvedFighter): number => (fighter.lesson.base / MM_PER_INCH / 2) * UNIT;
  const nameOf = (id: string): string => {
    const fighter = fighters.find((x) => x.lesson.id === id);
    return fighter === undefined ? id : f.text(fighter.name);
  };
  const xs = fighters.map((x) => at(x.lesson.id)?.[0] ?? 0);
  const middle = xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
  const focused = step.focus.map(nameOf);
  const description = t("tutorial.board.description", {
    fighters: fighters.map((x) => f.text(x.name)).join(", "),
    focus: focused.length === 0 ? t("tutorial.board.nobody") : focused.join(", "),
  });

  return (
    <figure className="self-start border-2 border-on-panel bg-white p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={ids.title}
        className="block h-auto w-full"
      >
        <title id={ids.title}>{`${t("tutorial.board.title")}. ${description}`}</title>
        <defs>
          <pattern
            id={ids.hatch}
            width="1.6"
            height="1.6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="1.6" height="1.6" className="fill-white" />
            <line x1="0" y1="0" x2="0" y2="1.6" strokeWidth="0.8" className="stroke-ink" />
          </pattern>
          <pattern id={ids.grid} width={UNIT} height={UNIT} patternUnits="userSpaceOnUse">
            <path d={`M${UNIT} 0H0V${UNIT}`} fill="none" strokeWidth="0.3" className="stroke-bone" />
          </pattern>
          <marker
            id={ids.arrow}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className="fill-ink" />
          </marker>
        </defs>

        <rect width={width} height={height} fill={`url(#${ids.grid})`} />

        {lesson.board.terrain.map((piece) => (
          <g key={`${piece.x}-${piece.y}`}>
            <rect
              x={piece.x * UNIT}
              y={piece.y * UNIT}
              width={piece.width * UNIT}
              height={piece.height * UNIT}
              strokeWidth="0.5"
              className="fill-stone stroke-charcoal"
            />
            <text
              x={(piece.x + piece.width / 2) * UNIT}
              y={(piece.y + piece.height / 2) * UNIT + 0.9}
              fontSize="2.6"
              fontStyle="italic"
              textAnchor="middle"
              className="fill-charcoal"
            >
              {piece.label}
            </text>
          </g>
        ))}

        <g transform={`translate(4 ${height - 4})`}>
          <path d={`M0 -1V1M0 0H${UNIT}M${UNIT} -1V1`} strokeWidth="0.6" className="stroke-ink" />
          <text x={UNIT + 2} y="1" fontSize="2.6" className="fill-ink">
            {t("tutorial.board.inch")}
          </text>
        </g>

        {step.annotations.map((a) => {
          if (a.kind === "charge") {
            const to = at(a.fighter);
            const fighter = fighters.find((x) => x.lesson.id === a.fighter);
            if (to === undefined || fighter === undefined) return null;
            const [fx, fy] = [a.from[0] * UNIT, a.from[1] * UNIT];
            const [tx, ty] = [to[0] * UNIT, to[1] * UNIT];
            const r = radius(fighter);
            const cx = (fx + tx) / 2;
            const cy = Math.max(fy, ty) + 4;
            return (
              <g key="charge">
                <circle
                  cx={fx}
                  cy={fy}
                  r={r}
                  fill="none"
                  strokeWidth="0.6"
                  strokeDasharray="1.2 1"
                  className="stroke-mist"
                />
                <text x={fx} y={fy + r + 3.4} fontSize="2.4" textAnchor="middle" className="fill-ash">
                  {t("tutorial.board.start")}
                </text>
                <path
                  d={`M${fx + r - 1} ${fy - 1} Q ${cx} ${cy} ${tx - r - 0.8} ${ty + 1.5}`}
                  fill="none"
                  strokeWidth="0.7"
                  strokeDasharray="1.6 1.2"
                  markerEnd={`url(#${ids.arrow})`}
                  className="stroke-charcoal"
                />
                <text x={cx} y={cy + 2.5} fontSize="2.6" fontStyle="italic" className="fill-charcoal">
                  {t("tutorial.board.charge")}
                </text>
              </g>
            );
          }
          const from = at(a.from);
          const to = at(a.to);
          if (from === undefined || to === undefined) return null;
          const [ax, ay, bx] = [from[0] * UNIT, from[1] * UNIT, to[0] * UNIT];
          const dir = bx >= ax ? 1 : -1;
          const mx = (ax + bx) / 2;
          return (
            <g key="exchange">
              <path
                d={`M${ax} ${ay - 8} Q ${mx} ${ay - 15} ${bx - dir * 1.5} ${ay - 7}`}
                fill="none"
                strokeWidth="0.7"
                markerEnd={`url(#${ids.arrow})`}
                className="stroke-ink"
              />
              <text
                x={mx}
                y={ay - 15.5}
                fontSize="2.8"
                fontWeight="700"
                textAnchor="middle"
                className="fill-ink"
              >
                {a.label}
              </text>
            </g>
          );
        })}

        {fighters.map((fighter) => {
          const p = at(fighter.lesson.id);
          if (p === undefined) return null;
          const [x, y] = [p[0] * UNIT, p[1] * UNIT];
          const r = radius(fighter);
          const left = p[0] <= middle;
          return (
            <g key={fighter.lesson.id}>
              {step.focus.includes(fighter.lesson.id) && (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 1.6}
                  fill="none"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 1"
                  className="stroke-charcoal motion-safe:animate-pulse"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                strokeWidth="0.8"
                fill={fighter.lesson.side === "a" ? undefined : `url(#${ids.hatch})`}
                className={fighter.lesson.side === "a" ? "fill-ink stroke-ink" : "stroke-ink"}
              />
              <text
                x={x + (left ? 3 : -3)}
                y={y + r + 4.2}
                fontSize="2.8"
                fontWeight="700"
                textAnchor={left ? "end" : "start"}
                className="fill-ink"
              >
                {f.text(fighter.name)}
              </text>
              {step.initiative === fighter.lesson.id && (
                // Diamond marker on the outer side of the base, its label beyond it.
                <g transform={`translate(${x + (left ? -9.5 : 9.5)} ${y - 6})`}>
                  <rect
                    x="-1.6"
                    y="-1.6"
                    width="3.2"
                    height="3.2"
                    transform="rotate(45)"
                    className="fill-ink"
                  />
                  <text y="0.9" fontSize="2.4" fontWeight="700" textAnchor="middle" className="fill-white">
                    {t("tutorial.board.initiativeMark")}
                  </text>
                  <text
                    x={left ? -3 : 3}
                    y="0.8"
                    fontSize="2.2"
                    fontStyle="italic"
                    textAnchor={left ? "end" : "start"}
                    className="fill-charcoal"
                  >
                    {t("tutorial.board.initiative")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs italic text-on-panel-muted">
        {fighters.map((fighter) => (
          <span key={fighter.lesson.id} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block size-3 rotate-45 border-2 border-on-panel ${
                fighter.lesson.side === "a" ? "bg-on-panel" : "bg-white"
              }`}
            />
            {t(fighter.lesson.side === "a" ? "tutorial.board.sideSolid" : "tutorial.board.sideHatched", {
              name: f.text(fighter.name),
            })}
          </span>
        ))}
        <span>{t("tutorial.board.scale")}</span>
      </figcaption>
    </figure>
  );
}
