---
"@chuvenger/typescript-app-stack": minor
---

Add a `link-stack-skills` command for linking the bundled agent skills into an app. Add `"prepare": "link-stack-skills"` and each install symlinks the skills into `.claude/skills/` and `.agents/skills/` at the repo root. It works under bun's hoisted and isolated linkers. This replaces the README's `npx agents export` instructions: that command runs Cloudflare's unrelated `agents` package. The unused `agents` field is removed from `package.json`, and every stack now declares its `repository`.
