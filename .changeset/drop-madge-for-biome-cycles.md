---
"@chuvenger/typescript-stack": minor
---

Drop `madge` and detect import cycles with Biome's `suspicious/noImportCycles`
instead.

`madge@8.0.0` is the current `latest` and was published 2024-08-05; the newest
commit on its default branch is that release. It still pins `commander@^7`,
`ora@^5` and `chalk@^4`, and installing it pulls 120 packages and 48 MB —
including its own `typescript@5.9.3`, via `dependency-tree` → `precinct`, so
every consumer of this stack carried a second TypeScript two majors behind the
`^7.0.2` it actually builds with.

Biome 2.5 ships `noImportCycles` in `suspicious` (promoted out of nursery), and
it reports the whole resolution path per offending import rather than a flat
list of cycles. The other thing madge was here for, orphaned files, is already
Knip's job.

`noImportCycles` is not part of Biome's `recommended` set, so `biome.json` now
enables it explicitly at `error`. Consumers inheriting that config will see
cycles they previously had no check for fail `biome lint`. The graphviz output
of `madge --image` has no replacement; reach for `bunx madge` when a picture of
the graph is what you want.
