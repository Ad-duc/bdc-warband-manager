/*
 * File:        src/App.tsx
 * Role:        Root component: page layout and the screen of the current
 *              route (home, creation wizard, campaign dashboard, print view,
 *              shared warband, French rules reader and its print view,
 *              changelog, scenarios,
 *              battle set-up, group campaign, rules tutorial or direction
 *              dice). Screens other than the home
 *              page are loaded on demand to keep the first download small.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "./features/layout/Layout.tsx";
import { HomePage } from "./features/home/HomePage.tsx";
import { useRoute } from "./app/router.ts";

const WizardPage = lazy(async () => ({
  default: (await import("./features/wizard/WizardPage.tsx")).WizardPage,
}));
const CampaignPage = lazy(async () => ({
  default: (await import("./features/campaign/CampaignPage.tsx")).CampaignPage,
}));
const PrintPage = lazy(async () => ({ default: (await import("./print/PrintPage.tsx")).PrintPage }));
const SharedPage = lazy(async () => ({
  default: (await import("./features/share/SharedPage.tsx")).SharedPage,
}));
const ChangelogPage = lazy(async () => ({
  default: (await import("./features/changelog/ChangelogPage.tsx")).ChangelogPage,
}));
const RulesPrintPage = lazy(async () => ({
  default: (await import("./features/reader/RulesPrintPage.tsx")).RulesPrintPage,
}));
const CardBacksPage = lazy(async () => ({
  default: (await import("./print/CardBacksPage.tsx")).CardBacksPage,
}));
const DirectionDiePage = lazy(async () => ({
  default: (await import("./features/dice/DirectionDiePage.tsx")).DirectionDiePage,
}));
const ReminderPage = lazy(async () => ({
  default: (await import("./print/ReminderPage.tsx")).ReminderPage,
}));
const ScenariosPage = lazy(async () => ({
  default: (await import("./features/scenarios/ScenariosPage.tsx")).ScenariosPage,
}));
const BattleSetupPage = lazy(async () => ({
  default: (await import("./features/battle/BattleSetupPage.tsx")).BattleSetupPage,
}));
const GroupCampaignPage = lazy(async () => ({
  default: (await import("./features/groups/GroupCampaignPage.tsx")).GroupCampaignPage,
}));
const TutorialPage = lazy(async () => ({
  default: (await import("./features/tutorial/TutorialPage.tsx")).TutorialPage,
}));
const RulesPage = lazy(async () => ({
  default: (await import("./features/reader/RulesPage.tsx")).RulesPage,
}));

export function App() {
  const route = useRoute();
  const { t } = useTranslation();
  return (
    <Layout>
      <Suspense fallback={<p aria-busy="true">{t("wizard.loading")}</p>}>
        {route.name === "wizard" && <WizardPage id={route.id} />}
        {route.name === "campaign" && <CampaignPage id={route.id} />}
        {route.name === "print" && <PrintPage id={route.id} />}
        {route.name === "shared" && <SharedPage payload={route.payload} />}
        {route.name === "rules" && <RulesPage chapterId={route.chapter} sectionId={route.section ?? null} />}
        {route.name === "rulesPrint" && <RulesPrintPage />}
        {route.name === "tutorial" && <TutorialPage lessonId={route.lesson} step={route.step} />}
        {route.name === "changelog" && <ChangelogPage />}
        {route.name === "cardBacks" && <CardBacksPage />}
        {route.name === "reminder" && <ReminderPage />}
        {route.name === "dice" && <DirectionDiePage />}
        {route.name === "scenarios" && <ScenariosPage number={route.number} />}
        {route.name === "battle" && (
          <BattleSetupPage
            key={`${route.warbandId ?? ""}-${route.campaignId ?? ""}`}
            warbandId={route.warbandId}
            campaignId={route.campaignId}
          />
        )}
        {route.name === "groupCampaign" && <GroupCampaignPage id={route.id} />}
      </Suspense>
      {route.name === "home" && <HomePage />}
    </Layout>
  );
}
