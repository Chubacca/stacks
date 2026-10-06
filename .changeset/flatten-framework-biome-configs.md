---
"@chuvenger/react-router-stack": minor
---

**Fix: the framework `biome.json` files gave consumers nothing but their own
keys.** `@chuvenger/react-router-stack/biome.json` reached the base config by
extending `@chuvenger/typescript-stack/biome.json`, but Biome resolves exactly
one level of `extends` — a config reached *through* an extends has its own
`extends` silently ignored. So an app that named only the framework config got
that file's `linter.domains` and nothing else: no VCS ignore file, no formatter
settings, none of the base rule tweaks. Measured on Biome 2.5.15 with three
local configs, `a extends b` reports VCS enabled and `c extends a extends b`
does not, with no diagnostic in between. Downstream it looked like 174 files
linted instead of 144, because the gitignore went unread, and the formatter
falling back to tabs.

Both framework configs now inline the base rather than extending it, so one
entry is enough again:

```json
{ "extends": ["@chuvenger/react-router-stack/biome.json"] }
```

Apps that worked around this by extending both configs, base first, do not have
to change in lockstep — that form still resolves to the same config. Drop the
base entry whenever convenient.

Same fix in `@chuvenger/svelte-stack`. The flattened files are generated from
`packages/typescript/biome.json` by `.github/build-biome-configs.sh`, and
`check-all` fails if they drift from it.
