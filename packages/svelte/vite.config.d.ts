import type { Config as KitConfig } from "@sveltejs/kit/vite"
import type { UserConfig } from "vite"

/** The stack's base SvelteKit options (node adapter + vitePreprocess). */
export declare const svelteKitConfig: KitConfig

/** Merge caller overrides onto the stack's base Vite config. */
export declare function createViteConfig(
  overrides?: UserConfig & { kit?: KitConfig },
): UserConfig

/** The stack's base Vite config (Tailwind + SvelteKit plugins). */
declare const base: UserConfig
export default base
