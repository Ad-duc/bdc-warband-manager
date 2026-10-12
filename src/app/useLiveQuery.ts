/*
 * File:        src/app/useLiveQuery.ts
 * Role:        React hook over Dexie liveQuery: re-renders when the queried
 *              IndexedDB tables change.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (v) => {
        setValue(v);
      },
      error: () => {
        setValue(undefined);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
