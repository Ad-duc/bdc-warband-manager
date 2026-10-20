/*
 * File:        src/features/groups/GroupCampaignPage.tsx
 * Role:        Page of a group campaign: name and notes, participants (a
 *              warband of this app with its live rating, or a guest warband
 *              typed in), standings, list of the battles with their scenario
 *              and result, a button to prepare the next battle with the set-up
 *              assistant, and deletion of the campaign. The warbands
 *              themselves are not changed here.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { useLiveQuery } from "../../app/useLiveQuery.ts";
import type { Campaign, CampaignParticipant } from "../../data/schema.ts";
import { useGameData } from "../../data/useGameData.ts";
import { db, deleteCampaign, listWarbands, saveCampaign } from "../../db/database.ts";
import { useFormatter } from "../../i18n/text.ts";
import { findFaction, indexFaction, warbandRating } from "../../rules/index.ts";
import { ConfirmDialog } from "../common/ConfirmDialog.tsx";
import { findScenario } from "../scenarios/scenarios.ts";
import {
  addGuestParticipant,
  addLocalParticipant,
  canRemoveParticipant,
  participantName,
  removeBattle,
  removeParticipant,
  standings,
} from "./groups.ts";

export function GroupCampaignPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const f = useFormatter();
  const gameData = useGameData();
  const campaign = useLiveQuery(async () => (await db.campaigns.get(id)) ?? null, [id]);
  const warbands = useLiveQuery(() => listWarbands(db), []);
  const [localPick, setLocalPick] = useState("");
  const [guest, setGuest] = useState({ name: "", factionId: "", rating: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();

  if (campaign === undefined || warbands === undefined || gameData === null)
    return <p aria-busy="true">{t("wizard.loading")}</p>;
  if (campaign === null) return <p role="alert">{t("battle.campaignMissing")}</p>;

  const byId = new Map(warbands.map((w) => [w.id, w]));
  const save = (c: Campaign) => void saveCampaign(db, c);
  const nameOf = (p: CampaignParticipant | undefined): string =>
    p === undefined ? "?" : participantName(p, byId) || t("home.unnamed");
  const participant = (pid: string | null) => campaign.participants.find((p) => p.id === pid);
  const factionName = (factionId: string | null): string => {
    const faction = factionId === null ? undefined : findFaction(gameData, factionId);
    return faction === undefined ? "-" : f.text(faction.name);
  };
  const ratingOf = (p: CampaignParticipant): number | null => {
    const w = p.warbandId === null ? undefined : byId.get(p.warbandId);
    if (w === undefined) return p.rating;
    const faction = findFaction(gameData, w.factionId);
    return faction === undefined ? null : warbandRating(indexFaction(gameData.common, faction), w).total;
  };
  const available = warbands.filter((w) => !campaign.participants.some((p) => p.warbandId === w.id));
  const table = standings(campaign);

  return (
    <div className="space-y-6">
      <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-labelledby="group-heading">
        <h1 id="group-heading" className="title-page">
          {campaign.name || t("groups.unnamed")}
        </h1>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold">{t("groups.name")}</span>
            <input
              key={`name-${campaign.id}`}
              className="field"
              defaultValue={campaign.name}
              onBlur={(e) => {
                if (e.target.value !== campaign.name)
                  save({ ...campaign, name: e.target.value, updatedAt: new Date().toISOString() });
              }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold">{t("groups.notes")}</span>
            <textarea
              key={`notes-${campaign.id}`}
              className="field min-h-11"
              defaultValue={campaign.notes}
              onBlur={(e) => {
                if (e.target.value !== campaign.notes)
                  save({ ...campaign, notes: e.target.value, updatedAt: new Date().toISOString() });
              }}
            />
          </label>
        </div>
        <p className="text-sm">{t("groups.noRules")}</p>
        <div className="flex flex-wrap gap-2">
          {campaign.participants.length >= 2 ? (
            <a
              className="btn btn-solid"
              href={hrefFor({ name: "battle", warbandId: null, campaignId: campaign.id })}
            >
              {t("groups.prepare")}
            </a>
          ) : (
            <p className="text-sm italic">{t("groups.needTwo")}</p>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setConfirmDelete(true);
            }}
          >
            {t("groups.delete")}
          </button>
        </div>
      </section>

      <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-labelledby="participants-heading">
        <h2 id="participants-heading" className="band title-section">
          {t("groups.participants")}
        </h2>
        {campaign.participants.length === 0 ? (
          <p>{t("groups.noParticipant")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-bdc" data-testid="participants">
              <thead>
                <tr>
                  <th scope="col">{t("groups.warband")}</th>
                  <th scope="col">{t("groups.faction")}</th>
                  <th scope="col">{t("groups.rating")}</th>
                  <th scope="col">{t("groups.kind")}</th>
                  <th scope="col">
                    <span className="sr-only">{t("groups.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaign.participants.map((p) => {
                  const local = p.warbandId !== null && byId.has(p.warbandId);
                  const r = ratingOf(p);
                  return (
                    <tr key={p.id}>
                      <th scope="row">
                        {local && p.warbandId !== null ? (
                          <a className="underline" href={hrefFor({ name: "campaign", id: p.warbandId })}>
                            {nameOf(p)}
                          </a>
                        ) : (
                          nameOf(p)
                        )}
                      </th>
                      <td>
                        {factionName(local ? (byId.get(p.warbandId ?? "")?.factionId ?? null) : p.factionId)}
                      </td>
                      <td>{r === null ? "-" : f.number(r)}</td>
                      <td>{t(local ? "groups.local" : "groups.guestKind")}</td>
                      <td>
                        {canRemoveParticipant(campaign, p.id) && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            aria-label={t("groups.removeNamed", { name: nameOf(p) })}
                            onClick={() => {
                              save(removeParticipant(campaign, p.id));
                            }}
                          >
                            {t("groups.remove")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <form
            className="space-y-2 border-2 border-on-panel p-3"
            aria-labelledby={`${formId}-local`}
            onSubmit={(e) => {
              e.preventDefault();
              const w = byId.get(localPick);
              if (w === undefined) return;
              save(addLocalParticipant(campaign, w));
              setLocalPick("");
            }}
          >
            <h3 id={`${formId}-local`} className="title-sub">
              {t("groups.addLocal")}
            </h3>
            <label className="block">
              <span className="text-sm">{t("groups.warband")}</span>
              <select
                className="field"
                value={localPick}
                onChange={(e) => {
                  setLocalPick(e.target.value);
                }}
              >
                <option value="">{t("battle.choose")}</option>
                {available.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || t("home.unnamed")}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-sm btn-solid" disabled={localPick === ""}>
              {t("groups.add")}
            </button>
          </form>

          <form
            className="space-y-2 border-2 border-on-panel p-3"
            aria-labelledby={`${formId}-guest`}
            onSubmit={(e) => {
              e.preventDefault();
              save(
                addGuestParticipant(campaign, {
                  name: guest.name.trim(),
                  factionId: guest.factionId === "" ? null : guest.factionId,
                  rating: guest.rating === "" ? null : Math.max(0, Math.trunc(Number(guest.rating))),
                }),
              );
              setGuest({ name: "", factionId: "", rating: "" });
            }}
          >
            <h3 id={`${formId}-guest`} className="title-sub">
              {t("groups.addGuest")}
            </h3>
            <label className="block">
              <span className="text-sm">{t("battle.guestName")}</span>
              <input
                className="field"
                value={guest.name}
                onChange={(e) => {
                  setGuest({ ...guest, name: e.target.value });
                }}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm">{t("groups.faction")}</span>
                <select
                  className="field"
                  value={guest.factionId}
                  onChange={(e) => {
                    setGuest({ ...guest, factionId: e.target.value });
                  }}
                >
                  <option value="">-</option>
                  {gameData.factions.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {f.text(fa.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm">{t("battle.guestRating")}</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={guest.rating}
                  onChange={(e) => {
                    setGuest({ ...guest, rating: e.target.value });
                  }}
                />
              </label>
            </div>
            <button type="submit" className="btn btn-sm btn-solid" disabled={guest.name.trim() === ""}>
              {t("groups.add")}
            </button>
          </form>
        </div>
      </section>

      <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-labelledby="standings-heading">
        <h2 id="standings-heading" className="band title-section">
          {t("groups.standings")}
        </h2>
        {table.length === 0 ? (
          <p>{t("groups.noParticipant")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-bdc text-center" data-testid="standings">
              <thead>
                <tr>
                  <th scope="col">{t("groups.warband")}</th>
                  <th scope="col">{t("groups.played")}</th>
                  <th scope="col">{t("groups.victories")}</th>
                  <th scope="col">{t("groups.draws")}</th>
                  <th scope="col">{t("groups.defeats")}</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr key={row.participantId}>
                    <th scope="row" className="text-left">
                      {nameOf(participant(row.participantId))}
                    </th>
                    <td>{row.played}</td>
                    <td>{row.victories}</td>
                    <td>{row.draws}</td>
                    <td>{row.defeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-parchment space-y-3 p-4 sm:p-6" aria-labelledby="battles-heading">
        <h2 id="battles-heading" className="band title-section">
          {t("groups.battles")}
        </h2>
        {campaign.battles.length === 0 ? (
          <p>{t("groups.noBattle")}</p>
        ) : (
          <ol className="space-y-2" data-testid="campaign-battles">
            {[...campaign.battles].reverse().map((b) => {
              const scenario = b.scenario === null ? undefined : findScenario(b.scenario);
              const twist = scenario?.twists.find((x) => x.roll === b.twist);
              const [a, c] = b.participantIds;
              return (
                <li key={b.id} className="flex flex-wrap items-start gap-3 border-2 border-on-panel p-3">
                  <div className="min-w-0 flex-1">
                    <p className="title-sub">
                      {t("groups.versus", { a: nameOf(participant(a)), b: nameOf(participant(c)) })}
                    </p>
                    <p className="text-sm">
                      {f.day(b.date)}
                      {" - "}
                      <span lang="fr">
                        {scenario === undefined
                          ? t("groups.noScenario")
                          : `${scenario.number}. ${scenario.title}`}
                        {twist === undefined ? "" : ` (${twist.title})`}
                      </span>
                      {" - "}
                      {b.winnerId === null
                        ? t("battle.draw")
                        : t("groups.wonBy", { name: nameOf(participant(b.winnerId)) })}
                    </p>
                    {b.notes !== "" && <p className="text-sm italic">{b.notes}</p>}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      save(removeBattle(campaign, b.id));
                    }}
                  >
                    {t("groups.removeBattle")}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title={t("groups.deleteTitle")}
        message={t("groups.deleteMessage", { name: campaign.name || t("groups.unnamed") })}
        confirmLabel={t("groups.delete")}
        onConfirm={() => {
          void deleteCampaign(db, campaign.id).then(() => {
            navigate({ name: "home" });
          });
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      />
    </div>
  );
}
