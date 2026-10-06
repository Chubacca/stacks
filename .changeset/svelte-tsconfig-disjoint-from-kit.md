---
"@chuvenger/svelte-stack": major
---

**Breaking: `@chuvenger/svelte-stack/tsconfig.json` is down to three options,
and no longer fights `$app/tsconfig`.**

A SvelteKit 3 app has to extend `$app/tsconfig`, the config `svelte-kit sync`
generates into `node_modules`. It supplies `paths`, `rootDirs`,
`types: ["$app/types"]`, `lib`, and the module and target options that have to
agree with Vite's. This stack's config set `lib`, `noEmit` and
`types: ["node", "vite/client", "vitest/globals"]`, and extended the base stack,
which set `target`, `module`, `moduleResolution`, `isolatedModules`,
`verbatimModuleSyntax` and the rest — every one of them also set by
`$app/tsconfig`. In an `extends` array the later entry wins, so the order of two
names silently decided whether the result was right, with no warning either way.

Measured with `tsc --showConfig` on a SvelteKit 3 fixture:

| `extends` | resolved `types` | `target` |
| --- | --- | --- |
| stack, then `$app/tsconfig` | `["$app/types"]` | `esnext` |
| `$app/tsconfig`, then stack | `["node", "vite/client", "vitest/globals"]` | `es2022` |

The second row is the broken one: no `$app/types` means no generated route
types and no `App.Locals`.

The config now holds only the three opinions Kit does not express — `strict`,
`noUncheckedIndexedAccess`, `sourceMap` — and no longer extends the base stack,
whose other options Kit covers. The two are disjoint, so the order stops
mattering: both rows above now resolve identically.

**What a consuming app changes.** `types` is the one to look at, because it
replaces rather than merges and Kit needs its own entry in it:

```jsonc
{
  "extends": ["@chuvenger/svelte-stack/tsconfig.json", "$app/tsconfig"],
  "compilerOptions": {
    "types": ["$app/types", "node", "vite/client", "vitest/globals"]
  },
  "include": ["src", "test", "*"],
  "exclude": ["src/service-worker"]
}
```

An app that was carrying a local `types` override to work around the clash can
keep it; it is now the only place `types` is set. An app that extends *only*
this config, without `$app/tsconfig`, now gets almost no compiler options and
has to add them — but SvelteKit 3 already requires extending `$app/tsconfig`,
and warns when you do not.
