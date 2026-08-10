import { defineConfig, mergeConfig } from "vitest/config"

/** @typedef {import("vitest/config").ViteUserConfig} ViteUserConfig */

const base = defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
  },
})

/** @param {ViteUserConfig} [overrides] */
export const createVitestConfig = (overrides = {}) =>
  mergeConfig(base, overrides)

export default base
