/*
 * File:        tests/setup.ts
 * Role:        Vitest set-up: DOM matchers and an in-memory IndexedDB so that
 *              Dexie works under jsdom.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
