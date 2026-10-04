---
"@chuvenger/typescript-app-stack": patch
---

Write `bin` targets without a leading `./`, so the `link-stack-skills` command
survives publication.

npm rewrites `package.json` as it publishes and only *warns* about what it
changed. A `bin` path spelled `"./link-skills.js"` is not normalised but
deleted outright — the package ships with no `bin` at all, which fails the
consuming install's `prepare`. `bun publish` rewrote that spelling instead of
dropping it, so the defect appeared only on moving the release to npm for
trusted publishing, and only in a warning nothing was reading.

`check-packages.sh` now fails on any correction npm would make to a
`package.json`, so the published manifest has to be the one in the repo. 0.5.0
was never published, so no release carried the broken `bin`.
