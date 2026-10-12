/*
 * File:        src/print/ReminderPage.tsx
 * Role:        Reminder sheet screen (header button): the French reminder
 *              sheet on one A4 page, printed through the browser dialog. The
 *              sheet stays in French whatever the interface language.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { ReminderSheet } from "./ReminderSheet.tsx";

export function ReminderPage() {
  const { t } = useTranslation();
  return (
    <div>
      <section aria-labelledby="reminder-heading" className="no-print panel-parchment mb-6 space-y-3 p-4">
        <h1 id="reminder-heading" className="font-hand text-3xl">
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
            {t("print.print")}
          </button>
          <a className="btn" href="#/">
            {t("print.back")}
          </a>
        </div>
      </section>
      <div className="print-root">
        <ReminderSheet />
      </div>
    </div>
  );
}
