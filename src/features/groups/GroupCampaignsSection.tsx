/*
 * File:        src/features/groups/GroupCampaignsSection.tsx
 * Role:        "Group campaigns" block of the home page: list of the saved
 *              campaigns and creation of a new one, then opening of its page.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor, navigate } from "../../app/router.ts";
import { useLiveQuery } from "../../app/useLiveQuery.ts";
import { db, listCampaigns, saveCampaign } from "../../db/database.ts";
import { useFormatter } from "../../i18n/text.ts";
import { createCampaign } from "./groups.ts";

export function GroupCampaignsSection() {
  const { t } = useTranslation();
  const f = useFormatter();
  const campaigns = useLiveQuery(() => listCampaigns(db), []);
  const [name, setName] = useState("");
  const nameId = useId();

  const create = async () => {
    const c = createCampaign(name.trim());
    await saveCampaign(db, c);
    setName("");
    navigate({ name: "groupCampaign", id: c.id });
  };

  return (
    <section aria-labelledby="groups-heading" className="mt-10 border-t-2 border-on-panel pt-6">
      <h2 id="groups-heading" className="title-section text-center">
        {t("groups.heading")}
      </h2>
      <p className="mx-auto mt-2 max-w-3xl text-center text-sm">{t("groups.intro")}</p>
      <form
        className="mx-auto mt-4 flex max-w-xl flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label htmlFor={nameId} className="sr-only">
          {t("groups.name")}
        </label>
        <input
          id={nameId}
          className="field min-w-0 flex-1"
          placeholder={t("groups.namePlaceholder")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <button type="submit" className="btn btn-solid">
          {t("groups.create")}
        </button>
        <a className="btn" href={hrefFor({ name: "battle", warbandId: null, campaignId: null })}>
          {t("scenarios.setUp")}
        </a>
      </form>
      {campaigns !== undefined && campaigns.length > 0 && (
        <ul className="mt-4 space-y-2" data-testid="campaign-list">
          {campaigns.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 border-2 border-on-panel p-3">
              <a
                className="title-section min-w-0 flex-1 underline-offset-4 hover:underline"
                href={hrefFor({ name: "groupCampaign", id: c.id })}
              >
                {c.name || t("groups.unnamed")}
              </a>
              <span className="text-sm">
                {t("groups.summary", { warbands: c.participants.length, count: c.battles.length })}
                {" - "}
                {t("home.updated", { date: f.date(c.updatedAt) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
