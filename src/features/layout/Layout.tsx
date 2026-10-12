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
import { gameData } from "../../data/index.ts";

const BASE = import.meta.env.BASE_URL;

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-panel focus:p-2 focus:text-on-panel"
      >
        {t("app.skipToContent")}
      </a>

      <header className="border-b-2 border-rule">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <img src={`${BASE}images/logo.png`} alt="" width={56} height={63} className="h-14 w-auto" />
          <div className="flex-1">
            <p className="font-gothic text-3xl leading-none">{t("app.gameTitle")}</p>
            <p className="font-hand text-lg text-on-page-muted">{t("app.tagline")}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t-2 border-rule">
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-4 text-sm text-on-page-muted">
          <p>{t("footer.disclaimer")}</p>
          <p>
            {t("footer.version", {
              version: __APP_VERSION__,
              rules: gameData.common.sourceVersion.replace("playtest-", ""),
            })}
            {" - "}
            {t("footer.offline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
