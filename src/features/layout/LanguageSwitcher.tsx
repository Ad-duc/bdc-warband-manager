/*
 * File:        src/features/layout/LanguageSwitcher.tsx
 * Role:        Language selector of the header. The choice is saved by the
 *              i18next detector (localStorage) and restored on next visit.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, currentLanguage } from "../../i18n/index.ts";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const active = currentLanguage();

  return (
    <div role="group" aria-label={t("language.label")} className="flex gap-1">
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={active === lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className="min-h-11 min-w-11 border-2 border-on-page px-2 text-sm uppercase aria-pressed:bg-on-page aria-pressed:text-page"
        >
          <span aria-hidden="true">{lng}</span>
          <span className="sr-only">{t(`language.${lng}`)}</span>
        </button>
      ))}
    </div>
  );
}
