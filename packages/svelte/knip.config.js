import { createKnipConfig as createAppKnipConfig } from "@chuvenger/typescript-app-stack/knip.config"
import { mergeKnipConfig } from "@chuvenger/typescript-stack/knip.config"

/** @typedef {import("knip").KnipConfig} KnipConfig */

/** `<script>` blocks, skipping self-closing `<script src=... />` tags. */
const scriptBlock =
  /<script\b(?:[^>"']|"[^"]*"|'[^']*')*(?<!\/)>([\s\S]*?)<\/script>/gi
const blockComment = /\/\*[\s\S]*?\*\//g
const lineComment = /^[ \t]*\/\/.*$/gm
/** `import ... "x"`, `import "x"` and `import("x")`, but never `import.meta`. */
const importStatement =
  /(?<![.\w$])import\b(?!\s*\.)\s*(?:\(\s*(['"])[^'"]+\1\s*\)|(?:[^'";]*?\bfrom\b\s*)?(['"])[^'"]+\2)/g
/** A template-level `import("x")`, which needs the parens to be safe to match. */
const templateImport = /(?<![.\w$])import\s*\(\s*(['"])[^'"]+\1\s*\)/g
const styleBlock = /<style\b[^>]*>[\s\S]*?<\/style>/gi
const htmlComment = /<!--[\s\S]*?-->/g

/**
 * Hand knip the imports out of a `.svelte` file. Knip ships a compiler for
 * this, but it registers it only when `svelte` is in the app's own
 * package.json, which with this stack it never is — and `svelte: true` does
 * not change that, the guard reads the dependency list, not the config. With
 * no compiler, `.svelte` files are not scanned at all, so a module imported
 * only from a component reads as an unused file.
 *
 * Only imports are returned, never whole script bodies: a body would also
 * expose `export let` props, and knip would report every prop of a Svelte 4
 * style component as an unused export.
 */
const svelteCompiler = (text) => {
  const imports = []
  for (const [, body] of text.matchAll(scriptBlock)) {
    const code = body.replace(blockComment, "").replace(lineComment, "")
    for (const [statement] of code.matchAll(importStatement)) {
      imports.push(statement)
    }
  }
  const template = text
    .replace(scriptBlock, "")
    .replace(styleBlock, "")
    .replace(htmlComment, "")
  for (const [statement] of template.matchAll(templateImport)) {
    imports.push(statement)
  }
  return imports.join(";\n")
}

/**
 * The SvelteKit stack's knip config.
 *
 * Knip's own `sveltekit` plugin cannot help here: it finds a project's routes
 * by parsing the app's `vite.config.ts` for a `sveltekit` import from
 * `@sveltejs/kit/vite`, and an app on this stack imports `createViteConfig`
 * instead. With nothing matched it contributes no entry points at all, so the
 * route and hook patterns are repeated below. Measured on a SvelteKit fixture:
 * `sveltekit: true` changes nothing, with or without this config.
 */
const createBase = () =>
  createAppKnipConfig({
    entry: [
      // Kit's own route and hook file names, as production entry points. These
      // are the same in every SvelteKit app; anything app-specific — a
      // `src/params/` matcher, a service worker, `instrumentation.server.ts` —
      // goes in the app's own config, because knip reports an entry pattern
      // that matches no file as a configuration hint.
      "src/routes/**/+{page,server,page.server,error,layout,layout.server}{,@*}.{js,ts,svelte}!",
      "src/hooks.{server,client}.{js,ts}!",
    ],
    // Makes `vite.config.ts` an entry point rather than an unused file, and
    // registers knip's `import.meta.glob` visitor.
    vite: true,
    // Kit's virtual modules have no file on disk for knip to resolve.
    ignoreUnresolved: ["^\\$app/"],
    compilers: { svelte: svelteCompiler },
  })

/** @param {KnipConfig} [overrides] */
export const createKnipConfig = (overrides) =>
  mergeKnipConfig(createBase(), overrides)

export default () => createBase()
