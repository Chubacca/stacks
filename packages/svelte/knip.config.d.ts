import type { KnipConfig } from "knip"

/** Merge caller overrides onto the SvelteKit stack's knip config. */
export declare function createKnipConfig(overrides?: KnipConfig): KnipConfig

/**
 * The SvelteKit stack's knip config, as a factory — knip calls it on each
 * load, so nothing is shared between runs.
 */
declare const createBase: () => KnipConfig
export default createBase
