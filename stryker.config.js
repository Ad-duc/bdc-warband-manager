/*
 * File:        stryker.config.js
 * Role:        Mutation testing of the rules engine with Stryker: every
 *              mutant of src/rules should be killed by the unit tests. Run
 *              with "npm run test:mutation" (about forty minutes on two
 *              cores); the HTML report lands in reports/mutation/. The score
 *              below "break" fails the run.
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

// @ts-check
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  // vitest-runner 10.0.0 joins suite and test names with a space while
  // vitest 5 matches testNamePattern against names joined with " > ", so no
  // test ran against any mutant; scripts/patch-stryker-vitest.ts (postinstall)
  // repairs the runner until the upstream fix ships (stryker-js issue 6210).
  vitest: { configFile: "vitest.config.ts", related: true },
  mutate: ["src/rules/**/*.ts"],
  ignorePatterns: ["dist", "dev-dist", "coverage", "playwright-report", "test-results", "reports", ".cache"],
  reporters: ["clear-text", "progress", "html"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  clearTextReporter: { allowColor: false, logTests: false, reportMutants: true, reportScoreTable: true },
  thresholds: { high: 90, low: 80, break: 80 },
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
};

export default config;
