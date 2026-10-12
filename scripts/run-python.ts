/*
 * File:        scripts/run-python.ts
 * Role:        Runs a Python script with the first interpreter found
 *              (python3, python, then the Windows launcher py), passing the
 *              remaining arguments through. Used by "npm run generate:data".
 * Usage:       tsx scripts/run-python.ts <script.py> [args...]
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { spawnSync } from "node:child_process";

const CANDIDATES = ["python3", "python", "py"];

function findPython(): string | null {
  for (const cmd of CANDIDATES) {
    const probe = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    // Python 3.10 or later is required (match statements are not used, f-strings are).
    if (probe.status === 0 && /Python 3\.(1\d|[2-9]\d)/.test(`${probe.stdout}${probe.stderr}`)) return cmd;
  }
  return null;
}

const python = findPython();
if (python === null) {
  console.error("Python 3.10 or later was not found (tried python3, python, py).");
  process.exit(1);
}
const result = spawnSync(python, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
