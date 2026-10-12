/*
 * File:        src/features/changelog/ChangelogPage.tsx
 * Role:        "What's new" page: history of the application versions, in the
 *              language of the interface, rendered from the changelog files.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentLanguage, type Language } from "../../i18n/index.ts";
import { renderChapter } from "../reader/markdown.ts";
import { loadChangelog } from "./changelog.ts";

type State = { status: "loading" } | { status: "ready" | "error"; language: Language; html: string };

export function ChangelogPage() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadChangelog(language)
      .then((markdown) => {
        if (active) setState({ status: "ready", language, html: renderChapter(markdown).html });
      })
      .catch(() => {
        if (active) setState({ status: "error", language, html: "" });
      });
    return () => {
      active = false;
    };
  }, [language]);

  // A state left by the other language counts as loading.
  const current = state.status !== "loading" && state.language === language ? state : null;

  return (
    <article className="panel-parchment mx-auto max-w-4xl p-4 sm:p-8" aria-busy={current === null}>
      {current === null && <p>{t("changelog.loading")}</p>}
      {current?.status === "error" && <p role="alert">{t("changelog.error")}</p>}
      {current?.status === "ready" && (
        <div className="reader-content" dangerouslySetInnerHTML={{ __html: current.html }} />
      )}
    </article>
  );
}
