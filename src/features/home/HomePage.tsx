/*
 * File:        src/features/home/HomePage.tsx
 * Role:        Home screen: saved warbands (name, faction, rating, last
 *              update) with open, duplicate, export and delete (confirmed);
 *              creation of a new warband and JSON import.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadGameDataAsync, useGameData } from "../../data/useGameData.ts";
import type { Warband } from "../../data/schema.ts";
import { db, deleteWarband, listWarbands, saveWarband } from "../../db/database.ts";
import { useLiveQuery } from "../../app/useLiveQuery.ts";
import { hrefFor, navigate } from "../../app/router.ts";
import { findFaction, indexFaction, warbandRating } from "../../rules/index.ts";
import { useFormatter } from "../../i18n/text.ts";
import { useWizard } from "../../store/wizard.ts";
import { ConfirmDialog } from "../common/ConfirmDialog.tsx";
import { ShareButton } from "../share/ShareButton.tsx";
import { GroupCampaignsSection } from "../groups/GroupCampaignsSection.tsx";
import { createWarband, duplicateWarband, newId } from "../warbands/factory.ts";
import { downloadExport } from "../warbands/export.ts";

export function HomePage() {
  const { t } = useTranslation();
  const f = useFormatter();
  const warbands = useLiveQuery(() => listWarbands(db), []);
  const start = useWizard((s) => s.start);
  const [toDelete, setToDelete] = useState<Warband | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gameData = useGameData();

  const create = async () => {
    const faction = (await loadGameDataAsync()).factions[0];
    if (faction === undefined) return;
    const w = createWarband(f.lang, faction.id);
    await start(w);
    navigate({ name: "wizard", id: w.id });
  };

  const importFile = async (file: File) => {
    const { parseImport } = await import("../warbands/transfer.ts");
    const result = parseImport(await file.text());
    if (!result.ok) {
      const known = ["invalid-json", "newer-version", "empty"].includes(result.error);
      setMessage(
        known
          ? t(`home.importError.${result.error}`)
          : t("home.importError.invalid", { detail: result.error }),
      );
      return;
    }
    const existing = new Set((await listWarbands(db)).map((w) => w.id));
    for (const w of result.warbands) await saveWarband(db, existing.has(w.id) ? { ...w, id: newId() } : w);
    setMessage(t("home.imported", { count: result.warbands.length }));
  };

  const rating = (w: Warband): number | null => {
    if (gameData === null) return null;
    const faction = findFaction(gameData, w.factionId);
    return faction === undefined ? null : warbandRating(indexFaction(gameData.common, faction), w).total;
  };

  return (
    <section aria-labelledby="home-heading" className="panel-parchment mx-auto max-w-7xl p-6 sm:p-10">
      <h1 id="home-heading" className="title-page text-center">
        {t("home.heading")}
      </h1>
      <div className="ornament my-4" aria-hidden="true" />

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-solid" onClick={() => void create()}>
          {t("home.create")}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            fileRef.current?.click();
          }}
        >
          {t("home.import")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("home.import")}
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file !== undefined) void importFile(file);
            e.target.value = "";
          }}
        />
        {warbands !== undefined && warbands.length > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              downloadExport(warbands);
            }}
          >
            {t("home.exportAll")}
          </button>
        )}
      </div>
      {message !== null && (
        <p role="status" className="mt-3 text-center">
          {message}
        </p>
      )}

      {warbands === undefined ? (
        <p className="mt-6 text-center">{t("wizard.loading")}</p>
      ) : warbands.length === 0 ? (
        <p className="mt-6 text-center text-lg text-on-panel-muted">{t("home.empty")}</p>
      ) : (
        <>
          <p className="mt-6 text-center font-hand text-xl" aria-live="polite">
            {t("home.savedCount", { count: warbands.length })}
          </p>
          <ul className="mt-4 space-y-3" data-testid="warband-list">
            {warbands.map((w) => {
              const faction = gameData === null ? undefined : findFaction(gameData, w.factionId);
              const r = rating(w);
              const title = w.name.trim() === "" ? t("home.unnamed") : w.name;
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-3 border-2 border-on-panel p-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={hrefFor({ name: "wizard", id: w.id })}
                      className="title-section underline-offset-4 hover:underline"
                    >
                      {title}
                    </a>
                    <p className="text-sm">
                      {faction === undefined ? w.factionId : f.text(faction.name)}
                      {" - "}
                      {t("home.rating", { value: r === null ? "-" : f.number(r) })}
                      {" - "}
                      {t("home.updated", { date: f.date(w.updatedAt) })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="btn btn-sm"
                      href={hrefFor({ name: "campaign", id: w.id })}
                      aria-label={t("home.campaignNamed", { name: title })}
                    >
                      {t("home.campaign")}
                    </a>
                    <a
                      className="btn btn-sm"
                      href={hrefFor({ name: "wizard", id: w.id })}
                      aria-label={t("home.editNamed", { name: title })}
                    >
                      {t("home.edit")}
                    </a>
                    <a
                      className="btn btn-sm"
                      href={hrefFor({ name: "print", id: w.id })}
                      aria-label={t("home.printNamed", { name: title })}
                    >
                      {t("home.print")}
                    </a>
                    <ShareButton warband={w} small label={t("home.shareNamed", { name: title })} />
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={t("home.duplicateNamed", { name: title })}
                      onClick={() => void saveWarband(db, duplicateWarband(w, t("home.copySuffix")))}
                    >
                      {t("home.duplicate")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={t("home.exportNamed", { name: title })}
                      onClick={() => {
                        downloadExport([w]);
                      }}
                    >
                      {t("home.export")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={t("home.deleteNamed", { name: title })}
                      onClick={() => {
                        setToDelete(w);
                      }}
                    >
                      {t("home.delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t("home.deleteTitle")}
        message={t("home.deleteMessage", { name: toDelete?.name.trim() || t("home.unnamed") })}
        confirmLabel={t("home.delete")}
        onCancel={() => {
          setToDelete(null);
        }}
        onConfirm={() => {
          if (toDelete !== null) void deleteWarband(db, toDelete.id);
          setToDelete(null);
        }}
      />
      <GroupCampaignsSection />
    </section>
  );
}
