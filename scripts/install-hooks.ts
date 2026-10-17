/*
 * File:        scripts/install-hooks.ts
 * Role:        Points git at the versioned hooks of .githooks/ (pre-commit and
 *              pre-push) by setting core.hooksPath in the local repository
 *              configuration. Run by the "prepare" script after "npm ci".
 *              Does nothing on the CI, outside a git checkout or when git is
 *              not on the PATH, so an install never fails because of it.
 * Usage:       npm run prepare   (or tsx scripts/install-hooks.ts)
 * Author:      Adrien Duclaud
 * Created:     2026-10-17
 * License:     MIT
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HOOKS_DIR = ".githooks";

function git(...args: string[]): { status: number | null; stdout: string } {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return { status: result.error ? null : result.status, stdout: result.stdout.trim() };
}

if (process.env["CI"] !== undefined) {
  console.log("install-hooks: CI detected, hooks not installed.");
  process.exit(0);
}

if (!existsSync(join(ROOT, HOOKS_DIR))) {
  console.error(`install-hooks: ${HOOKS_DIR}/ is missing.`);
  process.exit(1);
}

const inside = git("rev-parse", "--is-inside-work-tree");
if (inside.status !== 0 || inside.stdout !== "true") {
  console.log("install-hooks: not a git checkout, hooks not installed.");
  process.exit(0);
}

const current = git("config", "--local", "--get", "core.hooksPath").stdout;
if (current === HOOKS_DIR) {
  console.log(`install-hooks: core.hooksPath already set to ${HOOKS_DIR}.`);
  process.exit(0);
}

const set = git("config", "--local", "core.hooksPath", HOOKS_DIR);
if (set.status !== 0) {
  console.error("install-hooks: git config failed, hooks not installed.");
  process.exit(1);
}
console.log(`install-hooks: core.hooksPath set to ${HOOKS_DIR} (pre-commit, pre-push).`);
