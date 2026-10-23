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

### Changed

- Clearer wording of the introduction to the scenarios chapter of the French rules.

## [1.3.0] - 2026-10-21

Printable French rules, French faction and fighter names and one page width
for every screen, still on the Black Death City playtest v1.03.

### Added

- The French rules can be printed as a whole: a "Print the rules" link in
  the reader opens a book layout (title page, list of chapters, every
  chapter on two columns for A4 paper) with a print button.

### Changed

- Every screen now shares the same maximum width (80 rem): the warband
  list, the wizard, the campaign, the rules reader, the battle set-up and
  the tutorial line up on the same page width. The direction dice keeps
  its small centred panel.
- The direction dice now opens as a screen of its own (header button)
  instead of a window over the current page.
- Parchment panels now look like the pages of the rulebook: worn grey
  edges, an ink frame inside the edge and a small cross knot in the middle
  of its bottom line.
- Headings now follow one type scale on every screen: page titles, section
  titles and sub-titles have the same size and font wherever they appear.
- In the creation wizard, the budget frame (silver spent and left, warband
  rating) now sits in the side column, above the checks panel.
- Faction step: the shield sits at the top of each card, the radio button
  is centred on the shield, and every closed card has the same height.
- The faction and fighter names are now in French, like the rest of the
  translation: Mercenaires de la Guilde, Vermineux, Cabales de la Mort, Le
  Cloître gangrené, Capitaine de la Guilde, Maître artificier, Prêtre Véroleux,
  Bâtard du sang...
  The English name stays in parentheses in the rules reader. The Wizard
  keyword becomes Magicien. Saved warbands are not affected.

### Fixed

- The cross knot of the parchment panels was cut in half by the bottom
  edge: the inner frame moves 6 px inwards on every side so the knot stays
  whole inside the parchment, still centred on the bottom line.
- The confirmation window (deleting a warband, cancelling a battle) no
  longer shows a useless scrollbar, and its frame knot is no longer cut.
- The reminder sheet now adapts to the screen: no more horizontal scroll on a
  phone or a tablet, its columns stack on narrow screens. The printed A4
  page is unchanged.
- Translation fixes (#12, #13): the Verminkin faction is now named Vermineux
  in French, and the Pox Priest becomes the Prêtre Véroleux, with his
  Apprenti véroleux.
- A new version of the app now replaces the old one by itself: the app checks
  for an update when its tab comes back to the foreground and every 15 minutes,
  and reloads the page on the new version, at the same screen. Clearing the
  browser cache after a deployment is no longer needed. Saved warbands are not
  affected.
- Rules reader: the cost column of the fighter lists and armoury lists now
  keeps the same width in every table, so the costs line up from one list to
  the next instead of shifting with the longest name of each table.

## [1.2.0] - 2026-10-13

Rules tutorial, still on the Black Death City playtest v1.03.

### Added

- Rules tutorial ("Tutorial" in the header): the melee attack example of the
  book (p. 25) replayed in 12 steps on a board seen from above, with the
  fighter cards, the attack rolls, the life points left and a link to the
  rule of each step. Previous and next buttons, arrow keys, and the step kept
  in the address.
- Ranged attack lesson in the tutorial: a house example built from the rules
  (p. 28), with illustrative dice values: weapon range, the closest visible
  enemy not engaged in melee, the obscured target exception, cover, then the
  Bow roll, the armour roll and the damage. The board shows the range, the
  distances and the lines of sight.
- The rules reader opens a chapter at a given section
  (`#/rules/<chapter>/<section>`).

## [1.1.0] - 2026-10-13

Preparing a battle, group campaigns and name generators, still on the Black
Death City playtest v1.03.

### Added

- Battle set-up assistant ("Prepare a battle" in the header, on a warband's
  campaign dashboard and in a group campaign): warbands and underdog, scenario
  and twist rolled or chosen, battle group sizes with a random split, prepared
  spells, what happens during and after the battle, then the record in a
  warband's battle log or in the group campaign.
- Scenario reference: the scenario table, the shared rules and the six
  scenarios with their twists, from the French translation.
- Group campaigns on the home page: warbands of the app or of other players,
  battles fought and standings. Chapter 5 "Campaigns" is not published yet, so
  no campaign rule is applied.
- Direction dice ("Direction dice" button in the header), over the current
  screen: an arrow in any direction and, as an option, the scatter distances
  of the rules (1D6", 1D6x2", 3D6"), with the detail of the dice.
- French reminder sheet ("Reminder sheet" button in the header): the official
  reminder sheet translated into French on one A4 page, with the page numbers
  of the playtest v1.03 rules, ready to print.
- "My warbands" button in the header (and the phone menu), back to the
  warband list from any screen.
- Female fighter names: a male and a female symbol next to the random name
  button. The Death Covens follow the book rule ("-a" added to a name ending
  in a consonant, p. 96); the other factions use house D66 tables, not
  official.
- Random warband name next to the "Warband name" field, drawn from house
  tables of the selected faction (in French, not official).
- Translation feedback in the rules reader: a "Suggest a correction" link
  under each heading opens a pre-filled GitHub issue (form `traduction`), the
  selected passage is quoted, and each chapter links to the edit page of its
  file. Accepted issues are applied by a pull request
  (`docs/TRANSLATION_FEEDBACK.md`).
- Link to the official Black Death City website in the footer.

### Changed

- The "Recruit" buttons of the third wizard step are greyed out, with the
  reason below, when the rules forbid one more fighter: full warband, leader
  already recruited or not the one imposed by the origin, category or profile
  limit reached, not enough silver left.
- Origins listed one per row in the second wizard step, as the factions.
- The wargear step shows the category (Leader, Champion, Henchman...) under
  each fighter name of the fighter picker.
- Every die states its number of dice (1D6, 1D3+1, never a bare D6) in the
  app, the printed sheets, the rules reader, the data texts and the French
  translation; D66 tables keep their name. `npm run fix:dice` applies the rule
  and `npm run check:data` enforces it.
- On phones the header tools are grouped in one menu, so the title stays on
  one line; on tablets the tool buttons show their icon only, labels come
  back on large screens.
- The interface is in French only: the language selector is gone and an
  English browser gets the French screens (the English strings stay in
  `en.json`).
- The README presents the online app for players (in French, with an English
  section); the developer information moved to `docs/DEVELOPMENT.md`.

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
- Rules watcher: `scripts/watch/release.py` (check, fetch, mark) and
  `scripts/watch/diff_versions.py`, npm scripts `watch:*`, procedure
  `docs/RULES_UPDATE.md` followed by a weekly scheduled agent run that opens a
  pull request for each new official rules version.
- `sources/`: extracted English text of playtest v1.02 and v1.03, French
  translation and glossary, translation guidelines, release manifest.
- "Buy me a coffee" support link in the bottom-right corner of the footer.
- French rules reader ("Règles en français" button in the header): every
  chapter of the translation, chapter list, contents with jumps to sections,
  previous and next links, available offline.
- "What's new" page in the app, opened from the footer: this changelog in
  English or French, following the interface language (`CHANGELOG.fr.md` is
  the French version).
- Fighter card backs in the print view: game logo, faction shield on a stone
  panel and faction name, with the warband name as an option. "Print the backs
  behind the cards" adds a back page after each card page, mirrored for a
  long-edge duplex print; the new "Card backs" content prints a stand-alone
  sheet of 9 backs to put on the reverse by hand. Print-quality images in
  `public/images/print/`.
- Card back generator ("Card backs" button in the header): sheets of 9 backs
  for any faction, with an optional warband name, without a saved warband.

### Changed

- Rules data moved from playtest v1.02 to v1.03.
- Fonts served as WOFF2 and images as resized WebP: the first visit
  downloads about 0.6 MB instead of more than 4 MB.
- Screens, game data and validation schemas are loaded on demand; a static
  header is painted before the JavaScript runs.
- `npm run check:i18n` also reports unused interface strings.
- Factions listed one per row in the first wizard step; long descriptions are
  cut to three lines with a "Read more" toggle, as are the origin flavour
  texts of the second step and the long special rules of the fighter scrolls.
- Data scripts read the translation from `sources/fr/` by default; the CI now
  runs `check:generated` and compares the data with the translation.
- Header and footer stay in place on every screen size, more compact on
  phones; only the area between them scrolls, and a page that fits the window
  no longer scrolls.
- Radio buttons and checkboxes in black on the parchment panels (light on the
  dark page) instead of the browser blue.
- Headings, names and bands of the builder, campaign, home and print screens
  use Trattatello, easier to read than Old Celtiberian. Old Celtiberian is
  kept for the header title, the rules reader and the printed sheets.

[Unreleased]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Ad-duc/bdc-warband-manager/releases/tag/v1.0.0
