// Behavioural assertions for the config exports.
//
// check-packages.sh proves these modules are *shaped* right — every export is a
// factory, nothing is shared between calls, every file is packed. It cannot see
// whether they still *do* the right thing, and the parts most able to break
// quietly are not the shapes: `mergeKnipConfig` decides which options
// concatenate and which replace, `createViteConfig` has two different meanings
// for `plugins`, and the `.svelte` compiler is six regexes with lookbehinds.
// Nothing in this repo runs those, because there is no test runner here and the
// bug only appears in a consuming app.
//
// Run from the repo root; `bun run check-all` does.

const failures = []

const check = (label, fn) => {
  try {
    fn()
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
  }
}

const assert = (ok, message) => {
  if (!ok) throw new Error(message)
}

const eq = (actual, expected, what) =>
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )

const base = await import("../packages/typescript/knip.config.js")
const appStack = await import("../packages/typescript-app/knip.config.js")
const svelteKnip = await import("../packages/svelte/knip.config.js")
const reactRouterKnip = await import("../packages/react-router/knip.config.js")
const svelteVite = await import("../packages/svelte/vite.config.js")
const reactRouterVite = await import("../packages/react-router/vite.config.js")

// --- mergeKnipConfig: which options combine, and which win --------------------
// Apps extend a preset through this, so an option silently replacing instead of
// concatenating would drop the stack's own entry patterns or compilers.
check("mergeKnipConfig concatenates array options", () => {
  const merged = base.mergeKnipConfig(
    { entry: ["a!"], exclude: ["unlisted"], ignoreUnresolved: ["^x"] },
    { entry: ["b!"], exclude: ["binaries"], ignoreUnresolved: ["^y"] },
  )
  eq(merged.entry, ["a!", "b!"], "entry")
  eq(merged.exclude, ["unlisted", "binaries"], "exclude")
  eq(merged.ignoreUnresolved, ["^x", "^y"], "ignoreUnresolved")
})

check("mergeKnipConfig merges compilers per extension", () => {
  const svelte = () => "svelte"
  const mdx = () => "mdx"
  const merged = base.mergeKnipConfig({ compilers: { svelte } }, { compilers: { mdx } })
  eq(Object.keys(merged.compilers).sort(), ["mdx", "svelte"], "compiler extensions")
  assert(merged.compilers.svelte === svelte, "the base compiler was replaced rather than kept")
})

check("mergeKnipConfig lets an override replace a non-array option", () => {
  const merged = base.mergeKnipConfig({ vitest: true, prisma: true }, { prisma: false })
  eq([merged.vitest, merged.prisma], [true, false], "plugin flags")
})

check("mergeKnipConfig leaves the base alone when there are no overrides", () => {
  const original = { entry: ["a!"], vitest: true }
  eq(base.mergeKnipConfig(original), original, "merge with no overrides")
})

// --- the preset chain actually composes --------------------------------------
// Each layer calls the one below it, so a broken link would silently drop the
// lower layer rather than error.
check("each knip preset carries the layers below it", () => {
  eq(base.default().exclude, ["unlisted", "binaries"], "base exclude")
  assert(base.default().vitest === true, "base does not enable the vitest plugin")
  assert(appStack.default().prisma === true, "app stack does not enable the prisma plugin")
  eq(appStack.default().exclude, ["unlisted", "binaries"], "app stack lost the base exclude")

  for (const [name, mod] of [
    ["svelte-stack", svelteKnip],
    ["react-router-stack", reactRouterKnip],
  ]) {
    const config = mod.default()
    eq(config.exclude, ["unlisted", "binaries"], `${name} lost the base exclude`)
    assert(config.vitest === true, `${name} lost the base vitest plugin`)
    assert(config.prisma === true, `${name} lost the app stack prisma plugin`)
    assert(config.vite === true, `${name} does not enable the vite plugin`)
  }

  const svelteConfig = svelteKnip.default()
  assert(
    svelteConfig.entry.some((pattern) => pattern.startsWith("src/routes/")),
    "svelte-stack ships no SvelteKit route entry pattern",
  )
  assert(
    svelteConfig.entry.every((pattern) => pattern.endsWith("!")),
    "svelte-stack entry patterns are not marked as production entries",
  )
  eq(svelteConfig.ignoreUnresolved, ["^\\$app/"], "svelte-stack ignoreUnresolved")
  assert(
    typeof svelteConfig.compilers?.svelte === "function",
    "svelte-stack registers no .svelte compiler",
  )
  assert(
    reactRouterKnip.default()["react-router"] === true,
    "react-router-stack does not enable the react-router plugin",
  )
})

// --- the .svelte compiler ----------------------------------------------------
// Must find every import, and must invent none. A false specifier shows up in a
// consuming app as an unresolved import that does not exist in the source.
const compile = svelteKnip.default().compilers.svelte
const specifiers = (source) =>
  [...compile(source).matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1])

const compilerCases = [
  ["a multiline named import", '<script lang="ts">\n import {\n a,\n b,\n } from "#lib/x"\n</script>', ["#lib/x"]],
  ["default, namespace and side-effect imports", '<script>\nimport A from "./a.svelte"\nimport * as n from "./n"\nimport "./s.css"\n</script>', ["./a.svelte", "./n", "./s.css"]],
  ["a type-only import", '<script lang="ts">import type { T } from "./t"</script>', ["./t"]],
  ["import.meta, which is not an import", '<script>\nimport { x } from "./x"\nconst m = import.meta.env.MODE + "nope"\n</script>', ["./x"]],
  ["import.meta.glob, which looks the most like a dynamic import", '<script>\nimport { x } from "./x"\nconst mods = import.meta.glob("./routes/*.ts")\n</script>', ["./x"]],
  ["prose in the template, which is not an import", '<script>import { x } from "./x"</script>\n<p>We import widgets from "elsewhere" daily.</p>', ["./x"]],
  ["a dynamic import in the template", '<script>let c</script>\n{#await import("./lazy.svelte") then m}{/await}', ["./lazy.svelte"]],
  ["a commented-out import", '<script>\n// import { gone } from "./gone"\n/* import { g2 } from "./also" */\nimport { x } from "./x"\n</script>', ["./x"]],
  ["a script tag with a src attribute", '<script src="https://cdn/x.js"></script>\n<script>import { y } from "./y"</script>', ["./y"]],
  ["a module script", '<script module>\n import { reg } from "./reg"\n export const n = 1\n</script>\n<script>let a</script>', ["./reg"]],
  ["a URL containing //, which is not a comment", '<script>\nconst u = "https://x//y"\nimport { x } from "./x"\n</script>', ["./x"]],
  ["export let props, which must not be surfaced", '<script>export let title\nimport { x } from "./x"</script>', ["./x"]],
]

for (const [label, source, expected] of compilerCases) {
  check(`.svelte compiler handles ${label}`, () => {
    eq(specifiers(source), expected, "specifiers")
    assert(
      !/\bexport\b/.test(compile(source)),
      "an export leaked into the compiled output, so knip would report it as unused",
    )
  })
}

// --- createViteConfig: the two meanings of `plugins` --------------------------
const names = (config) =>
  config.plugins.flat(Infinity).filter(Boolean).map((plugin) => plugin.name)

for (const [name, mod] of [
  ["svelte-stack", svelteVite],
  ["react-router-stack", reactRouterVite],
]) {
  check(`${name} createViteConfig appends an array of plugins`, () => {
    const mine = { name: "mine" }
    const stackOnly = names(mod.createViteConfig())
    const withMine = names(mod.createViteConfig({ plugins: [mine] }))
    eq(withMine, [...stackOnly, "mine"], "plugin order")
  })

  check(`${name} createViteConfig lets a function put a plugin first`, () => {
    const mine = { name: "mine" }
    let received
    const result = names(
      mod.createViteConfig({
        plugins: (stackPlugins) => {
          received = stackPlugins
          return [mine, ...stackPlugins]
        },
      }),
    )
    assert(Array.isArray(received), "the plugins function was not called with the stack plugins")
    assert(received.length > 0, "the plugins function received no stack plugins")
    eq(result[0], "mine", "first plugin")
    eq(result, ["mine", ...names(mod.createViteConfig())], "plugin order")
  })

  check(`${name} createViteConfig still merges non-plugin options`, () => {
    const config = mod.createViteConfig({ base: "/x", build: { sourcemap: true } })
    eq(config.base, "/x", "base")
    assert(config.build?.sourcemap === true, "build.sourcemap was dropped")
    assert(names(config).length > 0, "the stack plugins were dropped")
  })
}

check("svelte-stack createSvelteKitConfig carries the adapter and preprocessor", () => {
  const kit = svelteVite.createSvelteKitConfig()
  assert(kit.adapter != null, "no adapter")
  assert(kit.preprocess != null, "no preprocess")
})

check("svelte-stack createViteConfig passes kit options through", () => {
  // The SvelteKit plugin is the only consumer, so the observable effect is that
  // it builds at all rather than throwing on an unknown option.
  assert(
    names(svelteVite.createViteConfig({ kit: { outDir: ".kit-out" } })).length > 0,
    "passing kit options produced no plugins",
  )
})

if (failures.length > 0) {
  for (const failure of failures) console.log(failure)
  process.exit(1)
}
console.log(`${compilerCases.length + 12} config contract assertions passed`)
