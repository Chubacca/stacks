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

# --- 4. Config exports must build their plugins per call ----------------------
# Vite re-evaluates a project's own vite.config.ts on every config load, but
# these modules are bare node_modules imports, so Node's ESM cache evaluates
# them exactly once per process. A base held in module scope is therefore the
# *same* plugin instances for every load, and `reactRouter()` carries build
# state — the server build inherits the instance that just finished the client
# build and dies with "Expected build manifest". Nothing else here would notice:
# in this repo the config is a local file that does get re-evaluated, so the bug
# only exists once the package is installed.
echo "Checking config exports build fresh plugins per call..."
for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  configs=$(jq -r '(.exports // {}) | .. | strings | select(endswith(".config.js"))' \
    "$dir/package.json" | sort -u)
  [ -z "$configs" ] && continue
  while IFS= read -r config; do
    problems=$(cd "$dir" && CONFIG="$config" node --input-type=module --eval '
      const mod = await import(process.env.CONFIG)
      const flat = (c) => (c?.plugins ?? []).flat(Infinity).filter(Boolean)
      // The default export has to be a factory too: an exported config *object*
      // is built at module scope by definition, so it can never be per-load.
      if (typeof mod.default !== "function") {
        console.log(`default export is ${typeof mod.default === "object" ? "an" : "a"} ${typeof mod.default}, expected a factory`)
      }
      for (const [key, fn] of Object.entries(mod)) {
        if (typeof fn !== "function") continue
        let a, b
        try { a = flat(fn({})); b = flat(fn({})) } catch { continue }
        const shared = a.filter((p, i) => p === b[i]).map((p) => p.name)
        if (shared.length > 0) {
          console.log(`${key}() reuses ${shared.length} plugin instance(s) between calls: ${shared.slice(0, 3).join(", ")}`)
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

# --- 5. Dependency changes must carry a changeset -----------------------------
# Nothing here is versioned by hand; a dep bump with no changeset is a change
# that never reaches npm.
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
  if git diff --quiet "$merge_base" -- packages/; then
    ok "no package changes, changeset not required"
  elif ls .changeset/*.md >/dev/null 2>&1 \
       && [ -n "$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md')" ]; then
    ok "changeset present"
  else
    err "packages/ changed but no changeset was added (see .claude/skills/version-bump)"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then echo "All package checks passed."; else echo "Package checks failed." >&2; fi
exit "$fail"
