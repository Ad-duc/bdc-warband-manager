<!--
  File:     docs/RULES_UPDATE.md
  Role:     Procedure followed by the weekly rules watcher (scheduled agent run)
            and by any maintainer when a new Black Death City rules version is
            published: detect, fetch, compare, translate, update the data,
            test, open a pull request.
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Rules update procedure

The app follows the official Black Death City playtest published by Sam
Pearson on https://www.blackdeathcity.com/. The chain is:

```text
files.blackdeathcity.com PDF  ->  sources/vo/*.txt  ->  sources/fr/*.md  ->  src/data/*.json  ->  app
       (watch:check/fetch)          (watch:diff)        (translation)       (generate:data, by hand)
```

`sources/manifest.json` records the current rules version, the fingerprint of
every official file and which version the translation (`translatedVersion`)
and the app data (`appDataVersion`) follow. The PDFs themselves are never
committed (over 100 MB, GitHub limit): only their extracted text is.

## Hard rules

1. Never push to `main`, never force push, never merge. Every change goes
   through a pull request that Adrien reviews and merges.
2. Never invent a rule. When the new text is ambiguous, contradicts itself or
   leaves a gap ("pg xx", blank value), keep the data open, write an entry in
   `RULES_ASSUMPTIONS.md` and list it under "Questions" in the pull request.
3. Code, comments, identifiers, commit messages and pull request titles in
   English. The pull request body is written in French (Adrien reads it).
4. No typographic quotes, no em dash, no ellipsis character, no invisible or
   non-breaking space, no mention of an AI tool in any file, commit or
   metadata. `npm run check:data` scans the repository for them.
5. Commits are authored as the repository owner
   (`git -c user.name="Adrien Duclaud" -c user.email="Ad-duc@users.noreply.github.com"`),
   without any co-author or tool trailer.
6. One run handles one rules version. If an open pull request already exists
   for that version (branch `rules/v<version>`), add commits to it instead of
   opening a second one, or stop if nothing is left to do.

## 0. Set-up

```bash
git checkout main && git pull --ff-only
npm ci
command -v pdftotext || sudo apt-get install -y poppler-utils   # or apt-get without sudo when root
gh api "repos/Ad-duc/bdc-warband-manager/pulls?state=open" \
  --jq '.[] | select(.head.ref | startswith("rules")) | "\(.number) \(.head.ref)"'   # work in progress?
```

The `gh` commands go through the REST API (`gh api`): GraphQL based
commands such as `gh pr create` or `gh pr list` may be unavailable in the
agent environment.

## 1. Detect

```bash
npm run -s watch:check -- --json      # also writes .cache/watch/report.json
```

| Exit | Meaning                                                                   | Next step                     |
| ---- | ------------------------------------------------------------------------- | ----------------------------- |
| 0    | Nothing new, and `pendingTranslation` / `pendingAppData` are both false   | Stop. No branch, no commit.   |
| 0    | Nothing new, but a pending flag is true (an earlier run stopped half way) | Resume at step 3 or 4         |
| 10   | New rules version (`newRules`), or current PDF re-uploaded with changes   | Steps 2 to 5                  |
| 11   | Only the website changelog or the roster / cards / reminder sheet moved   | Step 6                        |
| 2    | Network failure                                                           | Retry once, then stop quietly |

When `newRules` holds several versions, take the highest one: the diff then
covers every intermediate change at once.

## 2. Fetch and compare

```bash
git checkout -b rules/v<version>
npm run -s watch:fetch -- --version <version> --url <url from the report>
npm run -s watch:diff
```

`watch:fetch` downloads the PDF to `.cache/watch/`, writes
`sources/vo/<file>.txt` and moves the previous version to `history` in the
manifest. `watch:diff` writes `.cache/watch/diff-<old>-<new>.md`: every
changed, added or removed paragraph with its PDF page in both versions and a
word level view (`[-removed-] {+added+}`). Changes with a similarity of 98 %
or more are listed apart as "minor".

Read the whole report, then open the PDF pages it points to when the text
extraction is not enough (tables, profiles, icons): the PDF is in
`.cache/watch/`. Sort every entry into one of:

- rule change (meaning changes: values, conditions, new or removed rule);
- data change (cost, profile, trait, list, new fighter or item);
- wording or typo fix (no effect on meaning);
- layout only (page moves, extraction noise).

The author's own summary, when the website changelog or the first pages of
the PDF give one, comes first in the journal.

## 3. Update the French translation

Files: `sources/fr/01_...` to `10_...` and `00_glossaire.md`. Rules of
translation: `sources/guides/Prompt_traduction_BlackDeathCity.md` (sections "RÈGLES DE
TERMINOLOGIE", "PRÉCISION DES RÈGLES", "FIDÉLITÉ AU DOCUMENT SOURCE", "STYLE"
and "CONTRÔLE AVANT ENVOI"). In short:

- One English term = one French term, as in `00_glossaire.md`. Every game
  term keeps its original term in italics and between parentheses, singular
  form: `bande (*warband*)`.
- Faction names, fighter names and keywords identical to them stay in
  English.
- Only the paragraphs touched by a rule, data or wording change are edited;
  the rest of the translation is left as it is. Typo fixes of the English text
  usually need no French change.
- A new term goes into `00_glossaire.md` (table `VO | VF | Catégorie |
Remarque`, sorted by category then English term) with the remark
  "Ajout v<version>". A validated term is never changed without a question in
  the pull request.
- Page numbers quoted in the translation are those printed in the VO (PDF page
  minus 1).

Then write the changelog of the version, modelled on
`sources/fr/11_journal-modifications-1.03.md`:
`sources/fr/11_journal-modifications-<version>.md`, with the author's summary,
then one table per chapter (`Page | Règle | v<old> | v<new>`), then the list
of wording fixes.

```bash
npm run -s watch:mark -- --translated <version>
```

## 4. Update the application data

| File                                                                | How                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `verminkin.json`, `death-covens.json`, `the-blighted-cloister.json` | `npm run generate:data` (fix the generator if parsing fails) |
| `common.json`, `guild-mercenaries.json`                             | By hand, from the translation and the VO text                |
| `src/i18n/glossary.json`                                            | `npm run build:glossary`                                     |

- Update `sourceRef.page` of every entity whose page moved, and
  `sourceVersion` in `common.json` (`playtest-<version>`).
- Record each structural decision in `RULES_ASSUMPTIONS.md` (new `Dnn` entry
  "Move to playtest v<version> (data)", as `D08` did for v1.03).
- Update the version quoted in `README.md` (English and French sections),
  `package.json` (`description`), `CHANGELOG.md` (`[Unreleased]`) with its
  French twin `CHANGELOG.fr.md` (`[Non publié]`) and the
  campaign notice texts of `common.json` when they quote the version.
- A test that pins a value changed by the new rules is updated, with the
  version in its title (`(v<version>)`), never deleted. A new rule gets a new
  test in `tests/unit/rules/`.

```bash
npm run fix:dice         # every die with its count (1D6) in sources/fr and the data
npm run generate:data
npm run build:glossary
npm run check            # typecheck, lint, format, data, i18n, unit tests
npm run check:generated
npx playwright test --project=chromium
npm run -s watch:mark -- --app-data <version>
```

All must pass before the pull request is opened. If a failure cannot be fixed
without a rules decision, open the pull request as a draft and explain.

## 5. Commit and open the pull request

Commits in logical steps (`Import rules v<version> text`, `Update French
translation to v<version>`, `Update game data to v<version>`). Then:

```bash
git push -u origin rules/v<version>
N=$(gh api repos/Ad-duc/bdc-warband-manager/pulls -f base=main -f head=rules/v<version> \
  -f title="Update rules to playtest v<version>" -F body=@.cache/watch/pr-body.md --jq .number)
gh api repos/Ad-duc/bdc-warband-manager/issues/$N/labels -f "labels[]=rules-watch"
```

Pull request body (French), in this order:

1. Version, publication date, PDF link, size.
2. Résumé de l'auteur, if any.
3. Changements de règles et de données: table `Page | Règle | Avant | Après |
Fichiers touchés`.
4. Corrections de forme: count and a short list.
5. Questions: ambiguities, numbered, each with at most 2 options and the
   option implemented.
6. Vérifications: the commands run and their result.
7. Reminder: "Copier `sources/fr/` dans le dossier Nextcloud Traduction FR
   après fusion" (the Nextcloud folder is not updated by the watcher).

## 6. Secondary changes only (exit 11)

When only the roster, the fighter cards, the reminder sheet or the website
changelog moved: download the changed files to `.cache/watch/`, look at them
(print layout of the app in `src/print/` follows the Warband Roster and the
Fighter Cards), then

```bash
git checkout -b rules-watch/<yyyy-mm-dd>
npm run -s watch:mark -- --site <latest version announced> --resources
```

and open a pull request "Record official resource changes (<date>)" that
lists what changed and whether `src/print/` should follow. Change the print
code only when the difference is obvious and small; otherwise describe it.

## 7. Nothing new

Do nothing: no commit, no issue, no pull request. The run summary says
"Aucune nouvelle publication".
