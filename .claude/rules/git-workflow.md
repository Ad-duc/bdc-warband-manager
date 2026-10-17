<!--
  File:     .claude/rules/git-workflow.md
  Role:     Branch, commit and pull request rules for coding agents working in
            this repository. Completes the "Git and GitHub" section of the
            agent instruction file and never overrides it.
  Author:   Adrien Duclaud
  Created:  2026-10-15
  License:  MIT
-->

# Git workflow

Public repository, one developer. GitHub Flow: `main` is always deployable
(the CI publishes it to GitHub Pages), every change lives on a short branch
and reaches `main` through a pull request that Adrien merges himself.

## One branch per task

- Never commit on `main` unless Adrien asks for it explicitly. Before the
  first change, run `git branch --show-current`; on `main`, create a branch
  from an up to date `origin/main`.
- One branch per task, never one branch per page or screen. A task that
  touches `src/rules`, `src/data`, `src/i18n`, a screen and its tests stays on
  a single branch, so the data, the strings and the code are reviewed
  together.
- Branch name: `<type>/<short-kebab-case-summary>`, in English.

  | Prefix         | Use                                                |
  | -------------- | -------------------------------------------------- |
  | `feat/`        | new feature or screen (`feat/tutorial-melee`)      |
  | `fix/`         | bug fix (`fix/budget-rounding`)                    |
  | `ui/`          | layout or style only (`ui/typography-scale`)       |
  | `data/`        | game data or generators (`data/verminkin-armoury`) |
  | `rules/`       | new rules version, see `docs/RULES_UPDATE.md`      |
  | `translation/` | French translation in `sources/fr/`                |
  | `docs/`        | documentation and agent rules                      |
  | `ci/`          | workflows and repository settings                  |
  | `chore/`       | dependencies, tooling, refactoring                 |

- Keep a branch short lived: a few days of work. If a task grows beyond that,
  propose to split it into several pull requests that can be merged one after
  the other.
- To work on two tasks at once, use a separate worktree instead of switching
  branches with uncommitted changes.

## Commits

- English, imperative, at most 72 characters for the first line, optionally
  prefixed with the branch type: `ui: one type scale for every screen
heading`.
- One commit is one coherent change. Tidy "wip" or "fix typo" commits locally
  before the first push; once a branch is pushed, add commits instead of
  rewriting it (no force push without an explicit request from Adrien).
- No co-author line, no tool trailer, no mention of an assistant.

## Before pushing

1. `git fetch origin main` and `git rebase origin/main` (other sessions may
   have pushed meanwhile; on a changelog conflict keep both sides).
2. `npm run check` must pass (the pre-push hook runs it; the pre-commit hook
   runs the fast part, `npm run check:fast`).
3. `npm run test:e2e` for any change to a screen, a route or the PWA.
4. User-visible change: one line under `[Unreleased]` in `CHANGELOG.md` and
   the same line, in French, under `[Non publié]` in `CHANGELOG.fr.md`.

Never disable, skip or weaken a test or a check to make it pass: report the
failure to Adrien with a proposed fix.

## Pull requests

- One pull request per branch, opened with the REST API or `gh pr create`.
  Title in English, same style as a commit (it can become the merge commit
  message). Body in French: what changes, why, how it was tested, linked issue
  (`Closes #12`).
- Do not merge, do not enable auto-merge and do not approve a pull request
  unless Adrien asks for that action by name.
- Report the pull request link and the CI result to Adrien, and leave the
  branch in place: GitHub deletes it after the merge.

## Forbidden on `main`

Force push, history rewrite, deletion of the branch, and any way around a
branch protection or ruleset. If the agent environment refuses an operation
(pushing a tag, deleting a remote branch), report it with the steps to do it
on GitHub instead of working around the restriction.

## Releases

A release is a pull request of its own: it moves the changelog lines to a
dated version heading and bumps `version` in `package.json` (Semantic
Versioning). The release notes state the supported playtest version
("rules v1.03"). The tag `vX.Y.Z` is created by Adrien on the merged commit.
