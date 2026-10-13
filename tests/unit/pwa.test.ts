/*
 * File:        tests/unit/pwa.test.ts
 * Role:        Service worker updates (src/pwa.ts): an update is asked only
 *              online, when no worker is installing and when the worker script
 *              answers; checks run when the tab comes back and on a timer while
 *              it is visible.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { describe, expect, it, vi } from "vitest";
import {
  UPDATE_INTERVAL_MS,
  checkForUpdate,
  scheduleUpdates,
  type UpdateEnvironment,
} from "../../src/pwa.ts";

function registration(installing: unknown = null) {
  return { installing, update: vi.fn(() => Promise.resolve()) };
}

function environment(overrides: Partial<UpdateEnvironment> = {}) {
  const listeners: (() => void)[] = [];
  const timers: { ms: number; callback: () => void }[] = [];
  const env: UpdateEnvironment = {
    isOnline: () => true,
    isVisible: () => true,
    fetchStatus: vi.fn(() => Promise.resolve(200)),
    onVisible: (callback) => listeners.push(callback),
    every: (ms, callback) => timers.push({ ms, callback }),
    ...overrides,
  };
  return { env, listeners, timers };
}

describe("checkForUpdate", () => {
  it("asks for an update when online and the worker script answers", async () => {
    const r = registration();
    const { env } = environment();
    expect(await checkForUpdate("/sw.js", r, env)).toBe(true);
    expect(env.fetchStatus).toHaveBeenCalledWith("/sw.js");
    expect(r.update).toHaveBeenCalledOnce();
  });

  it("does nothing offline or while a worker is installing", async () => {
    const offline = environment({ isOnline: () => false });
    const r1 = registration();
    expect(await checkForUpdate("/sw.js", r1, offline.env)).toBe(false);
    expect(offline.env.fetchStatus).not.toHaveBeenCalled();

    const r2 = registration({});
    expect(await checkForUpdate("/sw.js", r2, environment().env)).toBe(false);
    expect(r2.update).not.toHaveBeenCalled();
  });

  it("does nothing when the script is missing or the network fails", async () => {
    const r = registration();
    expect(
      await checkForUpdate("/sw.js", r, environment({ fetchStatus: () => Promise.resolve(404) }).env),
    ).toBe(false);
    expect(
      await checkForUpdate(
        "/sw.js",
        r,
        environment({ fetchStatus: () => Promise.reject(new Error("down")) }).env,
      ),
    ).toBe(false);
    expect(r.update).not.toHaveBeenCalled();
  });
});

describe("scheduleUpdates", () => {
  it("checks when the tab is shown again and every 15 minutes while visible", async () => {
    let visible = true;
    const r = registration();
    const { env, listeners, timers } = environment({ isVisible: () => visible });
    scheduleUpdates("/sw.js", r, env);
    expect(listeners).toHaveLength(1);
    expect(timers.map((x) => x.ms)).toEqual([UPDATE_INTERVAL_MS]);
    expect(UPDATE_INTERVAL_MS).toBe(15 * 60 * 1000);

    listeners[0]?.();
    await vi.waitFor(() => {
      expect(r.update).toHaveBeenCalledTimes(1);
    });
    timers[0]?.callback();
    await vi.waitFor(() => {
      expect(r.update).toHaveBeenCalledTimes(2);
    });
    visible = false;
    timers[0]?.callback();
    await Promise.resolve();
    expect(env.fetchStatus).toHaveBeenCalledTimes(2);
  });
});
