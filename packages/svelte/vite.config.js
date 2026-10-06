import adapter from "@sveltejs/adapter-node"
import { sveltekit } from "@sveltejs/kit/vite"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("@sveltejs/kit/vite").Config} KitConfig */

/**
 * The stack's base SvelteKit options. As of SvelteKit 3 these are plugin
 * options rather than a `svelte.config.js` export — that file is now a hard
 * build error.
 */
export const svelteKitConfig = {
  adapter: adapter(),
  preprocess: vitePreprocess(),
}

/**
 * Built per call, never cached at module scope. Vite re-evaluates a project's
 * own `vite.config.ts` on every config load, but this module is a bare import
 * out of node_modules, so Node's ESM cache evaluates it exactly once per
 * process. A plugin held in module scope would therefore be the *same* instance
 * for every load, and these plugins carry build state — a later build would
 * inherit the instance that finished the previous one.
 * @param {KitConfig} [kit]
 */
const createBase = (kit) =>
  defineConfig({
    plugins: [tailwindcss(), sveltekit({ ...svelteKitConfig, ...kit })],
  })

/**
 * Merge caller overrides onto the stack's base Vite config. SvelteKit options
 * go under `kit` rather than in a second `sveltekit()` call, because
 * `mergeConfig` concatenates `plugins` and would register the plugin twice.
 * @param {UserConfig & { kit?: KitConfig }} [overrides]
 */
export const createViteConfig = ({ kit, ...overrides } = {}) =>
  mergeConfig(createBase(kit), overrides)

export default () => createBase()
