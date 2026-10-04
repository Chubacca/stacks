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
- a change under `packages/` carries a changeset

It deletes `bun.lock` first, because an existing lockfile replays the previous
resolution and hides peer conflicts. That file is gitignored and never
committed, so this is safe — your lockfile just gets regenerated.

There is nothing else to run. No test, lint or typecheck step exists, and the
usual pre-commit hunts (test gaps for changed functions, missing DB indexes,
Prisma schema drift) have nothing to apply to in this repo.

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
