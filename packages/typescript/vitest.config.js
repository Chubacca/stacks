import { defineConfig, mergeConfig } from "vitest/config"

/** @typedef {import("vitest/config").ViteUserConfig} ViteUserConfig */

/**
 * Built per call, never cached at module scope. Vite re-evaluates a project's
 * own config file on every load, but this module is a bare import out of
 * node_modules, so Node's ESM cache evaluates it exactly once per process —
 * anything held in module scope is shared by every load. Nothing in this base
 * is stateful today; the factory is here so that adding a plugin later cannot
 * reintroduce the sharing bug. See the framework stacks' `vite.config.js`.
 */
const createBase = () =>
  defineConfig({
    test: {
      globals: true,
      passWithNoTests: true,
    },
  })

/** @param {ViteUserConfig} [overrides] */
export const createVitestConfig = (overrides = {}) =>
  mergeConfig(createBase(), overrides)

export default () => createBase()
