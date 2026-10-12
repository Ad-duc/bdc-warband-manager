/*
 * File:        src/features/layout/Layout.tsx
 * Role:        Common page frame: skip link; header with logo, title, link to
 *              the French rules reader and language selector; main area;
 *              footer with the fan-made notice, the version, a link to the
 *              changelog and the support link. The frame fills the window:
 *              header and footer stay in place and only the area between them
 *              scrolls. Both are more compact on phones; print keeps the
 *              normal flow.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { useGameData } from "../../data/useGameData.ts";
import { hrefFor, useRoute } from "../../app/router.ts";

const BASE = import.meta.env.BASE_URL;

/** Optional support link shown in the bottom-right corner of the footer. */
const SUPPORT_URL = "https://buymeacoffee.com/ad.duc";

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const gameData = useGameData();
  const route = useRoute();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden print:h-auto print:overflow-visible">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-panel focus:p-2 focus:text-on-panel"
      >
        {t("app.skipToContent")}
      </a>

      <header className="no-print shrink-0 border-b-2 border-rule">
        <div className="mx-auto flex max-w-[120rem] items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6 sm:py-3 xl:px-10">
          <img
            src={`${BASE}images/logo.webp`}
            alt=""
            width={56}
            height={63}
            className="h-10 w-auto sm:h-14"
          />
          <div className="min-w-0 flex-1">
            <a href="#/" className="block font-gothic text-2xl leading-none sm:text-3xl">
              {t("app.gameTitle")}
            </a>
            <p className="truncate font-hand text-base text-on-page-muted sm:text-lg">{t("app.tagline")}</p>
          </div>
          <a
            href={hrefFor({ name: "rules", chapter: null })}
            aria-current={route.name === "rules" ? "page" : undefined}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 border-2 border-on-page px-2 text-sm hover:bg-on-page hover:text-page aria-[current=page]:bg-on-page aria-[current=page]:text-page sm:px-3"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
              <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="sr-only sm:not-sr-only">{t("header.rules")}</span>
          </a>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto print:overflow-visible">
        <main id="main" className="mx-auto w-full max-w-[120rem] px-4 py-8 sm:px-6 xl:px-10">
          {children}
        </main>
      </div>

      <footer className="no-print shrink-0 border-t-2 border-rule">
        <div className="mx-auto flex max-w-[120rem] items-center justify-between gap-3 px-4 py-2 text-xs text-on-page-muted sm:items-end sm:gap-4 sm:px-6 sm:py-4 sm:text-sm xl:px-10">
          <div className="space-y-1">
            <p>{t("footer.disclaimer")}</p>
            <p>
              {t("footer.version", {
                version: __APP_VERSION__,
                rules: gameData === null ? "" : gameData.common.sourceVersion.replace("playtest-", ""),
              })}
              {" - "}
              {t("footer.offline")}
              {" - "}
              <a
                href={hrefFor({ name: "changelog" })}
                aria-current={route.name === "changelog" ? "page" : undefined}
                className="underline underline-offset-2 hover:text-on-page"
              >
                {t("footer.changelog")}
              </a>
            </p>
          </div>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 border-2 border-on-page px-3 text-on-page hover:bg-on-page hover:text-page"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
              <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
              <path d="M8 3v3M12 3v3" />
            </svg>
            <span className="sr-only sm:not-sr-only">{t("footer.support")}</span>
            <span className="sr-only">{t("footer.newTab")}</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
