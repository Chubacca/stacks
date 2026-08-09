#!/usr/bin/env bash
# Publish every workspace package that isn't already on npm.
# Uses `bun publish`, which rewrites `workspace:*` to the concrete version
# in the packed tarball (plain `npm publish` / `changeset publish` do not).
set -euo pipefail

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
