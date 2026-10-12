/*
 * File:        src/App.tsx
 * Role:        Root component: page layout and the screen of the current
 *              route (home or creation wizard).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Layout } from "./features/layout/Layout.tsx";
import { HomePage } from "./features/home/HomePage.tsx";
import { WizardPage } from "./features/wizard/WizardPage.tsx";
import { useRoute } from "./app/router.ts";

export function App() {
  const route = useRoute();
  return <Layout>{route.name === "wizard" ? <WizardPage id={route.id} /> : <HomePage />}</Layout>;
}
