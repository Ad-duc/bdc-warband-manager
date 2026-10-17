<!--
  File:     CONTRIBUTING.md
  Role:     How to set up the project, change the game data, test and submit
            changes (English, with a French summary)
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Contributing

Thank you for helping. This project is a fan-made tool for a private gaming
group: keep changes small, tested and faithful to the rules book.
The stack, every npm command, the project layout and the deployment are
described in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Set-up

Requirements:

- Node.js 22 or later (`node --version`).
- Python 3.10 or later, only to run the data generators (`python3 --version`,
  or `py --version` on Windows).
- `pdftotext` (poppler-utils), only to import a new rules version.

```bash
npm ci
npm run dev          # http://localhost:5173/bdc-warband-manager/
npx playwright install --with-deps chromium firefox   # once, for the e2e tests
```

## Workflow

1. Create a branch from `main`.
2. Make the change, with its tests.
3. Run `npm run check`, then `npm run test:e2e`.
4. Add a line under `[Unreleased]` in `CHANGELOG.md` and the same line, in
   French, under `[Non publié]` in `CHANGELOG.fr.md`. Both files are shown in
   the app ("What's new" page) and must list the same versions.
5. Open a pull request. The CI runs the same checks and publishes `main` to
   GitHub Pages.

## Game data

The data lives in `src/data/*.json`; its format is described in
`src/data/README.md`.

| File                                                                | How it is maintained                                |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| `common.json`, `guild-mercenaries.json`                             | By hand                                             |
| `verminkin.json`, `death-covens.json`, `the-blighted-cloister.json` | Built by `scripts/generators/` from the translation |

To change a generated faction, change its generator (or the translation), never
the JSON directly, then:

```bash
npm run generate:data
npm run generate:data -- --only verminkin
npm run check:generated   # writes nothing, fails if a file is out of date
npm run check:data
```

The translation is read from `sources/fr/`; `--sources <folder>` or the
variable `BDC_SOURCES` point to another folder. A new rules version is
imported with the procedure of `docs/RULES_UPDATE.md`. Prettier formats the
generated files, so they can be compared line by line in a review.

Comments and corrections on the French translation come as GitHub issues
opened from the rules reader (form `traduction`); they are sorted and applied
as described in [docs/TRANSLATION_FEEDBACK.md](docs/TRANSLATION_FEEDBACK.md).

Rules that need a reading (a contradiction between a table and a text, a
missing price) are written down in `RULES_ASSUMPTIONS.md` with an id
(`A40`, `D11`), the page, the chosen reading and the open question. Tests
refer to these ids.

## Tests

| Command                 | What it covers                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| `npm test`              | Unit tests (vitest)                                                         |
| `npm run test:coverage` | Same, with 100% coverage required on `src/rules`                            |
| `npm run test:mutation` | Stryker on `src/rules`: about 20 minutes, the score must stay at 80 or more |
| `npm run test:e2e`      | Playwright on Chromium and Firefox, including the axe-core audit            |
| `npm run check`         | Type check, lint, format, data, interface strings and unit tests            |

A new rule goes with a unit test in `tests/unit/rules/`. A new screen or a new
interaction goes with an end-to-end test and is added to
`tests/e2e/a11y.spec.ts`.

## Conventions

- **Headers.** Every file starts with a header: file, role, author, created,
  license (and usage for scripts). JSON files use a `_header` object.
- **Language.** Code, identifiers, comments, commit messages and scripts are in
  English. The interface is shown in French only; the English strings are
  kept in `en.json` with the same keys so that English can come back by
  setting `lng` in `src/i18n/index.ts` and restoring a language selector.
- **Interface strings.** No text is written in JSX: every string is a key of
  `src/i18n/locales/en.json` and `fr.json`. Both files keep the same keys;
  `npm run check:i18n` fails on a missing, empty or unused key. A key built at
  run time (``t(`rules.${code}`)``) must keep a static prefix ending with a
  dot so that the checker can follow it.
- **Typography.** Straight quotes and apostrophes, simple hyphen, no em dash,
  no non-breaking, thin or invisible space. `npm run check:data` scans the data
  and the generators for these characters.
- **Type scale.** Screens use three title levels, defined in
  `src/styles/index.css`, and nothing else sets the size of a heading:

  | Level         | Class           | Look                      | Used for                                                         |
  | ------------- | --------------- | ------------------------- | ---------------------------------------------------------------- |
  | Page title    | `title-page`    | handwritten, 2.25rem      | every `h1`, wizard step titles included                          |
  | Section title | `title-section` | handwritten, 1.5rem       | every `h2`, dialog titles, card names (faction, origin, warband) |
  | Sub-title     | `title-sub`     | body font, bold, 1.125rem | `h3` to `h6`, legends of a group of fields                       |

  A black band adds `band` to the level (`band title-section`) and keeps the
  handwritten font. Only `font-gothic` may be added on top of a level (fighter
  names, style guide). Body text is `text-sm` and tables use `.table-bdc`.
  Print layouts (`src/print`, `print.css`, `reminder.css`) keep their sizes in
  points, and the rules reader keeps the book hierarchy (`.reader-content`).
  `npm run check:ui` fails on a heading without the class of its level or
  with its own size, weight or font.

- **Dice.** Every roll states its number of dice: `1D6`, `2D6`, `1D3+1`,
  never a bare `D6` (D66 tables keep their name). The app applies the rule on
  display, `npm run check:data` rejects a bare die in the data texts and in
  `sources/fr`, and `npm run fix:dice` rewrites them.
- **No generated-by markers.** No mention of an assistant or a generator tool
  in files, metadata or commit messages.
- **Identifiers** are English kebab-case and never change once published:
  saved warbands refer to them.
- **Saved documents.** A change to the warband format bumps
  `WARBAND_SCHEMA_VERSION` (`src/data/constants.ts`) and adds a migration in
  `src/features/warbands/transfer.ts`. A change to the database adds a Dexie
  version in `src/db/database.ts`; existing versions are never edited.
- **Accessibility.** Controls have a visible label or an `aria-label`, touch
  targets are at least 44 px, colours keep the WCAG AA contrast of the style
  guide.

## Licence of contributions

Code contributions are accepted under the MIT licence of the project. Game
texts and artwork belong to their author and are not covered by it.

---

## En français

Pré-requis : Node.js 22 ou plus, Python 3.10 ou plus pour les générateurs, et
le dossier "Traduction FR" pour comparer ou régénérer les données.

1. `npm ci`, puis `npm run dev`.
2. Les factions Verminkin, Death Covens et The Blighted Cloister se modifient
   dans `scripts/generators/`, puis
   `npm run generate:data -- --sources "<dossier Traduction FR>"`. Les fichiers
   `common.json` et `guild-mercenaries.json` se modifient à la main.
3. Avant chaque envoi : `npm run check`, puis `npm run test:e2e`, et une ligne
   dans `CHANGELOG.md` et sa traduction dans `CHANGELOG.fr.md`.
4. Conventions : en-tête dans chaque fichier, code et commentaires en anglais,
   aucun texte en dur dans le JSX, dés toujours avec leur nombre (1D6, jamais
   D6 seul ; `npm run fix:dice` corrige), aucun tiret cadratin ni espace insécable,
   aucune mention d'outil de génération.
5. Les choix d'interprétation des règles vont dans `RULES_ASSUMPTIONS.md`.
