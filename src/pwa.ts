/*
 * File:        src/pwa.ts
 * Role:        Service worker updates. The worker is registered as soon as
 *              the page loads; the app then asks the server for a new version
 *              when the tab comes back to the foreground and every 15 minutes
 *              while it stays open, skipping the check when offline. With the
 *              "autoUpdate" mode of vite-plugin-pwa, a new version takes over
 *              and the page reloads by itself: no need to clear the browser
 *              cache after a deployment. Saved warbands live in IndexedDB and
 *              are not touched.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

/** Delay between two update checks while the app stays open. */
export const UPDATE_INTERVAL_MS = 15 * 60 * 1000;

/** The parts of the browser the update logic needs, so it can be tested. */
export interface UpdateEnvironment {
  isOnline: () => boolean;
  isVisible: () => boolean;
  /** Fetches the worker script without any cache; resolves to the HTTP status. */
  fetchStatus: (url: string) => Promise<number>;
  onVisible: (callback: () => void) => void;
  every: (ms: number, callback: () => void) => void;
}

/** Minimal view of a ServiceWorkerRegistration. */
export interface Registration {
  installing: unknown;
  update: () => Promise<unknown>;
}

/**
 * Asks the server for a new worker when it makes sense: not while one is
 * already installing, not offline, and only when the worker script answers.
 * Returns true when an update check was started.
 */
export async function checkForUpdate(
  swUrl: string,
  registration: Registration,
  env: Pick<UpdateEnvironment, "isOnline" | "fetchStatus">,
): Promise<boolean> {
  if (registration.installing !== null || !env.isOnline()) return false;
  try {
    if ((await env.fetchStatus(swUrl)) !== 200) return false;
    await registration.update();
    return true;
  } catch {
    // Network error or server unreachable: try again at the next occasion.
    return false;
  }
}

/** Plans the update checks: when the tab is shown again, and on a timer while it is visible. */
export function scheduleUpdates(swUrl: string, registration: Registration, env: UpdateEnvironment): void {
  const check = (): void => {
    void checkForUpdate(swUrl, registration, env);
  };
  env.onVisible(check);
  env.every(UPDATE_INTERVAL_MS, () => {
    if (env.isVisible()) check();
  });
}

/** Browser implementation of UpdateEnvironment. */
export const browserEnvironment: UpdateEnvironment = {
  isOnline: () => navigator.onLine,
  isVisible: () => document.visibilityState === "visible",
  fetchStatus: async (url) => {
    const response = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
    return response.status;
  },
  onVisible: (callback) => {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") callback();
    });
  },
  every: (ms, callback) => {
    window.setInterval(callback, ms);
  },
};
