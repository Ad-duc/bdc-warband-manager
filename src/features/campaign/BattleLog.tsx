/*
 * File:        src/features/campaign/BattleLog.tsx
 * Role:        Battle log: list of the recorded battles, "New battle" form
 *              (scenario, opponent, result, experience per fighter, losses,
 *              gains) with a summary shown before applying everything at once,
 *              and undo of the last battle. A battle prepared with the set-up
 *              assistant opens the form with its scenario and opponent.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Warband, WarbandFighter } from "../../data/schema.ts";
import { gainsNoExperience, type FactionIndex } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { fighterLabel } from "../warbands/factory.ts";
import { ConfirmDialog } from "../common/ConfirmDialog.tsx";
import { applyBattle, emptyBattle, toLogEntry, undoLastBattle, type BattleDraft } from "./campaign.ts";
import { clearPrefill, peekPrefill } from "../battle/handoff.ts";

const RESULTS = ["victory", "defeat", "draw"] as const;

export function BattleLog({
  warband,
  index,
  update,
}: {
  warband: Warband;
  index: FactionIndex;
  update: (change: (w: Warband) => Warband) => void;
}) {
  const { t } = useTranslation();
  const f = useFormatter();
  // A battle prepared with the set-up assistant opens the form already filled in.
  const [draft, setDraft] = useState<BattleDraft | null>(() => {
    const prefill = peekPrefill(warband.id);
    return prefill === null
      ? null
      : { ...emptyBattle(), scenario: prefill.scenario, opponent: prefill.opponent, notes: prefill.notes };
  });
  useEffect(() => {
    if (peekPrefill(warband.id) !== null) clearPrefill();
  }, [warband.id]);
  const [reviewing, setReviewing] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const formId = useId();
  const active = warband.fighters.filter((x) => x.status === "active");
  // Thralls never gain experience (p. 96): their input stays disabled.
  const noXp = (x: WarbandFighter): boolean => {
    const p = index.fighters.get(x.profileId);
    return p !== undefined && gainsNoExperience(index, p);
  };
  const nameOf = (x: WarbandFighter) =>
    fighterLabel(x, index.fighters.get(x.profileId)?.name[f.lang] ?? x.profileId);
  const byId = new Map(warband.fighters.map((x) => [x.instanceId, x]));

  const patch = (p: Partial<BattleDraft>) => {
    setDraft((d) => (d === null ? d : { ...d, ...p }));
    setReviewing(false);
  };

  const apply = () => {
    if (draft === null) return;
    const entry = toLogEntry(draft);
    update((w) =>
      applyBattle(w, entry, (fighter) => {
        const xp = entry.deltas.experience[fighter.instanceId] ?? 0;
        const parts = [
          t("campaign.battle.historyBattle", {
            scenario: entry.scenario || "-",
            opponent: entry.opponent || "-",
          }),
        ];
        if (xp !== 0) parts.push(t("campaign.battle.historyXp", { count: xp }));
        if (entry.deltas.fightersLost.includes(fighter.instanceId))
          parts.push(t("campaign.battle.historyLost"));
        return parts.join(", ");
      }),
    );
    setDraft(null);
    setReviewing(false);
  };

  const num = (v: string): number => Math.trunc(Number(v) || 0);

  return (
    <section aria-labelledby="log-heading" className="space-y-3">
      <h2 id="log-heading" className="band title-section">
        {t("campaign.battle.title")}
      </h2>

      {draft === null ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-solid"
            onClick={() => {
              setDraft(emptyBattle());
            }}
          >
            {t("campaign.battle.new")}
          </button>
          {warband.battleLog.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirmUndo(true);
              }}
            >
              {t("campaign.battle.undo")}
            </button>
          )}
        </div>
      ) : (
        <form
          aria-labelledby={`${formId}-title`}
          className="space-y-3 border-2 border-on-panel p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setReviewing(true);
          }}
        >
          <h3 id={`${formId}-title`} className="title-sub">
            {t("campaign.battle.new")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold">{t("campaign.battle.date")}</span>
              <input
                type="date"
                className="field"
                required
                value={draft.date}
                onChange={(e) => {
                  patch({ date: e.target.value });
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t("campaign.battle.scenario")}</span>
              <input
                className="field"
                value={draft.scenario}
                onChange={(e) => {
                  patch({ scenario: e.target.value });
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t("campaign.battle.opponent")}</span>
              <input
                className="field"
                value={draft.opponent}
                onChange={(e) => {
                  patch({ opponent: e.target.value });
                }}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-bold">{t("campaign.battle.result")}</legend>
            <div className="flex flex-wrap gap-3">
              {RESULTS.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${formId}-result`}
                    className="size-5"
                    checked={draft.result === r}
                    onChange={() => {
                      patch({ result: r });
                    }}
                  />
                  {t(`campaign.result.${r}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold">{t("campaign.battle.perFighter")}</legend>
            <table className="table-bdc mt-1">
              <thead>
                <tr>
                  <th scope="col">{t("roster.name")}</th>
                  <th scope="col">{t("campaign.battle.xpGained")}</th>
                  <th scope="col">{t("campaign.battle.lost")}</th>
                </tr>
              </thead>
              <tbody>
                {active.map((x) => (
                  <tr key={x.instanceId}>
                    <th scope="row" className="!bg-transparent !text-on-panel font-normal">
                      {nameOf(x)}
                    </th>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="field w-20"
                        disabled={noXp(x)}
                        title={noXp(x) ? t("campaign.fighter.noExperience") : undefined}
                        aria-label={t("campaign.battle.xpFor", { name: nameOf(x) })}
                        value={draft.experience[x.instanceId] ?? ""}
                        onChange={(e) => {
                          patch({ experience: { ...draft.experience, [x.instanceId]: num(e.target.value) } });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="size-5"
                        aria-label={t("campaign.battle.lostFor", { name: nameOf(x) })}
                        checked={draft.fightersLost.includes(x.instanceId)}
                        onChange={(e) => {
                          patch({
                            fightersLost: e.target.checked
                              ? [...draft.fightersLost, x.instanceId]
                              : draft.fightersLost.filter((id) => id !== x.instanceId),
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            {(["silver", "leechJars", "holdingsRansacked"] as const).map((key) => (
              <label key={key} className="block">
                <span className="text-sm font-bold">{t(`campaign.battle.${key}`)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="field"
                  min={key === "holdingsRansacked" ? 0 : undefined}
                  value={draft[key]}
                  onChange={(e) => {
                    patch({ [key]: num(e.target.value) });
                  }}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-bold">{t("campaign.battle.notes")}</span>
            <textarea
              className="field min-h-20"
              value={draft.notes}
              onChange={(e) => {
                patch({ notes: e.target.value });
              }}
            />
          </label>

          {reviewing && <BattleSummary draft={draft} byId={byId} nameOf={nameOf} />}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDraft(null);
                setReviewing(false);
              }}
            >
              {t("common.cancel")}
            </button>
            {!reviewing ? (
              <button type="submit" className="btn btn-solid">
                {t("campaign.battle.review")}
              </button>
            ) : (
              <button type="button" className="btn btn-solid" onClick={apply}>
                {t("campaign.battle.apply")}
              </button>
            )}
          </div>
        </form>
      )}

      {warband.battleLog.length === 0 ? (
        <p>{t("campaign.battle.empty")}</p>
      ) : (
        <ol reversed className="space-y-2" data-testid="battle-log">
          {[...warband.battleLog].reverse().map((e) => (
            <li key={e.id} className="border-l-4 border-on-panel pl-2">
              <p className="font-bold">
                {f.day(e.date)} - {t(`campaign.result.${e.result}`)} - {e.scenario || "-"} -{" "}
                {e.opponent || "-"}
              </p>
              <p className="text-sm">
                {t("campaign.battle.entryDeltas", {
                  xp: Object.values(e.deltas.experience).reduce((s, v) => s + v, 0),
                  silver: e.deltas.silver,
                  jars: e.deltas.leechJars,
                  lost: e.deltas.fightersLost.length,
                })}
              </p>
              {e.notes !== "" && <p className="text-sm italic">{e.notes}</p>}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={confirmUndo}
        title={t("campaign.battle.undoTitle")}
        message={t("campaign.battle.undoMessage")}
        confirmLabel={t("campaign.battle.undo")}
        onCancel={() => {
          setConfirmUndo(false);
        }}
        onConfirm={() => {
          update(undoLastBattle);
          setConfirmUndo(false);
        }}
      />
    </section>
  );
}

function BattleSummary({
  draft,
  byId,
  nameOf,
}: {
  draft: BattleDraft;
  byId: Map<string, WarbandFighter>;
  nameOf: (x: WarbandFighter) => string;
}) {
  const { t } = useTranslation();
  const lines: string[] = [t("campaign.summary.result", { result: t(`campaign.result.${draft.result}`) })];
  for (const [id, xp] of Object.entries(draft.experience)) {
    const x = byId.get(id);
    if (x !== undefined && xp !== 0) lines.push(t("campaign.summary.xp", { name: nameOf(x), count: xp }));
  }
  for (const id of draft.fightersLost) {
    const x = byId.get(id);
    if (x !== undefined) lines.push(t("campaign.summary.lost", { name: nameOf(x) }));
  }
  if (draft.silver !== 0) lines.push(t("campaign.summary.silver", { count: draft.silver }));
  if (draft.leechJars !== 0) lines.push(t("campaign.summary.jars", { count: draft.leechJars }));
  if (draft.holdingsRansacked !== 0)
    lines.push(t("campaign.summary.ransacked", { count: draft.holdingsRansacked }));

  return (
    <div role="status" className="border-2 border-on-panel bg-bone p-3" data-testid="battle-summary">
      <p className="font-bold">{t("campaign.summary.title")}</p>
      <ul className="list-none text-sm">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
