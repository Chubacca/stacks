---
"@chuvenger/typescript-app-stack": minor
---

Fix internal stack dependencies being published one version behind. Releases relied on `bun publish` rewriting `workspace:*`, but bun takes that version from `bun.lock` rather than `package.json`, and CI installs before `changeset version` bumps — so 0.1.3, 0.2.0 and 0.2.1 each shipped pinned to its predecessor (`react-router-stack@0.2.1` → `typescript-app-stack@0.2.0` → `typescript-stack@0.1.3`). Consumers were silently held two stacks back from the tooling each release advertised, most visibly on Vitest. The release script now resolves internal versions itself and verifies the published metadata against the registry.

Pin `kysely` to `^0.28.17` in the app stack. `better-auth` pulls in `kysely@0.29.x`, which `prisma-extension-kysely@4.0.0` still rejects (`^0.27.0 || ^0.28.0`), producing an `incorrect peer dependency` warning on install. `0.28.17` satisfies both and dedupes to a single copy; drop the pin once `prisma-extension-kysely` widens its peer range.
