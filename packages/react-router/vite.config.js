import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */

const base = defineConfig({
  plugins: [tailwindcss(), reactRouter()],
})

/** @param {UserConfig} [overrides] */
export const createViteConfig = (overrides = {}) =>
  mergeConfig(base, overrides)

export default base
