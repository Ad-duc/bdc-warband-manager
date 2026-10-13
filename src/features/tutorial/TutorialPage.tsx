/*
 * File:        src/features/tutorial/TutorialPage.tsx
 * Role:        Rules tutorial. Without a lesson in the address: the list of
 *              lessons. With a lesson: one step at a time, with the board seen
 *              from above, the fighter cards, the attack rolls and the text of
 *              the step, a link to the rules section it illustrates and
 *              previous / next controls (also the left and right arrow keys).
 *              The step is kept in the address so it can be shared or reloaded.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate, parseHash } from "../../app/router.ts";
import type { GameData } from "../../data/index.ts";
import { useGameData } from "../../data/useGameData.ts";
import { useFormatter } from "../../i18n/text.ts";
import { LESSONS, findLesson } from "../../tutorial/index.ts";
import { clampStep, firstDiceStep, resolveFighters, textRuns } from "../../tutorial/model.ts";
import type { Lesson, Step } from "../../tutorial/schema.ts";
import { DiceTray } from "./DiceTray.tsx";
import { FighterPanel } from "./FighterPanel.tsx";
import { TutorialBoard } from "./TutorialBoard.tsx";

export function TutorialPage({ lessonId, step }: { lessonId: string | null; step: number | null }) {
  const { t } = useTranslation();
  const gameData = useGameData();
  if (lessonId === null) return <LessonList />;
  const lesson = findLesson(lessonId);
  if (lesson === undefined)
    return (
      <div className="space-y-4">
        <p role="alert">{t("tutorial.notFound")}</p>
        <a className="btn" href={hrefFor({ name: "tutorial", lesson: null, step: null })}>
          {t("tutorial.backToList")}
        </a>
      </div>
    );
  if (gameData === null) return <p aria-busy="true">{t("wizard.loading")}</p>;
  return <LessonPlayer lesson={lesson} gameData={gameData} step={clampStep(step, lesson.steps.length)} />;
}

function LessonList() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-hand text-4xl">{t("tutorial.title")}</h1>
      <p className="max-w-prose text-on-page-muted">{t("tutorial.intro")}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {LESSONS.map((lesson) => (
          <li key={lesson.id} lang="fr" className="panel-parchment flex flex-col gap-3 p-4">
            <h2 className="font-gothic text-2xl">{lesson.title}</h2>
            <p>{lesson.summary}</p>
            <p className="text-sm text-on-panel-muted">
              {lesson.origin === "book"
                ? t("tutorial.lessonMetaBook", { count: lesson.steps.length, page: lesson.sourceRef.page })
                : t("tutorial.lessonMetaHouse", { count: lesson.steps.length, page: lesson.sourceRef.page })}
            </p>
            <a
              className="btn btn-solid self-start"
              href={hrefFor({ name: "tutorial", lesson: lesson.id, step: 1 })}
              aria-label={t("tutorial.startLesson", { title: lesson.title })}
            >
              {t("tutorial.start")}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Paragraph of a step: game terms between double asterisks are shown in bold. */
function RichText({ text }: { text: string }) {
  return (
    <p className="max-w-prose">
      {textRuns(text).map((run, i) =>
        run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>,
      )}
    </p>
  );
}

function LessonPlayer({ lesson, gameData, step }: { lesson: Lesson; gameData: GameData; step: number }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const { fighters, problems } = useMemo(() => resolveFighters(lesson, gameData), [lesson, gameData]);
  const count = lesson.steps.length;
  const current: Step | undefined = lesson.steps[step - 1];
  const go = (n: number): void => {
    navigate({ name: "tutorial", lesson: lesson.id, step: clampStep(n, count) });
  };

  // Left and right arrow keys change the step, except while typing in a field. The
  // step is read from the address so that quick key repeats are not lost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]"))
        return;
      const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (delta === 0) return;
      const route = parseHash(window.location.hash);
      const shown = route.name === "tutorial" ? clampStep(route.step, count) : 1;
      const wanted = clampStep(shown + delta, count);
      if (wanted === shown) return;
      e.preventDefault();
      navigate({ name: "tutorial", lesson: lesson.id, step: wanted });
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [lesson.id, count]);

  if (current === undefined || problems.length > 0)
    return (
      <p role="alert">
        {t("tutorial.dataError")} {problems.join("; ")}
      </p>
    );

  const nameOf = (id: string): string => {
    const fighter = fighters.find((x) => x.lesson.id === id);
    return fighter === undefined ? id : f.text(fighter.name);
  };
  const diceStep = firstDiceStep(lesson) + 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-rule pb-3">
        <div className="min-w-0">
          <a
            className="text-sm uppercase tracking-wider text-on-page-muted underline-offset-4 hover:underline"
            href={hrefFor({ name: "tutorial", lesson: null, step: null })}
          >
            {t("tutorial.backToList")}
          </a>
          <h1 lang="fr" className="font-hand text-4xl">
            {lesson.title}
          </h1>
          <p className="text-sm italic text-on-page-muted">
            {lesson.origin === "book"
              ? t("tutorial.sourceBook", { page: lesson.sourceRef.page })
              : t("tutorial.sourceHouse", { page: lesson.sourceRef.page })}
          </p>
        </div>
        <nav aria-label={t("tutorial.steps")}>
          <ol className="flex flex-wrap items-center">
            {lesson.steps.map((s, i) => {
              const n = i + 1;
              return (
                <li key={n}>
                  <a
                    href={hrefFor({ name: "tutorial", lesson: lesson.id, step: n })}
                    aria-current={n === step ? "step" : undefined}
                    aria-label={t("tutorial.stepLink", { n, name: s.banner })}
                    className="grid min-h-11 min-w-11 place-items-center"
                  >
                    <span
                      aria-hidden="true"
                      className={`block rotate-45 border-2 border-on-page ${
                        n === step ? "size-4 bg-on-page" : n < step ? "size-3 bg-on-page-muted" : "size-3"
                      }`}
                    />
                  </a>
                </li>
              );
            })}
          </ol>
          <p className="text-right text-sm font-bold tabular-nums">
            {t("tutorial.counter", { step, count })}
          </p>
        </nav>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TutorialBoard lesson={lesson} step={current} fighters={fighters} />
        <div className="flex min-w-0 flex-col gap-4">
          {fighters
            .filter((fighter) => fighter.lesson.card)
            .map((fighter) => (
              <FighterPanel
                key={fighter.lesson.id}
                fighter={fighter}
                life={current.life[fighter.lesson.id] ?? fighter.stats.lf}
                active={current.focus.includes(fighter.lesson.id)}
                common={gameData.common}
              />
            ))}
        </div>
      </div>

      <DiceTray dice={current.dice} fighters={fighters} firstStep={diceStep} />

      <section aria-labelledby="tutorial-step-title" className="panel-parchment">
        <div aria-live="polite" lang="fr">
          <p className="band mt-3 inline-block pr-6 text-xl">{current.banner}</p>
          <div className="flex flex-col gap-3 p-4 pt-3">
            <h2 id="tutorial-step-title" className="text-2xl font-bold">
              {current.title}
            </h2>
            {current.text.map((paragraph) => (
              <RichText key={paragraph} text={paragraph} />
            ))}
            {current.event !== null && (
              <p className="max-w-prose border-l-4 border-on-panel bg-bone px-3 py-2">
                <span className="sr-only">{t("tutorial.event")} </span>
                {current.event}
              </p>
            )}
            {current.recap !== null && (
              <div className="max-w-2xl overflow-x-auto">
                <table className="table-bdc">
                  <caption className="sr-only">{t("tutorial.recap.caption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("tutorial.recap.exchange")}</th>
                      <th scope="col">{t("tutorial.recap.fighter")}</th>
                      <th scope="col">{t("tutorial.recap.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.recap.map((row) => (
                      <tr key={row.exchange}>
                        <th scope="row">{row.exchange}</th>
                        <td>{nameOf(row.fighter)}</td>
                        <td>{row.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-stone p-4">
          <button
            type="button"
            className="btn"
            disabled={step <= 1}
            onClick={() => {
              go(step - 1);
            }}
          >
            <span aria-hidden="true">&lt;</span> {t("tutorial.previous")}
          </button>
          <button
            type="button"
            className="btn btn-solid"
            disabled={step >= count}
            onClick={() => {
              go(step + 1);
            }}
          >
            {t("tutorial.next")} <span aria-hidden="true">&gt;</span>
          </button>
          <span className="text-xs italic text-on-panel-muted">{t("tutorial.keyboard")}</span>
          <span className="flex-1" />
          <a
            className="btn"
            href={hrefFor({
              name: "rules",
              chapter: current.rulesRef.chapter,
              section: current.rulesRef.section,
            })}
          >
            {t("tutorial.readRule", { section: current.rulesRef.label })}
          </a>
          {step > 1 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                go(1);
              }}
            >
              {t("tutorial.restart")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
