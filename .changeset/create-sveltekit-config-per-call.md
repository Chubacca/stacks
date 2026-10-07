---
"@chuvenger/svelte-stack": minor
---

**Breaking: `svelteKitConfig` is replaced by `createSvelteKitConfig()`.**

The group is pre-1.0, so this breaking change is a `minor` — `0.x` has no
other slot for one, and a `major` would declare 1.0.0. Pin `^0` rather than
`^0.8.0` if you want to pick these up without editing the range each time.

0.7.0 moved `createBase` to per-call construction because this module is a bare
import out of `node_modules`, so Node's ESM cache evaluates it exactly once per
process and anything held in module scope is the same instance for every config
load. `svelteKitConfig` was missed: it stayed a module-scope const holding
`adapter()` and `vitePreprocess()`, and `createBase` spread it, so the base
looked fresh while the instances inside it were shared. The reasoning in that
comment applies to them unchanged, and it is live, because `@sentry/sveltekit`
calls `adapter.adapt()` on every config resolve.

`check-packages.sh` only compared `plugins` arrays, which is why it passed on
this. It now compares every object a config exposes directly — its own values,
and the elements of any array among them — so the same shape cannot come back
anywhere else either. It deliberately stops before a plugin's internals, where a
third-party module-scope constant is shared quite legitimately.

**What a consuming app changes.** Nothing, unless you imported
`svelteKitConfig` to assemble the Vite config yourself — the usual reason being
to swap the adapter. Call the factory instead:

```js
// before
import { svelteKitConfig } from "@chuvenger/svelte-stack/vite"
sveltekit({ ...svelteKitConfig, adapter: vercel() })

// after
import { createSvelteKitConfig } from "@chuvenger/svelte-stack/vite"
sveltekit({ ...createSvelteKitConfig(), adapter: vercel() })
```

Call it inside the config factory, not at module scope, or the sharing is just
moved into your file. Most apps do not need it at all —
`createViteConfig({ kit: { adapter: vercel() } })` already merges onto the
stack's defaults.
