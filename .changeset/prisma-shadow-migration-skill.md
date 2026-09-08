---
"@chuvenger/typescript-app-stack": minor
---

Ship the `prisma-shadow-migration` agent skill with the stack. Consumers can pull it into their repo with `npx agents export --target claude`. The skill documents the shadow-DB migration workflow (capture `db push` schema changes into a migration without resetting the dev DB).
