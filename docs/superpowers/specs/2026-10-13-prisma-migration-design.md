# Prisma as Schema & Migration Source of Truth

Date: 2026-10-13
Status: Approved (design)

## Summary

Replace the Supabase SQL migration history (`supabase/migrations/*.sql`) with
Prisma as the source of truth for the `public` database schema and migrations.
Prisma models the schema and owns the migration history; **all runtime queries
and authentication remain on the Supabase JS client**. There are no runtime
behavior changes in this work.

Dev migrations run against a local Postgres started with Docker; the resulting
migration history is deployed to Supabase with `prisma migrate deploy`.

## Goals

- `prisma/schema.prisma` is the single source of truth for the `public` schema.
- `prisma/migrations/` is the migration history going forward, replacing
  `supabase/migrations/`.
- Provide a local Postgres (Docker) dev database for `prisma migrate dev`.
- Deploy migrations to Supabase via `prisma migrate deploy`.
- Preserve existing table/column names, constraints, indexes, RLS policies, and
  the `auth.users` foreign key.

## Non-goals

- No changes to runtime data access. The app keeps using the Supabase JS client
  (`@supabase/ssr`, `@supabase/supabase-js`) for queries.
- No changes to authentication. Supabase Auth remains the auth provider
  (`signInWithPassword`, `signUp`, `signOut`, `getUser`).
- No Prisma Client in application code. Prisma is used only for schema/migrations.
- No data migration tooling. Data is restored from the user's existing SQL/CSV
  backups after deploy.

## Current State

- Runtime queries live in:
  - `src/app/actions/habit.actions.ts`
  - `src/app/actions/milestone.actions.ts`
  - `src/app/actions/planner.actions.ts`
- Auth/session usage in:
  - `src/app/api/auth/{login,signup,logout,session}/route.ts`
  - `src/proxy.ts`
  - `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/planner/page.tsx`
- Supabase clients: `src/lib/supabase/{client,server}.ts`
- Types: `src/lib/types.ts`, `src/lib/planner-types.ts`
- Migrations: `supabase/migrations/*.sql` (9 files)
- Tables: `habits`, `completions`, `daily_planner_tasks`, `habit_topics`
- All tables have RLS enabled and policies scoped with `auth.uid() = user_id`,
  plus `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.

## Design

### 1. Local dev database

- Add `docker-compose.yml` with a `postgres:16` service exposing port `5432`,
  with a persistent volume and a named dev database.
- `.env` holds `DATABASE_URL` pointing at the local Postgres.
- `prisma migrate dev` runs against local Postgres; Prisma automatically creates
  and drops a shadow database on the same server (the default Postgres role has
  `CREATEDB`), so no separate shadow database configuration is required.

### 2. Prisma schema

`prisma/schema.prisma` models the four `public` tables:

| Prisma model      | Table                 |
| ----------------- | --------------------- |
| `Habit`           | `habits`              |
| `Completion`      | `completions`         |
| `DailyPlannerTask`| `daily_planner_tasks` |
| `HabitTopic`      | `habit_topics`        |

Modeling rules:

- Use `@@map` for table names and `@map` for snake_case columns.
- `user_id` is modeled as a plain `String @db.Uuid` column. There is no Prisma
  relation to `auth.users` because the `auth` schema is Supabase-managed.
- `id` columns use `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`.
- Timestamps use `DateTime @db.Timestamptz(6)` with the existing defaults
  (`now()`), and `updated_at` is not auto-managed by Prisma (it was set by
  application code / SQL before).
- Preserve unique constraints: `@@unique([habitId, date])` on `Completion`.
- Preserve indexes including `(user_id, sort_order)` on `habits` and
  `(user_id, date)` on `completions` / `daily_planner_tasks`.
- `status` and `priority` columns are modeled as `String` with CHECK constraints
  recreated via raw SQL (decision 1). They are **not** native Prisma enums, to
  stay closest to the current database shape.
- Omit a Prisma `generator` block (or leave it unused) since no Prisma Client is
  used at runtime. If a generator is present, it is never invoked in app code.

### 3. Migration history

Migrations are generated from `schema.prisma` and then augmented with
hand-written, idempotent SQL so the **same migration set runs on both local
Postgres and Supabase**.

Files (ordering is illustrative):

1. `0_auth_bootstrap/migration.sql` — Supabase-specific prerequisites, guarded
   so they are no-ops on Supabase and create local stubs on Docker Postgres:
   - `CREATE SCHEMA IF NOT EXISTS auth;`
   - guarded creation of an `auth.users` stub table (only if the table does not
     already exist)
   - guarded creation of an `auth.uid()` stub function (only if it does not
     already exist) returning `uuid`
2. `1_init/migration.sql` — the schema baseline generated from empty →
   `schema.prisma` with
   `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.
   Includes tables, columns, defaults, indexes, unique constraints, and the
   `auth.users` foreign keys.
3. `2_constraints/migration.sql` — CHECK constraints for `priority` and `status`
   columns (decision 1) plus any raw SQL Prisma cannot express.
4. `3_rls/migration.sql` — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and the
   full set of policies mirroring the current `supabase/migrations`, scoped with
   `auth.uid() = user_id`.

Notes:

- Guarded `auth` bootstrap is critical: `CREATE OR REPLACE` on `auth.uid()` on
  Supabase would overwrite Supabase's own function, so the migration must only
  create it when absent.
- Because local dev never runs Supabase Auth against the local database, the RLS
  policies are inert locally; they exist so the migration set is complete and
  reproducible against Supabase.

### 4. Environment & scripts

- `.env`:
  - `DATABASE_URL` — local Postgres connection string (used by `migrate dev`).
  - `SUPABASE_DATABASE_URL` — Supabase connection string (direct/session
    connection) used only for deploy.
- `.env.example` updated to document both, with placeholder values.
- `package.json` scripts:
  - `db:migrate` → `prisma migrate dev`
  - `db:deploy` → `prisma migrate deploy` against `SUPABASE_DATABASE_URL`
  - `db:studio` → `prisma studio`
  - `db:validate` → `prisma validate`
- Add `prisma` as a `devDependency` (CLI only). No `@prisma/client` dependency is
  required because the client is not used at runtime.

### 5. Files added / removed

Added:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `docker-compose.yml`
- updated `.env.example`, `package.json`, `package-lock.json`

Removed:

- `supabase/migrations/*.sql` (git history preserves them; the user has SQL and
  CSV backups)
- The `supabase/` directory is left in place if empty, or removed if it only
  contained migrations. No Supabase CLI config is present today.

## Data Flow

- **Development:** edit `schema.prisma` → `prisma migrate dev` applies against
  local Docker Postgres → migration SQL is created in `prisma/migrations/`.
- **Deploy:** `prisma migrate deploy` applies pending migrations against
  Supabase. The app continues to talk to Supabase through the JS client using
  the same tables and columns as before.
- **Data:** restored separately from the user's SQL/CSV backups after the schema
  is deployed.

## Error Handling

- Guarded bootstrap SQL ensures migrations are re-runnable and safe against a
  database where Supabase's `auth` objects already exist.
- If a migration fails mid-way, `prisma migrate` records failure and requires
  `prisma migrate resolve`; this is standard Prisma behavior and is documented
  in the README/AGENTS notes if needed.

## Testing / Validation

- `npx prisma validate`
- `npx prisma migrate dev` against local Postgres; confirm tables, indexes,
  unique constraints, CHECK constraints, RLS policies, and `auth.users` FKs.
- `npx prisma migrate deploy` against Supabase (performed by the user, using
  `SUPABASE_DATABASE_URL`).
- `npm run lint` to confirm no regressions.
- Restore CSV/SQL data and smoke-test the app (calendar, planner, milestones,
  analytics) against Supabase.

## Decisions

1. **`status` / `priority` remain `String` + CHECK constraints**, not native
   Prisma enums, to stay closest to the current database shape and keep CSV
   restores trivial.
2. **RLS policies and the `auth.users` FK are included in the Prisma migration
   set** via guarded, idempotent raw SQL, so a single migration history is
   reproducible against both local Postgres and Supabase.

## Risks

- `auth` stub objects could diverge from real Supabase `auth` objects over time.
  Mitigation: guarded creation only when absent, and never `CREATE OR REPLACE` on
  Supabase-managed functions.
- Drift between local Postgres and Supabase if someone changes the Supabase
  database outside Prisma. Mitigation: document that all schema changes go
  through Prisma.
- Prisma migration ordering must place the `auth` bootstrap before `1_init` so
  the `auth.users` FK can be created locally.

## Out of Scope

- Replacing Supabase Auth.
- Moving runtime queries to Prisma Client.
- Automatic data migration/restore.
- Changes to `src/proxy.ts` route protection or auth flows.
