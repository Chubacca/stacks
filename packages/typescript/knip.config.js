/** @typedef {import("knip").KnipConfig} KnipConfig */

/**
 * Knip turns its framework plugins on by looking for the framework in the
 * *app's* package.json. A stack-based app names the stack and almost nothing
 * else, so that detection never fires and every plugin has to be enabled by
 * hand — which is what this preset is for. Everything below is a false
 * positive caused by the stack layout; nothing here suppresses a genuine
 * finding.
 */
const createBase = () => ({
  // Every tool and library an app imports or runs comes from the stack, so to
  // knip it is "used but not declared". Enumerating the stack's packages in
  // `ignoreDependencies`/`ignoreBinaries` instead was measured on a SvelteKit
  // fixture: same report, plus 28 permanent "Remove from ignoreDependencies"
  // configuration hints, because no app imports all of them. The only way to
  // silence those is `--no-config-hints`, which also hides the hints worth
  // reading ("Extension in project not registered as a compiler").
  exclude: ["unlisted", "binaries"],

  // Vitest lives in this package. Without this, test files are not entry
  // points and every `*.test.ts` and `vitest.config.ts` reads as unused.
  vitest: true,

  // Biome lives here too. The plugin resolves `extends` in biome.json, which
  // is what marks the stack as referenced in a package that reaches it only
  // through that file — otherwise the stack itself reads as an unused
  // dependency.
  biome: true,
})

/**
 * Merge caller overrides onto a knip config. Array options concatenate and
 * `compilers` merges per extension, so a layer adding an entry pattern or a
 * compiler keeps the ones underneath it; everything else is replaced.
 * @param {KnipConfig} base
 * @param {KnipConfig} [overrides]
 * @returns {KnipConfig}
 */
export const mergeKnipConfig = (base, overrides = {}) => {
  const merged = { ...base, ...overrides }
  for (const key of [
    "entry",
    "project",
    "exclude",
    "include",
    "ignoreUnresolved",
  ]) {
    const combined = [...(base[key] ?? []), ...(overrides[key] ?? [])]
    if (combined.length > 0) {
      merged[key] = combined
    }
  }
  if (base.compilers || overrides.compilers) {
    merged.compilers = { ...base.compilers, ...overrides.compilers }
  }
  return merged
}

/** @param {KnipConfig} [overrides] */
export const createKnipConfig = (overrides) =>
  mergeKnipConfig(createBase(), overrides)

export default () => createBase()
