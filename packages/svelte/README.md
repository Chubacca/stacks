# @chuvenger/svelte-stack

SvelteKit stack: Svelte, SvelteKit, svelte-check, Vite — on top of
`@chuvenger/typescript-app-stack` and `@chuvenger/typescript-stack`.

Name this one package in your app and reach everything through it.

## tsconfig

A SvelteKit 3 app has to extend `$app/tsconfig`, the config `svelte-kit sync`
generates into `node_modules`. It supplies `paths`, `rootDirs`,
`types: ["$app/types"]`, `lib`, and the module/target options that have to agree
with Vite's. So this stack's `tsconfig.json` holds only the three opinions Kit
does not express — `strict`, `noUncheckedIndexedAccess`, `sourceMap` — and the
two configs are disjoint:

```jsonc
// tsconfig.json
{
  "extends": ["@chuvenger/svelte-stack/tsconfig.json", "$app/tsconfig"],
  "compilerOptions": {
    // `types` replaces rather than merges, so Kit's entry has to be repeated
    // alongside anything you add.
    "types": ["$app/types", "node", "vite/client", "vitest/globals"]
  },
  "include": ["src", "test", "*"],
  "exclude": ["src/service-worker"]
}
```

Being disjoint is the point: the order of those two `extends` entries no longer
changes the result. It used to. This stack's config set `lib`, `noEmit` and
`types: ["node", "vite/client", "vitest/globals"]`, all of which `$app/tsconfig`
also sets, and a later entry in an `extends` array wins. Measured with
`tsc --showConfig` on a SvelteKit 3 fixture, naming the stack second resolved to
`types: ["node", "vite/client", "vitest/globals"]` — no `$app/types`, so no
generated route types and no `App.Locals` — and to `target`/`module` `es2022`
instead of `esnext`. Naming it first resolved correctly. Nothing warned either
way.

## Vite

```js
// vite.config.ts
import { createViteConfig } from "@chuvenger/svelte-stack/vite"

export default createViteConfig()
```

SvelteKit options go under `kit`; there is no `svelte.config.js` in SvelteKit 3.

```js
export default createViteConfig({ kit: { adapter: vercel() } })
```

`plugins` as an array is appended to the stack's, which is what `mergeConfig`
does. When the order matters, pass a function instead — it receives the stack's
plugins and returns the whole list:

```js
import { sentrySvelteKit } from "@sentry/sveltekit/vite"

export default createViteConfig({
  plugins: (stack) => [sentrySvelteKit(), ...stack],
})
```

`@sentry/sveltekit` is the case this exists for: its own types say it must be
"registered before the SvelteKit plugin", and with only the array form there was
no way to ask for that.

The stack's SvelteKit options are also exported as `createSvelteKitConfig()` if
you would rather assemble the Vite config yourself. It is a factory, not a
constant: it holds `adapter()` and `vitePreprocess()`, which are instances, and
`@sentry/sveltekit` calls `adapter.adapt()` on every config resolve.

## Biome, Vitest, Knip

```jsonc
// biome.json
{ "extends": ["@chuvenger/svelte-stack/biome.json"] }
```

```js
// vitest.config.ts
import { createVitestConfig } from "@chuvenger/svelte-stack/vitest.config"

export default createVitestConfig()
```

```js
// knip.config.ts
export { default } from "@chuvenger/svelte-stack/knip.config"
```

Knip needs the preset because it enables its plugins by looking for the
framework in the *app's* package.json, which on this stack names the stack and
little else. Its `sveltekit` plugin needs more than enabling: it finds a
project's routes by parsing `vite.config.ts` for a `sveltekit` import from
`@sveltejs/kit/vite`, and an app here imports `createViteConfig` instead, so it
contributes no entry points at all. The preset therefore carries Kit's route and
hook patterns itself, plus a `.svelte` compiler — knip ships one but registers
it only when `svelte` is an app dependency, and without it `.svelte` files are
not scanned, so a module imported only from a component reads as unused.

Measured on a SvelteKit 3 fixture whose only dependency is this stack: 23
findings with no config (every route, hook and `+page.server.ts` as an unused
file; every stack binary as unlisted; `$app/*` imports unresolved), 2 with the
preset, both of them real.

Patterns that are not in every SvelteKit app are left to yours, because knip
reports an entry pattern matching no file as a configuration hint:

```js
import { createKnipConfig } from "@chuvenger/svelte-stack/knip.config"

export default createKnipConfig({
  entry: ["src/params/*.{js,ts}!", "src/service-worker.ts!"],
})
```
