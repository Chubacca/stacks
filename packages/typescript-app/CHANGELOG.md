# @chuvenger/typescript-app-stack

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
