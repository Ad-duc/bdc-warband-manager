/*
 * File:        src/features/tutorial/TutorialBoard.tsx
 * Role:        Board of a tutorial step seen from above, drawn in SVG at scale
 *              (one grid square = one inch, any board size): terrain, bases at
 *              their real diameter (side "a" solid, side "b" hatched, never
 *              told apart by colour alone), highlighted fighters, initiative
 *              marker, charge path, arrow of the current attack or parry,
 *              weapon range, measured distances and lines of sight (clear,
 *              obscured, or to a fighter that cannot be picked).
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useFormatter } from "../../i18n/text.ts";
import type { ResolvedFighter } from "../../tutorial/model.ts";
import type { Annotation, Lesson, Point, Step } from "../../tutorial/schema.ts";

/** Width of the drawing in SVG units, whatever the board size. */
const VIEW_WIDTH = 100;
const MM_PER_INCH = 25.4;
/** Below this width (SVG units) a terrain label is written under the piece. */
const NARROW_TERRAIN = 12;

/** Text with a white outline, readable over lines and terrain. */
function Halo({
  x,
  y,
  size,
  anchor = "middle",
  bold = false,
  italic = false,
  muted = false,
  children,
}: {
  x: number;
  y: number;
  size: number;
  anchor?: "start" | "middle" | "end";
  bold?: boolean;
  italic?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={bold ? 700 : 400}
      fontStyle={italic ? "italic" : "normal"}
      textAnchor={anchor}
      strokeWidth="0.8"
      paintOrder="stroke"
      strokeLinejoin="round"
      className={`stroke-white ${muted ? "fill-charcoal" : "fill-ink"}`}
    >
      {children}
    </text>
  );
}

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
  const ids = {
    hatch: `hatch${uid}`,
    grid: `grid${uid}`,
    arrow: `arrow${uid}`,
    arrowMuted: `arrowm${uid}`,
    title: `title${uid}`,
  };
  const unit = VIEW_WIDTH / lesson.board.width;
  const width = VIEW_WIDTH;
  const height = lesson.board.height * unit;

  const fighterOf = (id: string): ResolvedFighter | undefined => fighters.find((x) => x.lesson.id === id);
  const at = (id: string): [number, number] | undefined => {
    const p: Point | undefined = step.positions[id];
    return p === undefined ? undefined : [p[0] * unit, p[1] * unit];
  };
  const radius = (fighter: ResolvedFighter | undefined): number =>
    fighter === undefined ? 0 : (fighter.lesson.base / MM_PER_INCH / 2) * unit;
  const nameOf = (id: string): string => {
    const fighter = fighterOf(id);
    return fighter === undefined ? id : f.text(fighter.name);
  };

  /** Segment between the edges of two bases, its middle and its normal (for labels). */
  const segment = (fromId: string, toId: string) => {
    const a = at(fromId);
    const b = at(toId);
    if (a === undefined || b === undefined) return null;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const length = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / length, dy / length];
    const ra = radius(fighterOf(fromId)) + 0.6;
    const rb = radius(fighterOf(toId)) + 0.6;
    const start: [number, number] = [a[0] + ux * ra, a[1] + uy * ra];
    const end: [number, number] = [b[0] - ux * rb, b[1] - uy * rb];
    // Unit normal pointing up the page, so labels sit above the line.
    const up: [number, number] = ux >= 0 ? [uy, -ux] : [-uy, ux];
    return { start, end, mid: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] as const, up };
  };

  const focused = step.focus.map(nameOf);
  const description = t("tutorial.board.description", {
    fighters: fighters.map((x) => f.text(x.name)).join(", "),
    focus: focused.length === 0 ? t("tutorial.board.nobody") : focused.join(", "),
  });

  const annotation = (a: Annotation, key: number): ReactNode => {
    switch (a.kind) {
      case "charge": {
        const to = at(a.fighter);
        if (to === undefined) return null;
        const [fx, fy] = [a.from[0] * unit, a.from[1] * unit];
        const [tx, ty] = to;
        const r = radius(fighterOf(a.fighter));
        const cx = (fx + tx) / 2;
        const cy = Math.max(fy, ty) + 4;
        return (
          <g key={key}>
            <circle
              cx={fx}
              cy={fy}
              r={r}
              fill="none"
              strokeWidth="0.6"
              strokeDasharray="1.2 1"
              className="stroke-mist"
            />
            <Halo x={fx} y={fy + r + 3.4} size={2.4} muted>
              {t("tutorial.board.start")}
            </Halo>
            <path
              d={`M${fx + r - 1} ${fy - 1} Q ${cx} ${cy} ${tx - r - 0.8} ${ty + 1.5}`}
              fill="none"
              strokeWidth="0.7"
              strokeDasharray="1.6 1.2"
              markerEnd={`url(#${ids.arrowMuted})`}
              className="stroke-charcoal"
            />
            <Halo x={cx} y={cy + 2.5} size={2.6} anchor="start" italic muted>
              {t("tutorial.board.charge")}
            </Halo>
          </g>
        );
      }
      case "exchange": {
        const from = at(a.from);
        const to = at(a.to);
        if (from === undefined || to === undefined) return null;
        const [ax, ay, bx] = [from[0], from[1], to[0]];
        const dir = bx >= ax ? 1 : -1;
        const mx = (ax + bx) / 2;
        return (
          <g key={key}>
            <path
              d={`M${ax} ${ay - 8} Q ${mx} ${ay - 15} ${bx - dir * 1.5} ${ay - 7}`}
              fill="none"
              strokeWidth="0.7"
              markerEnd={`url(#${ids.arrow})`}
              className="stroke-ink"
            />
            <Halo x={mx} y={ay - 15.5} size={2.8} bold>
              {a.label}
            </Halo>
          </g>
        );
      }
      case "range": {
        const c = at(a.fighter);
        if (c === undefined) return null;
        const r = a.inches * unit;
        return (
          <g key={key}>
            <circle
              cx={c[0]}
              cy={c[1]}
              r={r}
              fill="none"
              strokeWidth="0.6"
              strokeDasharray="2 1.2"
              className="stroke-ash"
            />
            <Halo x={c[0] + r - 1} y={c[1] - 1.2} size={2.6} anchor="end" italic muted>
              {a.label}
            </Halo>
          </g>
        );
      }
      case "measure": {
        const s = segment(a.from, a.to);
        if (s === null) return null;
        return (
          <g key={key}>
            <line
              x1={s.start[0]}
              y1={s.start[1]}
              x2={s.end[0]}
              y2={s.end[1]}
              strokeWidth="0.4"
              strokeDasharray="0.8 0.8"
              className="stroke-ash"
            />
            <Halo x={s.mid[0] + s.up[0] * 2} y={s.mid[1] + s.up[1] * 2 + 0.9} size={2.6} muted>
              {a.label}
            </Halo>
          </g>
        );
      }
      case "sight": {
        const s = segment(a.from, a.to);
        if (s === null) return null;
        const style = {
          clear: { width: "0.7", dash: undefined, className: "stroke-ink" },
          obscured: { width: "0.7", dash: "2 1", className: "stroke-ink" },
          excluded: { width: "0.5", dash: "0.6 1", className: "stroke-ash" },
        }[a.state];
        const [ex, ey] = s.end;
        return (
          <g key={key}>
            <line
              x1={s.start[0]}
              y1={s.start[1]}
              x2={ex}
              y2={ey}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              markerEnd={a.state === "excluded" ? undefined : `url(#${ids.arrow})`}
              className={style.className}
            />
            {a.state === "excluded" && (
              <path
                d={`M${ex - 1.2} ${ey - 1.2}L${ex + 1.2} ${ey + 1.2}M${ex - 1.2} ${ey + 1.2}L${ex + 1.2} ${ey - 1.2}`}
                strokeWidth="0.7"
                className="stroke-ink"
              />
            )}
            <Halo
              x={s.mid[0] + s.up[0] * 2.2}
              y={s.mid[1] + s.up[1] * 2.2 + 0.9}
              size={2.6}
              bold={a.state !== "excluded"}
              muted={a.state === "excluded"}
            >
              {a.label}
            </Halo>
          </g>
        );
      }
    }
  };

  // Names go under the base, pushed aside when another base stands next to it.
  const labelSide = (id: string): "start" | "middle" | "end" => {
    const p = at(id);
    const r = radius(fighterOf(id));
    if (p === undefined) return "middle";
    for (const other of fighters) {
      if (other.lesson.id === id) continue;
      const q = at(other.lesson.id);
      if (q === undefined) continue;
      if (Math.abs(q[1] - p[1]) < r * 2 && Math.abs(q[0] - p[0]) < r * 4)
        return q[0] > p[0] ? "end" : "start";
    }
    return "middle";
  };

  // A name goes above its base when, below, it would overlap terrain or leave the board.
  const NAME_SIZE = 2.8;
  const nameAbove = (x: number, y: number, r: number, anchor: "start" | "middle" | "end", text: string) => {
    const w = text.length * NAME_SIZE * 0.55;
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    const [top, bottom] = [y + r + 1.6, y + r + 5];
    if (bottom > height) return true;
    return lesson.board.terrain.some((piece) => {
      const [px, py, pw, ph] = [piece.x * unit, piece.y * unit, piece.width * unit, piece.height * unit];
      return left < px + pw && left + w > px && top < py + ph && bottom > py;
    });
  };

  const sides = (["a", "b"] as const)
    .map((side) => ({
      side,
      names: [...new Set(fighters.filter((x) => x.lesson.side === side).map((x) => f.text(x.name)))],
    }))
    .filter((s) => s.names.length > 0);

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
          <pattern id={ids.grid} width={unit} height={unit} patternUnits="userSpaceOnUse">
            <path d={`M${unit} 0H0V${unit}`} fill="none" strokeWidth="0.3" className="stroke-bone" />
          </pattern>
          {[
            { id: ids.arrow, className: "fill-ink" },
            { id: ids.arrowMuted, className: "fill-charcoal" },
          ].map((m) => (
            <marker
              key={m.id}
              id={m.id}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" className={m.className} />
            </marker>
          ))}
        </defs>

        <rect width={width} height={height} fill={`url(#${ids.grid})`} />

        {lesson.board.terrain.map((piece) => {
          const w = piece.width * unit;
          const narrow = w < NARROW_TERRAIN;
          const [x, y, h] = [piece.x * unit, piece.y * unit, piece.height * unit];
          return (
            <g key={`${piece.x}-${piece.y}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                strokeWidth="0.5"
                className="fill-stone stroke-charcoal"
              />
              <Halo x={x + w / 2} y={narrow ? y + h + 3 : y + h / 2 + 0.9} size={2.6} italic muted>
                {piece.label}
              </Halo>
            </g>
          );
        })}

        <g transform={`translate(${lesson.board.ruler[0] * unit} ${lesson.board.ruler[1] * unit})`}>
          <path d={`M0 -1V1M0 0H${unit}M${unit} -1V1`} strokeWidth="0.6" className="stroke-ink" />
          <text x={unit + 2} y="1" fontSize="2.6" className="fill-ink">
            {t("tutorial.board.inch")}
          </text>
        </g>

        {step.annotations.map(annotation)}

        {fighters.map((fighter) => {
          const p = at(fighter.lesson.id);
          if (p === undefined) return null;
          const [x, y] = p;
          const r = radius(fighter);
          const anchor = labelSide(fighter.lesson.id);
          const left = anchor !== "start";
          const nameX = anchor === "middle" ? x : x + (anchor === "end" ? r : -r) * 0.6;
          const shortName = fighter.lesson.boardLabel ?? f.text(fighter.name);
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
              <Halo
                x={nameX}
                y={nameAbove(x, y, r, anchor, shortName) ? y - r - 1.8 : y + r + 4.2}
                size={NAME_SIZE}
                anchor={anchor}
                bold
              >
                {shortName}
              </Halo>
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
                  <Halo x={left ? -3 : 3} y={0.8} size={2.2} anchor={left ? "end" : "start"} italic muted>
                    {t("tutorial.board.initiative")}
                  </Halo>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs italic text-on-panel-muted">
        {sides.map(({ side, names }) => (
          <span key={side} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block size-3 rotate-45 border-2 border-on-panel ${
                side === "a" ? "bg-on-panel" : "bg-white"
              }`}
            />
            {t(side === "a" ? "tutorial.board.sideSolid" : "tutorial.board.sideHatched", {
              name: names.join(", "),
            })}
          </span>
        ))}
        <span>{t("tutorial.board.scale")}</span>
      </figcaption>
    </figure>
  );
}
