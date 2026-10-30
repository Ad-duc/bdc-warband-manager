/*
 * File:        src/features/reminder/ReminderPage.tsx
 * Role:        Reminder sheet screen (header button). On screen the French
 *              reminder sheet is shown like the other screens
 *              (ReminderGuide); the print button prints the A4 layout of the
 *              official sheet (ReminderSheet), which is hidden on screen. Both
 *              stay in French whatever the interface language.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { ReminderSheet } from "../../print/ReminderSheet.tsx";
import { ReminderGuide } from "./ReminderGuide.tsx";

export function ReminderPage() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="no-print space-y-6">
        <section aria-labelledby="reminder-heading" className="panel-parchment space-y-3 p-4">
          <h1 id="reminder-heading" className="title-page">
            {t("reminder.title")}
          </h1>
          <p className="text-sm">{t("reminder.intro")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-solid"
              onClick={() => {
                window.print();
              }}
            >
              {t("reminder.print")}
            </button>
            <a className="btn" href="#/">
              {t("print.back")}
            </a>
          </div>
        </section>
        <ReminderGuide />
      </div>
      <div className="print-root print-only">
        <ReminderSheet />
      </div>
    </div>
  );
}
