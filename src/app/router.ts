/*
 * File:        src/app/router.ts
 * Role:        Minimal hash router (works on GitHub Pages without server rules).
 *              Routes: "#/" home, "#/warband/<id>" creation wizard,
 *              "#/warband/<id>/campaign" campaign dashboard.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useSyncExternalStore } from "react";

export type Route = { name: "home" } | { name: "wizard"; id: string } | { name: "campaign"; id: string };

export function parseHash(hash: string): Route {
  const match = /^#\/warband\/([A-Za-z0-9-]+)(\/campaign)?$/.exec(hash);
  if (match?.[1] !== undefined) return { name: match[2] === undefined ? "wizard" : "campaign", id: match[1] };
  return { name: "home" };
}

export function hrefFor(route: Route): string {
  if (route.name === "wizard") return `#/warband/${route.id}`;
  if (route.name === "campaign") return `#/warband/${route.id}/campaign`;
  return "#/";
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
