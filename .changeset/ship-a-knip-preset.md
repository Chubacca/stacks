---
"@chuvenger/typescript-stack": minor
"@chuvenger/typescript-app-stack": minor
"@chuvenger/svelte-stack": minor
"@chuvenger/react-router-stack": minor
---

**New: a `knip.config` export on every stack.**

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
