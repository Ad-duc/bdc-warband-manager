/*
 * File:        src/features/share/ShareButton.tsx
 * Role:        Copies the share link of a warband to the clipboard; when the
 *              clipboard is not available, shows the link in a field to copy.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Warband } from "../../data/schema.ts";
import { shareUrl } from "./share.ts";

export function ShareButton({
  warband,
  label,
  small = false,
}: {
  warband: Warband;
  label?: string;
  small?: boolean;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const url = shareUrl(warband);

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={`btn ${small ? "btn-sm" : ""}`}
        aria-label={label}
        onClick={() => {
          navigator.clipboard.writeText(url).then(
            () => {
              setState("copied");
            },
            () => {
              setState("manual");
            },
          );
        }}
      >
        {t("share.button")}
      </button>
      {state === "copied" && (
        <span role="status" className="text-xs">
          {t("share.copied")}
        </span>
      )}
      {state === "manual" && (
        <input
          readOnly
          className="field mt-1 text-xs"
          aria-label={t("share.manual")}
          value={url}
          onFocus={(e) => {
            e.target.select();
          }}
        />
      )}
    </span>
  );
}
