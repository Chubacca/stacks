import adapter from "@sveltejs/adapter-node"
import { sveltekit } from "@sveltejs/kit/vite"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("vite").PluginOption} PluginOption */
/** @typedef {import("@sveltejs/kit/vite").Config} KitConfig */

/**
 * The stack's base SvelteKit options. As of SvelteKit 3 these are plugin
 * options rather than a `svelte.config.js` export — that file is now a hard
 * build error.
 *
 * Built per call for the same reason as `createBase` below: `adapter()` and
 * `vitePreprocess()` are instances, and `@sentry/sveltekit` calls
 * `adapter.adapt()` on every config resolve.
 */
export const createSvelteKitConfig = () => ({
  adapter: adapter(),
  preprocess: vitePreprocess(),
})

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
    plugins: [tailwindcss(), sveltekit({ ...createSvelteKitConfig(), ...kit })],
  })

/**
 * Merge caller overrides onto the stack's base Vite config. SvelteKit options
 * go under `kit` rather than in a second `sveltekit()` call, because
 * `mergeConfig` concatenates `plugins` and would register the plugin twice.
 *
 * `plugins` as an array is appended to the stack's, as `mergeConfig` does. Pass
 * a function instead when the order matters — it receives the stack's plugins
 * and returns the whole list, so a plugin can go first. `@sentry/sveltekit`
 * needs that: its own types say it "is registered before the SvelteKit
 * plugin".
 *
 * ```js
 * createViteConfig({ plugins: (stack) => [sentrySvelteKit(), ...stack] })
 * ```
 *
 * @param {Omit<UserConfig, "plugins"> & {
 *   kit?: KitConfig
 *   plugins?: PluginOption[] | ((stackPlugins: PluginOption[]) => PluginOption[])
 * }} [overrides]
 */
export const createViteConfig = ({ kit, plugins, ...overrides } = {}) => {
  const { plugins: stackPlugins = [], ...base } = createBase(kit)
  return mergeConfig(
    {
      ...base,
      plugins:
        typeof plugins === "function"
          ? plugins(stackPlugins)
          : [...stackPlugins, ...(plugins ?? [])],
    },
    overrides,
  )
}

export default () => createBase()
