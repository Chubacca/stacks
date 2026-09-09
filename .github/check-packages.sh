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

# --- 3. Everything package.json points at must actually ship ------------------
# `exports` targets and bundled agent skills are resolved by consumers out of
# the tarball. A rename, or a `files` field added later, silently breaks them
# with no error on this side of the publish.
echo "Checking exports and skill paths are packed..."
for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  refs=$(jq -r '
    [ (.exports // {} | .. | strings | select(startswith("./"))),
      ((.agents.skills // []) | .[].path) ]
    | .[] | sub("^\\./"; "")
  ' "$dir/package.json" | sort -u)
  [ -z "$refs" ] && continue

  packed=$(cd "$dir" && bun publish --dry-run --access public </dev/null 2>&1 \
    | grep '^packed ' | sed 's/^packed [^ ]* //')
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

# --- 4. Dependency changes must carry a changeset -----------------------------
# Nothing here is versioned by hand; a dep bump with no changeset is a change
# that never reaches npm.
if [ -n "${CHECK_CHANGESET_BASE:-}" ]; then
  echo "Checking for a changeset..."
  if git diff --quiet "$CHECK_CHANGESET_BASE"...HEAD -- packages/; then
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
