---
name: version-bump
description: Bump the published version of the @chuvenger/* stack packages in
  this repo. Use when asked to bump, release, or change the version of one or
  all stack packages. This repo is changeset-driven with a fixed version group
  — you add a changeset, you do NOT hand-edit version fields or run
  `changeset version`; CI does that on merge.
---

# Version bump

This repo publishes the `@chuvenger/*` stack packages to npm. Versioning is
**changeset-driven** and **fully automated on merge to `main`**. Your job is to
record the intended bump as a changeset — nothing more.

## Key facts about this repo

- **Fixed version group.** `.changeset/config.json` has
  `"fixed": [["@chuvenger/*"]]`, so **all four packages always bump together to
  the same version**, no matter which one you name in the changeset:
  - `@chuvenger/typescript-stack`
  - `@chuvenger/typescript-app-stack`
  - `@chuvenger/react-router-stack`
  - `@chuvenger/svelte-stack`
- **CI does the bump.** `.github/workflows/publish.yml` runs on push to `main`:
  it runs `bun run version` (consumes changesets → rewrites `version` fields and
  `CHANGELOG.md`), commits `Release: version packages [skip ci]` back to `main`,
  then publishes anything not already on npm. There is **no separate "Version
  Packages" PR**.

## Rules

- **DO** add a changeset describing the change and its bump level.
- **DO NOT** edit `version` fields in any `package.json` by hand.
- **DO NOT** run `bun run version` / `changeset version` and commit the result —
  that is CI's job. Running it locally pre-consumes the changeset and deviates
  from the release flow.
- Because the group is fixed, you only need **one** changeset entry naming any
  single `@chuvenger/*` package; all four follow.

## Choosing the bump level

Standard semver, applied to the whole group:

- `patch` — bug fixes, docs, packaging tweaks, non-breaking internal changes.
- `minor` — new backward-compatible capability (e.g. a new bundled skill, a new
  export, an added dependency consumers gain).
- `major` — breaking change (removed/renamed export, dropped dependency, changed
  config contract).

Current versions are all **0.x**, so treat the group as pre-1.0: prefer `patch`
and `minor`; avoid `major` churn unless genuinely breaking.

## Steps

1. **Pick the level** (see above), or use the level the user asked for. If they
   name a target version, derive the level from the current version:
   - current `0.2.0` → target `0.2.1` = `patch`
   - current `0.2.0` → target `0.3.0` = `minor`
   - current `0.2.0` → target `1.0.0` = `major`

2. **Write a changeset** under `.changeset/<slug>.md`. One entry is enough (the
   fixed group carries the rest):

   ```markdown
   ---
   "@chuvenger/typescript-app-stack": patch
   ---

   <one or two sentences describing the change, consumer-facing>
   ```

   You can also run `bunx changeset` for the interactive prompt, but writing the
   file directly is fine and faster.

3. **Preview** what will bump (does not modify anything):

   ```bash
   bun run changeset status
   ```

   Confirm all four `@chuvenger/*` packages are listed at the expected level.

4. **(Optional) Verify the resulting version** without committing it, then
   revert — useful when the user gave a target version and you want to prove it:

   ```bash
   cp -r .changeset /tmp/cs_backup
   bun run version                        # rewrites versions + changelogs
   for p in typescript typescript-app react-router svelte; do
     printf "%s -> " "$p"; jq -r .version "packages/$p/package.json"
   done
   # revert the simulation — leave only the changeset for CI to consume
   git checkout -- 'packages/*/package.json' 'packages/*/CHANGELOG.md'
   rm -rf .changeset && cp -r /tmp/cs_backup .changeset && rm -rf /tmp/cs_backup
   ```

5. **Commit the changeset only** (versions stay untouched) and open/merge the
   PR. On merge to `main`, CI applies the bump and publishes.

## Verifying afterward

- Before merge: `git status` should show only your changeset (and any real code
  changes) — **no `version` edits**.
- After merge: look for the CI commit `Release: version packages [skip ci]` on
  `main` and the new versions on npm.
