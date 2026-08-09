import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig, type UserConfig } from "vite"

const base = defineConfig({
  plugins: [tailwindcss(), sveltekit()],
})

export const createViteConfig = (overrides: UserConfig = {}) =>
  mergeConfig(base, overrides)

export default base
