/*
 * File:        src/features/wizard/WizardPage.tsx
 * Role:        Creation wizard frame: step navigation with progress, budget bar
 *              always visible, current step and the live diagnostics panel.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gameData } from "../../data/index.ts";
import { findFaction, indexFaction, validateWarband, type FactionIndex } from "../../rules/index.ts";
import { navigate } from "../../app/router.ts";
import { WIZARD_STEPS, useWizard } from "../../store/wizard.ts";
import type { Warband } from "../../data/schema.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { DiagnosticsPanel } from "./DiagnosticsPanel.tsx";
import { StepFaction } from "./StepFaction.tsx";
import { StepOrigin } from "./StepOrigin.tsx";
import { StepFighters } from "./StepFighters.tsx";
import { StepWargear } from "./StepWargear.tsx";
import { StepSkills } from "./StepSkills.tsx";
import { StepRating } from "./StepRating.tsx";

export interface StepProps {
  warband: Warband;
  index: FactionIndex;
  update: (change: (w: Warband) => Warband) => void;
}

export function WizardPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const { warband, step, load, update, goTo, saveError } = useWizard();
  const [missing, setMissing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Moving to another step puts the focus (and the view) on its title.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  useEffect(() => {
    if (warband?.id === id) return;
    void load(id).then((found) => {
      setMissing(!found);
    });
  }, [id, warband?.id, load]);

  const faction = warband === null ? undefined : findFaction(gameData, warband.factionId);
  const index = useMemo(
    () => (faction === undefined ? null : indexFaction(gameData.common, faction)),
    [faction],
  );
  const diagnostics = useMemo(
    () => (warband === null ? [] : validateWarband(warband, gameData, warband.mode)),
    [warband],
  );

  if (missing)
    return (
      <section className="panel-parchment p-6 text-center">
        <p>{t("wizard.notFound")}</p>
        <button
          type="button"
          className="btn btn-solid mt-4"
          onClick={() => {
            navigate({ name: "home" });
          }}
        >
          {t("wizard.backHome")}
        </button>
      </section>
    );
  if (warband?.id !== id || index === null) return <p aria-busy="true">{t("wizard.loading")}</p>;

  const props: StepProps = { warband, index, update };
  const current = WIZARD_STEPS[step] ?? "faction";

  return (
    <div className="space-y-4">
      <nav aria-label={t("wizard.stepsLabel")}>
        <ol className="grid grid-cols-3 gap-1 sm:grid-cols-6">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => {
                  goTo(i);
                }}
                className="w-full min-h-11 border-2 border-on-page px-1 py-1 text-sm aria-[current=step]:bg-on-page aria-[current=step]:text-page"
              >
                <span className="block font-bold">{i + 1}</span>
                <span className="block">{t(`wizard.steps.${s}`)}</span>
              </button>
            </li>
          ))}
        </ol>
        <progress
          className="mt-2 h-2 w-full"
          max={WIZARD_STEPS.length}
          value={step + 1}
          aria-label={t("wizard.progress", { step: step + 1, total: WIZARD_STEPS.length })}
        />
      </nav>

      <BudgetBar warband={warband} index={index} />
      {saveError !== null && (
        <p role="alert" className="panel-parchment p-3">
          {t("wizard.saveError", { error: saveError })}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="step-heading" className="panel-parchment min-w-0 p-4 sm:p-6">
          <h1
            id="step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mb-4 scroll-mt-24 font-gothic text-3xl sm:text-4xl"
          >
            {t(`wizard.steps.${current}`)}
          </h1>
          {current === "faction" && <StepFaction {...props} />}
          {current === "origin" && <StepOrigin {...props} />}
          {current === "fighters" && <StepFighters {...props} />}
          {current === "wargear" && <StepWargear {...props} />}
          {current === "skills" && <StepSkills {...props} />}
          {current === "rating" && <StepRating {...props} diagnostics={diagnostics} />}

          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t-2 border-on-panel pt-4">
            <button
              type="button"
              className="btn"
              disabled={step === 0}
              onClick={() => {
                goTo(step - 1);
              }}
            >
              {t("wizard.previous")}
            </button>
            {step < WIZARD_STEPS.length - 1 && (
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  goTo(step + 1);
                }}
              >
                {t("wizard.next")}
              </button>
            )}
          </div>
        </section>
        <DiagnosticsPanel diagnostics={diagnostics} warband={warband} index={index} />
      </div>
    </div>
  );
}
