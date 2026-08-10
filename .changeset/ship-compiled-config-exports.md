---
"@chuvenger/react-router-stack": patch
"@chuvenger/typescript-stack": patch
"@chuvenger/svelte-stack": patch
---

Ship config exports as plain `.js` instead of raw `.ts`.

The `./vite` (react-router, svelte) and `./vitest.config` (typescript) exports
shipped uncompiled `vite.config.ts` / `vitest.config.ts`. React Router's config
loader uses Node's native TS type-stripping, which refuses `.ts` files inside
`node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so `./vite` was
unusable as re-exported. These are now plain ESM `.js` files with JSDoc types —
matching the existing `svelte.config.js` convention and requiring no build step.
