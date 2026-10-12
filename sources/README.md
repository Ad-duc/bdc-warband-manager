<!--
  File:     sources/README.md
  Role:     Content of the sources folder: official rules text, French
            translation and the manifest followed by the rules watcher
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT (this file). Game content belongs to Sam Pearson.
-->

# Sources

> Black Death City, its rules, texts and names belong to Sam Pearson. The
> extracted English text and the French translation are kept here for the
> private, non-commercial use of a gaming group, as the source of the app
> data. They are not an official translation.

| Path                     | Content                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `manifest.json`          | Current rules version, fingerprints of the official files, versions the repo follows      |
| `vo/*.txt`               | Text of each rules PDF (`pdftotext`, reading order, one form feed per page)               |
| `fr/00_glossaire.md`     | English > French glossary, the reference of every translated term                         |
| `fr/01_...` to `fr/10_...` | French translation, one file per chapter                                                |
| `fr/11_journal-modifications-<version>.md` | Rules changes of each version and how they were carried over            |
| `guides/`                | Translation guidelines                                                                    |

The PDFs are not stored (over GitHub's 100 MB limit). They are downloaded on
demand by `npm run watch:fetch` into `.cache/watch/`, which git ignores.

How the folder is kept up to date: see `docs/RULES_UPDATE.md`.

## En français

Ce dossier remplace le dossier Nextcloud "Traduction FR" comme source de
référence. Après chaque mise à jour fusionnée, copier `fr/` vers Nextcloud si
une copie locale y est conservée.
