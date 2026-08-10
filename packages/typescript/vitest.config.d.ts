import type { ViteUserConfig } from "vitest/config"

/** Merge caller overrides onto the stack's base Vitest config. */
export declare function createVitestConfig(overrides?: ViteUserConfig): ViteUserConfig

/** The stack's base Vitest config (globals, passWithNoTests). */
declare const base: ViteUserConfig
export default base
