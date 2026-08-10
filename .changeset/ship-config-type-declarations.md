---
"@chuvenger/react-router-stack": patch
"@chuvenger/svelte-stack": patch
"@chuvenger/typescript-stack": patch
---

Ship type declarations for the config exports.

The compiled config files (`vite.config.js`, `svelte.config.js`,
`vitest.config.js`) shipped without `.d.ts` companions, so importing
`createViteConfig` / `createVitestConfig` / `svelteConfig` resolved to
implicit `any` and tripped `tsc` under `strict`. Each config export now
carries a hand-written `.d.ts` (no build step) and a `types` condition in
`exports`, so consumers get proper types with no local module shim.
