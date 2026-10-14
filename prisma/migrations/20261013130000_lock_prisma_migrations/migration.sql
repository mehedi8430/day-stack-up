-- The `_prisma_migrations` bookkeeping table is created by Prisma in the
-- exposed `public` schema. Supabase's default privileges grant new public
-- tables to the `anon` and `authenticated` roles, which would expose the
-- migration history through PostgREST.
--
-- Lock it down: enable RLS with no policies (deny-all for API roles; the table
-- owner, i.e. the migration connection, still bypasses RLS) and revoke the API
-- roles' grants where those roles exist (they do not exist on local Docker
-- Postgres, so the revokes are guarded).

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "public"."_prisma_migrations" FROM "anon";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "public"."_prisma_migrations" FROM "authenticated";
  END IF;
END
$$;
