# @chuvenger/react-router-stack

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
- f48b5c7: **`createViteConfig` can now put a plugin before the stack's.**
  
  `createViteConfig` merged overrides with `mergeConfig`, which concatenates
  `plugins` — so a caller's plugin always landed *after* `sveltekit()` or
  `reactRouter()` and there was no way to ask for anything else. A plugin that has
  to run first could not be expressed, and the only way out was to abandon the
  helper and hand-assemble the plugin list, importing `sveltekit`, `tailwindcss`
  and `defineConfig` out of the stack's transitive dependencies — which is the
  thing the stack exists to avoid.
  
  `plugins` now also accepts a function. It receives the stack's plugins and
  returns the whole list, so it can prepend, append, reorder or drop:
  
  ```js
  import { sentrySvelteKit } from "@sentry/sveltekit/vite"
  import { createViteConfig } from "@chuvenger/svelte-stack/vite"
  
  export default createViteConfig({
    plugins: (stack) => [sentrySvelteKit(), ...stack],
  })
  ```
  
  `@sentry/sveltekit` is the case this exists for; its own type declarations say
  it must be "registered before the SvelteKit plugin". Verified against
  `@sentry/sveltekit@11.4.0`: with the function form, Sentry's plugins resolve at
  index 0 and `vite-plugin-sveltekit-*` at 19.
  
  **What a consuming app changes.** Nothing. `plugins` as an array still appends,
  exactly as `mergeConfig` did. Use the function form only when you need the
  order.

### Patch Changes

- Updated dependencies [f48b5c7]
- Updated dependencies [f48b5c7]
- Updated dependencies [f48b5c7]
  - @chuvenger/typescript-stack@0.9.0
  - @chuvenger/typescript-app-stack@0.9.0

## 0.8.0

### Minor Changes

- 8f3db20: **Fix: the framework `biome.json` files gave consumers nothing but their own
  keys.** `@chuvenger/react-router-stack/biome.json` reached the base config by
  extending `@chuvenger/typescript-stack/biome.json`, but Biome resolves exactly
  one level of `extends` — a config reached *through* an extends has its own
  `extends` silently ignored. So an app that named only the framework config got
  that file's `linter.domains` and nothing else: no VCS ignore file, no formatter
  settings, none of the base rule tweaks. Measured on Biome 2.5.15 with three
  local configs, `a extends b` reports VCS enabled and `c extends a extends b`
  does not, with no diagnostic in between. Downstream it looked like 174 files
  linted instead of 144, because the gitignore went unread, and the formatter
  falling back to tabs.
  
  Both framework configs now inline the base rather than extending it, so one
  entry is enough again:
  
  ```json
  { "extends": ["@chuvenger/react-router-stack/biome.json"] }
  ```
  
  Apps that worked around this by extending both configs, base first, do not have
  to change in lockstep — that form still resolves to the same config. Drop the
  base entry whenever convenient.
  
  Same fix in `@chuvenger/svelte-stack`. The flattened files are generated from
  `packages/typescript/biome.json` by `.github/build-biome-configs.sh`, and
  `check-all` fails if they drift from it.

### Patch Changes

- @chuvenger/typescript-stack@0.8.0
  - @chuvenger/typescript-app-stack@0.8.0

## 0.7.0

### Minor Changes

- 17fc180: **Fix: `createViteConfig` shared one set of plugin instances across every build.**
  The base config was built once at module scope. A project's own
  `vite.config.ts` is re-evaluated by Vite on each config load, but this module is
  a bare import out of `node_modules`, so Node's ESM cache evaluates it exactly
  once per process — every load got the same `reactRouter()` and `tailwindcss()`
  instances. Because `reactRouter()` carries build state, a second load inherits
  the instance that finished the first build and fails with
  `Error: Expected build manifest`. The base is now a factory, so each load builds
  its own plugins. Same fix in `@chuvenger/svelte-stack`, which cached its base the
  same way whenever no `kit` overrides were passed.
  
  The `default` export of `.../vite` and `.../vitest.config` is now a config
  **function** rather than a config object, for the same reason. Vite and Vitest
  both accept either. Code that called `createViteConfig()` needs no change; code
  that spread the default export as an object does.
  
  **Each framework stack now exports the whole config surface an app needs**, so
  nothing has to reach past its declared dependency:
  
  - `@chuvenger/{react-router,svelte}-stack/vitest.config` re-export
    `createVitestConfig` from the base stack. Previously an app's
    `vitest.config.ts` had to import `@chuvenger/typescript-stack/vitest.config`,
    two levels down its dependency chain and not something it depends on.
  - `@chuvenger/{react-router,svelte}-stack/biome.json` extend the base config.
  - Both stacks now depend on `@chuvenger/typescript-stack` directly, which is
    what `tsconfig.json` has always extended. This also settles which TypeScript
    an app runs: `prisma-kysely` and `prisma-json-types-generator` pull their own
    TS 5 and TS 6, and those used to tie with the stack's TS 7 on install depth,
    so `node_modules/.bin/tsc` was whichever one the installer happened to hoist.
    The stack's copy is now strictly shallower and wins.
  
  **The React Biome rules are now actually on.** Biome enables its `react` and
  `test` rule domains by sniffing the *app's* `package.json`, and in a stack-based
  app React and Vitest are the stack's dependencies, not the app's — so every
  consumer silently linted without `useHookAtTopLevel`,
  `useExhaustiveDependencies` or `noFocusedTests`. The React Router stack's
  `biome.json` turns on `react`, and the base stack's turns on `test`. Note that
  Biome *replaces* rather than merges `linter.domains` across `extends`, so an app
  that sets its own must restate the stack's.

### Patch Changes

- @chuvenger/typescript-stack@0.7.0
  - @chuvenger/typescript-app-stack@0.7.0

## 0.6.0

### Patch Changes

- @chuvenger/typescript-app-stack@0.6.0

## 0.5.1

### Patch Changes

- Updated dependencies [07139a4]
  - @chuvenger/typescript-app-stack@0.5.1

## 0.5.0

### Patch Changes

- @chuvenger/typescript-app-stack@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [a9c448a]
  - @chuvenger/typescript-app-stack@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [d7fc20f]
  - @chuvenger/typescript-app-stack@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [45fd062]
  - @chuvenger/typescript-app-stack@0.2.1

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
  - @chuvenger/typescript-app-stack@0.2.0

## 0.1.3

### Patch Changes

- 1911c84: Ship type declarations for the config exports.

  The compiled config files (`vite.config.js`, `svelte.config.js`,
  `vitest.config.js`) shipped without `.d.ts` companions, so importing
  `createViteConfig` / `createVitestConfig` / `svelteConfig` resolved to
  implicit `any` and tripped `tsc` under `strict`. Each config export now
  carries a hand-written `.d.ts` (no build step) and a `types` condition in
  `exports`, so consumers get proper types with no local module shim.

  - @chuvenger/typescript-app-stack@0.1.3

## 0.1.2

### Patch Changes

- 7a012d6: Ship config exports as plain `.js` instead of raw `.ts`.

  The `./vite` (react-router, svelte) and `./vitest.config` (typescript) exports
  shipped uncompiled `vite.config.ts` / `vitest.config.ts`. React Router's config
  loader uses Node's native TS type-stripping, which refuses `.ts` files inside
  `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so `./vite` was
  unusable as re-exported. These are now plain ESM `.js` files with JSDoc types —
  matching the existing `svelte.config.js` convention and requiring no build step.

  - @chuvenger/typescript-app-stack@0.1.2
