/*
 * File:        playwright.config.ts
 * Role:        End-to-end test configuration. Builds the app, serves it with
 *              "vite preview" and runs the specs on Chromium and Firefox.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/bdc-warband-manager/`;

/** Optional local Chromium binary (eg. a sandbox where downloads are blocked). */
const chromiumPath = process.env["PLAYWRIGHT_CHROMIUM_PATH"];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: process.env["CI"] !== undefined,
  retries: process.env["CI"] !== undefined ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumPath !== undefined ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: process.env["CI"] === undefined,
    timeout: 180_000,
  },
});
