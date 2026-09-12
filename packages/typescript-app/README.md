# @chuvenger/typescript-app-stack

Web app stack: Tailwind, Zod, Prisma, better-auth, dotenv.

## Bundled agent skills

This package ships coding-agent skills alongside its code, following the
[Agent Skills](https://agentskills.io) open standard. Each skill is a
`skills/<name>/SKILL.md` under [`skills/`](./skills).

| Skill | What it does |
| --- | --- |
| [`prisma-shadow-migration`](./skills/prisma-shadow-migration) | Create a Prisma migration that captures schema changes already applied to the dev DB via `db push`, using the shadow DB so the dev DB is never reset. |

### Using the skills in a consuming app

Agents don't look in `node_modules`, so the skills have to be linked into your
repo's agent directories. The stacks ship a `link-stack-skills` command that
does this. Run it from your app's `prepare` script so it re-runs on every
install:

```json
{
  "scripts": {
    "prepare": "link-stack-skills"
  }
}
```

On `bun install` it symlinks every skill shipped by the `@chuvenger/*` stacks
your app depends on into `.claude/skills/<name>` (Claude Code) and
`.agents/skills/<name>` (Codex) at the repo root. The links point into
`node_modules`, so skills update with the stack version and nothing is copied.
It also writes a `.gitignore` into each of those directories that covers its
own links, so there's nothing to commit and nothing to add to your own
`.gitignore`.

It only ever touches its own links. A skill of yours with the same name is
left alone with a warning, and links to skills a newer stack version dropped
are removed.

The command comes from whichever stack your app depends on directly
(`react-router-stack`, `svelte-stack` or this package), so it's there under
bun's hoisted and isolated linkers and with `bun install --production`.

**In a bun workspace**, bun only runs the root package's `prepare`, so point it
at the app that depends on the stack:

```json
{
  "scripts": {
    "prepare": "cd apps/web && bun run link-stack-skills"
  }
}
```

The skill layout is the one other skill tools read too, so
[`skills-npm`](https://github.com/antfu/skills-npm) or
[TanStack Intent](https://github.com/TanStack/intent) also work if you'd rather
use one of those.
