# Prisma Schema & Migration Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the project's database schema and migration history from Supabase SQL files to Prisma, using a local Docker Postgres for development and deploying to Supabase, while keeping all runtime queries and authentication on the Supabase JS client.

**Architecture:** Prisma CLI (dev dependency only) models the four `public` tables in `prisma/schema.prisma` and owns `prisma/migrations/`. A Docker `postgres:16` service is the local dev database for applying migrations. Supabase-specific objects Prisma cannot model — the `auth.users` foreign keys and RLS policies — are added via guarded, idempotent raw SQL migrations so the same migration set applies to both local Postgres and Supabase. No application code changes.

**Tech Stack:** Prisma (CLI), PostgreSQL 16 (Docker), Supabase (Postgres + Auth, unchanged), Next.js 16 / React 19 (unchanged at runtime).

**Spec:** `docs/superpowers/specs/2026-10-13-prisma-migration-design.md`

## Global Constraints

- No runtime behavior changes. All data access stays on the Supabase JS client in `src/app/actions/*` and `src/lib/supabase/*`; auth stays on Supabase Auth.
- Do **not** add `@prisma/client` or import Prisma at runtime. Prisma is a dev-only CLI dependency.
- Do **not** create a commit. The user will commit after all changes are complete. Skip every commit step.
- `status` and `priority` stay `String` columns with CHECK constraints (not native Prisma enums).
- RLS policies and `auth.users` FKs live in raw SQL migrations using guarded creation, so they are no-ops where Supabase already provides those objects.
- Existing table names, column names, defaults, indexes, and unique constraints must be preserved exactly.
- Local database: service `db`, image `postgres:16`, user `postgres`, password `postgres`, database `daystackup`, port `5432`.
- Local connection string: `postgresql://postgres:postgres@localhost:5432/daystackup?schema=public`.

## File Structure

- `docker-compose.yml` (modify) — add a `db` Postgres 16 service and its volume, preserving the existing `app` service and `demo-network`.
- `package.json` (modify) — add `prisma@6.19.3` devDependency and `db:*` scripts.
- `.env.example` (modify) — document `DATABASE_URL` and `SUPABASE_DATABASE_URL`.
- `.env` (modify) — add the same two variables with the local value.
- `prisma/schema.prisma` (create) — source of truth for the `public` schema.
- `prisma/migrations/20261013090000_auth_bootstrap/migration.sql` (create) — guarded `auth` schema/stub.
- `prisma/migrations/20261013100000_init/migration.sql` (create) — generated schema baseline.
- `prisma/migrations/20261013110000_constraints/migration.sql` (create) — CHECK constraints + `auth.users` FKs.
- `prisma/migrations/20261013120000_rls/migration.sql` (create) — RLS enablement + policies.
- `supabase/migrations/` (delete) — replaced by Prisma.

---

### Task 1: Add Prisma CLI + local Postgres dev environment

**Files:**
- Create: `docker-compose.yml`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Consumes: nothing.
- Produces: a running local Postgres reachable at `postgresql://postgres:postgres@localhost:5432/daystackup?schema=public`, and a working `npx prisma` CLI.

- [ ] **Step 1: Add the `db` service to the existing `docker-compose.yml`**

The repo already has a `docker-compose.yml` with an `app` service and a
`demo-network`. Preserve both; add a `db` service and a volume. The resulting
file must contain the existing `app` service and `demo-network` unchanged, plus:

```yaml
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: daystackup
    ports:
      - "5432:5432"
    volumes:
      - daystackup_pgdata:/var/lib/postgresql/data

volumes:
  daystackup_pgdata:
```

- [ ] **Step 2: Start the database and verify it is up**

Run: `docker compose up -d db && docker compose ps`
Expected: the `db` service is listed with state `running`; no port-binding errors.

- [ ] **Step 3: Verify connectivity**

Run: `docker compose exec -T db psql -U postgres -d daystackup -c "select version();"`
Expected: prints the PostgreSQL 16 version string.

- [ ] **Step 4: Install the Prisma CLI as a dev dependency (pinned to v6)**

Run: `npm install -D prisma@6.19.3`
Expected: `"prisma": "6.19.3"` (or `^6.19.3`) appears under `devDependencies` in `package.json`.

Note: npm's `latest` tag currently points at `8.0.0-rc.22` and stable `7.x`
is a breaking change (needs `prisma.config.ts`). This project uses the classic
Prisma 6 workflow, so the exact major is pinned.

- [ ] **Step 5: Verify the Prisma CLI works**

Run: `npx prisma -v`
Expected: prints `prisma` and `@prisma/client`/engine versions and a Node.js version line, with no install prompt. The version must be `6.19.3`.

- [ ] **Step 6: Add variables to `.env.example`**

Append to `.env.example`:

```dotenv
# Local development database (Docker Postgres). Used by `prisma migrate dev`.
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/daystackup?schema=public

# Supabase connection string (direct/session connection). Used only by `prisma migrate deploy`.
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

- [ ] **Step 7: Add the same variables to `.env`**

Append to `.env` (keep the existing Supabase keys untouched):

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/daystackup?schema=public
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

- [ ] **Step 8: Add npm scripts to `package.json`**

Add these entries to `"scripts"` (keep existing scripts):

```json
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"db:status": "prisma migrate status",
"db:studio": "prisma studio",
"db:validate": "prisma validate"
```

- [ ] **Step 9: Verify scripts are wired up**

Run: `npm run db:validate`
Expected: it fails with a clear "Could not find a schema" / "schema.prisma not found" style error (the schema is created in Task 2). This confirms the script and CLI resolve.

Do **not** commit.

---

### Task 2: Author `prisma/schema.prisma`

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Consumes: Task 1's `DATABASE_URL` and Prisma CLI.
- Produces: the four models (`Habit`, `Completion`, `DailyPlannerTask`, `HabitTopic`) with exactly the column/table/index names task 3's generated baseline depends on.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Habit {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String
  emoji     String   @default("📋")
  category  String   @default("other")
  sortOrder Int      @default(0) @map("sort_order")
  goal      String   @default("")
  notes     String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  completions Completion[]
  topics      HabitTopic[]

  @@index([userId], map: "idx_habits_user_id")
  @@index([userId, sortOrder], map: "idx_habits_user_order")
  @@map("habits")
}

model Completion {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  habitId   String   @map("habit_id") @db.Uuid
  date      DateTime @db.Date
  completed Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date], map: "completions_habit_id_date_key")
  @@index([userId], map: "idx_completions_user_id")
  @@index([userId, date], map: "idx_completions_user_date")
  @@index([habitId], map: "idx_completions_habit_id")
  @@map("completions")
}

model DailyPlannerTask {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  title           String
  date            DateTime  @db.Date
  startTime       DateTime? @map("start_time") @db.Time(6)
  durationMinutes Int?      @map("duration_minutes")
  priority        String    @default("medium")
  status          String    @default("planned")
  notes           String?
  position        Int       @default(0)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@index([userId, date], map: "idx_daily_planner_tasks_user_date")
  @@map("daily_planner_tasks")
}

model HabitTopic {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  habitId    String    @map("habit_id") @db.Uuid
  title      String
  status     String    @default("planned")
  details    String    @default("")
  resources  String    @default("")
  sortOrder  Int       @default(0) @map("sort_order")
  startDate  DateTime? @map("start_date") @db.Date
  targetDate DateTime? @map("target_date") @db.Date
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@index([habitId, sortOrder], map: "idx_habit_topics_habit_order")
  @@map("habit_topics")
}
```

- [ ] **Step 2: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 3: Format the schema**

Run: `npx prisma format`
Expected: reformats in place and reports the schema is formatted; `prisma validate` still passes.

Do **not** commit.

---

### Task 3: Auth bootstrap migration + generated schema baseline

**Files:**
- Create: `prisma/migrations/20261013090000_auth_bootstrap/migration.sql`
- Create: `prisma/migrations/20261013100000_init/migration.sql`

**Interfaces:**
- Consumes: `prisma/schema.prisma` from Task 2.
- Produces: an `auth` schema with a stub `auth.users` table and `auth.uid()` function locally, plus the four `public` tables with indexes, unique constraint, and the two `habit_id` foreign keys.

- [ ] **Step 1: Create the auth bootstrap migration directory and file**

Create `prisma/migrations/20261013090000_auth_bootstrap/migration.sql`:

```sql
-- Supabase provides the `auth` schema and `auth.users`/`auth.uid()`.
-- Locally (Docker Postgres) these do not exist, so guarded stubs are created.
-- All statements are no-ops against a real Supabase database.

CREATE SCHEMA IF NOT EXISTS auth;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    CREATE TABLE auth.users (
      id    uuid PRIMARY KEY,
      email text
    );
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $func$ SELECT NULL::uuid $func$;
  END IF;
END
$do$;
```

- [ ] **Step 2: Generate the schema baseline migration**

Run:

```bash
mkdir -p prisma/migrations/20261013100000_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261013100000_init/migration.sql
```

- [ ] **Step 3: Inspect the generated baseline**

Run: `cat prisma/migrations/20261013100000_init/migration.sql`
Expected: contains `CREATE TABLE "habits"`, `"completions"`, `"daily_planner_tasks"`, `"habit_topics"`; the indexes `idx_habits_user_id`, `idx_habits_user_order`, `idx_completions_user_id`, `idx_completions_user_date`, `idx_completions_habit_id`, `idx_daily_planner_tasks_user_date`, `idx_habit_topics_habit_order`; the unique constraint `completions_habit_id_date_key`; and two `FOREIGN KEY ("habit_id") ... ON DELETE CASCADE` clauses. It must **not** contain any `user_id` foreign key (those are added in Task 4).

- [ ] **Step 4: Apply migrations to the local database**

Run: `npx prisma migrate deploy`
Expected: output lists `20261013090000_auth_bootstrap` and `20261013100000_init`, then `All migrations have been successfully applied.`

- [ ] **Step 5: Verify migration status**

Run: `npx prisma migrate status`
Expected: `Database schema is up to date!`

- [ ] **Step 6: Verify the local tables and one structure**

Run:

```bash
docker compose exec -T db psql -U postgres -d daystackup -c "\dt public.*"
docker compose exec -T db psql -U postgres -d daystackup -c "\d public.habits"
```

Expected: `\dt` lists `habits`, `completions`, `daily_planner_tasks`, `habit_topics`; `\d habits` shows columns `id, user_id, name, emoji, category, sort_order, goal, notes, created_at` and the two indexes. Also verify the `auth` stub:

```bash
docker compose exec -T db psql -U postgres -d daystackup -c "select table_schema, table_name from information_schema.tables where table_schema = 'auth';"
```

Expected: one row for `auth.users`.

Do **not** commit.

---

### Task 4: Constraints migration (CHECK constraints + `auth.users` foreign keys)

**Files:**
- Create: `prisma/migrations/20261013110000_constraints/migration.sql`

**Interfaces:**
- Consumes: Task 3's applied baseline and `auth.users` stub.
- Produces: `status`/`priority`/`duration_minutes` CHECK constraints and `user_id` foreign keys from every `public` table to `auth.users(id)`.

- [ ] **Step 1: Create the constraints migration file**

Create `prisma/migrations/20261013110000_constraints/migration.sql`:

```sql
-- CHECK constraints and auth.users foreign keys: not expressible in schema.prisma.

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_priority_check"
  CHECK ("priority" IN ('low', 'medium', 'high'));

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_status_check"
  CHECK ("status" IN ('planned', 'in_progress', 'done', 'skipped'));

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_duration_minutes_check"
  CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0);

ALTER TABLE "habit_topics"
  ADD CONSTRAINT "habit_topics_status_check"
  CHECK ("status" IN ('planned', 'in_progress', 'done', 'skipped'));

ALTER TABLE "habits"
  ADD CONSTRAINT "habits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "completions"
  ADD CONSTRAINT "completions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "habit_topics"
  ADD CONSTRAINT "habit_topics_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx prisma migrate deploy`
Expected: lists `20261013110000_constraints` and reports success.

- [ ] **Step 3: Verify CHECK constraints and foreign keys**

Run:

```bash
docker compose exec -T db psql -U postgres -d daystackup -c "\d public.daily_planner_tasks"
docker compose exec -T db psql -U postgres -d daystackup -c "\d public.habits"
```

Expected: `daily_planner_tasks` shows the three `CHECK` constraints and `daily_planner_tasks_user_id_fkey`; `habits` shows `habits_user_id_fkey` referencing `auth.users(id)`.

- [ ] **Step 4: Confirm no drift was introduced**

Run: `npx prisma migrate status`
Expected: `Database schema is up to date!` (no warnings about missing/extra migrations).

Do **not** commit.

---

### Task 5: RLS migration (policies)

**Files:**
- Create: `prisma/migrations/20261013120000_rls/migration.sql`

**Interfaces:**
- Consumes: Task 3's tables and Task 4's constraints.
- Produces: row level security enabled on all four tables with owner-scoped policies using `auth.uid() = user_id`.

- [ ] **Step 1: Create the RLS migration file**

Create `prisma/migrations/20261013120000_rls/migration.sql`:

```sql
-- RLS policies: not expressible in schema.prisma. Mirrors supabase/migrations.

ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_planner_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_topics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON "habits" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own habits"
  ON "habits" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own habits"
  ON "habits" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own habits"
  ON "habits" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own completions"
  ON "completions" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own completions"
  ON "completions" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own completions"
  ON "completions" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own completions"
  ON "completions" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own daily planner tasks"
  ON "daily_planner_tasks" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own daily planner tasks"
  ON "daily_planner_tasks" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own daily planner tasks"
  ON "daily_planner_tasks" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own daily planner tasks"
  ON "daily_planner_tasks" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own habit topics"
  ON "habit_topics" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own habit topics"
  ON "habit_topics" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own habit topics"
  ON "habit_topics" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own habit topics"
  ON "habit_topics" FOR DELETE USING (auth.uid() = "user_id");
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx prisma migrate deploy`
Expected: lists `20261013120000_rls` and reports success.

- [ ] **Step 3: Verify policies**

Run:

```bash
docker compose exec -T db psql -U postgres -d daystackup -c "select tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;"
docker compose exec -T db psql -U postgres -d daystackup -c "select relname, relrowsecurity from pg_class where relname in ('habits','completions','daily_planner_tasks','habit_topics');"
```

Expected: 16 policy rows (4 per table); all four tables report `relrowsecurity = t`.

Do **not** commit.

---

### Task 6: Remove Supabase migrations and run final validation

**Files:**
- Delete: `supabase/migrations/` (all `.sql` files)
- Modify: none

**Interfaces:**
- Consumes: the complete Prisma migration set from Tasks 1–5.
- Produces: a repo where Prisma is the only schema/migration source, with lint passing.

- [ ] **Step 1: Remove the Supabase migration files**

Run:

```bash
rm -rf supabase/migrations
```

Then confirm: `ls supabase` — the `supabase` directory may now be empty or absent. Remove it if it only contained `migrations`:

```bash
rmdir supabase 2>/dev/null || true
```

- [ ] **Step 2: Confirm no code references the deleted files**

Run: `grep -rn "supabase/migrations" . --include=*.ts --include=*.tsx --include=*.json --include=*.md --exclude-dir=node_modules --exclude-dir=.git`
Expected: no matches in application code. (Matches inside `docs/superpowers/` referring to the migration history are acceptable and expected.)

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: passes with no errors (pre-existing warnings, if any, are acceptable).

- [ ] **Step 4: Validate the Prisma schema one final time**

Run: `npx prisma validate && npx prisma migrate status`
Expected: schema valid; `Database schema is up to date!`.

- [ ] **Step 5: Deployment instructions to the user (do not execute against production here)**

Report to the user:

1. Set `SUPABASE_DATABASE_URL` to a **fresh/empty** Supabase database, then run:
   `DATABASE_URL="$SUPABASE_DATABASE_URL" npm run db:deploy`
2. If deploying to an **existing populated** Supabase database instead, baseline it (do not run the migrations):
   `DATABASE_URL="$SUPABASE_DATABASE_URL" npx prisma migrate resolve --applied 20261013090000_auth_bootstrap` and repeat for the other three migration names, then `npm run db:status`.
3. Restore data from the SQL/CSV backups.

Do **not** commit.

---

## Self-Review

**Spec coverage:**

- Local Docker Postgres dev DB → Task 1.
- `schema.prisma` source of truth, four models, `@@map`/`@map`, `user_id` as plain uuid, String+CHECK, no runtime client → Tasks 2, 4.
- Guarded auth bootstrap so migrations run on local and Supabase → Task 3.
- Baseline generated from empty → Task 3.
- CHECK constraints / auth FKs → Task 4.
- RLS policies → Task 5.
- Env + scripts → Task 1.
- Remove `supabase/migrations` → Task 6.
- Validation (`prisma validate`, `migrate dev`/`deploy`, status, lint) → Tasks 2–6.
- Data restore/deploy notes → Task 6 Step 5.

**Placeholder scan:** No TBD/TODO. Generated baseline is produced by an explicit command with expected contents described; all hand-written SQL is given in full.

**Type consistency:** Table and column names are identical across `schema.prisma` (Task 2), the auth bootstrap (Task 3), constraints (Task 4), and RLS (Task 5). Migration directory ordering is lexicographic and correct: `...090000_auth_bootstrap` < `...100000_init` < `...110000_constraints` < `...120000_rls`, so the `auth.users` stub exists before the `init` and `constraints` migrations reference it.

**Note on commits:** Per the user's instruction, no commit steps are included; the user commits after all changes.
