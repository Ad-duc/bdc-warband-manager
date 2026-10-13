<!--
  File:     CLAUDE.md
  Role:     Instructions read first by coding agents working in this
            repository: what the project is, how to build and test it, the
            conventions every change must follow and the procedures to use.
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Agent instructions

BDC Warband Manager is a static React PWA for Black Death City (playtest
v1.03, Sam Pearson): warband builder, campaign tracking, print sheets, battle
set-up, group campaigns and a French rules reader. It is published on GitHub
Pages at https://ad-duc.github.io/bdc-warband-manager/ from `main`. Owner and
only reviewer: Adrien Duclaud (French speaker).

Read `README.md`, `docs/DEVELOPMENT.md`, `CONTRIBUTING.md` and
`src/data/README.md` before changing anything. Rule readings already taken are
in `RULES_ASSUMPTIONS.md` (ids `A..` and `D..`, referred to by the tests).

## Procedures

| Task                                       | Follow                                       |
| ------------------------------------------ | -------------------------------------------- |
| Check for or apply a new rules publication | `docs/RULES_UPDATE.md`, step by step         |
| Sort or apply feedback on the translation  | `docs/TRANSLATION_FEEDBACK.md`               |
| Any other change                           | `CONTRIBUTING.md` (workflow and conventions) |

The "Hard rules" of `docs/RULES_UPDATE.md` override any other habit for the
first two: pull request only, never merge, never invent a rule, no AI
mention, no typographic characters, commits authored by the owner without
trailers.

## Stack and layout

Vite, React, TypeScript (type check with `typescript-native`), Tailwind,
i18next, zustand, zod, Dexie (IndexedDB), vite-plugin-pwa, marked, vitest,
Playwright with axe-core. Python 3 for the data generators and the rules
watcher. Node 22 or later.

```
src/rules/      pure rules engine (no React, no storage, no i18n), 100% covered
src/data/       game data JSON and zod schemas
src/features/   one folder per screen (wizard, campaign, battle, groups, reader...)
src/i18n/       i18next set-up, fr.json / en.json, dice notation helpers
src/db/         Dexie database, versioned schema
src/print/      A4 roster and TCG card layouts
scripts/        data and i18n checkers, Python generators, rules watcher
sources/fr/     French translation of the rules (Markdown), read by the app
sources/vo/     extracted English text of each rules version
docs/           maintenance procedures
tests/          unit (vitest) and e2e (Playwright)
```

## Commands

```bash
npm ci
npm run dev                 # http://localhost:5173/bdc-warband-manager/
npm run check               # typecheck, lint, format, data, i18n, unit tests
npm run check:generated     # generated faction files match their generators
npm run test:coverage       # 100% required on src/rules
npm run test:e2e            # Playwright, Chromium and Firefox, with axe-core
npm run generate:data       # rebuild verminkin, death-covens, the-blighted-cloister
npm run fix:dice            # write every die with its count (1D6)
npm run format              # Prettier on the whole repository
```

`npm run check` and `npm run check:generated` must pass before any commit.
Run the e2e tests for any change to a screen. With a preinstalled Chromium:
`PLAYWRIGHT_CHROMIUM_PATH=<path> npx playwright test --project=chromium`.

## Conventions

- **Language.** Code, comments, identifiers, commit messages, docs: English.
  Messages to Adrien and pull request bodies: French. The interface is shown
  in French only; `en.json` keeps the same keys so English can come back.
- **Headers.** Every new file starts with a header: file, role, author
  "Adrien Duclaud", creation date, license. JSON files use a `_header` object,
  Markdown an HTML comment, YAML a `#` comment.
- **Interface strings.** No text in JSX: every string is a key of
  `src/i18n/locales/fr.json` and `en.json`, both with the same keys.
  `npm run check:i18n` fails on a missing, empty or unused key; plural keys
  need `_one` and `_other`; a key built at run time keeps a static prefix
  ending with a dot (``t(`rules.${code}`)``).
- **Typography.** Straight quotes and apostrophes, simple hyphen, `...` instead
  of an ellipsis character, no em or en dash, no non-breaking, thin or
  zero-width space. `npm run check:data` scans the repository for them and for
  any mention of an AI tool.
- **Dice.** Every roll states its count: `1D6`, `2D6`, `1D3+1`, never a bare
  `D6`; D66 tables keep their name.
- **Rules.** Never invent a rule. A reading of an unclear text goes into
  `RULES_ASSUMPTIONS.md` with an id and the page. Content that is not in the
  book (house name tables, for example) stays out of the faction data files
  and is marked as not official in the interface.
- **Game data.** `common.json` and `guild-mercenaries.json` are edited by
  hand. `verminkin.json`, `death-covens.json` and `the-blighted-cloister.json`
  are generated from `sources/fr/` by `scripts/generators/`: change the
  generator or the translation, never the JSON. The schemas are strict: a new
  field needs a schema change.
- **Identifiers** are English kebab-case and never change once published.
- **Saved documents.** A change to the warband format bumps
  `WARBAND_SCHEMA_VERSION` and adds a migration; a database change adds a new
  Dexie version, existing versions are never edited.
- **Tests.** A new rule goes with a unit test in `tests/unit/rules/`. A new
  screen or interaction goes with an e2e test and an entry in
  `tests/e2e/a11y.spec.ts`. Controls have a visible label or an `aria-label`,
  touch targets are at least 44 px.
- **Lint traps.** React purity rules forbid `Math.random()` in render scope
  (put random helpers outside the component) and `setState` called directly
  in an effect body; `@typescript-eslint` rejects unnecessary conditions and
  async functions without `await`.
- **Changelog.** Every user-visible change adds a line under `[Unreleased]`
  in `CHANGELOG.md` and the same line, in French, under `[Non publié]` in
  `CHANGELOG.fr.md`. Both files are shown in the app and must list the same
  versions. A release moves these lines to a dated version heading and bumps
  `version` in `package.json` (Semantic Versioning); the footer shows it.

## Git and GitHub

- Commits are authored and committed as "Adrien Duclaud" (the repository
  `git config` sets it), with no co-author or tool trailer.
- Pull requests are the rule for procedures and for any change that needs a
  review; Adrien merges them himself. Small changes he asked for directly may
  go to `main` when he says so.
- Other sessions may push to `main` at the same time: `git fetch` and
  `git rebase origin/main` before pushing; on a changelog conflict keep both
  sides.
- Use the REST API (`gh api repos/Ad-duc/bdc-warband-manager/...`) rather
  than GraphQL based `gh` commands.
- Some operations can be refused by the network of an agent environment
  (pushing tags, deleting remote branches): report it to Adrien with the steps
  to do it on GitHub, never work around the restriction.
- Never rewrite history, force push or merge a pull request without an
  explicit request from Adrien naming the action.
- The CI (`.github/workflows/ci.yml`) runs every check and the e2e tests, and
  deploys `main` to GitHub Pages.
