import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, mergeConfig, type UserConfig } from "vite"

const base = defineConfig({
  plugins: [tailwindcss(), reactRouter()],
})

export const createViteConfig = (overrides: UserConfig = {}) =>
  mergeConfig(base, overrides)

export default base
