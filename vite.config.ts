/*
 * File:        vite.config.ts
 * Role:        Vite build configuration: React, Tailwind CSS, PWA (offline
 *              cache, manifest, automatic updates) and the GitHub Pages base
 *              path.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

/** Served from https://<user>.github.io/bdc-warband-manager/ */
export const BASE_PATH = "/bdc-warband-manager/";

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version takes over and reloads the page (src/pwa.ts checks for one).
      registerType: "autoUpdate",
      // Registered from src/main.tsx through virtual:pwa-register.
      injectRegister: false,
      includeAssets: ["icons/favicon-64.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "BDC Warband Manager",
        short_name: "BDC Warbands",
        description: "Outil de fan non officiel pour créer et suivre ses bandes de Black Death City.",
        lang: "fr",
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: "standalone",
        orientation: "any",
        background_color: "#0B0B0B",
        theme_color: "#0B0B0B",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webp,svg,woff2,json,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${BASE_PATH}index.html`,
        // A new worker takes control of the open pages at once, so the page can reload on it.
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: "es2023",
    sourcemap: true,
  },
});
