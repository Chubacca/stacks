---
"@chuvenger/typescript-stack": minor
"@chuvenger/typescript-app-stack": minor
"@chuvenger/svelte-stack": minor
"@chuvenger/react-router-stack": minor
---

**Pin `^0` to stop hand-editing the version every release, and the release
check now names packages.**

### Pin `^0`, not `^0.8.0`

A caret on a `0.x` version is locked to the minor: `^0.7.0` means
`>=0.7.0 <0.8.0`, so it does not accept `0.8.0`. Since every release of this
group is a minor — `0.x` has no other slot for a breaking change — a consumer on
`^0.8.0` has to edit the range by hand every single time, which is the opposite
of what a stack is for.

`^0` (or equivalently `0.x`) accepts every `0.minor`:

```jsonc
{ "dependencies": { "@chuvenger/svelte-stack": "^0" } }
```

Measured with semver: `^0.7.0` rejects `0.8.0`; `^0` accepts `0.8.0` and
`0.9.0` and stops at `1.0.0`.

The trade-off is explicit and worth stating: because a `0.x` minor is also the
breaking slot, `^0` picks breaking changes up automatically too. Four of the
eleven releases so far carried one — 0.2.0, 0.5.0, 0.6.0 and 0.7.0 — and this
release carries three. So read the changelog on upgrade; the range will not warn
you. Staying on an exact minor and editing it deliberately is the other valid
choice, and declaring 1.0.0 (where a caret spans minors and a major is the
signal) is the third — deliberately not taken yet.

### The release check now names packages

0.7.0 and 0.8.0 both read "No changes in this release" in `typescript-stack`'s
changelog and "Patch Changes — @chuvenger/typescript-stack" in `svelte-stack`'s,
for releases that changed the files both of those packages ship. The changesets
were not empty — each named only `"@chuvenger/react-router-stack"`. Because the
version group is `fixed`, that is enough to bump all four, so nothing
complained; but the changelog entry only lands on the packages a changeset
lists, and the other three got a dependency-bump stub.

`check-packages.sh` now compares the packages changed since the merge base
against the packages named in the frontmatter of the pending changesets, and
fails on any that changed without being named.

**What a consuming app changes.** Move the range to `^0` once, and stop
touching it.
