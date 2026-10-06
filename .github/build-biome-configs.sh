#!/usr/bin/env bash
# Generate each framework stack's biome.json by flattening the base config.
#
# Biome resolves exactly one level of `extends`: a config reached *through* an
# extends has its own `extends` silently ignored. So an app that names only
# @chuvenger/react-router-stack/biome.json gets that file's own keys and
# nothing else — no VCS ignore file, no formatter settings, none of the base
# rule tweaks. Measured on Biome 2.5.15 with three local configs:
#
#     a extends b           -> VCS enabled: true
#     c extends a extends b -> VCS enabled: false
#
# There is no warning; the grandparent is just dropped. A framework config that
# merely extends the base is therefore useless to the consumer it exists for,
# which showed up downstream as 174 files linted instead of 144 (the gitignore
# went unread) and the formatter falling back to tabs.
#
# So the framework configs inline the base instead of extending it, and are
# generated here so the three copies cannot drift. Run with --check to verify
# the committed files are current (check-packages.sh does); run with no
# arguments to rewrite them after editing the base.
set -euo pipefail

cd "$(dirname "$0")/.."
base=packages/typescript/biome.json

# What each framework stack adds on top of the base. Biome *replaces* rather
# than merges `linter.domains` across an extends, but this is a plain deep
# merge of the two files, so the base's domains survive alongside these.
overlay() {
  case "$1" in
    # React rules are opt-in: Biome only auto-detects a domain from the
    # *consuming* app's package.json, and React arrives as a stack dependency
    # rather than one the app declares, so detection leaves them off.
    react-router) echo '{ "linter": { "domains": { "react": "recommended" } } }' ;;
    # Biome has no Svelte domain. This config is the base verbatim, and exists
    # only so a Svelte app can extend the stack it actually depends on.
    svelte) echo '{}' ;;
    *) echo "no overlay defined for $1" >&2; return 1 ;;
  esac
}

check=0
[ "${1:-}" = "--check" ] && check=1

stale=0
for pkg in react-router svelte; do
  out="packages/$pkg/biome.json"
  generated=$(jq --argjson overlay "$(overlay "$pkg")" '. * $overlay' "$base")
  if [ "$check" -eq 1 ]; then
    # `|| true` because a difference is diff's exit 1, which pipefail plus
    # set -e would turn into an abort — and then a second stale config would
    # never be reported.
    drift=$(diff -u "$out" - <<<"$generated" || true)
    if [ -n "$drift" ]; then
      echo "$out is out of date with $base:" >&2
      sed 's/^/    /' <<<"$drift" >&2
      stale=1
    fi
  else
    printf '%s\n' "$generated" > "$out"
    echo "  wrote $out"
  fi
done

if [ "$stale" -eq 1 ]; then
  echo "Run: bash .github/build-biome-configs.sh" >&2
  exit 1
fi
