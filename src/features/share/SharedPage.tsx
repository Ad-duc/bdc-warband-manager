/*
 * File:        src/features/share/SharedPage.tsx
 * Role:        Read-only view of a warband opened from a share link
 *              ("#w=..."): roster preview, print, and "save a copy" into the
 *              local database under a new id.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { db, saveWarband } from "../../db/database.ts";
import { hrefFor, navigate } from "../../app/router.ts";
import { PrintView } from "../../print/PrintPage.tsx";
import { newId, nowIso } from "../warbands/factory.ts";
import { decodeWarband } from "./share.ts";

export function SharedPage({ payload }: { payload: string }) {
  const { t } = useTranslation();
  const result = useMemo(() => decodeWarband(payload), [payload]);

  if (!result.ok || result.warbands[0] === undefined)
    return (
      <section className="panel-parchment p-6 text-center" role="alert">
        <p>{t("share.invalid")}</p>
        <a className="btn btn-solid mt-4" href={hrefFor({ name: "home" })}>
          {t("wizard.backHome")}
        </a>
      </section>
    );
  const warband = result.warbands[0];

  const saveCopy = async () => {
    const now = nowIso();
    const copy = { ...warband, id: newId(), createdAt: now, updatedAt: now };
    await saveWarband(db, copy);
    navigate({ name: copy.mode === "campaign" ? "campaign" : "wizard", id: copy.id });
  };

  return (
    <div>
      <section
        className="no-print panel-parchment mb-4 flex flex-wrap items-center gap-3 p-4"
        aria-labelledby="shared-heading"
      >
        <div className="min-w-0 flex-1">
          <h1 id="shared-heading" className="title-page">
            {t("share.title", { name: warband.name.trim() === "" ? t("home.unnamed") : warband.name })}
          </h1>
          <p>{t("share.readOnly")}</p>
        </div>
        <button type="button" className="btn btn-solid" onClick={() => void saveCopy()}>
          {t("share.saveCopy")}
        </button>
      </section>
      <PrintView warband={warband} backHref={hrefFor({ name: "home" })} />
    </div>
  );
}
