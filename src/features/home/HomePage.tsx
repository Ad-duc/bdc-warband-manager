/*
 * File:        src/features/home/HomePage.tsx
 * Role:        Home screen. Step 1: themed empty state with the saved warband
 *              count read from IndexedDB. The list, creation and import arrive
 *              in step 3.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db/database.ts";

export function HomePage() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    db.warbands
      .count()
      .then((n) => {
        if (alive) setCount(n);
      })
      .catch(() => {
        if (alive) setCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-labelledby="home-heading" className="panel-parchment mx-auto max-w-3xl p-6 sm:p-10">
      <h1 id="home-heading" className="text-center font-gothic text-4xl sm:text-5xl">
        {t("home.heading")}
      </h1>
      <div className="ornament my-4" aria-hidden="true" />
      <p className="text-center text-lg text-on-panel-muted">{t("home.empty")}</p>
      {count !== null && (
        <p className="mt-2 text-center font-hand text-xl" aria-live="polite">
          {t("home.savedCount", { count })}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {(["create", "import"] as const).map((action) => (
          <button
            key={action}
            type="button"
            disabled
            aria-describedby="home-coming-soon"
            className="min-h-11 border-2 border-on-panel bg-on-panel px-6 py-2 font-bold text-panel disabled:cursor-not-allowed disabled:opacity-70"
          >
            {t(`home.${action}`)}
          </button>
        ))}
      </div>
      <p id="home-coming-soon" className="mt-3 text-center text-sm text-on-panel-muted">
        {t("home.comingSoon")}
      </p>
    </section>
  );
}
