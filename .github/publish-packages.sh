#!/usr/bin/env bash
# Publish every workspace package that isn't already on npm.
set -euo pipefail

# --- Why this script pins internal deps itself --------------------------------
# Internal deps are declared `workspace:*`. `bun publish` does rewrite those to
# a concrete version in the packed tarball — but it reads that version from
# bun.lock, NOT from package.json, and `bun install` never refreshes a
# workspace entry's `version` field afterwards (not even with --force). CI
# installs before `changeset version` bumps, so the lockfile is always one
# release stale at publish time. Leaning on that rewrite shipped 0.1.3, 0.2.0
# and 0.2.1 each pinned to its PREDECESSOR, which silently held consumers two
# stacks back. So: substitute the versions ourselves, from the package.json
# files `changeset version` just wrote, and leave bun nothing to infer.

backup=$(mktemp -d)
for dir in packages/*/; do
  cp "$dir/package.json" "$backup/$(basename "${dir%/}").json"
done
restore() {
  for dir in packages/*/; do
    cp "$backup/$(basename "${dir%/}").json" "$dir/package.json"
  done
  rm -rf "$backup"
}
trap restore EXIT

# name -> version, straight from the working tree.
versions=$(jq -s 'map({(.name): .version}) | add' packages/*/package.json)

for dir in packages/*/; do
  jq --argjson v "$versions" '
    if has("dependencies") then
      .dependencies |= with_entries(
        if (.value | startswith("workspace:"))
        then .value = ($v[.key] // error("no workspace version for " + .key))
        else . end
      )
    else . end
  ' "$dir/package.json" > "$dir/package.json.tmp"
  mv "$dir/package.json.tmp" "$dir/package.json"

  # Belt and braces: nothing may reach npm still speaking workspace protocol.
  if grep -q '"workspace:' "$dir/package.json"; then
    echo "ERROR: unresolved workspace: dep left in $dir/package.json" >&2
    exit 1
  fi
done

for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  ver=$(jq -r .version "$dir/package.json")

  if npm view "$name@$ver" version >/dev/null 2>&1; then
    echo "Skipping $name@$ver (already published)"
  else
    echo "Publishing $name@$ver"
    (cd "$dir" && bun publish --access public)
  fi
done

# --- Tripwire -----------------------------------------------------------------
# Read back what the registry actually stored. The bug above was invisible for
# three releases precisely because nothing ever checked the published metadata;
# this fails the workflow loudly if an internal pin lands on anything other
# than the version published alongside it, whatever the cause.
echo "Verifying published internal pins..."
failed=0
for dir in packages/*/; do
  name=$(jq -r .name "$dir/package.json")
  ver=$(jq -r .version "$dir/package.json")

  deps=""
  for attempt in 1 2 3 4 5; do
    # Registry reads go through a CDN and can lag a publish by a few seconds.
    if deps=$(npm view "$name@$ver" dependencies --json 2>/dev/null) && [ -n "$deps" ]; then
      break
    fi
    sleep 5
  done

  if [ -z "$deps" ]; then
    echo "ERROR: could not read $name@$ver back from the registry" >&2
    failed=1
    continue
  fi

  mismatches=$(
    jq -r --arg ver "$ver" '
      to_entries
      | map(select(.key | startswith("@chuvenger/")))
      | map(select(.value != $ver))
      | .[] | "  \(.key) is \(.value), expected \($ver)"
    ' <<<"$deps"
  )
  if [ -n "$mismatches" ]; then
    echo "ERROR: $name@$ver published with stale internal pins:" >&2
    echo "$mismatches" >&2
    failed=1
  else
    echo "  OK $name@$ver"
  fi
done

exit "$failed"
