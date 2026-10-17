/*
 * File:        vitest.config.ts
 * Role:        Unit test configuration (jsdom, fake IndexedDB, coverage
 *              thresholds: 100% on the rules engine, the database and the
 *              wizard store, 90% on the print layouts).
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
      include: ["src/rules/**/*.ts", "src/db/**/*.ts", "src/store/**/*.ts", "src/print/**/*.{ts,tsx}"],
      reporter: ["text", "html"],
      thresholds: {
        "src/rules/**/*.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "src/db/**/*.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "src/store/**/*.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "src/print/**/*.{ts,tsx}": { lines: 90, functions: 90, branches: 75, statements: 90 },
      },
    },
  },
});
