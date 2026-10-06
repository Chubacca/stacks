# stacks

Publishes the `@chuvenger/*` stack packages to npm. A package here is a curated
dependency set plus a few config files — there is no application code, no tests,
no database and no schema in this repo. The one script is `link-stack-skills`
(`packages/typescript-app/link-skills.js`), which links bundled agent skills
into consuming apps. Checks are therefore about the *published artifact*, not
the source.

## Before committing

```bash
bun run check-all
```

This is the same script CI runs on every PR (`.github/check-packages.sh`), and
it must pass with zero failures. It verifies that:

- the dependency set resolves with no warnings, on a cold lockfile
- internal deps stay on `workspace:*`
- every `exports` and `bin` target and bundled skill is present in the packed
  tarball, and each skill's frontmatter has a `name` and `description`
- each exported Vite/Vitest config builds fresh plugin instances per call
- the framework `biome.json` files are current with the base they were
  generated from
- a change under `packages/` carries a changeset

It deletes `bun.lock` first, because an existing lockfile replays the previous
resolution and hides peer conflicts. That file is gitignored and never
committed, so this is safe — your lockfile just gets regenerated.

There is nothing else to run. No test, lint or typecheck step exists, and the
usual pre-commit hunts (test gaps for changed functions, missing DB indexes,
Prisma schema drift) have nothing to apply to in this repo.

## Biome configs

`packages/typescript/biome.json` is the only one written by hand. The framework
stacks' `biome.json` files are **generated** from it:

```bash
bash .github/build-biome-configs.sh          # rewrite them
bash .github/build-biome-configs.sh --check  # what check-all runs
```

They inline the base instead of extending it because Biome resolves exactly one
level of `extends` — a config reached *through* an extends has its own
`extends` silently ignored, with no warning. So `react-router-stack/biome.json`
extending the base gives an app that names only the framework config a config
with the framework's keys and nothing else: no VCS ignore file, no formatter
settings, none of the base rule tweaks. Measured on Biome 2.5.15 with three
local files — `a extends b` reports VCS enabled, `c extends a extends b` does
not. Downstream that looked like 174 files linted instead of 144 and the
formatter reverting to tabs.

Consumers therefore name one config, the stack they depend on:

```json
{ "extends": ["@chuvenger/react-router-stack/biome.json"] }
```

Per-framework additions (currently just the React domain) go in the `overlay`
function in the generator, not in the generated file. Editing a generated
`biome.json` by hand fails `check-all` on the next run.

## Versioning

Changeset-driven with a fixed group: all four packages bump together, and CI
does the bump on merge to `main`. Add a changeset; never edit a `version` field
by hand and never run `changeset version` locally. See
`.claude/skills/version-bump`.

## Publishing

Publishing authenticates by **npm trusted publishing (OIDC)** — there is no
`NPM_TOKEN` and no `.npmrc`. The release job carries `id-token: write` and the
npm CLI exchanges that for publish rights, which also gets provenance
attestations for free. Each of the four packages has a trusted publisher
configured on npmjs.com pointing at this repo and `publish.yml`; renaming that
workflow file breaks the release until the npm side is updated to match.

This is why the publish step is `npm publish` and not `bun publish`: bun cannot
do OIDC, it only reads a token out of an `.npmrc`. Bun still does the install
and runs changesets; only the publish call is npm. `check-packages.sh` models
the tarball with `npm pack --dry-run` for the same reason — it should ask
whatever actually packs the release.

`.github/publish-packages.sh` also resolves `workspace:*` internal deps itself
rather than leaving it to the publisher. This is deliberate and should not be
"simplified" back. The rule was learned under `bun publish`, which takes that
version from `bun.lock`, not `package.json` — and CI installs before `changeset
version` bumps, so the lockfile was always one release stale at publish time.
Relying on it shipped 0.1.3, 0.2.0 and 0.2.1 each pinned to its predecessor,
holding consumers two stacks behind. A post-publish step reads the metadata back
off the registry and fails the release if an internal pin disagrees with the
version published beside it.
