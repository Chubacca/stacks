---
"@chuvenger/svelte-stack": minor
"@chuvenger/react-router-stack": minor
---

**`createViteConfig` can now put a plugin before the stack's.**

`createViteConfig` merged overrides with `mergeConfig`, which concatenates
`plugins` — so a caller's plugin always landed *after* `sveltekit()` or
`reactRouter()` and there was no way to ask for anything else. A plugin that has
to run first could not be expressed, and the only way out was to abandon the
helper and hand-assemble the plugin list, importing `sveltekit`, `tailwindcss`
and `defineConfig` out of the stack's transitive dependencies — which is the
thing the stack exists to avoid.

`plugins` now also accepts a function. It receives the stack's plugins and
returns the whole list, so it can prepend, append, reorder or drop:

```js
import { sentrySvelteKit } from "@sentry/sveltekit/vite"
import { createViteConfig } from "@chuvenger/svelte-stack/vite"

export default createViteConfig({
  plugins: (stack) => [sentrySvelteKit(), ...stack],
})
```

`@sentry/sveltekit` is the case this exists for; its own type declarations say
it must be "registered before the SvelteKit plugin". Verified against
`@sentry/sveltekit@11.4.0`: with the function form, Sentry's plugins resolve at
index 0 and `vite-plugin-sveltekit-*` at 19.

**What a consuming app changes.** Nothing. `plugins` as an array still appends,
exactly as `mergeConfig` did. Use the function form only when you need the
order.
