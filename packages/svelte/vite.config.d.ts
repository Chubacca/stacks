import type { UserConfig } from "vite"

/** Merge caller overrides onto the stack's base Vite config. */
export declare function createViteConfig(overrides?: UserConfig): UserConfig

/** The stack's base Vite config (Tailwind + SvelteKit plugins). */
declare const base: UserConfig
export default base
