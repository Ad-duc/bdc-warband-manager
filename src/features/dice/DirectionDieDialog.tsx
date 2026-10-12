/*
 * File:        src/features/dice/DirectionDieDialog.tsx
 * Role:        Direction dice opened from the header, over the current screen:
 *              an arrow pointing in any direction (as a dice with arrows on
 *              its faces) and, as an option, the scatter distance of the rules
 *              (D6", D6x2" or 3D6"). Native <dialog> (focus trap, Escape to
 *              close); the result is announced to screen readers.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SCATTER_DISTANCES, rollScatter, type ScatterDistance, type ScatterRoll } from "../../rules/dice.ts";

export function DirectionDieDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [distance, setDistance] = useState<ScatterDistance>("d6");
  const [roll, setRoll] = useState<ScatterRoll | null>(null);
  /* Full turns added at each roll so the arrow visibly spins to its new angle. */
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const doRoll = (): void => {
    setRoll(rollScatter(distance));
    setTurns((n) => n + 2);
  };

  const rotation = roll === null ? 0 : turns * 360 + roll.angle;
  const detail =
    roll === null || roll.inches === null
      ? ""
      : roll.distance === "d6x2"
        ? t("directionDie.detail.double", { die: roll.dice[0], inches: roll.inches })
        : roll.distance === "3d6"
          ? t("directionDie.detail.sum", { dice: roll.dice.join(" + "), inches: roll.inches })
          : t("directionDie.detail.single", { inches: roll.inches });

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid="direction-die"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="panel-parchment m-auto w-[min(28rem,calc(100vw-2rem))] p-5 backdrop:bg-ink/80"
    >
      <h2 id={titleId} className="font-hand text-2xl">
        {t("directionDie.title")}
      </h2>
      <p className="mt-1 text-sm">{t("directionDie.intro")}</p>

      <fieldset className="mt-3">
        <legend className="font-bold">{t("directionDie.distance")}</legend>
        <div className="grid gap-1">
          {SCATTER_DISTANCES.map((d) => (
            <label key={d} className="inline-flex items-start gap-2">
              <input
                type="radio"
                name="scatter-distance"
                className="mt-0.5 size-5 shrink-0"
                checked={distance === d}
                onChange={() => {
                  setDistance(d);
                }}
              />
              <span>
                <strong>{t(`directionDie.distances.${d}.label`)}</strong>{" "}
                <span className="text-sm text-on-panel-muted">{t(`directionDie.distances.${d}.use`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex items-center gap-4">
        <svg
          viewBox="-50 -50 100 100"
          width="112"
          height="112"
          className="shrink-0"
          role="img"
          aria-label={
            roll === null ? t("directionDie.notRolled") : t("directionDie.angle", { angle: roll.angle })
          }
        >
          <rect x="-46" y="-46" width="92" height="92" rx="14" fill="var(--color-ink)" />
          <circle r="38" fill="none" stroke="var(--color-charcoal)" strokeWidth="2" />
          <g
            data-testid="direction-arrow"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
            className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
          >
            <path d="M0 -36 L14 -12 L5 -12 L5 36 L-5 36 L-5 -12 L-14 -12 Z" fill="var(--color-white)" />
          </g>
        </svg>
        <div aria-live="polite" className="min-w-0 flex-1" data-testid="direction-result">
          {roll === null ? (
            <p className="text-sm">{t("directionDie.prompt")}</p>
          ) : (
            <>
              <p className="font-hand text-3xl leading-tight">
                {roll.inches === null ? t("directionDie.directionOnly") : `${roll.inches}"`}
              </p>
              {detail !== "" && <p className="text-sm">{detail}</p>}
              <p className="text-sm text-on-panel-muted">{t("directionDie.angle", { angle: roll.angle })}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>
          {t("directionDie.close")}
        </button>
        <button type="button" className="btn btn-solid" onClick={doRoll}>
          {roll === null ? t("directionDie.roll") : t("directionDie.rollAgain")}
        </button>
      </div>
    </dialog>
  );
}
