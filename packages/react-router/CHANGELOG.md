# @chuvenger/react-router-stack

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
