/*
 * File:        src/features/common/ClampedText.tsx
 * Role:        Long text (plain or rich) cut to three lines with a "read more"
 *              / "show less" button. The button only appears when the text overflows, and
 *              the overflow is measured again when the box is resized. With
 *              `uniform`, the closed text always takes three lines and the
 *              button line is kept, so that a list of cards has one height.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ClampedTextProps {
  /** Id of the paragraph, for aria-describedby; generated when omitted. */
  id?: string;
  /** Plain text, or use children for rich content. */
  text?: string;
  children?: ReactNode;
  /** Any value whose change means the content changed (the text in the current language). */
  watch?: string;
  className?: string;
  /** Keep three lines and the button line while closed, even for a short text. */
  uniform?: boolean;
}

/** Text cut to three lines, with a toggle shown only when the text is longer. */
export function ClampedText({
  id,
  text,
  children,
  watch,
  className = "",
  uniform = false,
}: ClampedTextProps) {
  const { t } = useTranslation();
  const generated = useId();
  const paragraphId = id ?? generated;
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
  }, [open, text, watch]);

  return (
    <>
      <p
        id={paragraphId}
        ref={ref}
        className={`${className} ${open ? "" : "line-clamp-3"} ${uniform && !open ? "min-h-[3lh]" : ""}`}
      >
        {children ?? text}
      </p>
      {uniform && !overflows && !open && <span aria-hidden="true" className="block min-h-11" />}
      {(overflows || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={paragraphId}
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
