/*
 * File:        vitest.config.ts
 * Role:        Unit test configuration (jsdom, fake IndexedDB, coverage of
 *              the rules engine).
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  base: "/bdc-warband-manager/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/rules/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
