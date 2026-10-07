---
"@chuvenger/typescript-stack": minor
"@chuvenger/svelte-stack": minor
---

**Breaking: `typescript` is held at `^6.0.3`, down from `^7.0.2`. This fixes a
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
