# @chuvenger/react-router-stack

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
