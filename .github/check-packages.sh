#!/usr/bin/env bash
# Pre-merge checks for the published stack packages.
#
# These packages ship almost no code — a curated dependency set and a handful
# of config files. So the things that break are not compile errors, they are
# metadata defects that only surface in a downstream project weeks later: a
# peer range that no longer lines up, a config file that stopped being packed.
# Every check below is therefore about the *published artifact*, not the source.
#
# Deliberately NOT -e: collect every failure in one run rather than stopping at
# the first, so a red build tells you everything that is wrong.
set -uo pipefail

fail=0
err() { printf "FAIL: %b\\n" "$*" >&2; fail=1; }
ok()  { echo "  ok: $*"; }

# --- 1. The dependency set must resolve without complaint ---------------------
# The whole product is "these versions work together", so an install warning is
# the product being broken. `better-auth` pulling a kysely that
# `prisma-extension-kysely` rejects showed up here and nowhere else.
echo "Checking the dependency set installs cleanly..."
# A pre-existing lockfile replays the previous resolution and stays silent, so
# the warning we care about only appears on a cold resolve. bun.lock is
# gitignored and never committed, so removing it costs nothing.
rm -f bun.lock
install_out=$(bun install 2>&1) || err "bun install failed:\n$install_out"
install_warnings=$(grep '^warn:' <<<"$install_out" | sort -u || true)
if [ -n "$install_warnings" ]; then
  err "bun install reported warnings:"
  sed 's/^/    /' <<<"$install_warnings" >&2
else
  ok "no install warnings"
fi

# --- 2. Internal deps must stay on the workspace protocol ---------------------
# A hand-written version here would go stale the moment the group bumps, which
# is the failure mode that shipped three releases pinned to their predecessor.
echo "Checking internal deps use workspace:*..."
for dir in packages/*/; do
  bad=$(jq -r '
    (.dependencies // {}) | to_entries
    | map(select(.key | startswith("@chuvenger/")))
    | map(select(.value | startswith("workspace:") | not))
    | .[] | "\(.key) = \(.value)"
  ' "$dir/package.json")
  if [ -n "$bad" ]; then
    err "$dir pins an internal dep to a literal version (use workspace:*):"
    sed 's/^/    /' <<<"$bad" >&2
  fi
done
[ "$fail" -eq 0 ] && ok "all internal deps on workspace:*"

# --- 3. Everything consumers resolve out of the tarball must actually ship ----
# `exports` and `bin` targets, and the `skills/<name>/SKILL.md` files that
# link-stack-skills finds in node_modules. A rename, or a `files` field added
# later, silently breaks them with no error on this side of the publish — and a
# missing bin fails the consumer's `prepare`, so their whole install.
echo "Checking exports, bins and skills are packed..."
for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  # The Agent Skills spec requires both name and description in the
  # frontmatter; an agent may not load a skill missing either, and nothing on
  # this side of the publish would notice.
  for skill in "$dir"skills/*/SKILL.md; do
    [ -e "$skill" ] || continue
    front=$(awk 'NR==1 && $0!="---" {exit} NR>1 && $0=="---" {exit} NR>1' "$skill")
    for key in name description; do
      grep -q "^$key:" <<<"$front" || err "$name: ${skill#"$dir"} frontmatter has no $key"
    done
  done
  # npm silently rewrites package.json as it publishes and only *warns*. A
  # `bin` path written as "./x.js" is deleted outright rather than normalised
  # — so the package ships with no bin, which fails the consumer's `prepare`
  # and so their whole install. `bun publish` rewrote that form instead of
  # dropping it, so the defect only appeared on moving to npm, and only in a
  # warning nothing was reading. Treat any correction as a failure: the
  # published manifest should be the one in the repo.
  corrections=$(cd "$dir" && npm publish --dry-run --access public </dev/null 2>&1 \
    | grep '^npm warn publish ' || true)
  if grep -q 'auto-corrected' <<<"$corrections"; then
    err "$name: npm would rewrite package.json on publish:"
    sed 's/^npm warn publish /    /' <<<"$corrections" >&2
  fi

  # Both spellings reach the tarball, and `bin` must NOT use "./" (above), so
  # strip the prefix rather than requiring it.
  refs=$( { jq -r '[.exports, .bin] | .. | strings | sub("^\\./"; "")' \
              "$dir/package.json"
            (cd "$dir" && ls skills/*/SKILL.md 2>/dev/null)
          } | sort -u)
  [ -z "$refs" ] && continue

  # Ask the real publisher what it would pack. `npm publish` does the release
  # (bun cannot authenticate by OIDC), so modelling the tarball with bun's
  # packer here would be checking something nothing actually ships.
  packed=$(cd "$dir" && npm pack --dry-run --json 2>/dev/null \
    | jq -r '.[0].files[].path')
  if [ -z "$packed" ]; then
    err "$name: could not determine packed file list"
    continue
  fi

  while IFS= read -r ref; do
    [ -e "$dir/$ref" ] || { err "$name: $ref is referenced but does not exist"; continue; }
    # A directory ships as its contents, so match on the prefix instead.
    if [ -d "$dir/$ref" ]; then
      grep -q "^$ref/" <<<"$packed" || err "$name: $ref/ exists but nothing under it is packed"
    else
      grep -qx "$ref" <<<"$packed" || err "$name: $ref exists but is not in the published tarball"
    fi
  done <<<"$refs"
  ok "$name: $(wc -l <<<"$refs" | tr -d ' ') referenced path(s) present and packed"
done

# --- 4. Config exports must build their instances per call --------------------
# Vite re-evaluates a project's own vite.config.ts on every config load, but
# these modules are bare node_modules imports, so Node's ESM cache evaluates
# them exactly once per process. A base held in module scope is therefore the
# *same* plugin instances for every load, and `reactRouter()` carries build
# state — the server build inherits the instance that just finished the client
# build and dies with "Expected build manifest". Nothing else here would notice:
# in this repo the config is a local file that does get re-evaluated, so the bug
# only exists once the package is installed.
#
# "Plugins" is too narrow a test for that. `svelteKitConfig` held `adapter()`
# and `vitePreprocess()` at module scope and was spread *into* a per-call base,
# so the base looked fresh while the instances inside it were shared — and
# `@sentry/sveltekit` calls `adapter.adapt()` on every config resolve. So this
# compares every object a config exposes directly, not only `plugins`: the
# config's own values, and the elements of any array among them (which is where
# plugins live, `tailwindcss()` returning an array of them). It deliberately
# stops there rather than recursing into plugin internals, where a
# third-party module-scope constant would be shared quite legitimately.
echo "Checking config exports build fresh instances per call..."
for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  configs=$(jq -r '(.exports // {}) | .. | strings | select(endswith(".config.js"))' \
    "$dir/package.json" | sort -u)
  [ -z "$configs" ] && continue
  while IFS= read -r config; do
    problems=$(cd "$dir" && CONFIG="$config" node --input-type=module --eval '
      const mod = await import(process.env.CONFIG)

      // Every object a config hands the caller: its own values, and the
      // elements of any array among them, flattened.
      const exposed = (config) => {
        const out = []
        const visit = (value, isTop) => {
          if (value === null || typeof value !== "object") return
          if (Array.isArray(value)) {
            out.push(value)
            for (const item of value) visit(item, false)
            return
          }
          out.push(value)
          if (!isTop) return
          for (const item of Object.values(value)) visit(item, false)
        }
        visit(config, true)
        return out
      }
      const label = (value) =>
        Array.isArray(value) ? "array" : (value.name ?? value.constructor?.name ?? "object")

      // Every export has to be a factory, the default one included. An
      // exported *object* is built at module scope by definition, so it can
      // never be per-load — and if a factory then spreads it, as `createBase`
      // spread `svelteKitConfig`, the config it returns looks fresh while the
      // instances inside it are shared. That is invisible to the walk below,
      // which stops before plugin internals, and a spread plugin option ends
      // up exactly there.
      for (const [key, value] of Object.entries(mod)) {
        if (typeof value === "function") continue
        const kind = Array.isArray(value) ? "an array" : value === null ? "null" : `${/^[aeiou]/.test(typeof value) ? "an" : "a"} ${typeof value}`
        console.log(`${key} is ${kind}, expected a factory`)
      }
      for (const [key, fn] of Object.entries(mod)) {
        if (typeof fn !== "function") continue
        let a, b
        try { a = exposed(fn({})); b = new Set(exposed(fn({}))) } catch { continue }
        const shared = a.filter((value) => b.has(value)).map(label)
        if (shared.length > 0) {
          console.log(`${key}() reuses ${shared.length} instance(s) between calls: ${shared.slice(0, 3).join(", ")}`)
        }
      }
    ' 2>&1)
    if [ -n "$problems" ]; then
      err "$name: $config does not build a fresh config per call:"
      sed 's/^/    /' <<<"$problems" >&2
    else
      ok "$name: $config builds a fresh config per call"
    fi
  done <<<"$configs"
done

# --- 5. Config exports must still behave as documented -----------------------
# Section 4 proves these modules are shaped right; it cannot see whether they
# still do the right thing. The parts able to break quietly are not the shapes:
# `mergeKnipConfig` decides which options concatenate and which replace,
# `createViteConfig` gives `plugins` two different meanings, and the `.svelte`
# compiler is six regexes with lookbehinds whose failure mode is inventing a
# module specifier that is nowhere in the source. There is no test runner in
# this repo, and the bug only shows up in a consuming app.
echo "Checking config exports behave as documented..."
if contract_failures=$(node ./.github/check-config-contracts.mjs 2>&1); then
  ok "${contract_failures}"
else
  err "config exports do not behave as documented:"
  sed 's/^/    /' <<<"$contract_failures" >&2
fi

# --- 6. Framework Biome configs must stay flattened and current --------------
# Biome resolves exactly one level of `extends`, dropping the grandparent
# without a warning, so a framework config cannot reach the base by extending
# it — an app naming only the framework config would get its keys and nothing
# else. The framework configs therefore inline the base and are generated;
# this fails if the base moved and they were not regenerated.
echo "Checking framework Biome configs are current..."
if biome_drift=$(bash ./.github/build-biome-configs.sh --check 2>&1); then
  ok "framework biome.json files match the base"
else
  err "framework Biome configs are stale:"
  sed 's/^/    /' <<<"$biome_drift" >&2
fi

# --- 7. Every changed package must be named in a changeset --------------------
# Nothing here is versioned by hand; a change with no changeset is a change
# that never reaches npm. Naming *some* package is not enough either: the
# version group is `fixed`, so one changeset bumps all four whatever it names,
# but the changelog entry only lands on the packages it lists. 0.7.0 and 0.8.0
# both shipped real changes to packages/svelte and named only
# react-router-stack, so `svelte-stack`'s changelog read "Patch Changes —
# @chuvenger/typescript-stack@0.7.0" and `typescript-stack`'s read "No changes
# in this release", for releases that changed both of their shipped files.
#
# CI passes the PR's base branch. Locally there is nothing to pass, so fall back
# to origin/main — `bun run check` should behave the same on a laptop as on CI.
base="${CHECK_CHANGESET_BASE:-}"
if [ -z "$base" ] && git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  base=origin/main
fi
if [ -n "$base" ] && git rev-parse --verify -q "$base" >/dev/null 2>&1; then
  echo "Checking for a changeset..."
  # Diff from the merge base *without* ...HEAD, so uncommitted work counts too.
  # On CI those are identical; locally it means the check sees the change you
  # are about to commit rather than only what is already committed.
  merge_base=$(git merge-base "$base" HEAD)
  # CHANGELOG.md is written *by* `changeset version`, so a change to it is the
  # release, not something a changeset should have to describe.
  changed_dirs=$(git diff --name-only "$merge_base" -- packages/ \
    | grep -v '/CHANGELOG\.md$' | cut -d/ -f2 | sort -u)
  changesets=$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md')
  if [ -z "$changed_dirs" ]; then
    ok "no package changes, changeset not required"
  elif [ -z "$changesets" ]; then
    err "packages/ changed but no changeset was added (see .claude/skills/version-bump)"
  else
    # Only the frontmatter names packages; the body is prose that may well
    # mention a package it is not bumping. One awk per file, because the
    # frontmatter is delimited and the state does not carry across files.
    named=$(while IFS= read -r changeset; do
      awk 'FNR==1 {inside=0} /^---$/ {inside++; next} inside==1' "$changeset"
    done <<<"$changesets" \
      | sed -n 's/^[[:space:]]*"\{0,1\}\(@[^":]*\)"\{0,1\}"\{0,1\}[[:space:]]*:.*/\1/p' \
      | sort -u)
    missing=""
    while IFS= read -r changed_dir; do
      pkg=$(jq -r .name "packages/$changed_dir/package.json")
      grep -qxF "$pkg" <<<"$named" \
        || missing="$missing    $pkg (packages/$changed_dir)\n"
    done <<<"$changed_dirs"
    if [ -n "$missing" ]; then
      err "changed but named in no changeset, so the entry would land on another package's changelog:"
      printf "%b" "$missing" >&2
    else
      ok "every changed package is named in a changeset"
    fi
  fi
fi

echo
if [ "$fail" -eq 0 ]; then echo "All package checks passed."; else echo "Package checks failed." >&2; fi
exit "$fail"
