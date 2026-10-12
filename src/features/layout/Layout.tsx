/*
 * File:        src/features/layout/Layout.tsx
 * Role:        Common page frame: skip link, header with logo, title and
 *              language selector, main area, footer with the fan-made notice.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { useGameData } from "../../data/useGameData.ts";

const BASE = import.meta.env.BASE_URL;

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const gameData = useGameData();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-panel focus:p-2 focus:text-on-panel"
      >
        {t("app.skipToContent")}
      </a>

      <header className="no-print border-b-2 border-rule">
        <div className="mx-auto flex max-w-[120rem] items-center gap-4 px-4 py-3 sm:px-6 xl:px-10">
          <img src={`${BASE}images/logo.webp`} alt="" width={56} height={63} className="h-14 w-auto" />
          <div className="flex-1">
            <a href="#/" className="block font-gothic text-3xl leading-none">
              {t("app.gameTitle")}
            </a>
            <p className="font-hand text-lg text-on-page-muted">{t("app.tagline")}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main id="main" className="mx-auto min-h-dvh w-full max-w-[120rem] flex-1 px-4 py-8 sm:px-6 xl:px-10">
        {children}
      </main>

      <footer className="no-print border-t-2 border-rule">
        <div className="mx-auto max-w-[120rem] space-y-1 px-4 py-4 sm:px-6 xl:px-10 text-sm text-on-page-muted">
          <p>{t("footer.disclaimer")}</p>
          <p>
            {t("footer.version", {
              version: __APP_VERSION__,
              rules: gameData === null ? "" : gameData.common.sourceVersion.replace("playtest-", ""),
            })}
            {" - "}
            {t("footer.offline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
