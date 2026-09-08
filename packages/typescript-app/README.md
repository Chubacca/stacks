# @chuvenger/typescript-app-stack

Web app stack: Tailwind, Zod, Prisma, better-auth, dotenv.

## Bundled agent skills

This package ships coding-agent skills alongside its code, following the
[Agent Skills](https://code.claude.com/docs/en/skills) open standard. Skills
are declared in the `agents.skills` field of `package.json` and live under
[`skills/`](./skills).

| Skill | What it does |
| --- | --- |
| [`prisma-shadow-migration`](./skills/prisma-shadow-migration) | Create a Prisma migration that captures schema changes already applied to the dev DB via `db push`, using the shadow DB so the dev DB is never reset. |

### Using the skills in a consuming app

Skills are **not** auto-discovered from `node_modules` — export them into your
repo's agent directory once after installing:

```bash
# discover every dependency that ships skills, then copy them in
npx agents export --target claude   # -> .claude/skills/
```

`npx agents` comes from [`npm-agentskills`](https://github.com/onmax/npm-agentskills),
which scans `node_modules` for packages with an `agents` field. Re-run it after
`npm update` / `bun update` to pull skill updates that shipped with a new
version of this package. Other targets (`--target cursor`, `--target copilot`,
etc.) are supported too; several agents also read `.claude/skills/` directly.
