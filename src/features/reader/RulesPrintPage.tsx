/*
 * File:        src/features/reader/RulesPrintPage.tsx
 * Role:        Print view of the whole French translation of the rules: a
 *              title page, the list of chapters and every chapter of the
 *              reader in book order, laid out on two columns for A4 paper
 *              (src/styles/rules-print.css). The screen shows the same pages
 *              as a preview with a print button; the application frame is
 *              hidden when printing. No feedback links in this view.
 * Author:      Adrien Duclaud
 * Created:     2026-10-20
 * License:     MIT
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor } from "../../app/router.ts";
import { CHAPTERS, loadChapter, type Chapter } from "./chapters.ts";
import { renderChapter } from "./markdown.ts";

interface PrintedChapter {
  chapter: Chapter;
  html: string;
}

type State = { status: "loading" } | { status: "ready"; chapters: PrintedChapter[] } | { status: "error" };

/** Loads and renders every chapter in book order, with ids unique to this view. */
async function loadBook(): Promise<PrintedChapter[]> {
  return Promise.all(
    CHAPTERS.map(async (chapter) => {
      const markdown = await loadChapter(chapter);
      return { chapter, html: renderChapter(markdown, { prefix: `p-${chapter.id}` }).html };
    }),
  );
}

export function RulesPrintPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadBook()
      .then((chapters) => {
        if (active) setState({ status: "ready", chapters });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <section
        aria-labelledby="rules-print-heading"
        className="no-print panel-parchment mb-6 space-y-3 p-4 sm:p-6"
      >
        <h1 id="rules-print-heading" className="title-page">
          {t("reader.print.title")}
        </h1>
        <p className="text-sm">{t("reader.print.intro")}</p>
        <p className="text-sm">{t("reader.print.help")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-solid"
            disabled={state.status !== "ready"}
            onClick={() => {
              window.print();
            }}
          >
            {t("print.print")}
          </button>
          <a className="btn" href={hrefFor({ name: "rules", chapter: null })}>
            {t("reader.print.back")}
          </a>
        </div>
      </section>

      {state.status === "loading" && (
        <p className="no-print" aria-busy="true">
          {t("reader.print.loading")}
        </p>
      )}
      {state.status === "error" && (
        <p className="no-print" role="alert">
          {t("reader.error")}
        </p>
      )}
      {state.status === "ready" && (
        <div lang="fr" className="rules-book" data-testid="rules-book">
          <section className="rules-book-cover" aria-label={t("reader.print.coverLabel")}>
            <p className="rules-book-cover-title">{t("reader.print.coverTitle")}</p>
            <p className="rules-book-cover-subtitle">{t("reader.print.coverRules")}</p>
            <p className="rules-book-cover-author">{t("reader.print.coverAuthor")}</p>
            <p className="rules-book-cover-note">{t("reader.notice")}</p>
            <p className="rules-book-cover-note">{t("reader.print.coverSource")}</p>
          </section>

          <nav className="rules-book-toc" aria-label={t("reader.contents")}>
            <h2 className="title-section">{t("reader.contents")}</h2>
            <ol>
              {CHAPTERS.map((c) => (
                <li key={c.id}>{c.title}</li>
              ))}
            </ol>
          </nav>

          {state.chapters.map(({ chapter, html }) => (
            <section
              key={chapter.id}
              className="rules-book-chapter reader-content"
              aria-label={chapter.title}
              data-testid="rules-book-chapter"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
