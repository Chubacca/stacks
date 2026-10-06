import type { UserConfig } from "vite"

/** Merge caller overrides onto the stack's base Vite config. */
export declare function createViteConfig(overrides?: UserConfig): UserConfig

/**
 * The stack's base Vite config (Tailwind + React Router plugins), as a factory
 * — Vite calls it on each config load so the stateful plugins are never shared
 * between builds.
 */
declare const createBase: () => UserConfig
export default createBase
