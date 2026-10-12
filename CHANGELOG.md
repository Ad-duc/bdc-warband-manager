<!--
  File:     CHANGELOG.md
  Role:     Notable changes of each release
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The game rules
version is given separately (playtest v1.03).

## [Unreleased]

## [1.0.0] - 2026-10-12

First complete release, built on the Black Death City playtest v1.03.

### Added

- Game data for the four factions of the playtest: Guild Mercenaries,
  Verminkin, Death Covens and The Blighted Cloister, in English and French,
  each entry linked to its page in the book and its heading in the French
  translation.
- Data checker (`npm run check:data`): zod schemas, referential integrity,
  forbidden characters, comparison with the translation files.
- Python generators that rebuild the Verminkin, Death Covens and Blighted
  Cloister files from the translation (`npm run generate:data`,
  `npm run check:generated`).
- Pure rules engine with full test coverage: costs, warband rating, profile
  limits, origins, wargear restrictions and improvements, skills, spells,
  experience, injuries, advancements and Black Rot.
- Six-step creation wizard (faction, origin, fighters, wargear, skills,
  rating) with live checks, fighter options, alternate forms and random
  epithets.
- Campaign dashboard: battle log with apply and undo, injuries, advancements,
  Black Rot, holdings, stash and stronghold counters.
- A4 warband roster and TCG-size fighter cards, with an ink saver mode.
- JSON export and import, and read-only share links (data in the URL
  fragment, nothing sent to a server).
- Offline use and installation as a PWA; local storage in IndexedDB.
- English and French interface, saved language choice, original terms shown
  in tooltips from the glossary.
- Accessibility audit with axe-core on every screen in both languages (WCAG
  2.2 A and AA), run by the end-to-end tests.
- Contribution guide (`CONTRIBUTING.md`) and this changelog.

### Changed

- Rules data moved from playtest v1.02 to v1.03.
- Fonts served as WOFF2 and images as resized WebP: the first visit
  downloads about 0.6 MB instead of more than 4 MB.
- Screens, game data and validation schemas are loaded on demand; a static
  header is painted before the JavaScript runs.
- `npm run check:i18n` also reports unused interface strings.

[Unreleased]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Ad-duc/bdc-warband-manager/releases/tag/v1.0.0
