/*
 * File:        src/data/useGameData.ts
 * Role:        Loads the game data on demand (separate chunk) for the screens
 *              shown first, so the home page paints before the data is parsed.
 *              The other screens are lazy-loaded and import the data directly.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useState } from "react";
import type { GameData } from "./index.ts";

let pending: Promise<GameData> | null = null;
let loaded: GameData | null = null;

/** Loads the data once; later calls reuse the same promise. */
export function loadGameDataAsync(): Promise<GameData> {
  pending ??= import("./index.ts").then((m) => {
    loaded = m.gameData;
    return m.gameData;
  });
  return pending;
}

/** The game data, or null while it is still loading. */
export function useGameData(): GameData | null {
  const [data, setData] = useState<GameData | null>(loaded);
  useEffect(() => {
    if (data !== null) return;
    let alive = true;
    void loadGameDataAsync().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [data]);
  return data;
}
