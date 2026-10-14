import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` runs as part of the production build and does not need a
// live database, so resolving the datasource URL must not throw when the
// database env vars are absent (e.g. a Vercel build before runtime env is
// configured). Prisma's `env()` helper raises `PrismaConfigEnvError` in that
// case, so read the variables directly instead. Commands that actually need a
// connection (`db:migrate`, `db:deploy`, ...) will still fail clearly if no
// URL is provided.
const datasourceUrl =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
