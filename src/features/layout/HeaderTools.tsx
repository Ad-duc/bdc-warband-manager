/*
 * File:        src/features/layout/HeaderTools.tsx
 * Role:        Tools of the header: direction dice, card back generator,
 *              reminder sheet, French rules reader and language selector. From
 *              the "sm" breakpoint they are shown as buttons (icons, labels
 *              from "xl");
 *              on phones they are grouped in one menu so the title keeps the
 *              room it needs. The menu closes with Escape, an outside click
 *              or the choice of an entry.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, useRoute } from "../../app/router.ts";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";

const BUTTON =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 border-2 border-on-page px-2 text-sm hover:bg-on-page hover:text-page aria-[current=page]:bg-on-page aria-[current=page]:text-page xl:px-3";
const MENU_ITEM =
  "flex min-h-11 w-full items-center gap-3 border-2 border-on-page px-3 text-left hover:bg-on-page hover:text-page aria-[current=page]:bg-on-page aria-[current=page]:text-page";

function Icon({ children }: { children: ReactNode }) {
  return (
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
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const DieIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M12 6l3.5 5h-2.3v7h-2.4v-7H8.5z" />
  </Icon>
);
const BacksIcon = () => (
  <Icon>
    <rect x="7" y="3" width="13" height="17" />
    <path d="M4 6v15h12" />
    <path d="M13.5 8l2.5 3.5-2.5 3.5-2.5-3.5z" />
  </Icon>
);
const ReminderIcon = () => (
  <Icon>
    <rect x="5" y="3" width="14" height="18" />
    <path d="M9 3v3h6V3" />
    <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
  </Icon>
);
const RulesIcon = () => (
  <Icon>
    <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
    <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export function HeaderTools({ onOpenDie }: { onOpenDie: () => void }) {
  const { t } = useTranslation();
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  const backsCurrent = route.name === "cardBacks" ? "page" : undefined;
  const rulesCurrent = route.name === "rules" ? "page" : undefined;
  const reminderCurrent = route.name === "reminder" ? "page" : undefined;

  /* Closes the phone menu on Escape (focus back on its button) and on a click outside. */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      toggle.current?.focus();
    };
    const onPointer = (e: PointerEvent): void => {
      if (wrapper.current !== null && !wrapper.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  /* A new screen closes the menu (state adjusted during render, no effect). */
  const [menuRoute, setMenuRoute] = useState(route.name);
  if (menuRoute !== route.name) {
    setMenuRoute(route.name);
    setMenuOpen(false);
  }

  const close = (): void => {
    setMenuOpen(false);
  };

  return (
    <>
      {/* Tablets and computers: one button per tool */}
      <div className="hidden items-center gap-3 sm:flex xl:gap-4">
        <button type="button" aria-haspopup="dialog" onClick={onOpenDie} className={BUTTON}>
          <DieIcon />
          <span className="sr-only xl:not-sr-only">{t("header.directionDie")}</span>
        </button>
        <a href={hrefFor({ name: "cardBacks" })} aria-current={backsCurrent} className={BUTTON}>
          <BacksIcon />
          <span className="sr-only xl:not-sr-only">{t("header.cardBacks")}</span>
        </a>
        <a href={hrefFor({ name: "reminder" })} aria-current={reminderCurrent} className={BUTTON}>
          <ReminderIcon />
          <span className="sr-only xl:not-sr-only">{t("header.reminder")}</span>
        </a>
        <a href={hrefFor({ name: "rules", chapter: null })} aria-current={rulesCurrent} className={BUTTON}>
          <RulesIcon />
          <span className="sr-only xl:not-sr-only">{t("header.rules")}</span>
        </a>
        <LanguageSwitcher />
      </div>

      {/* Phones: the same tools in one menu */}
      <div ref={wrapper} className="relative sm:hidden">
        <button
          ref={toggle}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => {
            setMenuOpen(!menuOpen);
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center border-2 border-on-page aria-expanded:bg-on-page aria-expanded:text-page"
        >
          <Icon>
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </Icon>
          <span className="sr-only">{t("header.menu")}</span>
        </button>
        <div
          id={menuId}
          hidden={!menuOpen}
          className="absolute right-0 top-full z-30 mt-2 w-64 space-y-2 border-2 border-on-page bg-page p-2 shadow-lg"
        >
          <button
            type="button"
            aria-haspopup="dialog"
            className={MENU_ITEM}
            onClick={() => {
              close();
              onOpenDie();
            }}
          >
            <DieIcon />
            {t("header.directionDie")}
          </button>
          <a
            href={hrefFor({ name: "cardBacks" })}
            aria-current={backsCurrent}
            className={MENU_ITEM}
            onClick={close}
          >
            <BacksIcon />
            {t("header.cardBacks")}
          </a>
          <a
            href={hrefFor({ name: "reminder" })}
            aria-current={reminderCurrent}
            className={MENU_ITEM}
            onClick={close}
          >
            <ReminderIcon />
            {t("header.reminder")}
          </a>
          <a
            href={hrefFor({ name: "rules", chapter: null })}
            aria-current={rulesCurrent}
            className={MENU_ITEM}
            onClick={close}
          >
            <RulesIcon />
            {t("header.rules")}
          </a>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-sm text-on-page-muted">{t("language.label")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </>
  );
}
