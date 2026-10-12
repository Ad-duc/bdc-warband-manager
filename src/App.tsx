/*
 * File:        src/App.tsx
 * Role:        Root component: page layout and the screen of the current
 *              route (home, creation wizard, campaign dashboard, print view,
 *              shared warband, French rules reader or changelog). Screens other than the home page are
 *              loaded on demand to keep the first download small.
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
        {route.name === "rules" && <RulesPage chapterId={route.chapter} />}
        {route.name === "changelog" && <ChangelogPage />}
      </Suspense>
      {route.name === "home" && <HomePage />}
    </Layout>
  );
}
