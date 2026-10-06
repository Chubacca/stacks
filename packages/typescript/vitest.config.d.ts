import type { ViteUserConfig } from "vitest/config"

/** Merge caller overrides onto the stack's base Vitest config. */
export declare function createVitestConfig(overrides?: ViteUserConfig): ViteUserConfig

/**
 * The stack's base Vitest config (globals, passWithNoTests), as a factory —
 * Vitest calls it on each config load so nothing is shared between runs.
 */
declare const createBase: () => ViteUserConfig
export default createBase
