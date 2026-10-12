/*
 * File:        src/app/router.ts
 * Role:        Minimal hash router (works on GitHub Pages without server rules).
 *              Routes: "#/" home, "#/warband/<id>" creation wizard,
 *              "#/warband/<id>/campaign" campaign dashboard,
 *              "#/warband/<id>/print" print view, "#w=<data>" shared warband,
 *              "#/rules" and "#/rules/<chapter>" French rules reader,
 *              "#/changelog" history of the application versions.
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
  | { name: "changelog" };

export function parseHash(hash: string): Route {
  if (hash.startsWith("#w=")) return { name: "shared", payload: hash.slice(3) };
  if (hash === "#/changelog") return { name: "changelog" };
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
