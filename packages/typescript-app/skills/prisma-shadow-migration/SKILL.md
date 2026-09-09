---
name: prisma-shadow-migration
description: Create a Prisma migration that captures schema changes already
  applied to the dev DB via `db push`, using the shadow DB so the dev DB is
  never reset. Use in any project that depends on
  @chuvenger/typescript-app-stack when the user asks to create a migration
  after a push-based dev workflow.
---

# Prisma shadow-DB migration

Create a Prisma migration that captures schema changes already applied to the
dev DB via `db push`, without resetting (and wiping) the dev database.

This skill ships with `@chuvenger/typescript-app-stack`, which provides the
Prisma toolchain (`prisma`, `@prisma/client`, `@prisma/adapter-pg`,
`prisma-kysely`). It documents the migration convention every app built on the
stack should follow.

## Why this exists

The dev workflow for stack projects is:

1. Edit `prisma/schema.prisma`.
2. Run the project's push script (e.g. `bun run db:push`) to sync the dev DB
   without creating a migration.
3. Iterate on the schema until happy.
4. **Then** create the migration that captures the final shape.

Because step 2 has already mutated the dev DB, a plain `prisma migrate dev`
sees drift (table/column exists in DB but no migration produced it) and asks
to **reset the database** — which would wipe data. This skill avoids that by
generating the SQL via the shadow DB and marking it applied.

## Pre-flight checks

- Confirm the user explicitly asked for a migration. The convention is "we use
  push on development; I will tell you when to create the migration." Do not
  run this unprompted after schema edits.
- Confirm `prisma/schema.prisma` is in the desired final state.
- Run the project's check and lint scripts (e.g. `bun run check`,
  `bun run lint`) to make sure nothing else is broken before snapshotting.

## Steps

1. **Pick a migration name** in snake_case that describes the change
   (e.g. `add_insulins`, `rename_user_email_column`). Match the style of
   existing folders under `prisma/migrations/`.

2. **Compute the SQL via the shadow DB** (no writes to the dev DB):

   ```bash
   bunx prisma migrate diff \
     --from-migrations ./prisma/migrations \
     --to-schema ./prisma/schema.prisma \
     --script
   ```

   `prisma.config.ts` supplies the datasource and `SHADOW_DATABASE_URL`
   automatically — do not pass `--shadow-database-url` (Prisma 7 removed it).
   The shadow DB applies all existing migrations in order, then diffs against
   the schema, so the output is the exact SQL needed to bring migration
   history forward.

3. **Inspect the diff.** Confirm the SQL looks right:
   - Expected `CREATE TABLE` / `ALTER TABLE` statements?
   - Expected indexes and FKs?
   - No unintended column drops or type changes?

   If anything looks wrong, fix `prisma/schema.prisma` and rerun step 2.

4. **Write the migration file.** Use a UTC timestamp prefix matching the
   pattern of existing folders (`YYYYMMDDhhmmss_<name>`):

   ```bash
   TS=$(date -u +%Y%m%d%H%M%S)
   NAME="${TS}_<migration_name>"
   mkdir -p "prisma/migrations/$NAME"
   bunx prisma migrate diff \
     --from-migrations ./prisma/migrations \
     --to-schema ./prisma/schema.prisma \
     --script > "prisma/migrations/$NAME/migration.sql"
   ```

   `2>` is not redirected here because Prisma's "Loaded Prisma config…" line
   goes to stderr and the SQL goes to stdout — only stdout reaches the file.

5. **Mark the migration applied** (since `db push` already created the schema
   in the dev DB, do NOT run the SQL again):

   ```bash
   bunx prisma migrate resolve --applied "$NAME"
   ```

6. **Verify**:

   ```bash
   bunx prisma migrate status
   ```

   Should report "Database schema is up to date!" and list the new migration
   at the bottom of the migrations list.

7. **Spot-check data preservation** for any tables touched. Example for an
   additive migration where the dev DB already had test rows:

   ```bash
   PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d <database> \
     -c "SELECT COUNT(*) FROM <table>;"
   ```

   The row count should be unchanged from before this ran.

## When NOT to use this

- **No prior `db push`**: if you edited the schema but haven't pushed yet, just
  run the project's `migrate dev` script (e.g. `bun run db:migrate:dev`) —
  Prisma will create AND apply the migration cleanly without drift.

- **Destructive change to a table that already has production-relevant data**:
  `prisma migrate diff` will happily emit `DROP COLUMN` / `DROP TABLE`. The
  shadow DB workflow doesn't protect data — it only protects the dev DB from
  automatic reset. Review the diff carefully for any destructive statements and
  confirm with the user before resolving.

- **Multiple pending diffs**: if the schema has accumulated several unrelated
  changes since the last migration, split them into multiple migrations
  (revert schema → migrate → re-apply next change → migrate, etc.) so each
  migration captures a single conceptual change. Bundling unrelated DDL into
  one migration makes future reverts harder.

## Risk notes

- `prisma migrate resolve --applied` writes a row into `_prisma_migrations`
  saying the migration ran successfully, **without actually executing the
  SQL**. This is correct here because the dev DB already has the schema, but it
  means the migration file's SQL has never actually run against any database.
  The shadow DB does run it during `migrate diff`, which gives reasonable
  confidence — but it's not the same as a fresh deploy.
- On the first deploy that runs `prisma migrate deploy` (e.g. CI / Railway),
  the SQL **will** execute. If the diff has bugs, that's where they'll surface.
  Always glance at the file in step 3.
