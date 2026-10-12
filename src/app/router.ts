/*
 * File:        src/app/router.ts
 * Role:        Minimal hash router (works on GitHub Pages without server rules).
 *              Routes: "#/" home, "#/warband/<id>" creation wizard,
 *              "#/warband/<id>/campaign" campaign dashboard,
 *              "#/warband/<id>/print" print view, "#w=<data>" shared warband.
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
  | { name: "shared"; payload: string };

export function parseHash(hash: string): Route {
  if (hash.startsWith("#w=")) return { name: "shared", payload: hash.slice(3) };
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
