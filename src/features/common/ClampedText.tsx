/*
 * File:        src/features/common/ClampedText.tsx
 * Role:        Long text cut to three lines with a "read more" / "show less"
 *              button. The button only appears when the text overflows, and
 *              the overflow is measured again when the box is resized.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** Text cut to three lines, with a toggle shown only when the text is longer. */
export function ClampedText({ id, text, className = "" }: { id: string; text: string; className?: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || open) return;
    const measure = (): void => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [open, text]);

  return (
    <>
      <p id={id} ref={ref} className={`${className} ${open ? "" : "line-clamp-3"}`}>
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen((o) => !o);
          }}
          className="min-h-11 self-start text-sm font-bold not-italic underline underline-offset-4"
        >
          {open ? t("common.readLess") : t("common.readMore")}
        </button>
      )}
    </>
  );
}
