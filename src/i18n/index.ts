/*
 * File:        src/i18n/index.ts
 * Role:        i18next initialisation: English and French resources, language
 *              detection (saved choice first, then browser language) and sync of
 *              the <html lang> attribute.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = "bdc.language";

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Current interface language, reduced to a supported code. */
export function currentLanguage(): Language {
  const code = (i18n.resolvedLanguage ?? i18n.language).slice(0, 2);
  return isLanguage(code) ? code : "en";
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

const syncHtmlLang = (): void => {
  if (typeof document !== "undefined") document.documentElement.lang = currentLanguage();
};
i18n.on("languageChanged", syncHtmlLang);
syncHtmlLang();

export default i18n;
