# @chuvenger/typescript-stack

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
- f48b5c7: **Breaking: `typescript` is held at `^6.0.3`, down from `^7.0.2`. This fixes a
  SvelteKit build that could not run at all.**
  
  The group is pre-1.0, so this breaking change is a `minor` — `0.x` has no
  other slot for one, and a `major` would declare 1.0.0. Pin `^0` rather than
  `^0.8.0` if you want to pick these up without editing the range each time.
  
  `typescript@7` is the Go port, and its npm package no longer exposes the
  classic JavaScript API — the `.` export is `./lib/version.cjs`, a version
  string, with the compiler behind `./unstable/*` instead. `@sveltejs/kit@3.0.1`
  does `ts = await import("typescript")` and then calls
  `ts.readConfigFile(file, ts.sys.readFile)` to validate the app's tsconfig. Under
  TypeScript 7 `ts.sys` is `undefined`, so it throws during Vite's config
  resolution:
  
  ```
  TypeError: Cannot read properties of undefined (reading 'readFile')
      at load_tsconfig (@sveltejs/kit/src/core/sync/write_tsconfig/index.js:194:59)
  ```
  
  Kit guards with `if (!ts) return` for the no-TypeScript case, but the module
  imports fine under 7 — it is simply almost empty — so the guard does not fire.
  The throw happens for any app with a `tsconfig.json`, which is every TypeScript
  app, and it aborts `write_tsconfig` **before** `.svelte-kit` and `$app/types`
  are written. Measured on a SvelteKit 3 fixture: both `svelte-kit sync` and
  `vite build` fail outright on `0.8.0`. The 0.5.0 changeset recorded Kit 3's
  optional `typescript@^6` peer and concluded "it installs and builds clean" —
  install is clean, the build is not, and an *optional* peer means npm will not
  install a satisfying copy, not that any version will do.
  
  Nothing in the stack actually wanted TypeScript 7:
  
  | package | requires | before |
  | --- | --- | --- |
  | `knip` | `typescript@7.0.2` as a **dependency** | bundles its own, unaffected |
  | `svelte-check` | peer `^5.0.0 \|\| ^6.0.0` | rejected 7, nested its own 6.0.3 |
  | `prisma-json-types-generator` | own `^6.0.3` | nested its own |
  | `@sveltejs/kit` | optional peer `^6.0.0` | resolved to the hoisted 7 → crash |
  | `vitest`, `@vitest/coverage-v8` | no constraint | — |
  
  So TypeScript 7 was reaching exactly one consumer: the hoisted `tsc` binary —
  which then type-checked with a different compiler than `svelte-check` used. At
  `^6.0.3` nothing in the dependency set needs a nested copy any more.
  
  With the hold, the whole SvelteKit toolchain passes on the fixture —
  `svelte-kit sync`, `vite build`, `svelte-check`, `tsc --noEmit`, `vitest run`,
  `knip`. React Router is unaffected: `react-router typegen`, `vite build` and
  `vitest` behave identically on 6 and 7, and `tsc` reports fewer errors on 6.
  
  `6.0.3` is a stable release that is no longer the `latest` dist-tag, the same
  situation as the `prisma` hold. **Do not let an "update to latest" pass move it
  to 7** — there is nothing to upgrade to yet: `7.0.2` is the newest 7.x and
  `@sveltejs/kit@3.0.1` the newest Kit, so no released combination works.
  
  **What a consuming app changes.** Nothing, unless you were relying on
  TypeScript 7 — `tsc` is now the 6.x JavaScript implementation rather than the
  native port, so expect it to be slower, and TypeScript 7-only syntax or flags
  will stop resolving. In exchange a SvelteKit app can build.
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

## 0.8.0

No changes in this release.

## 0.7.0

No changes in this release.

## 0.6.0

### Minor Changes

- dccc761: Drop `madge` and detect import cycles with Biome's `suspicious/noImportCycles`
  instead.
  
  `madge@8.0.0` is the current `latest` and was published 2024-08-05; the newest
  commit on its default branch is that release. It still pins `commander@^7`,
  `ora@^5` and `chalk@^4`, and installing it pulls 120 packages and 48 MB —
  including its own `typescript@5.9.3`, via `dependency-tree` → `precinct`, so
  every consumer of this stack carried a second TypeScript two majors behind the
  `^7.0.2` it actually builds with.
  
  Biome 2.5 ships `noImportCycles` in `suspicious` (promoted out of nursery), and
  it reports the whole resolution path per offending import rather than a flat
  list of cycles. The other thing madge was here for, orphaned files, is already
  Knip's job.
  
  `noImportCycles` is not part of Biome's `recommended` set, so `biome.json` now
  enables it explicitly at `error`. Consumers inheriting that config will see
  cycles they previously had no check for fail `biome lint`. The graphviz output
  of `madge --image` has no replacement; reach for `bunx madge` when a picture of
  the graph is what you want.

## 0.5.1

No changes in this release.

## 0.5.0

### Minor Changes

- 3475bbb: Add Portless to the base stack, move to SvelteKit 3, and refresh every
  dependency to its latest release.
  
  The group is pre-1.0, so this breaking change is a `minor` (0.x minor is the
  breaking slot) rather than a `major` that would declare 1.0.0.
  
  ## Breaking: SvelteKit 2 → 3 (`svelte-stack`)
  
  **The `@chuvenger/svelte-stack/svelte.config` export is gone.** SvelteKit 3 no
  longer reads `svelte.config.js` at all — it now *errors* if the file exists:
  
  ```
  SvelteKit error: config_file_unsupported
  `svelte.config.js` is no longer used. Please pass configuration via the
  `sveltekit(...)` plugin in your Vite config.
  ```
  
  So deleting your `svelte.config.js` is required, not optional. Everything it
  used to hold (the node adapter, `vitePreprocess`) now lives in the stack's Vite
  config, which already passes it to the `sveltekit()` plugin for you:
  
  ```js
  // vite.config.js — unchanged for most apps
  import { createViteConfig } from "@chuvenger/svelte-stack/vite"
  
  export default createViteConfig()
  ```
  
  If you were spreading `svelteConfig` to override something — most often to swap
  the adapter — pass those options under `kit` instead. They are flat now; there
  is no more `kit: {}` nesting inside the SvelteKit config itself:
  
  ```js
  // before
  import { svelteConfig } from "@chuvenger/svelte-stack/svelte.config"
  export default { ...svelteConfig, kit: { ...svelteConfig.kit, adapter: vercel() } }
  
  // after
  import { createViteConfig } from "@chuvenger/svelte-stack/vite"
  export default createViteConfig({ kit: { adapter: vercel() } })
  ```
  
  They go under `kit` rather than in a second `sveltekit()` call because
  `mergeConfig` concatenates `plugins`, which would register the plugin twice.
  The stack's own defaults are also exported as `svelteKitConfig` from
  `@chuvenger/svelte-stack/vite` if you would rather build the Vite config
  yourself.
  
  `@sveltejs/adapter-node` goes 5 → 6 alongside it, which drops the `ORIGIN`
  environment variable. SvelteKit 3 also raises the floor to Node 22.17 and
  brings a pile of app-level renames the stack cannot do for you — `$lib` →
  `#lib` subpath imports, `$app/stores` → `$app/state`, `$app/environment` →
  `$app/env`, `invalidateAll()` → `refreshAll()`, and `checkOrigin` →
  `csrf.trustedOrigins`. See the official migration guide.
  
  One loose end to be aware of: SvelteKit 3 declares an optional peer of
  `typescript@^6` while the base stack ships `^7.0.2`. It installs and builds
  clean — the peer is optional and simply has not been widened for TypeScript 7
  yet.
  
  ## New: `portless`
  
  In `typescript-app-stack`, so it reaches the three stacks that actually serve
  something — the app stack and the React Router and Svelte stacks built on it —
  but not the base `typescript-stack`, where a library project would never have a
  port to name.
  
  It replaces dev-server port numbers with stable, named `.localhost` URLs, so an
  app is at `myapp.localhost` on every machine and in every agent session instead
  of whichever port happened to be free that day. It ships a `portless` bin;
  nothing is wired up automatically, consuming apps opt in. Note it requires
  Node 24+, above the stack's other floors — a consumer on Node 22 will still
  install fine but cannot run the CLI.
  
  ## Breaking in a dependency: dotenv 17 → 18
  
  In `typescript-app-stack`. The preload entry point is gone, so
  `node -r dotenv/config your-script.js` no longer works — use the new CLI,
  `dotenv run -- node your-script.js`. `.env.vault` support was also removed.
  Apps that only call `config()` from their own code are unaffected.
  
  ## Everything else
  
  Patch or minor within its current major: Biome 2.5.15, Knip 6.39.0, Vitest and
  coverage-v8 5.0.3, `@types/node` 26.6.4, Zod 4.6.5, better-auth 1.7.7, React
  and its types 19.3.0, React Router 8.4.0, TanStack Query 5.104.1, tRPC 11.19.0,
  Jotai 3.0.1, Lucide 1.52.0, Vite 8.3.2, Svelte 5.57.1,
  `@sveltejs/vite-plugin-svelte` 7.3.1, bits-ui 2.19.5.
  
  Two packages are deliberately held back:
  
  - **`prisma` stays on `^7.10.0`.** Its `latest` tag is `8.0.0-rc.19`, a
    prerelease, while `@prisma/client` and `@prisma/adapter-pg` are still stable
    on 7.x.
  - **`kysely` stays on `^0.28.17`.** `prisma-extension-kysely` peers on
    `^0.27.0 || ^0.28.0` and rejects 0.29.

## 0.4.0

No changes in this release.

## 0.3.0

No changes in this release.

## 0.2.1

No changes in this release.

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

## 0.1.3

### Patch Changes

- 1911c84: Ship type declarations for the config exports.

  The compiled config files (`vite.config.js`, `svelte.config.js`,
  `vitest.config.js`) shipped without `.d.ts` companions, so importing
  `createViteConfig` / `createVitestConfig` / `svelteConfig` resolved to
  implicit `any` and tripped `tsc` under `strict`. Each config export now
  carries a hand-written `.d.ts` (no build step) and a `types` condition in
  `exports`, so consumers get proper types with no local module shim.

## 0.1.2

### Patch Changes

- 7a012d6: Ship config exports as plain `.js` instead of raw `.ts`.

  The `./vite` (react-router, svelte) and `./vitest.config` (typescript) exports
  shipped uncompiled `vite.config.ts` / `vitest.config.ts`. React Router's config
  loader uses Node's native TS type-stripping, which refuses `.ts` files inside
  `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so `./vite` was
  unusable as re-exported. These are now plain ESM `.js` files with JSDoc types —
  matching the existing `svelte.config.js` convention and requiring no build step.
