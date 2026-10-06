import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */

/**
 * Built per call, never cached at module scope. Vite re-evaluates a project's
 * own `vite.config.ts` on every config load, but this module is a bare import
 * out of node_modules, so Node's ESM cache evaluates it exactly once per
 * process. A plugin held in module scope would therefore be the *same*
 * instance for every load, and `reactRouter()` carries build state — the server
 * build would inherit the instance that just finished the client build and fail
 * with "Expected build manifest".
 */
const createBase = () =>
  defineConfig({
    plugins: [tailwindcss(), reactRouter()],
  })

/** @param {UserConfig} [overrides] */
export const createViteConfig = (overrides = {}) =>
  mergeConfig(createBase(), overrides)

export default () => createBase()
