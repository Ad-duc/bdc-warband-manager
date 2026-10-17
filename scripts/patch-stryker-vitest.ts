/*
 * File:        scripts/patch-stryker-vitest.ts
 * Role:        Repairs @stryker-mutator/vitest-runner 10.0.0 for vitest 5.
 *              The runner joins suite and test names with a space when it
 *              builds the testNamePattern of a mutant run, while vitest 5
 *              matches that pattern against names joined with " > ": no test
 *              ran against any mutant and every mutant survived. This script
 *              rewrites the joiner in the two copies of collectTestName. It is
 *              idempotent, run by "npm install" (postinstall) and does nothing
 *              once the upstream fix ships (stryker-js issue 6210).
 * Usage:       tsx scripts/patch-stryker-vitest.ts
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RUNNER = join(ROOT, "node_modules", "@stryker-mutator", "vitest-runner", "dist", "src");
const FILES = ["test-helpers.js", "stryker-setup.js"];
const BROKEN = "return nameParts.join(' ').trim();";
const FIXED = "return nameParts.join(' > ').trim();";

if (!existsSync(RUNNER)) {
  console.log("patch-stryker-vitest: runner not installed, nothing to do.");
  process.exit(0);
}

let patched = 0;
for (const name of FILES) {
  const path = join(RUNNER, name);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  if (source.includes(FIXED)) continue;
  if (!source.includes(BROKEN)) {
    console.log(`patch-stryker-vitest: ${name} has changed upstream, left untouched.`);
    continue;
  }
  writeFileSync(path, source.replace(BROKEN, FIXED));
  patched += 1;
}
console.log(`patch-stryker-vitest: ${patched} file(s) patched, ${FILES.length - patched} already fine.`);
