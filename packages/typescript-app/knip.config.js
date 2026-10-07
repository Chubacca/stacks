import {
  createKnipConfig as createBaseKnipConfig,
  mergeKnipConfig,
} from "@chuvenger/typescript-stack/knip.config"

/** @typedef {import("knip").KnipConfig} KnipConfig */

/**
 * The app stack's knip config: the base stack's, plus the plugins for the
 * tools this package adds. See `@chuvenger/typescript-stack/knip.config` for
 * why every plugin has to be named explicitly.
 */
const createBase = () =>
  createBaseKnipConfig({
    // Prisma lives in this package. Prisma 7 puts the schema path and the seed
    // command in `prisma.config.ts`; without the plugin that file is not a
    // config file to knip and reads as unused.
    prisma: true,
  })

/** @param {KnipConfig} [overrides] */
export const createKnipConfig = (overrides) =>
  mergeKnipConfig(createBase(), overrides)

export default () => createBase()
