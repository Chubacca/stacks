import adapter from "@sveltejs/adapter-node"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import("@sveltejs/kit").Config} */
export const svelteConfig = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
}

export default svelteConfig
