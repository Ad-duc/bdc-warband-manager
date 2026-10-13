/*
 * File:        src/features/scenarios/ScenariosPage.tsx
 * Role:        Scenario reference: the scenario table and the rules shared by
 *              the scenarios (battle groups, reserve, treasure), then each of
 *              the six scenarios with what to do before and during the battle,
 *              the campaign bonus, the map legend and the twist table. A
 *              button opens the battle set-up assistant. Texts are taken from
 *              the French translation.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { currentLanguage } from "../../i18n/index.ts";
import { Markdown } from "./Markdown.tsx";
import { findScenario, scenarioChapter, type Phase, type Scenario } from "./scenarios.ts";

const PHASES: Phase[] = ["before", "during", "campaign"];

export function ScenariosPage({ number }: { number: number | null }) {
  const { t } = useTranslation();
  const chapter = scenarioChapter();
  const scenario = number === null ? undefined : findScenario(number);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-10">
      <div className="lg:sticky lg:top-0 lg:self-start">
        <p className="mb-3 font-hand text-3xl">{t("scenarios.title")}</p>
        <div className="lg:hidden">
          <label htmlFor="scenario-pick" className="mb-1 block font-bold">
            {t("scenarios.pick")}
          </label>
          <select
            id="scenario-pick"
            lang="fr"
            className="field"
            value={scenario?.number ?? ""}
            onChange={(e) => {
              navigate({ name: "scenarios", number: e.target.value === "" ? null : Number(e.target.value) });
            }}
          >
            <option value="">{t("scenarios.overview")}</option>
            {chapter.scenarios.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.title}
              </option>
            ))}
          </select>
        </div>
        <nav aria-label={t("scenarios.list")} className="hidden lg:block">
          <ol className="space-y-1">
            <li>
              <a
                href={hrefFor({ name: "scenarios", number: null })}
                aria-current={scenario === undefined ? "page" : undefined}
                className="block min-h-11 border-l-4 border-transparent px-3 py-2 hover:border-on-page aria-[current=page]:border-on-page aria-[current=page]:bg-charcoal aria-[current=page]:font-bold"
              >
                {t("scenarios.overview")}
              </a>
            </li>
            {chapter.scenarios.map((s) => (
              <li key={s.number} lang="fr">
                <a
                  href={hrefFor({ name: "scenarios", number: s.number })}
                  aria-current={s.number === scenario?.number ? "page" : undefined}
                  className="block min-h-11 border-l-4 border-transparent px-3 py-2 hover:border-on-page aria-[current=page]:border-on-page aria-[current=page]:bg-charcoal aria-[current=page]:font-bold"
                >
                  {s.number}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <a
          className="btn btn-solid mt-4 w-full"
          href={hrefFor({ name: "battle", warbandId: null, campaignId: null })}
        >
          {t("scenarios.setUp")}
        </a>
      </div>

      <article className="panel-parchment min-w-0 p-4 sm:p-8">
        {currentLanguage() === "en" && (
          <p className="mb-4 text-sm text-on-panel-muted">{t("scenarios.frenchOnly")}</p>
        )}
        {number !== null && scenario === undefined && <p role="alert">{t("scenarios.notFound")}</p>}
        {number === null && <Overview />}
        {scenario !== undefined && <ScenarioView scenario={scenario} />}
      </article>
    </div>
  );
}

function Overview() {
  const { t } = useTranslation();
  const chapter = scenarioChapter();
  return (
    <div lang="fr">
      <h1 className="mb-4 font-hand text-4xl">{chapter.title}</h1>
      <Markdown text={chapter.intro} idPrefix="intro" />
      <h2 className="mb-2 mt-6 font-hand text-2xl" lang={currentLanguage()}>
        {t("scenarios.table")}
      </h2>
      <div className="reader-table">
        <table>
          <thead>
            <tr>
              <th scope="col">{t("scenarios.roll")}</th>
              <th scope="col" lang={currentLanguage()}>
                {t("scenarios.scenario")}
              </th>
            </tr>
          </thead>
          <tbody>
            {chapter.scenarios.map((s) => (
              <tr key={s.number}>
                <td>{s.number}</td>
                <td>
                  <a
                    className="underline underline-offset-2"
                    href={hrefFor({ name: "scenarios", number: s.number })}
                  >
                    {s.title}
                  </a>{" "}
                  ({s.originalTitle})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chapter.shared.map((section, i) => (
        <section key={section.title} aria-labelledby={`shared-${i}`}>
          <h2 id={`shared-${i}`} className="mb-2 mt-8 border-b-2 border-on-panel font-hand text-2xl">
            {section.title}
          </h2>
          <Markdown text={section.markdown} idPrefix={`shared-${i}`} />
        </section>
      ))}
    </div>
  );
}

export function ScenarioView({ scenario, headingLevel = 1 }: { scenario: Scenario; headingLevel?: 1 | 2 }) {
  const { t } = useTranslation();
  const Title = headingLevel === 1 ? "h1" : "h2";
  const Sub = headingLevel === 1 ? "h2" : "h3";
  const Item = headingLevel === 1 ? "h3" : "h4";
  const key = `sc${scenario.number}`;
  return (
    <div lang="fr">
      <Title className="font-hand text-4xl">
        {scenario.number}. {scenario.title}
      </Title>
      <p className="mb-4 text-sm italic">{scenario.originalTitle}</p>
      <Markdown text={scenario.intro} idPrefix={`${key}-intro`} />
      {PHASES.map((phase) =>
        scenario.phases[phase].length === 0 ? null : (
          <section key={phase}>
            <Sub className="mb-2 mt-8 border-b-2 border-on-panel font-hand text-2xl" lang={currentLanguage()}>
              {t(`scenarios.phase.${phase}`)}
            </Sub>
            {scenario.phases[phase].map((section, i) => (
              <div key={section.title}>
                <Item className="mb-1 mt-4 font-bold">{section.title}</Item>
                <Markdown text={section.markdown} idPrefix={`${key}-${phase}-${i}`} />
              </div>
            ))}
          </section>
        ),
      )}
      {scenario.map !== "" && (
        <section>
          <Sub className="mb-2 mt-8 border-b-2 border-on-panel font-hand text-2xl" lang={currentLanguage()}>
            {t("scenarios.map")}
          </Sub>
          <Markdown text={scenario.map} idPrefix={`${key}-map`} />
        </section>
      )}
      <section>
        <Sub className="mb-2 mt-8 border-b-2 border-on-panel font-hand text-2xl" lang={currentLanguage()}>
          {t("scenarios.twists", { die: scenario.twistDie })}
        </Sub>
        {scenario.twists.map((twist) => (
          <div key={twist.roll}>
            <Item className="mb-1 mt-4 font-bold">
              {twist.roll} - {twist.title}
            </Item>
            <Markdown text={twist.markdown} idPrefix={`${key}-twist-${twist.roll}`} />
          </div>
        ))}
      </section>
    </div>
  );
}
