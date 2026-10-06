# @chuvenger/typescript-stack

Base TypeScript stack: TypeScript, Biome, Knip, Vitest.

Everything here is also reachable from the framework stacks built on it
(`@chuvenger/react-router-stack`, `@chuvenger/svelte-stack`), and an app should
name the one stack it depends on rather than reaching past it.

## Config exports

```jsonc
// tsconfig.json
{ "extends": "@chuvenger/typescript-stack/tsconfig.json" }
```

```jsonc
// biome.json
{ "extends": ["@chuvenger/typescript-stack/biome.json"] }
```

```js
// vitest.config.ts
import { createVitestConfig } from "@chuvenger/typescript-stack/vitest.config"

export default createVitestConfig()
```

```js
// knip.config.ts
export { default } from "@chuvenger/typescript-stack/knip.config"
```

## Why knip needs a preset

Knip enables its framework plugins by looking for the framework in the *app's*
package.json. An app on this stack names the stack and almost nothing else, so
that detection never fires: Vitest is not found, so test files are not entry
points and every `*.test.ts` reads as an unused file; the tools the stack puts
on `PATH` are not found, so every `biome`/`tsc`/`knip` in a script reads as an
unlisted binary. Measured on a library fixture whose only dependency is this
stack: 7 findings with no config, 0 with the preset.

The preset only removes false positives the stack layout causes. Suppressing
infrastructure you meant to keep belongs in your own config:

```js
import { createKnipConfig } from "@chuvenger/typescript-stack/knip.config"

export default createKnipConfig({ entry: ["scripts/*.ts"] })
```

Array options (`entry`, `project`, `exclude`, `include`, `ignoreUnresolved`)
concatenate onto the stack's and `compilers` merges per extension; everything
else replaces.
