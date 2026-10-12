/*
 * File:        src/i18n/text.ts
 * Role:        Hooks and helpers to display game data in the active language:
 *              bilingual texts, numbers, dates, dice, characteristics and
 *              weapon values with the roster abbreviations of each language.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { AttackProfile, LocalizedText, StatKey } from "../data/schema.ts";
import { isLanguage, type Language } from "./index.ts";

export function pick(text: LocalizedText, lang: Language): string {
  return text[lang];
}

/** "d3+1" stays lower case in English and becomes "D3+1" in French. */
export function formatDice(value: number | string | null | undefined, lang: Language): string {
  if (value === null || value === undefined) return "-";
  const s = String(value);
  return lang === "fr" ? s.replace(/d/g, "D") : s;
}

export function formatRend(rend: number): string {
  return rend === 0 ? "-" : String(rend);
}

export function formatRange(profile: AttackProfile, flameLabel: string): string {
  if (profile.range === undefined) return "-";
  return profile.range === "flame" ? flameLabel : `${profile.range}"`;
}

/** Characteristic as printed: 5", 3+, 4, or "-". */
export function formatStat(key: StatKey, value: number | null): string {
  if (value === null) return "-";
  if (key === "mv") return `${value}"`;
  if (key === "bl" || key === "bw" || key === "ar") return `${value}+`;
  return String(value);
}

export interface Formatter {
  lang: Language;
  text: (t: LocalizedText) => string;
  number: (n: number) => string;
  date: (iso: string) => string;
  day: (iso: string) => string;
  dice: (v: number | string | null | undefined) => string;
}

export function useFormatter(): Formatter {
  const { i18n } = useTranslation();
  const code = (i18n.resolvedLanguage ?? i18n.language).slice(0, 2);
  const lang: Language = isLanguage(code) ? code : "en";
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  return {
    lang,
    text: (t) => pick(t, lang),
    // Plain spaces instead of the (narrow) non-breaking spaces of Intl, see check-data typography rules.
    number: (n) => new Intl.NumberFormat(locale).format(n).replace(/[\u00A0\u202F]/g, " "),
    date: (iso) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)),
    day: (iso) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
        .format(new Date(iso))
        .replace(/[\u00A0\u202F]/g, " "),
    dice: (v) => formatDice(v, lang),
  };
}
