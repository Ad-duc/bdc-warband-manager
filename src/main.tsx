/*
 * File:        src/main.tsx
 * Role:        Application entry point: styles, i18n, React root, service
 *              worker registration with automatic updates (see pwa.ts).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./i18n/index.ts";
import { App } from "./App.tsx";
import { registerSW } from "virtual:pwa-register";
import { browserEnvironment, scheduleUpdates } from "./pwa.ts";

const container = document.getElementById("root");
if (container === null) throw new Error("#root element missing in index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registers the worker now; a new version found later reloads the page by itself.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration !== undefined) scheduleUpdates(swUrl, registration, browserEnvironment);
  },
});
