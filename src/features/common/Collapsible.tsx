/*
 * File:        src/features/common/Collapsible.tsx
 * Role:        Collapsible menu built on <details>/<summary>: an ink band
 *              with a chevron that opens or closes its content. It keeps its
 *              own state (defaultOpen) or follows the state given by its
 *              parent (open + onOpenChange), so a screen can remember which
 *              groups are open when the content around them changes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-30
 * License:     MIT
 */

import { useState, type ReactNode } from "react";

interface CollapsibleProps {
  /** Text of the band; any extra detail (a count) can follow the title. */
  summary: ReactNode;
  children: ReactNode;
  /** Initial state when the parent does not control it. */
  defaultOpen?: boolean;
  /** Controlled state, used with onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** "section" for a main group (larger band), "sub" for a group inside it. */
  level?: "section" | "sub";
  className?: string;
  testId?: string;
}

export function Collapsible({
  summary,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  level = "sub",
  className = "",
  testId,
}: CollapsibleProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;

  return (
    <details
      open={isOpen}
      data-testid={testId}
      className={`group ${className}`}
      onToggle={(e) => {
        const now = e.currentTarget.open;
        if (now === isOpen) return;
        if (open === undefined) setInner(now);
        onOpenChange?.(now);
      }}
    >
      <summary
        className={`band ${level === "section" ? "title-section" : "title-sub"} flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden`}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
        <span className="min-w-0 flex-1">{summary}</span>
      </summary>
      <div className="pt-1">{children}</div>
    </details>
  );
}
