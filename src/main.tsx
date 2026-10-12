/*
 * File:        src/main.tsx
 * Role:        Application entry point: styles, i18n, React root.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./i18n/index.ts";
import { App } from "./App.tsx";

const container = document.getElementById("root");
if (container === null) throw new Error("#root element missing in index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
