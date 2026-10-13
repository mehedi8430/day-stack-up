import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Local development runs the app against the Docker Postgres, which mirrors the
 * Supabase schema including the `user_id -> auth.users(id)` foreign keys, while
 * authentication still happens against Supabase. This makes sure the
 * authenticated user exists in the local `auth.users` stub so those foreign
 * keys can be satisfied.
 *
 * It is a no-op unless `LOCAL_AUTH_BOOTSTRAP=1` is set (docker-compose sets it
 * for the app service), so it never writes to a real Supabase `auth.users`.
 */
export async function ensureLocalAuthUser(
  id: string,
  email: string | null
): Promise<void> {
  if (process.env.LOCAL_AUTH_BOOTSTRAP !== "1") return;

  await prisma.$executeRaw`
    INSERT INTO "auth"."users" ("id", "email")
    VALUES (${id}::uuid, ${email})
    ON CONFLICT ("id") DO NOTHING
  `;
}

/**
 * Returns the authenticated Supabase user and ensures it exists in the local
 * auth schema. Redirects to the login page when there is no session.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureLocalAuthUser(user.id, user.email ?? null);
  return user;
}
