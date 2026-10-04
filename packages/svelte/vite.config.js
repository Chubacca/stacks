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

/** @param {KitConfig} [kit] */
const createBase = (kit) =>
  defineConfig({
    plugins: [tailwindcss(), sveltekit({ ...svelteKitConfig, ...kit })],
  })

const base = createBase()

/**
 * Merge caller overrides onto the stack's base Vite config. SvelteKit options
 * go under `kit` rather than in a second `sveltekit()` call, because
 * `mergeConfig` concatenates `plugins` and would register the plugin twice.
 * @param {UserConfig & { kit?: KitConfig }} [overrides]
 */
export const createViteConfig = ({ kit, ...overrides } = {}) =>
  mergeConfig(kit ? createBase(kit) : base, overrides)

export default base
