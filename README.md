<!--
  File:     README.md
  Role:     Project overview, set-up and commands (English, with a French section)
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# BDC Warband Manager

Unofficial fan-made warband builder and campaign tracker for **Black Death City**
(playtest v1.03). Static, installable web app (PWA) that works offline, in
English and French.

> **Fan-made, unofficial.** Black Death City, its rules, texts, names and
> artwork belong to their author, Sam Pearson. This project is not affiliated
> with or endorsed by the author. It is meant for private use by a gaming
> group. The fonts Old Celtiberian (Woodcutter Manero) and Trattatello (James
> Grieshaber) are free for non-commercial use only.

## Features (planned by step)

| Step | Content                                                  | Status |
| ---- | -------------------------------------------------------- | ------ |
| 0    | Data schemas, Guild Mercenaries data, data checker       | done   |
| 1    | Project skeleton, theme, i18n, local storage, PWA, tests | done   |
| 2    | Rules engine and its tests                               | done   |
| 3    | Warband creation wizard                                  | done   |
| 4    | Campaign tracking                                        | done   |
| 5    | Printing, export, sharing                                | done   |
| 6    | Verminkin, Death Covens, The Blighted Cloister           | done   |
| 7    | Accessibility, performance, contribution guide           | done   |

## Stack

Vite 8, React 19, TypeScript 7 (strict), Tailwind CSS 4, i18next 26 with
react-i18next 17, zustand 5, zod 4, Dexie 4 (IndexedDB), vite-plugin-pwa 2,
vitest 5, Playwright 1.64, ESLint 10 with typescript-eslint, Prettier 3.

TypeScript is installed twice on purpose: `typescript-native` (7.0.2) runs the
type check, `typescript` (6.0.3) is only there for typescript-eslint, which does
not support TypeScript 7 yet. Remove the second one when typescript-eslint
accepts 7.x.

## Getting started

Requirements: Node.js 22 or later.

```bash
npm ci
npm run dev          # http://localhost:5173/bdc-warband-manager/
```

## Commands

| Command                                         | Purpose                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`                                   | Development server                                                                              |
| `npm run build`                                 | Type check then production build in `dist/`                                                     |
| `npm run preview`                               | Serve the production build                                                                      |
| `npm run typecheck`                             | TypeScript 7 strict check                                                                       |
| `npm run lint`                                  | ESLint (also forbids hard-coded JSX text)                                                       |
| `npm run format` / `format:check`               | Prettier                                                                                        |
| `npm test` / `test:coverage`                    | Unit tests (vitest)                                                                             |
| `npm run test:e2e`                              | End-to-end tests (Playwright, Chromium and Firefox)                                             |
| `npm run check:data`                            | Validate `src/data/*.json`; add `-- --sources <folder>` to compare with the translated Markdown |
| `npm run check:i18n`                            | Same keys in `en.json` and `fr.json`, every `t()` key exists, no unused key                     |
| `npm run generate:data -- --sources <folder>`   | Rebuild the Verminkin, Death Covens and Blighted Cloister data from the translation (Python)    |
| `npm run check:generated -- --sources <folder>` | Fail if a generated data file is out of date; writes nothing                                    |
| `npm run build:glossary -- --sources <folder>`  | Regenerate `src/i18n/glossary.json` from `00_glossaire.md`                                      |
| `npm run check`                                 | Everything above except the end-to-end tests                                                    |

The `--sources` folder is the "Traduction FR" folder of the translation
project. It is not part of this repository; the variable `BDC_SOURCES` can be
used instead of the option.

## Project layout

```
src/
  data/       game data (JSON) and zod schemas, see src/data/README.md
  rules/      pure rules engine, no UI dependency
  i18n/       i18next set-up, locales, generated glossary
  db/         Dexie database and versioned schema
  features/   one folder per screen
  print/      A4 roster and TCG card layouts
  styles/     Tailwind entry point and design tokens
scripts/      data, i18n and glossary tools, Python data generators
tests/        unit (vitest) and e2e (Playwright)
public/       local fonts, images, PWA icons
```

Rule readings and open questions are kept in `RULES_ASSUMPTIONS.md`. See
`CONTRIBUTING.md` before changing anything and `CHANGELOG.md` for the history.

## Quality

- Accessibility: axe-core audit of every screen in English and French (WCAG
  2.2 A and AA) in the end-to-end tests, no violation.
- Lighthouse 13.5 on the home page: accessibility, best practices and SEO
  100; performance 99 on desktop. On mobile the score is 88 to 93 with
  applied throttling (`--throttling-method=devtools`) and 75 to 90 with the
  default simulated throttling, on a slow measuring machine. The first visit
  downloads about 0.6 MB; later visits are served by the service worker.

## Deployment

The CI workflow (`.github/workflows/ci.yml`) runs every check and, on `main`,
publishes `dist/` to GitHub Pages. In the repository settings, set
**Pages > Source** to **GitHub Actions**. GitHub Pages is free for public
repositories; a private repository needs a paid plan.

## License

Code under the MIT license, see `LICENSE`. Game content and artwork are not
covered by this license.

---

## En français

**BDC Warband Manager** est un outil de fan, non officiel, pour créer et suivre
des bandes de **Black Death City** (version de test 1.03). C'est une application
web statique, installable et utilisable hors ligne, en anglais et en français.

Black Death City, ses règles, ses textes et ses illustrations appartiennent à
leur auteur, Sam Pearson. Ce projet n'est ni affilié ni approuvé par l'auteur et
reste destiné à un usage privé.

Démarrage rapide :

```bash
npm ci
npm run dev
```

Avant chaque envoi : `npm run check`, puis `npm run test:e2e`. Pour comparer les
données aux fichiers de traduction :
`npm run check:data -- --sources "<dossier Traduction FR>"`.

Les choix d'interprétation des règles sont consignés dans
`RULES_ASSUMPTIONS.md`. Le format des données est décrit dans
`src/data/README.md`, la façon de contribuer dans `CONTRIBUTING.md` et
l'historique dans `CHANGELOG.md`.
