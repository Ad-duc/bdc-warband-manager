<!--
  File:     src/data/README.md
  Role:     Description of the game data format (common.json and <faction>.json)
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT (format description). Game content belongs to Sam Pearson.
-->

# Game data format

The app reads every JSON file of this folder at build time. `common.json` holds
what all factions share; every other file describes one faction and is named
after its `id` (`guild-mercenaries.json`). Adding a faction means dropping a new
file here: no code change is needed as long as it passes `npm run check:data`.

All schemas live in `schema.ts` (zod 4). They are strict: an unknown property is
an error, so a typo cannot slip through.

## General conventions

| Topic                 | Rule                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identifiers           | English kebab-case, stable, never translated: `two-handed`, `guild-captain`.                                                                                           |
| Texts                 | Every displayable text is `{ "en": "...", "fr": "..." }`.                                                                                                              |
| Names kept in English | Faction names, fighter names and keywords identical to them (`Mercenary`, `Witch Hunter`) carry the same value in `en` and `fr`. The checker enforces it for fighters. |
| French texts          | Clean text without the `(*original term*)` parentheses of the translation files. The interface shows the original term in a tooltip from the keyword and trait tables. |
| Typography            | Straight quotes and apostrophes, simple hyphen, no em dash, no non-breaking or invisible space. The checker scans every file.                                          |
| Header                | JSON has no comments, so each file starts with a `_header` object (file, role, author, created, license).                                                              |
| Traceability          | Every entity has a `sourceRef`: `page` is the page printed in the VO playtest v1.03, `md` is `<file> > <heading>` in the French translation.                           |
| Book cross references | "pg xx" / "p. xx" are kept as printed: the playtest has no page numbers there.                                                                                         |

## Value encoding

| Value                            | Encoding                                                                                          | Printed as                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Move                             | integer inches                                                                                    | `5"`                                |
| Blade, Bow, Armour               | target number 2 to 6, `null` for none                                                             | `3+`, `-`                           |
| Initiative, Willpower, Life      | integer                                                                                           | `4`                                 |
| Attacks, Damage, Critical Damage | integer or dice string (`"d3"`, `"d3+1"`, `"d6+2"`)                                               | `D3+1` in French, `d3+1` in English |
| Critical Damage absent           | `null`                                                                                            | `-`                                 |
| Rend                             | integer 0 or below, 0 means none                                                                  | `-`, `-1`                           |
| Range                            | integer inches, or `"flame"`                                                                      | `24"`, `Flame` / `Flamme`           |
| Rare 0-x                         | `rarity: x` on the wargear, plus a `{ "key": "rare" }` trait on weapons to keep the printed order | `Rare 0-1`                          |
| Starting experience              | `{ "base": 60, "dice": "d6" }`, `dice` null for a fixed value                                     | `60+D6`, `D6`, `0`                  |
| Income                           | dice string                                                                                       | `3d6x5`                             |

## common.json

| Key             | Content                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `recruitment`   | Starting silver (1000), 15 fighters maximum, min and max per category.                         |
| `carryingLimit` | 2 melee, 1 ranged, 1 armour, 2 items (p. 13). Held items use a melee slot.                     |
| `unarmedStrike` | Profile used by a fighter without a melee weapon (p. 24).                                      |
| `rosterLimits`  | 5 holdings, 3 Black Rot boxes (Warband Roster).                                                |
| `keywords`      | Every keyword with its kind: `category` (Leader...), `fighter` (Human...), `item` (Held Item). |
| `weaponTraits`  | The 19 traits: key, bilingual name, unique reminder (glossary annex A), page of the full rule. |
| `conditions`    | Bloodied, Hidden, Poisoned.                                                                    |
| `skillTables`   | Veteran Skills, open to any fighter.                                                           |
| `campaign`      | Chapter 5 placeholders: status `not-published` and empty tables ready to be filled.            |

## <faction>.json

| Key                                 | Content                                                                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `origins`                           | Imposed leader (`requiredLeaderId`, may be null), starting stronghold, extra rules.                                                                                                                                                |
| `strongholds`                       | Flavour, income formula, rules, roster trackers (eg. bottles of vintage wine, initial `2d6`).                                                                                                                                      |
| `campaignRules`, `leaderSuccession` | Faction campaign rules; who can replace a dead leader.                                                                                                                                                                             |
| `nameTable`                         | D66 table, keys `"11"` to `"66"`.                                                                                                                                                                                                  |
| `fighters`                          | Profiles: category, keywords, cost, `limit` (1 for "0-1"), stats, allowed armoury lists, fixed wargear, starting experience, known lores, recruitment grants, special rules, quote.                                                |
| `wargear`                           | Every weapon, armour and item of the faction armoury with its reference price, profile, traits, armour value, item keywords, rarity, requirements (`requires`), restrictions (`restrictions`), granted extra attack and rule text. |
| `armouryLists`                      | Named lists (`main`, `munitions`, `champion`...) with the price of each entry. A price may differ from the reference price: the checker reports it as a warning.                                                                   |
| `skillTables`                       | Faction skill tables. `eligibility` is `any`, `fighters` (explicit ids) or `keywords` in disjunctive form: `[["mercenary","leader"],["mercenary","champion"]]` reads "Mercenary AND Leader, OR Mercenary AND Champion".            |
| `spellLores`                        | Lores rolled on a D6, with casting values, critical cast and optional attack profile.                                                                                                                                              |
| `assets`                            | Shield picture and accent colour (null until the style question is settled).                                                                                                                                                       |

### Recruitment grants

`recruitmentGrants` describes what the fighter receives when recruited:

- `skills`: number of skills to pick, on top of `fixedSkillIds`.
- `fixedSkillIds`: skills given for free (the Noble starts with `duellist`).
- `spells` and `spellLoreId`: number of signature spells picked from that lore.

### Requirements and restrictions

- `requires.anyOfWargearIds`: the item needs one of these weapons (Bomb-bolt needs a Crossbow).
- `restrictions`: `forbid-trait` rules, eg. Full-plate forbids two-handed ranged weapons except the Brace of Pistols.
- `armourImprovement`: improves the bearer's Armour value by this amount, to 2+ at best (Shield: 1).

## Player documents

`schema.ts` also defines the documents the app stores and exports:
`Warband` (versioned with `schemaVersion`), `WarbandFighter`, `BattleLogEntry`
and `Campaign` (arbiter mode, modelled only). They hold ids and numbers only,
never translated text, so an export does not depend on the interface language.

## Checking the data

```bash
npm run check:data -- --sources "<folder holding 05_..., 06_..., 10_... .md>"
```

Without `--sources` (or the `BDC_SOURCES` variable) the script still validates
schemas, references, prices and typography, and skips the Markdown comparison.
