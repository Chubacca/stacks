// Re-exported so a consuming app can point at the stack it actually depends on.
// Biome and Vitest both live in @chuvenger/typescript-stack, two levels down the
// dependency chain, and reaching through it only works while the installer
// happens to hoist. See biome.json for the same reasoning.
export {
  createVitestConfig,
  default,
} from "@chuvenger/typescript-stack/vitest.config"
