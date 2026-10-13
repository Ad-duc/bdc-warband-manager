<!--
  File:     CLAUDE.md
  Role:     Instructions read first by coding agents working in this repository
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Agent instructions

BDC Warband Manager is a static React PWA built from the Black Death City
playtest rules. Read `README.md`, `docs/DEVELOPMENT.md`, `CONTRIBUTING.md` and
`src/data/README.md` before changing anything.

## Rules watcher

When asked to check for, or apply, a new rules publication, follow
`docs/RULES_UPDATE.md` step by step. Its "Hard rules" section overrides any
other habit: pull request only, never merge, never invent a rule, no AI
mention, no typographic characters, commits authored by the owner without
trailers.

## Conventions

- Code, comments, identifiers, commits: English. Messages to Adrien and pull
  request bodies: French.
- Every new file starts with a header (file, role, author "Adrien Duclaud",
  creation date, license), JSON files with a `_header` object.
- Translation sources live in `sources/fr/` (Markdown, French with original
  terms in parentheses); the English text of each rules version in
  `sources/vo/`. The data scripts read `sources/fr/` by default.
- Before any commit: `npm run check` and `npm run check:generated`.
