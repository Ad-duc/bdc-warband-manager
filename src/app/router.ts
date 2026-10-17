/*
 * File:        src/app/router.ts
 * Role:        Minimal hash router (works on GitHub Pages without server rules).
 *              Routes: "#/" home, "#/warband/<id>" creation wizard,
 *              "#/warband/<id>/campaign" campaign dashboard,
 *              "#/warband/<id>/print" print view, "#w=<data>" shared warband,
 *              "#/rules", "#/rules/<chapter>" and "#/rules/<chapter>/<section>"
 *              French rules reader (the section is a heading id),
 *              "#/tutorial", "#/tutorial/<lesson>" and
 *              "#/tutorial/<lesson>/<step>" rules tutorial (1-based step),
 *              "#/changelog" history of the application versions,
 *              "#/card-backs" stand-alone card back generator,
 *              "#/dice" direction dice,
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
  | { name: "rules"; chapter: string | null; section?: string }
  | { name: "tutorial"; lesson: string | null; step: number | null }
  | { name: "changelog" }
  | { name: "cardBacks" }
  | { name: "dice" }
  | { name: "reminder" }
  | { name: "scenarios"; number: number | null }
  | { name: "battle"; warbandId: string | null; campaignId: string | null }
  | { name: "groupCampaign"; id: string };

export function parseHash(hash: string): Route {
  if (hash.startsWith("#w=")) return { name: "shared", payload: hash.slice(3) };
  if (hash === "#/changelog") return { name: "changelog" };
  if (hash === "#/card-backs") return { name: "cardBacks" };
  if (hash === "#/dice") return { name: "dice" };
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
  const rules = /^#\/rules(?:\/([a-z0-9-]+)(?:\/(s-[a-z0-9-]+))?)?$/.exec(hash);
  if (rules !== null) {
    const chapter = rules[1] ?? null;
    return rules[2] === undefined
      ? { name: "rules", chapter }
      : { name: "rules", chapter, section: rules[2] };
  }
  const tutorial = /^#\/tutorial(?:\/([a-z0-9-]+)(?:\/([1-9][0-9]{0,2}))?)?$/.exec(hash);
  if (tutorial !== null)
    return {
      name: "tutorial",
      lesson: tutorial[1] ?? null,
      step: tutorial[2] === undefined ? null : Number(tutorial[2]),
    };
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
      if (route.chapter === null) return "#/rules";
      return route.section === undefined
        ? `#/rules/${route.chapter}`
        : `#/rules/${route.chapter}/${route.section}`;
    case "tutorial":
      if (route.lesson === null) return "#/tutorial";
      return route.step === null ? `#/tutorial/${route.lesson}` : `#/tutorial/${route.lesson}/${route.step}`;
    case "changelog":
      return "#/changelog";
    case "cardBacks":
      return "#/card-backs";
    case "dice":
      return "#/dice";
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
