/*
 * File:        src/features/reader/RulesPage.tsx
 * Role:        Reader of the French translation of the rules: chapter list
 *              (side column on large screens, drop-down list on phones),
 *              contents of the current chapter with jumps to its sections,
 *              chapter text and previous / next links. Works offline. The
 *              first heading of the chapter file is the page title.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { currentLanguage } from "../../i18n/index.ts";
import { CHAPTERS, findChapter, loadChapter, type Chapter } from "./chapters.ts";
import { renderChapter, type RenderedChapter } from "./markdown.ts";

type State =
  | { status: "loading" }
  | { status: "ready"; id: string; chapter: RenderedChapter }
  | { status: "error"; id: string };

function scrollToTop(): void {
  document.getElementById("main")?.parentElement?.scrollTo({ top: 0 });
}

function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (target === null) return;
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
}

export function RulesPage({ chapterId }: { chapterId: string | null }) {
  const { t } = useTranslation();
  const chapter = findChapter(chapterId);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (chapter === undefined) return;
    let active = true;
    loadChapter(chapter)
      .then((markdown) => {
        if (!active) return;
        setState({ status: "ready", id: chapter.id, chapter: renderChapter(markdown) });
        scrollToTop();
      })
      .catch(() => {
        if (active) setState({ status: "error", id: chapter.id });
      });
    return () => {
      active = false;
    };
  }, [chapter]);

  const index = chapter === undefined ? -1 : CHAPTERS.indexOf(chapter);
  const previous = index > 0 ? CHAPTERS[index - 1] : undefined;
  const next = index >= 0 ? CHAPTERS[index + 1] : undefined;
  // A state left by the previous chapter counts as loading.
  const ready = state.status === "ready" && state.id === chapter?.id ? state.chapter : null;
  const failed = state.status === "error" && state.id === chapter?.id;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-10">
      <ChapterNav current={chapter} />

      <article lang="fr" className="panel-parchment min-w-0 p-4 sm:p-8" aria-busy={ready === null}>
        <p className="mb-4 text-sm text-on-panel-muted" lang={currentLanguage()}>
          {t("reader.notice")}
        </p>
        {chapter === undefined && <p role="alert">{t("reader.notFound")}</p>}
        {failed && <p role="alert">{t("reader.error")}</p>}
        {chapter !== undefined && !failed && ready === null && <p>{t("reader.loading")}</p>}
        {ready !== null && (
          <>
            {ready.sections.length > 1 && <Contents chapter={ready} />}
            <div className="reader-content" dangerouslySetInnerHTML={{ __html: ready.html }} />
          </>
        )}
        {chapter !== undefined && (
          <nav
            aria-label={t("reader.pager")}
            className="mt-10 flex flex-wrap justify-between gap-3 border-t-2 border-on-panel pt-4"
          >
            {previous === undefined ? (
              <span />
            ) : (
              <a className="btn" href={hrefFor({ name: "rules", chapter: previous.id })}>
                <span aria-hidden="true">&lt;</span> {previous.title}
                <span className="sr-only">{t("reader.previous")}</span>
              </a>
            )}
            {next !== undefined && (
              <a className="btn btn-solid" href={hrefFor({ name: "rules", chapter: next.id })}>
                {next.title} <span aria-hidden="true">&gt;</span>
                <span className="sr-only">{t("reader.next")}</span>
              </a>
            )}
          </nav>
        )}
      </article>
    </div>
  );
}

/** Chapter list: side column from the lg breakpoint, drop-down list below. */
function ChapterNav({ current }: { current: Chapter | undefined }) {
  const { t } = useTranslation();
  return (
    <div className="lg:sticky lg:top-0 lg:self-start">
      <p className="mb-3 font-gothic text-3xl">{t("reader.title")}</p>

      <div className="lg:hidden">
        <label htmlFor="reader-chapter" className="mb-1 block font-bold">
          {t("reader.chapter")}
        </label>
        <select
          id="reader-chapter"
          lang="fr"
          className="field"
          value={current?.id ?? ""}
          onChange={(e) => {
            navigate({ name: "rules", chapter: e.target.value });
          }}
        >
          {current === undefined && <option value="" />}
          {CHAPTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label={t("reader.chapters")} className="hidden lg:block">
        <ol lang="fr" className="space-y-1">
          {CHAPTERS.map((c) => (
            <li key={c.id}>
              <a
                href={hrefFor({ name: "rules", chapter: c.id })}
                aria-current={c.id === current?.id ? "page" : undefined}
                className="block min-h-11 border-l-4 border-transparent px-3 py-2 hover:border-on-page aria-[current=page]:border-on-page aria-[current=page]:bg-charcoal aria-[current=page]:font-bold"
              >
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

/** Contents of the chapter: one button per second-level heading. */
function Contents({ chapter }: { chapter: RenderedChapter }) {
  const { t } = useTranslation();
  return (
    <details className="mb-6 border-2 border-on-panel p-3">
      <summary className="cursor-pointer font-bold">{t("reader.contents")}</summary>
      <ol className="mt-2 columns-1 gap-6 text-sm sm:columns-2">
        {chapter.sections.map((s) => (
          <li key={s.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => {
                jumpTo(s.id);
              }}
              className="min-h-9 text-left underline-offset-4 hover:underline"
            >
              {s.text}
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}
