# @chuvenger/typescript-app-stack

## 0.9.0

### Minor Changes

- f48b5c7: **Pin `^0` to stop hand-editing the version every release, and the release
  check now names packages.**
  
  ### Pin `^0`, not `^0.8.0`
  
  A caret on a `0.x` version is locked to the minor: `^0.7.0` means
  `>=0.7.0 <0.8.0`, so it does not accept `0.8.0`. Since every release of this
  group is a minor — `0.x` has no other slot for a breaking change — a consumer on
  `^0.8.0` has to edit the range by hand every single time, which is the opposite
  of what a stack is for.
  
  `^0` (or equivalently `0.x`) accepts every `0.minor`:
  
  ```jsonc
  { "dependencies": { "@chuvenger/svelte-stack": "^0" } }
  ```
  
  Measured with semver: `^0.7.0` rejects `0.8.0`; `^0` accepts `0.8.0` and
  `0.9.0` and stops at `1.0.0`.
  
  The trade-off is explicit and worth stating: because a `0.x` minor is also the
  breaking slot, `^0` picks breaking changes up automatically too. Four of the
  eleven releases so far carried one — 0.2.0, 0.5.0, 0.6.0 and 0.7.0 — and this
  release carries three. So read the changelog on upgrade; the range will not warn
  you. Staying on an exact minor and editing it deliberately is the other valid
  choice, and declaring 1.0.0 (where a caret spans minors and a major is the
  signal) is the third — deliberately not taken yet.
  
  ### The release check now names packages
  
  0.7.0 and 0.8.0 both read "No changes in this release" in `typescript-stack`'s
  changelog and "Patch Changes — @chuvenger/typescript-stack" in `svelte-stack`'s,
  for releases that changed the files both of those packages ship. The changesets
  were not empty — each named only `"@chuvenger/react-router-stack"`. Because the
  version group is `fixed`, that is enough to bump all four, so nothing
  complained; but the changelog entry only lands on the packages a changeset
  lists, and the other three got a dependency-bump stub.
  
  `check-packages.sh` now compares the packages changed since the merge base
  against the packages named in the frontmatter of the pending changesets, and
  fails on any that changed without being named.
  
  **What a consuming app changes.** Move the range to `^0` once, and stop
  touching it.
- f48b5c7: **New: a `knip.config` export on every stack.**
  
  The stacks owned Knip but shipped no config for it, and the stack layout is
  exactly what breaks its defaults. Knip enables its framework plugins by looking
  for the framework in the *app's* package.json — and an app on one of these
  stacks names the stack and almost nothing else. So Vitest is not found and every
  `*.test.ts` reads as an unused file; React Router is not found and no route
  module is an entry point; the tools the stack puts on `PATH` are not found and
  every `tsc`/`biome`/`prisma` in a script reads as an unlisted binary.
  
  Measured on three fixtures whose only dependency is the stack:
  
  | fixture | no config | with the preset |
  | --- | --- | --- |
  | SvelteKit 3 | 23 findings | 2, both real |
  | React Router 8 | 23 findings | 3, all real |
  | library on the base stack | 7 findings | 0 |
  
  **What a consuming app changes.** Add a `knip.config.ts` naming the stack it
  depends on:
  
  ```js
  export { default } from "@chuvenger/svelte-stack/knip.config"
  ```
  
  or, to add to it, `createKnipConfig(overrides)` — array options (`entry`,
  `project`, `exclude`, `include`, `ignoreUnresolved`) concatenate onto the
  stack's and `compilers` merges per extension; everything else replaces. An app
  with a hand-rolled knip config can delete whatever of it the preset now covers.
  
  The preset removes false positives the stack layout causes and nothing else.
  Genuine findings stay, and suppressing infrastructure you meant to keep still
  belongs in your own config.
  
  ### What each layer adds, and why
  
  The split follows the dependency chain, so each plugin is named by the package
  that actually ships the tool:
  
  - **`typescript-stack`** — `vitest: true`, `biome: true`, and
    `exclude: ["unlisted", "binaries"]`.
  - **`typescript-app-stack`** — `prisma: true`. Under Prisma 7 the schema path
    and seed command live in `prisma.config.ts`, and without the plugin that file
    is not a config file to knip and reads as unused.
  - **`svelte-stack`** — Kit's route and hook entry patterns, `vite: true`,
    `ignoreUnresolved: ["^\\$app/"]`, and a `.svelte` compiler.
  - **`react-router-stack`** — `"react-router": true` and `vite: true`.
  
  Two of those need the explanation.
  
  **The `.svelte` compiler.** Knip ships one, but registers it only when `svelte`
  is in the app's own package.json — `svelte: true` does not change that, the
  guard reads the dependency list rather than the config. With no compiler
  `.svelte` files are not scanned at all, so a module imported only from a
  component reads as an unused file; knip says so itself, as the configuration
  hint "`.svelte` Extension in project not registered as a compiler". The
  preset's compiler returns only the imports from `<script>` blocks and any
  `import(...)` in the template, never whole script bodies — a body would also
  expose `export let` props, and knip would then report every prop of a Svelte 4
  style component as an unused export.
  
  **`svelte-stack` carries route patterns but `react-router-stack` does not.**
  Knip's `react-router` plugin reads `react-router.config.ts` and loads
  `app/routes.ts`, so enabling it is enough. Its `sveltekit` plugin instead finds
  routes by parsing the app's `vite.config.ts` for a `sveltekit` import from
  `@sveltejs/kit/vite` — an app here imports `createViteConfig`, nothing matches,
  and the plugin contributes no entry points, no `$app/*` ignores and no aliases.
  Measured: `sveltekit: true` changes the report by nothing at all. Hence the
  patterns and the `ignoreUnresolved` entry being repeated by hand.
  
  Only patterns present in *every* SvelteKit app are in the preset, because knip
  reports an entry pattern matching no file as a configuration hint. A
  `src/params/` matcher, a service worker or `src/instrumentation.server.ts` goes
  in your own config.
  
  ### On `exclude: ["unlisted", "binaries"]`
  
  That line is blunter than the rest of the preset, and the narrower version was
  tried first: enumerate the stack's packages and binaries in
  `ignoreDependencies`/`ignoreBinaries`, so a dependency you genuinely forgot
  still gets reported. Measured on the SvelteKit fixture it gives the same report
  *plus 28 permanent "Remove from ignoreDependencies" configuration hints*,
  because no app imports all 28 packages a stack provides. The only way to
  silence those is `--no-config-hints`, which also hides the hints worth reading.
  So `exclude` it is. The classes it gives up — an import of a package that is not
  installed, a typo'd binary in a script — both fail loudly at build or run time
  anyway.

### Patch Changes

- Updated dependencies [f48b5c7]
- Updated dependencies [f48b5c7]
- Updated dependencies [f48b5c7]
  - @chuvenger/typescript-stack@0.9.0

## 0.8.0

### Patch Changes

- @chuvenger/typescript-stack@0.8.0

## 0.7.0

### Patch Changes

- @chuvenger/typescript-stack@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [dccc761]
  - @chuvenger/typescript-stack@0.6.0

## 0.5.1

### Patch Changes

- 07139a4: Write `bin` targets without a leading `./`, so the `link-stack-skills` command
  survives publication.
  
  npm rewrites `package.json` as it publishes and only *warns* about what it
  changed. A `bin` path spelled `"./link-skills.js"` is not normalised but
  deleted outright — the package ships with no `bin` at all, which fails the
  consuming install's `prepare`. `bun publish` rewrote that spelling instead of
  dropping it, so the defect appeared only on moving the release to npm for
  trusted publishing, and only in a warning nothing was reading.
  
  `check-packages.sh` now fails on any correction npm would make to a
  `package.json`, so the published manifest has to be the one in the repo. 0.5.0
  was never published, so no release carried the broken `bin`.
- @chuvenger/typescript-stack@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies [3475bbb]
  - @chuvenger/typescript-stack@0.5.0

## 0.4.0

### Minor Changes

- a9c448a: Add a `link-stack-skills` command for linking the bundled agent skills into an app. Add `"prepare": "link-stack-skills"` and each install symlinks the skills into `.claude/skills/` and `.agents/skills/` at the repo root. It works under bun's hoisted and isolated linkers. This replaces the README's `npx agents export` instructions: that command runs Cloudflare's unrelated `agents` package. The unused `agents` field is removed from `package.json`, and every stack now declares its `repository`.

### Patch Changes

- @chuvenger/typescript-stack@0.4.0

## 0.3.0

### Minor Changes

- d7fc20f: Fix internal stack dependencies being published one version behind. Releases relied on `bun publish` rewriting `workspace:*`, but bun takes that version from `bun.lock` rather than `package.json`, and CI installs before `changeset version` bumps — so 0.1.3, 0.2.0 and 0.2.1 each shipped pinned to its predecessor (`react-router-stack@0.2.1` → `typescript-app-stack@0.2.0` → `typescript-stack@0.1.3`). Consumers were silently held two stacks back from the tooling each release advertised, most visibly on Vitest. The release script now resolves internal versions itself and verifies the published metadata against the registry.
  
  Pin `kysely` to `^0.28.17` in the app stack. `better-auth` pulls in `kysely@0.29.x`, which `prisma-extension-kysely@4.0.0` still rejects (`^0.27.0 || ^0.28.0`), producing an `incorrect peer dependency` warning on install. `0.28.17` satisfies both and dedupes to a single copy; drop the pin once `prisma-extension-kysely` widens its peer range.

### Patch Changes

- @chuvenger/typescript-stack@0.3.0

## 0.2.1

### Patch Changes

- 45fd062: Ship the `prisma-shadow-migration` agent skill with the stack. Consumers can pull it into their repo with `npx agents export --target claude`. The skill documents the shadow-DB migration workflow (capture `db push` schema changes into a migration without resetting the dev DB).
- @chuvenger/typescript-stack@0.2.1

## 0.2.0

### Minor Changes

- 28e530a: Upgrade all stack dependencies to their latest releases.
  
  Two of these are majors that change behaviour for consuming apps. Both reach
  every stack through the internal dependency chain, so this is a minor bump
  across the board rather than a patch:
  
  **Vitest 4 → 5** (in `typescript-stack`, so it reaches all four). Mocks are
  now cleared before each test by default, `sequential` test/suite options are
  gone in favour of `concurrent`, unawaited async assertions now fail the test,
  config is no longer looked up from ancestor directories, and the attachment
  dir moved to `.vitest/attachments/`. Requires Node 22+. The stack's
  `vitest.config.js` (`globals`, `passWithNoTests`) is unaffected, and
  `ViteUserConfig` is still exported from `vitest/config`.
  
  **Jotai 2 → 3** (`react-router-stack`). ESM-only, and two utilities were
  removed: `atomFamily` moved to the separate `jotai-family` package, and
  `loadable` is gone — use `unwrap` instead. `setSelf` and the `delay` option
  for `useAtomValue` were also removed. Apps importing `atomFamily` or
  `loadable` from `jotai/utils` must be updated.
  
  `prisma` is deliberately held at `^7.10.0` rather than its `latest` dist-tag:
  that tag currently points at the `8.0.0-rc.13` prerelease, while
  `@prisma/client` and `@prisma/adapter-pg` are still stable on 7.10.0.
  Everything else is a routine minor or patch bump.
  
  The shipped `biome.json` migrates `linter.rules.recommended: true` to
  `linter.rules.preset: "recommended"`. Biome 2.5.12 deprecates the old field
  and will drop it in the next major; this is the migration Biome's own
  `biome migrate` produces, and it is behaviourally identical.
  
  The four stack packages are now versioned in lockstep (`fixed` in the
  Changesets config), so they always share one version number.

### Patch Changes

- Updated dependencies [28e530a]
  - @chuvenger/typescript-stack@0.2.0

## 0.1.3

### Patch Changes

- Updated dependencies [1911c84]
  - @chuvenger/typescript-stack@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [7a012d6]
  - @chuvenger/typescript-stack@0.1.2
