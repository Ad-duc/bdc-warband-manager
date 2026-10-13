<!--
  File:     docs/TRANSLATION_FEEDBACK.md
  Role:     How the French community sends comments and corrections on the
            rules translation (sources/fr), and how they are sorted and
            applied through a pull request.
  Author:   Adrien Duclaud
  Created:  2026-10-13
  License:  MIT
-->

# Translation feedback

Players report mistakes or suggest better wording for the French translation
of the rules from the rules reader of the app. Everything goes through GitHub
issues on the public repository: the app itself sends nothing.

```text
rules reader  ->  pre-filled issue (label "traduction")  ->  sorted by Adrien  ->  pull request on sources/fr  ->  merged by Adrien
```

## What the reader offers

- A "Proposer une correction" link under every heading of level 2 to 4. It
  opens the form `.github/ISSUE_TEMPLATE/traduction.yml` in a new tab, with
  the chapter, the section and a link to the heading line in `sources/fr`
  filled in (`src/features/reader/feedback.ts`).
- A passage selected in the text is quoted in the "Texte actuel" field (cut
  at 1500 characters). A bar at the bottom of the chapter shows the selected
  passage with its own link.
- A "modifiez le fichier sur GitHub" link at the top of each chapter, for
  contributors who prefer to edit the file and open a pull request
  themselves.

A GitHub account is needed to open an issue. The form fields are pre-filled
through the query string (`?template=traduction.yml&chapitre=...`); a field
id renamed in the form must be renamed in `feedback.ts` too (a unit test
checks they match).

## Sorting

Each issue labelled `traduction` gets one of these outcomes, written as a
comment in French:

| Outcome      | Label to add | Next step                                       |
| ------------ | ------------ | ----------------------------------------------- |
| Accepted     | `accepté`    | Applied by the next translation pull request    |
| To discuss   | `question`   | Left open until a decision is taken             |
| Refused      | `wontfix`    | Closed with the reason (book wording, glossary) |
| Already done | `duplicate`  | Closed with a link to the first issue           |

A choice of vocabulary that should hold for the whole translation is written
into the glossary (`sources/fr/00_glossaire.md`) by the same pull request, so
it is not discussed again.

## Applying accepted issues

When asked to apply the accepted translation issues:

1. Hard rules of [`RULES_UPDATE.md`](RULES_UPDATE.md) apply: pull request
   only, never merge, never invent a rule, French pull request body, no
   typographic character, no mention of an AI tool, commits authored by the
   repository owner without trailers.
2. List the open issues labelled both `traduction` and `accepté`:

   ```bash
   gh api "repos/Ad-duc/bdc-warband-manager/issues?state=open&labels=traduction,accept%C3%A9&per_page=100" \
     --jq '.[] | "\(.number) \(.title)"'
   ```

3. Create the branch `translation/<date>` from `main` and change only
   `sources/fr/` (and the glossary when needed). Keep the format of the
   translation: original terms in parentheses and italics, dice with their
   count (`npm run fix:dice`).
4. A change in `07_verminkin.md`, `08_death-covens.md` or
   `09_the-blighted-cloister.md` can change the generated faction data: run
   `npm run generate:data`, then `npm run check:generated`. A change in a
   text also copied into `guild-mercenaries.json` or `common.json` is applied
   there by hand.
5. Run `npm run check` and `npm run check:generated`.
6. Add a line to both changelogs ("Corrections de la traduction" with the
   issue numbers) and thank the contributors who filled the "Nom à citer"
   field, with that name only.
7. Open the pull request with `Closes #<n>` for each issue, in French, and
   leave it for Adrien to review and merge.
