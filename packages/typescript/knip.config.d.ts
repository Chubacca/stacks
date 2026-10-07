import type { KnipConfig } from "knip"

/** Merge caller overrides onto a knip config (arrays concatenate). */
export declare function mergeKnipConfig(
  base: KnipConfig,
  overrides?: KnipConfig,
): KnipConfig

/** Merge caller overrides onto the base stack's knip config. */
export declare function createKnipConfig(overrides?: KnipConfig): KnipConfig

/**
 * The base stack's knip config, as a factory — knip calls it on each load, so
 * nothing is shared between runs.
 */
declare const createBase: () => KnipConfig
export default createBase
