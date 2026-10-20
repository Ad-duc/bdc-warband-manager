/*
 * File:        src/features/reader/RulesPage.tsx
 * Role:        Reader of the French translation of the rules: chapter list
 *              (side column on large screens, drop-down list on phones),
 *              contents of the current chapter with jumps to its sections,
 *              chapter text and previous / next links. Works offline. The
 *              first heading of the chapter file is the page title. Each
 *              section has a "suggest a correction" link to a pre-filled GitHub
 *              issue, which quotes the passage selected in that section. An
 *              address with a section ("#/rules/batailles/s-garde") opens the
 *              chapter at that heading (links from the tutorial).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { currentLanguage } from "../../i18n/index.ts";
import { CHAPTERS, findChapter, loadChapter, type Chapter } from "./chapters.ts";
import { editUrl, issueUrl, trimQuote, type FeedbackTarget } from "./feedback.ts";
import { renderChapter, type Heading, type RenderedChapter } from "./markdown.ts";

interface Selected {
  text: string;
  headingId: string;
}

function pageUrl(chapter: Chapter): string {
  return new URL(hrefFor({ name: "rules", chapter: chapter.id }), window.location.href).href;
}

function targetFor(chapter: Chapter, heading: Heading | undefined, quote?: string): FeedbackTarget {
  return {
    chapterTitle: chapter.title,
    file: chapter.file,
    section: heading?.text ?? "",
    line: heading?.line ?? 1,
    pageUrl: pageUrl(chapter),
    ...(quote === undefined ? {} : { quote }),
  };
}

function render(chapter: Chapter, markdown: string, t: TFunction): RenderedChapter {
  return renderChapter(markdown, {
    feedbackLink: (heading) => ({
      href: issueUrl(targetFor(chapter, heading)),
      text: t("reader.feedback.link"),
      label: t("reader.feedback.linkFor", { section: heading.text }),
    }),
  });
}

/** Last heading (level 2 to 4) placed before a node of the chapter text. */
function headingBefore(root: HTMLElement, node: Node): string | null {
  let found: string | null = null;
  for (const h of root.querySelectorAll("h2, h3, h4")) {
    if (h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) found = h.id;
    else break;
  }
  return found;
}

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

export function RulesPage({ chapterId, sectionId }: { chapterId: string | null; sectionId: string | null }) {
  const { t } = useTranslation();
  const chapter = findChapter(chapterId);
  const [state, setState] = useState<State>({ status: "loading" });
  const [selected, setSelected] = useState<Selected | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Remembers the last passage selected in the chapter text: clicking a link
  // collapses the selection before the click is handled.
  useEffect(() => {
    const onChange = () => {
      const root = contentRef.current;
      const selection = document.getSelection();
      if (root === null || selection === null || selection.isCollapsed || selection.anchorNode === null)
        return;
      if (!root.contains(selection.anchorNode)) return;
      const text = trimQuote(selection.toString());
      const headingId = headingBefore(root, selection.anchorNode);
      if (text !== "" && headingId !== null) setSelected({ text, headingId });
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
    };
  }, []);

  useEffect(() => {
    if (chapter === undefined) return;
    let active = true;
    loadChapter(chapter)
      .then((markdown) => {
        if (!active) return;
        setState({ status: "ready", id: chapter.id, chapter: render(chapter, markdown, t) });
        setSelected(null);
        scrollToTop();
      })
      .catch(() => {
        if (active) setState({ status: "error", id: chapter.id });
      });
    return () => {
      active = false;
    };
  }, [chapter, t]);

  // A section in the address: jump to its heading once the chapter text is in the page.
  const shownId = state.status === "ready" ? state.id : null;
  useEffect(() => {
    if (shownId !== null && shownId === chapter?.id && sectionId !== null) jumpTo(sectionId);
  }, [shownId, chapter, sectionId]);

  const index = chapter === undefined ? -1 : CHAPTERS.indexOf(chapter);
  const previous = index > 0 ? CHAPTERS[index - 1] : undefined;
  const next = index >= 0 ? CHAPTERS[index + 1] : undefined;
  // A state left by the previous chapter counts as loading.
  const ready = state.status === "ready" && state.id === chapter?.id ? state.chapter : null;
  const failed = state.status === "error" && state.id === chapter?.id;
  const headingOf = (id: string): Heading | undefined => ready?.headings.find((h) => h.id === id);
  const selectedHeading = selected === null ? undefined : headingOf(selected.headingId);

  // A section link quotes the passage selected in that section.
  const onContentClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || chapter === undefined) return;
    const link = event.target.closest<HTMLAnchorElement>("a[data-heading]");
    const id = link?.dataset["heading"];
    if (link === null || id === undefined) return;
    const quote = selected?.headingId === id ? selected.text : undefined;
    link.href = issueUrl(targetFor(chapter, headingOf(id), quote));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-10">
      <ChapterNav current={chapter} />

      <article lang="fr" className="panel-parchment min-w-0 p-4 sm:p-8" aria-busy={ready === null}>
        <p className="mb-4 text-sm text-on-panel-muted" lang={currentLanguage()}>
          {t("reader.notice")} {t("reader.feedback.notice")}{" "}
          {chapter !== undefined && (
            <a className="underline" href={editUrl(chapter.file)} target="_blank" rel="noopener">
              {t("reader.feedback.edit")}
            </a>
          )}
        </p>
        {chapter === undefined && <p role="alert">{t("reader.notFound")}</p>}
        {failed && <p role="alert">{t("reader.error")}</p>}
        {chapter !== undefined && !failed && ready === null && <p>{t("reader.loading")}</p>}
        {ready !== null && (
          <>
            {ready.sections.length > 1 && <Contents chapter={ready} />}
            <div
              ref={contentRef}
              className="reader-content"
              onClick={onContentClick}
              dangerouslySetInnerHTML={{ __html: ready.html }}
            />
          </>
        )}
        <div aria-live="polite" className="sticky bottom-0 z-10">
          {chapter !== undefined && selected !== null && selectedHeading !== undefined && (
            <SelectionBar
              quote={selected.text}
              section={selectedHeading.text}
              href={issueUrl(targetFor(chapter, selectedHeading, selected.text))}
              onClear={() => {
                setSelected(null);
              }}
            />
          )}
        </div>
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
      <p className="title-section mb-3">{t("reader.title")}</p>

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

      <a className="btn mt-4 w-full lg:w-auto" href={hrefFor({ name: "rulesPrint" })}>
        {t("reader.printLink")}
      </a>
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

/** Passage selected in the chapter, with a link to suggest a correction for it. */
function SelectionBar({
  quote,
  section,
  href,
  onClear,
}: {
  quote: string;
  section: string;
  href: string;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-2 border-on-panel bg-panel p-3 text-sm shadow-lg">
      <p className="w-full min-w-0 sm:w-auto sm:flex-1">
        <strong>{t("reader.feedback.selected", { section })}</strong>{" "}
        <span className="line-clamp-2 italic">{quote}</span>
      </p>
      <a className="btn btn-sm btn-solid" href={href} target="_blank" rel="noopener">
        {t("reader.feedback.suggest")}
      </a>
      <button type="button" className="btn btn-sm" onClick={onClear}>
        {t("reader.feedback.clear")}
      </button>
    </div>
  );
}
