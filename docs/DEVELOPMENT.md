<!--
  File:     docs/DEVELOPMENT.md
  Role:     Developer guide: stack, set-up, commands, project layout, rules
            watcher, quality figures and deployment
  Author:   Adrien Duclaud
  Created:  2026-10-13
  License:  MIT
-->

# Development

Technical guide of BDC Warband Manager. The app itself is described in the
[README](../README.md); how to submit a change is in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Build steps

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
react-i18next 17, zustand 5, zod 4, Dexie 4 (IndexedDB), marked 18 (rules
reader), vite-plugin-pwa 2, vitest 5, Playwright 1.64, ESLint 10 with
typescript-eslint, Prettier 3.

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

| Command                                | Purpose                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                          | Development server                                                                           |
| `npm run build`                        | Type check then production build in `dist/`                                                  |
| `npm run preview`                      | Serve the production build                                                                   |
| `npm run typecheck`                    | TypeScript 7 strict check                                                                    |
| `npm run lint`                         | ESLint (also forbids hard-coded JSX text)                                                    |
| `npm run format` / `format:check`      | Prettier                                                                                     |
| `npm test` / `test:coverage`           | Unit tests (vitest)                                                                          |
| `npm run test:e2e`                     | End-to-end tests (Playwright, Chromium and Firefox)                                          |
| `npm run check:data`                   | Validate `src/data/*.json` and compare it with the translated Markdown of `sources/fr/`      |
| `npm run check:i18n`                   | Same keys in `en.json` and `fr.json`, every `t()` key exists, no unused key                  |
| `npm run check:ui`                     | Every heading uses the title class of its level (type scale, see `CONTRIBUTING.md`)          |
| `npm run generate:data`                | Rebuild the Verminkin, Death Covens and Blighted Cloister data from the translation (Python) |
| `npm run check:generated`              | Fail if a generated data file is out of date; writes nothing                                 |
| `npm run fix:dice`                     | Write every die with its number of dice (1D6) in `sources/fr` and the data texts             |
| `npm run build:glossary`               | Regenerate `src/i18n/glossary.json` from `00_glossaire.md`                                   |
| `npm run check:fast`                   | Type check, Prettier, data, interface strings and type scale; run by the pre-commit hook     |
| `npm run check`                        | Everything above except the end-to-end tests; run by the pre-push hook and the CI            |
| `npm run prepare`                      | Point git at the versioned hooks of `.githooks/` (done by `npm ci`, skipped on the CI)       |
| `npm run watch:check`                  | Look for a new official rules version or resource (exit 10 or 11 when something is new)      |
| `npm run watch:fetch -- --version <v>` | Download a rules PDF, extract its text to `sources/vo/`, update `sources/manifest.json`      |
| `npm run watch:diff`                   | Paragraph diff of the previous and current rules text into `.cache/watch/`                   |
| `npm run watch:mark`                   | Record the version followed by the translation (`--translated`) and the data (`--app-data`)  |

The translation and the extracted rules text live in `sources/` (see
[`sources/README.md`](../sources/README.md)). The data scripts read `sources/fr/` by default;
`--sources <folder>` or the variable `BDC_SOURCES` point them elsewhere.

## Rules watcher

A scheduled agent run checks every week for a new Black Death City
publication. When one is out, it follows [`RULES_UPDATE.md`](RULES_UPDATE.md): downloads
the PDF, compares the text with the previous version, updates the French
translation and the game data, runs every check and opens a pull request
labelled `rules-watch`. Nothing reaches `main` without a review.

## Translation feedback

The rules reader links every section to a pre-filled GitHub issue form
(`.github/ISSUE_TEMPLATE/traduction.yml`, label `traduction`). Accepted
issues are applied to `sources/fr` by a pull request, as described in
[`TRANSLATION_FEEDBACK.md`](TRANSLATION_FEEDBACK.md).

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
scripts/      data, i18n and glossary tools, Python data generators, rules watcher
sources/      extracted rules text, French translation, release manifest
docs/         maintenance procedures (rules update, translation feedback)
tests/        unit (vitest) and e2e (Playwright)
public/       local fonts, images, PWA icons
```

Rule readings and open questions are kept in
[`RULES_ASSUMPTIONS.md`](../RULES_ASSUMPTIONS.md). See
[`CONTRIBUTING.md`](../CONTRIBUTING.md) before changing anything and
[`CHANGELOG.md`](../CHANGELOG.md) (French:
[`CHANGELOG.fr.md`](../CHANGELOG.fr.md)) for the history.

## Quality

- Accessibility: axe-core audit of every screen of the French interface (WCAG
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
