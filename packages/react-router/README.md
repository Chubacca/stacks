# @chuvenger/react-router-stack

React Router stack: React, React Router, tRPC, TanStack Query, Vite — on top of
`@chuvenger/typescript-app-stack` and `@chuvenger/typescript-stack`.

Name this one package in your app and reach everything through it.

## Config exports

```jsonc
// tsconfig.json
{ "extends": "@chuvenger/react-router-stack/tsconfig.json" }
```

```jsonc
// biome.json
{ "extends": ["@chuvenger/react-router-stack/biome.json"] }
```

```js
// vitest.config.ts
import { createVitestConfig } from "@chuvenger/react-router-stack/vitest.config"

export default createVitestConfig()
```

```js
// knip.config.ts
export { default } from "@chuvenger/react-router-stack/knip.config"
```

## Vite

```js
// vite.config.ts
import { createViteConfig } from "@chuvenger/react-router-stack/vite"

export default createViteConfig()
```

`plugins` as an array is appended to the stack's, which is what `mergeConfig`
does. When the order matters, pass a function instead — it receives the stack's
plugins and returns the whole list, so a plugin that has to run before
`reactRouter()` can:

```js
export default createViteConfig({
  plugins: (stack) => [sentryReactRouter(sentryOptions), ...stack],
})
```

## Why knip needs a preset

Knip enables its framework plugins by looking for the framework in the *app's*
package.json. An app on this stack names the stack and almost nothing else, so
that detection never fires: without the `react-router` plugin none of
`root.tsx`, `entry.client.tsx`, `routes.ts` or any route module is an entry
point, and every tool the stack puts on `PATH` reads as an unlisted binary.
Measured on a React Router 8 fixture whose only dependency is this stack: 23
findings with no config, 3 with the preset, all three real.

The preset needs no entry patterns. Knip's `react-router` plugin reads
`react-router.config.ts` and loads `app/routes.ts`, so it finds the route graph
on its own once it is enabled — unlike the `sveltekit` plugin, which looks for a
specific import in `vite.config.ts` and so cannot see a stack-based app at all.

The preset only removes false positives the stack layout causes. Suppressing
infrastructure you meant to keep belongs in your own config:

```js
import { createKnipConfig } from "@chuvenger/react-router-stack/knip.config"

export default createKnipConfig({ entry: ["app/entry.server.tsx!"] })
```
