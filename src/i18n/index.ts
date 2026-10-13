/*
 * File:        src/i18n/index.ts
 * Role:        i18next initialisation: the interface is in French only (the
 *              English resources are kept, unused, with the same keys) and the
 *              <html lang> attribute follows the language. A post-processor writes every die
 *              with its count (1D6).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { withDiceCount } from "./dice.ts";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Current interface language, reduced to a supported code. */
export function currentLanguage(): Language {
  const code = (i18n.resolvedLanguage ?? i18n.language).slice(0, 2);
  return isLanguage(code) ? code : "fr";
}

void i18n
  .use({ type: "postProcessor", name: "dice", process: (value: string) => withDiceCount(value) })
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    // The interface is shown in French only; the English strings stay in
    // en.json (same keys) so that the language can come back later.
    lng: "fr",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: "fr",
    // Every interface string states the number of dice of a roll (1D6).
    postProcess: ["dice"],
    interpolation: { escapeValue: false },
  });

const syncHtmlLang = (): void => {
  if (typeof document !== "undefined") document.documentElement.lang = currentLanguage();
};
i18n.on("languageChanged", syncHtmlLang);
syncHtmlLang();

export default i18n;
