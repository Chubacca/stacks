---
"@chuvenger/react-router-stack": minor
---

**Fix: `createViteConfig` shared one set of plugin instances across every build.**
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
