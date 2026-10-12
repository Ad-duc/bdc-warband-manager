/*
 * File:        src/App.tsx
 * Role:        Root component: page layout and current screen. Screens and
 *              routing are added from step 3.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { Layout } from "./features/layout/Layout.tsx";
import { HomePage } from "./features/home/HomePage.tsx";

export function App() {
  return (
    <Layout>
      <HomePage />
    </Layout>
  );
}
