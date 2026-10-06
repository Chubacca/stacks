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
- **DO name every package whose files you changed**, even though the fixed
  group means naming one is enough to bump all four. The *version* follows the
  group; the **changelog entry only lands on the packages a changeset lists**,
  and `check-packages.sh` fails on a package that changed without being named.
  0.7.0 and 0.8.0 each named only `react-router-stack` while changing
  `packages/svelte` too, so `svelte-stack`'s changelog read "Patch Changes —
  @chuvenger/typescript-stack@0.7.0" and `typescript-stack`'s read "No changes
  in this release" — for releases that changed the files both of them ship.
- That is a floor, not a cap. **Also name a package whose consumers have to
  read the entry**, even if its own files did not change — a dependency range
  held in `typescript-stack` that unbreaks the SvelteKit build belongs in
  `svelte-stack`'s changelog too, or a `svelte-stack` user sees only "Updated
  dependencies". Beyond that, leave packages out: they pick up the version from
  the group and a dependency-bump line, which is accurate.

## Choosing the bump level

Standard semver, applied to the whole group:

- `patch` — bug fixes, docs, packaging tweaks, non-breaking internal changes.
- `minor` — new backward-compatible capability (e.g. a new bundled skill, a new
  export, an added dependency consumers gain).
- `major` — breaking change (removed/renamed export, dropped dependency, changed
  config contract).

The group is **1.x**, so these mean what they say: a consumer on `^1.0.0` picks
up every `minor` and `patch` without touching their package.json, and a `major`
is the one that asks them to act. Mark a breaking change `major` rather than
reaching for `minor` — under `0.x` the minor *was* the breaking slot, and
changesets written then used it that way.

## Steps

1. **Pick the level** (see above), or use the level the user asked for. If they
   name a target version, derive the level from the current version:
   - current `1.2.0` → target `1.2.1` = `patch`
   - current `1.2.0` → target `1.3.0` = `minor`
   - current `1.2.0` → target `2.0.0` = `major`

2. **Write a changeset** under `.changeset/<slug>.md`, naming every package
   whose files the change touches:

   ```markdown
   ---
   "@chuvenger/typescript-app-stack": patch
   "@chuvenger/svelte-stack": patch
   ---

   <one or two sentences describing the change, consumer-facing>
   ```

   List every package whose files the change touches, and say what a consuming
   app has to do about it (including "nothing", when that is the answer). You
   can also run `bunx changeset` for the interactive prompt, but writing the
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
