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
