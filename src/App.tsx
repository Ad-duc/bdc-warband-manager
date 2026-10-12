/*
 * File:        src/App.tsx
 * Role:        Root component: page layout and the screen of the current
 *              route (home, creation wizard or campaign dashboard).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Layout } from "./features/layout/Layout.tsx";
import { HomePage } from "./features/home/HomePage.tsx";
import { WizardPage } from "./features/wizard/WizardPage.tsx";
import { CampaignPage } from "./features/campaign/CampaignPage.tsx";
import { useRoute } from "./app/router.ts";

export function App() {
  const route = useRoute();
  return (
    <Layout>
      {route.name === "wizard" && <WizardPage id={route.id} />}
      {route.name === "campaign" && <CampaignPage id={route.id} />}
      {route.name === "home" && <HomePage />}
    </Layout>
  );
}
