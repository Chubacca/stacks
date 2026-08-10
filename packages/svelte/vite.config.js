import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig } from "vite"

/** @typedef {import("vite").UserConfig} UserConfig */

const base = defineConfig({
  plugins: [tailwindcss(), sveltekit()],
})

/** @param {UserConfig} [overrides] */
export const createViteConfig = (overrides = {}) =>
  mergeConfig(base, overrides)

export default base
