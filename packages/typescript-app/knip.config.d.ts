import type { KnipConfig } from "knip"

/** Merge caller overrides onto the app stack's knip config. */
export declare function createKnipConfig(overrides?: KnipConfig): KnipConfig

/**
 * The app stack's knip config, as a factory — knip calls it on each load, so
 * nothing is shared between runs.
 */
declare const createBase: () => KnipConfig
export default createBase
