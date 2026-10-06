---
"@chuvenger/typescript-stack": major
"@chuvenger/typescript-app-stack": major
"@chuvenger/svelte-stack": major
"@chuvenger/react-router-stack": major
---

**1.0.0, so a caret range picks up the next release.**

Everything was `0.x`, where a caret is pinned to the minor: `^0.7.0` does not
accept `0.8.0`. Since every release of this group is a minor — `0.x` has no
other slot for a breaking change — every release meant hand-editing the version
in every consuming app, which is the opposite of what a stack is for. At 1.0.0
`^1.0.0` accepts every subsequent minor and patch, and a breaking change
announces itself by needing the range widened.

**What a consuming app changes.** Move the pin to a caret once, and stop
touching it:

```jsonc
{ "dependencies": { "@chuvenger/svelte-stack": "^1.0.0" } }
```

The other breaking changes in this release are the two in `svelte-stack`, both
documented separately: the stripped `tsconfig.json` and `createSvelteKitConfig`.

### Also: the release check now names packages

0.7.0 and 0.8.0 both read "No changes in this release" in
`typescript-stack`'s changelog and "Patch Changes — @chuvenger/typescript-stack"
in `svelte-stack`'s, for releases that changed the files both of those packages
ship. The changesets were not empty — each named only
`"@chuvenger/react-router-stack"`. Because the group is `fixed`, that is enough
to bump all four, so nothing complained; but the changelog entry only lands on
the packages a changeset lists, and the other three got a dependency-bump stub.

`check-packages.sh` now compares the packages changed since the merge base
against the packages named in the frontmatter of the pending changesets, and
fails on any that changed without being named.
