# @chuvenger/typescript-stack

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
