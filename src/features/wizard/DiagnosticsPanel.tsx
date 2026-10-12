/*
 * File:        src/features/wizard/DiagnosticsPanel.tsx
 * Role:        Live list of errors, warnings and information, each with the
 *              fighter concerned and its rule source (VO page and section).
 *              Severity is given by text and icon, never by colour alone.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { Warband } from "../../data/schema.ts";
import { RULES, type Diagnostic, type FactionIndex, type RuleCode } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { displayParams, fighterName } from "./diagnostics.ts";

const ICON = { error: "✖", warning: "!", info: "i" } as const;
const ORDER = { error: 0, warning: 1, info: 2 } as const;

export function DiagnosticsPanel({
  diagnostics,
  warband,
  index,
}: {
  diagnostics: Diagnostic[];
  warband: Warband;
  index: FactionIndex;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  const sorted = [...diagnostics].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const count = (s: Diagnostic["severity"]) => diagnostics.filter((d) => d.severity === s).length;

  return (
    <aside aria-labelledby="diag-heading" className="panel-parchment self-start p-4 lg:sticky lg:top-24">
      <h2 id="diag-heading" className="font-hand text-2xl">
        {t("diagnostics.title")}
      </h2>
      <p className="text-sm" aria-live="polite" data-testid="diagnostics-summary">
        {t("diagnostics.summary", {
          errors: count("error"),
          warnings: count("warning"),
          infos: count("info"),
        })}
      </p>
      {sorted.length === 0 ? (
        <p className="mt-3 font-hand text-xl">{t("diagnostics.allGood")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((d, i) => {
            const rule = RULES[d.code as RuleCode];
            const who = fighterName(warband, index, d.fighterInstanceId, f.lang);
            return (
              <li
                key={`${d.code}-${d.fighterInstanceId ?? ""}-${i}`}
                className="border-l-4 border-on-panel pl-2"
              >
                <p className={d.severity === "error" ? "font-bold" : ""}>
                  <span aria-hidden="true" className="mr-1 inline-block w-4 text-center">
                    {ICON[d.severity]}
                  </span>
                  <span className="sr-only">{t(`severity.${d.severity}`)}</span>
                  {who !== null && <span className="font-bold">{t("diagnostics.who", { name: who })} </span>}
                  {t(d.messageKey, displayParams(d, index, f.lang, t))}
                </p>
                <p className="text-xs text-on-panel-muted" title={rule.ref.md}>
                  {t("diagnostics.source", {
                    page: rule.ref.page,
                    section: rule.ref.md.split(" > ").at(-1) ?? "",
                  })}
                  {"assumption" in rule && ` - ${t("diagnostics.assumption", { id: rule.assumption })}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
