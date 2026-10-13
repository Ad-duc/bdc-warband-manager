/*
 * File:        src/app/router.ts
 * Role:        Minimal hash router (works on GitHub Pages without server rules).
 *              Routes: "#/" home, "#/warband/<id>" creation wizard,
 *              "#/warband/<id>/campaign" campaign dashboard,
 *              "#/warband/<id>/print" print view, "#w=<data>" shared warband,
 *              "#/rules" and "#/rules/<chapter>" French rules reader,
 *              "#/changelog" history of the application versions,
 *              "#/card-backs" stand-alone card back generator,
 *              "#/reminder" French reminder sheet, "#/scenarios" and
 *              "#/scenarios/<n>" scenario reference, "#/battle" battle set-up
 *              (optionally "?warband=<id>" or "?campaign=<id>"),
 *              "#/campaigns/<id>" group campaign.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useSyncExternalStore } from "react";

export type Route =
  | { name: "home" }
  | { name: "wizard"; id: string }
  | { name: "campaign"; id: string }
  | { name: "print"; id: string }
  | { name: "shared"; payload: string }
  | { name: "rules"; chapter: string | null }
  | { name: "changelog" }
  | { name: "cardBacks" }
  | { name: "reminder" }
  | { name: "scenarios"; number: number | null }
  | { name: "battle"; warbandId: string | null; campaignId: string | null }
  | { name: "groupCampaign"; id: string };

export function parseHash(hash: string): Route {
  if (hash.startsWith("#w=")) return { name: "shared", payload: hash.slice(3) };
  if (hash === "#/changelog") return { name: "changelog" };
  if (hash === "#/card-backs") return { name: "cardBacks" };
  if (hash === "#/reminder") return { name: "reminder" };
  const scenarios = /^#\/scenarios(?:\/([1-9]))?$/.exec(hash);
  if (scenarios !== null)
    return { name: "scenarios", number: scenarios[1] === undefined ? null : Number(scenarios[1]) };
  const battle = /^#\/battle(?:\?(warband|campaign)=([A-Za-z0-9-]+))?$/.exec(hash);
  if (battle !== null)
    return {
      name: "battle",
      warbandId: battle[1] === "warband" ? (battle[2] ?? null) : null,
      campaignId: battle[1] === "campaign" ? (battle[2] ?? null) : null,
    };
  const group = /^#\/campaigns\/([A-Za-z0-9-]+)$/.exec(hash);
  if (group?.[1] !== undefined) return { name: "groupCampaign", id: group[1] };
  const rules = /^#\/rules(?:\/([a-z0-9-]+))?$/.exec(hash);
  if (rules !== null) return { name: "rules", chapter: rules[1] ?? null };
  const match = /^#\/warband\/([A-Za-z0-9-]+)(?:\/(campaign|print))?$/.exec(hash);
  if (match?.[1] !== undefined) {
    const id = match[1];
    if (match[2] === "campaign") return { name: "campaign", id };
    if (match[2] === "print") return { name: "print", id };
    return { name: "wizard", id };
  }
  return { name: "home" };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "wizard":
      return `#/warband/${route.id}`;
    case "campaign":
      return `#/warband/${route.id}/campaign`;
    case "print":
      return `#/warband/${route.id}/print`;
    case "shared":
      return `#w=${route.payload}`;
    case "rules":
      return route.chapter === null ? "#/rules" : `#/rules/${route.chapter}`;
    case "changelog":
      return "#/changelog";
    case "cardBacks":
      return "#/card-backs";
    case "reminder":
      return "#/reminder";
    case "scenarios":
      return route.number === null ? "#/scenarios" : `#/scenarios/${route.number}`;
    case "battle":
      if (route.warbandId !== null) return `#/battle?warband=${route.warbandId}`;
      return route.campaignId === null ? "#/battle" : `#/battle?campaign=${route.campaignId}`;
    case "groupCampaign":
      return `#/campaigns/${route.id}`;
    case "home":
      return "#/";
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}

const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
  };
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
