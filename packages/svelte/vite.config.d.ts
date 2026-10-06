import type { Config as KitConfig } from "@sveltejs/kit/vite"
import type { PluginOption, UserConfig } from "vite"

/**
 * The stack's base SvelteKit options (node adapter + vitePreprocess), as a
 * factory — `adapter()` and `vitePreprocess()` are instances, so they are
 * built per call rather than shared.
 */
export declare const createSvelteKitConfig: () => KitConfig

export type ViteConfigOverrides = Omit<UserConfig, "plugins"> & {
  kit?: KitConfig
  /**
   * Appended to the stack's plugins when an array. Pass a function to control
   * the order — it receives the stack's plugins and returns the whole list, so
   * a plugin that has to run first can go first.
   */
  plugins?: PluginOption[] | ((stackPlugins: PluginOption[]) => PluginOption[])
}

/** Merge caller overrides onto the stack's base Vite config. */
export declare function createViteConfig(
  overrides?: ViteConfigOverrides,
): UserConfig

/**
 * The stack's base Vite config (Tailwind + SvelteKit plugins), as a factory —
 * Vite calls it on each config load so the stateful plugins are never shared
 * between builds.
 */
declare const createBase: () => UserConfig
export default createBase
