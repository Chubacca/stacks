import { createKnipConfig as createAppKnipConfig } from "@chuvenger/typescript-app-stack/knip.config"
import { mergeKnipConfig } from "@chuvenger/typescript-stack/knip.config"

/** @typedef {import("knip").KnipConfig} KnipConfig */

/**
 * The React Router stack's knip config.
 *
 * Unlike knip's `sveltekit` plugin, the `react-router` one finds a project's
 * routes from its config rather than from a specific import in
 * `vite.config.ts`: it reads `react-router.config.ts`, then loads
 * `app/routes.ts` and makes every route file a production entry point. So this
 * stack needs no entry patterns of its own — only the plugin, which knip
 * cannot enable by itself because `@react-router/dev` is not in the app's
 * package.json.
 */
const createBase = () =>
  createAppKnipConfig({
    "react-router": true,
    // Registers knip's `import.meta.glob` visitor. The route entry points
    // already come from the plugin above.
    vite: true,
  })

/** @param {KnipConfig} [overrides] */
export const createKnipConfig = (overrides) =>
  mergeKnipConfig(createBase(), overrides)

export default () => createBase()
