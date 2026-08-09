import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config"

const base = defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
  },
})

export const createVitestConfig = (overrides: ViteUserConfig = {}) =>
  mergeConfig(base, overrides)

export default base
