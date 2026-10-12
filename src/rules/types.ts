/*
 * File:        src/rules/types.ts
 * Role:        Types shared by the rules engine: validation modes, diagnostics
 *              and the game data bundle the engine works on.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import type { CommonData, FactionData } from "../data/schema.ts";

/** "recruitment": creation at 1000 silver. "campaign": after the first battle. */
export type ValidationMode = "recruitment" | "campaign";

export type Severity = "error" | "warning" | "info";

/** Parameters stay language independent: ids and numbers only. */
export type DiagnosticParams = Record<string, string | number>;

export interface Diagnostic {
  severity: Severity;
  /** Stable code, also the i18n key suffix: "rules.<code>". */
  code: string;
  messageKey: string;
  params: DiagnosticParams;
  fighterInstanceId?: string;
}

/** What the engine needs: shared data plus every loaded faction. */
export interface RulesData {
  common: CommonData;
  factions: FactionData[];
}
