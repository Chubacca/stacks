import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("vite").PluginOption} PluginOption */

/**
 * Built per call, never cached at module scope. Vite re-evaluates a project's
 * own `vite.config.ts` on every config load, but this module is a bare import
 * out of node_modules, so Node's ESM cache evaluates it exactly once per
 * process. A plugin held in module scope would therefore be the *same*
 * instance for every load, and `reactRouter()` carries build state — the server
 * build would inherit the instance that just finished the client build and fail
 * with "Expected build manifest".
 */
const createBase = () =>
  defineConfig({
    plugins: [tailwindcss(), reactRouter()],
  })

/**
 * Merge caller overrides onto the stack's base Vite config.
 *
 * `plugins` as an array is appended to the stack's, as `mergeConfig` does. Pass
 * a function instead when the order matters — it receives the stack's plugins
 * and returns the whole list, so a plugin can go first.
 *
 * ```js
 * createViteConfig({ plugins: (stack) => [sentryReactRouter(options), ...stack] })
 * ```
 *
 * @param {Omit<UserConfig, "plugins"> & {
 *   plugins?: PluginOption[] | ((stackPlugins: PluginOption[]) => PluginOption[])
 * }} [overrides]
 */
export const createViteConfig = ({ plugins, ...overrides } = {}) => {
  const { plugins: stackPlugins = [], ...base } = createBase()
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
